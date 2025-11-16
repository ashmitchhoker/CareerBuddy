import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/home - Get home page data
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get user profile
    const user = await prisma.customUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        grade: true,
        age: true,
        email: true,
        phone: true,
        is_setup_complete: true,
        created_at: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get saved (in-progress) assessment
    const savedAssessment = await prisma.assessment.findFirst({
      where: {
        user_id: userId,
        status: 'in_progress',
      },
      include: {
        test_responses: {
          orderBy: { test_type: 'asc' },
        },
      },
    });

    // Get completed assessments
    const completedAssessmentsRaw = await prisma.assessment.findMany({
      where: {
        user_id: userId,
        status: 'completed',
      },
      orderBy: { completed_at: 'desc' },
      take: 10,
      include: {
        chat_messages: {
          select: {
            id: true,
          },
        },
      },
    });

    // Sort: assessments with chat messages first, then by completed_at desc
    const completedAssessments = completedAssessmentsRaw.sort((a, b) => {
      const aHasChat = a.chat_messages.length > 0;
      const bHasChat = b.chat_messages.length > 0;
      
      // If one has chat and the other doesn't, prioritize the one with chat
      if (aHasChat && !bHasChat) return -1;
      if (!aHasChat && bHasChat) return 1;
      
      // If both have chat or both don't, sort by completed_at desc
      return b.completed_at!.getTime() - a.completed_at!.getTime();
    });

    // Calculate completion stats
    const totalAssessments = await prisma.assessment.count({
      where: { user_id: userId },
    });
    const completedCount = completedAssessments.length;
    const completionPercentage =
      totalAssessments > 0
        ? Math.round((completedCount / totalAssessments) * 100 * 100) / 100
        : 0;

    res.json({
      user_profile: user,
      saved_assessment: savedAssessment
        ? {
            id: savedAssessment.id,
            assessment_number: savedAssessment.assessment_number,
            status: savedAssessment.status,
            started_at: savedAssessment.started_at,
            test_responses: savedAssessment.test_responses.map((tr) => ({
              id: tr.id,
              test_type: tr.test_type,
              is_completed: tr.is_completed,
              current_question_index: tr.current_question_index,
            })),
          }
        : null,
      completed_assessments: completedAssessments.map((a) => ({
        id: a.id,
        assessment_number: a.assessment_number,
        completed_at: a.completed_at,
        status: a.status,
        has_chat: a.chat_messages.length > 0,
      })),
      completion_stats: {
        total_assessments: totalAssessments,
        completed_percentage: completionPercentage,
      },
    });
  } catch (error: any) {
    console.error('Error getting home data:', error);
    res.status(500).json({ error: 'Failed to get home data' });
  }
});

export default router;

