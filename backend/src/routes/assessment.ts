import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth";
import { GeminiService } from "../services/gemini";
import type { AssessmentPayload, AssessmentResponse } from "../types";

const router = Router();
const prisma = new PrismaClient();

// Lazy initialization of Gemini service
let geminiService: GeminiService | null = null;

function getGeminiService(): GeminiService {
  if (!geminiService) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is required. Please check your .env file."
      );
    }
    geminiService = new GeminiService(apiKey);
  }
  return geminiService;
}

// Helper to get user language type
type Language = "en" | "hi" | "te" | "ta" | "bn" | "gu";

// POST /api/assessment/start - Start a new assessment
router.post(
  "/start",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      // Check for existing in-progress assessment
      const existingInProgress = await prisma.assessment.findFirst({
        where: {
          user_id: userId,
          status: "in_progress",
        },
      });

      if (existingInProgress) {
        // Return the existing in-progress assessment
        return res.status(200).json({
          assessment_id: existingInProgress.id,
          first_test_type: "riasec",
          redirect_url: "/assessment/test/riasec/",
        });
      }

      // Find the next available assessment_number by checking the max
      const maxAssessment = await prisma.assessment.findFirst({
        where: { user_id: userId },
        orderBy: { assessment_number: "desc" },
        select: { assessment_number: true },
      });

      const nextAssessmentNumber = maxAssessment
        ? maxAssessment.assessment_number + 1
        : 1;

      // Create a new assessment
      const assessment = await prisma.assessment.create({
        data: {
          user_id: userId,
          assessment_number: nextAssessmentNumber,
          status: "in_progress",
          test_responses: {
            create: {
              test_type: "riasec",
              total_questions: 0,
            },
          },
        },
      });

      res.status(201).json({
        assessment_id: assessment.id,
        first_test_type: "riasec",
        redirect_url: "/assessment/test/riasec/",
      });
    } catch (error: any) {
      console.error("Error starting assessment:", error);
      res.status(500).json({ error: "Failed to start assessment" });
    }
  }
);

// GET /api/assessment/test/:testType - Get test questions and progress
router.get(
  "/test/:testType",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { testType } = req.params;
      const assessmentId = parseInt(req.query.assessmentId as string);

      if (!["riasec", "values", "personal"].includes(testType)) {
        return res.status(400).json({ error: "Invalid test type" });
      }

      let assessment;
      if (assessmentId) {
        assessment = await prisma.assessment.findFirst({
          where: {
            id: assessmentId,
            user_id: userId,
          },
        });
      } else {
        assessment = await prisma.assessment.findFirst({
          where: {
            user_id: userId,
            status: "in_progress",
          },
        });
      }

      if (!assessment) {
        return res.status(404).json({ error: "Assessment not found" });
      }

      // Get or create test response
      let testResponse = await prisma.testResponse.findUnique({
        where: {
          assessment_id_test_type: {
            assessment_id: assessment.id,
            test_type: testType,
          },
        },
      });

      if (!testResponse) {
        testResponse = await prisma.testResponse.create({
          data: {
            assessment_id: assessment.id,
            test_type: testType,
            total_questions: 0,
          },
        });
      }

      // Parse saved responses
      let savedAnswers = {};
      try {
        savedAnswers = JSON.parse(testResponse.responses || "{}");
      } catch {
        savedAnswers = {};
      }

      res.json({
        test_type: testType,
        test_response_id: testResponse.id,
        current_question_index: testResponse.current_question_index,
        total_questions: testResponse.total_questions,
        saved_answers: savedAnswers,
        is_completed: testResponse.is_completed,
      });
    } catch (error: any) {
      console.error("Error getting test:", error);
      res.status(500).json({ error: "Failed to get test data" });
    }
  }
);

// POST /api/assessment/save - Save test progress
router.post("/save", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { test_response_id, answers, current_question_index } = req.body;

    if (!test_response_id) {
      return res.status(400).json({ error: "test_response_id is required" });
    }

    // Verify test response belongs to user
    const testResponse = await prisma.testResponse.findUnique({
      where: { id: test_response_id },
      include: { assessment: true },
    });

    if (!testResponse || testResponse.assessment.user_id !== req.user!.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Update test response
    await prisma.testResponse.update({
      where: { id: test_response_id },
      data: {
        responses: JSON.stringify(answers || {}),
        current_question_index: current_question_index || 0,
        last_saved_at: new Date(),
      },
    });

    res.json({ success: true, saved_at: new Date().toISOString() });
  } catch (error: any) {
    console.error("Error saving progress:", error);
    res.status(500).json({ error: "Failed to save progress" });
  }
});

// POST /api/assessment/submit - Submit completed test
router.post(
  "/submit",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { test_response_id, answers } = req.body;

      if (!test_response_id || !answers) {
        return res
          .status(400)
          .json({ error: "test_response_id and answers are required" });
      }

      // Verify test response belongs to user
      const testResponse = await prisma.testResponse.findUnique({
        where: { id: test_response_id },
        include: { assessment: true },
      });

      if (!testResponse || testResponse.assessment.user_id !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Update test response as completed
      await prisma.testResponse.update({
        where: { id: test_response_id },
        data: {
          responses: JSON.stringify(answers),
          is_completed: true,
          submitted_at: new Date(),
        },
      });

      const assessment = testResponse.assessment;

      // Check if all tests are completed
      const allTestResponses = await prisma.testResponse.findMany({
        where: { assessment_id: assessment.id },
      });

      const testOrder = ["riasec", "values", "personal"];
      const currentIndex = testOrder.indexOf(testResponse.test_type);

      if (currentIndex < testOrder.length - 1) {
        // Create next test response
        const nextTestType = testOrder[currentIndex + 1];
        await prisma.testResponse.upsert({
          where: {
            assessment_id_test_type: {
              assessment_id: assessment.id,
              test_type: nextTestType,
            },
          },
          create: {
            assessment_id: assessment.id,
            test_type: nextTestType,
            total_questions: 0,
          },
          update: {},
        });

        return res.json({
          success: true,
          next_test_type: nextTestType,
          redirect_url: `/assessment/test/${nextTestType}/`,
        });
      } else {
        // All tests completed
        await prisma.assessment.update({
          where: { id: assessment.id },
          data: {
            status: "completed",
            completed_at: new Date(),
          },
        });

        return res.json({
          success: true,
          next_test_type: null,
          redirect_url: `/assessment/processing/${assessment.id}/`,
        });
      }
    } catch (error: any) {
      console.error("Error submitting test:", error);
      res.status(500).json({ error: "Failed to submit test" });
    }
  }
);

// POST /api/assessment/complete - Process assessment and generate recommendations
router.post(
  "/complete",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const payload: AssessmentPayload = req.body;
      const userId = req.user!.id;

      // Validate payload
      if (
        !payload.userProfile ||
        !payload.tests ||
        !Array.isArray(payload.tests)
      ) {
        return res.status(400).json({
          error: "Invalid payload. Required: userProfile, tests (array)",
        });
      }

      if (payload.tests.length === 0) {
        return res.status(400).json({
          error: "At least one test result is required",
        });
      }

      console.log(
        `Processing assessment for user: ${payload.userProfile.name}`
      );

      // Get or verify assessment exists
      const assessment = await prisma.assessment.findFirst({
        where: {
          id: payload.assessmentId,
          user_id: userId,
        },
        include: {
          test_responses: true,
        },
      });

      if (!assessment) {
        return res.status(404).json({ error: "Assessment not found" });
      }

      // Save/update test responses to database
      for (const test of payload.tests) {
        await prisma.testResponse.upsert({
          where: {
            assessment_id_test_type: {
              assessment_id: assessment.id,
              test_type: test.type,
            },
          },
          create: {
            assessment_id: assessment.id,
            test_type: test.type,
            responses: JSON.stringify(test.answers),
            is_completed: true,
            submitted_at: new Date(),
            total_questions: Object.keys(test.answers).length,
          },
          update: {
            responses: JSON.stringify(test.answers),
            is_completed: true,
            submitted_at: new Date(),
            total_questions: Object.keys(test.answers).length,
          },
        });
      }

      // Mark assessment as completed
      await prisma.assessment.update({
        where: { id: assessment.id },
        data: {
          status: "completed",
          completed_at: new Date(),
        },
      });

      // Calculate RIASEC scores and fetch matching careers
      let riasecScores = null;
      let matchingCareers: string[] = [];

      const riasecTest = payload.tests.find((test) => test.type === "riasec");
      if (riasecTest) {
        const { calculateRIASECScore, getCareersByRIASECCode } = await import(
          "../services/riasecService"
        );
        // Convert numeric keys to strings for calculateRIASECScore
        const answersWithStringKeys: {
          [questionId: string]: string | string[];
        } = {};
        Object.entries(riasecTest.answers).forEach(([key, value]) => {
          answersWithStringKeys[key] = value;
        });
        riasecScores = calculateRIASECScore(answersWithStringKeys);
        matchingCareers = getCareersByRIASECCode(riasecScores.top3);
        console.log(
          `RIASEC Top 3: ${riasecScores.top3}, Found ${matchingCareers.length} matching careers`
        );
      }

      // Generate recommendations using Gemini
      const recommendations = await getGeminiService().generateRecommendations(
        payload,
        {
          maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || "3"),
          initialDelay: parseInt(process.env.RETRY_DELAY_MS || "1000"),
        },
        riasecScores,
        matchingCareers
      );

      // Generate and save initial chatbot greeting message immediately
      // This ensures it's ready when user clicks "View Results"
      try {
        const user = await prisma.customUser.findUnique({
          where: { id: userId },
        });

        // Build assessment summary for chatbot with filtered recommendations
        const testResponses = payload.tests.map((test) => ({
          type: test.type,
          answers: test.answers,
        }));

        const summaryParts = [
          `Assessment #${assessment.assessment_number} completed.`,
          `Student: ${user?.name || "Student"}, Grade: ${
            user?.grade || "N/A"
          }, Age: ${user?.age || "N/A"}`,
        ];

        // Add RIASEC scores and matching careers to summary
        if (riasecScores) {
          summaryParts.push(`\nRIASEC Top 3: ${riasecScores.top3}`);
          if (matchingCareers && matchingCareers.length > 0) {
            summaryParts.push(
              `\nMatching Careers (${matchingCareers.length}): ${matchingCareers
                .slice(0, 10)
                .join(", ")}${matchingCareers.length > 10 ? "..." : ""}`
            );
          }
        }

        summaryParts.push(`\nTest Responses:`);
        testResponses.forEach((tr) => {
          summaryParts.push(`\n${tr.type.toUpperCase()} Test:`);
          Object.entries(tr.answers).forEach(([qId, answer]) => {
            const answerStr = Array.isArray(answer)
              ? answer.join(", ")
              : String(answer);
            summaryParts.push(`  Question ${qId}: ${answerStr}`);
          });
        });

        // Add the filtered recommendations to the summary
        summaryParts.push(`\n\nCareer Recommendations (from matching list):`);
        recommendations.recommendations.forEach((rec, idx) => {
          summaryParts.push(`\n${idx + 1}. ${rec.title}`);
          summaryParts.push(`   Reason: ${rec.reason}`);
          summaryParts.push(`   Next Steps: ${rec.next_steps.join(", ")}`);
        });

        const assessmentSummary = summaryParts.join("\n");

        // Check if initial greeting already exists for this assessment to prevent duplicates
        const existingInitialMessage = await prisma.chatMessage.findFirst({
          where: {
            user_id: userId,
            assessment_id: assessment.id,
            sender: "bot",
            is_results_chat: true,
          },
        });

        // Only create initial greeting if it doesn't already exist
        if (!existingInitialMessage) {
          // Generate initial greeting (language is validated to be one of the supported types)
          const userLanguage = (payload.userProfile.language || "en") as
            | "en"
            | "hi"
            | "te"
            | "ta"
            | "bn"
            | "gu";
          const aiMessage = await getGeminiService().generateInitialGreeting(
            assessmentSummary,
            userLanguage
          );

          // Save initial bot message to database
          await prisma.chatMessage.create({
            data: {
              user_id: userId,
              assessment_id: assessment.id,
              message_text: aiMessage.reply,
              sender: "bot",
              is_results_chat: true,
            },
          });
        }
      } catch (greetingError) {
        // Don't fail the whole request if greeting generation fails
        console.error("Failed to generate initial greeting:", greetingError);
      }

      const response: AssessmentResponse = {
        recommendations: recommendations.recommendations,
        summary: recommendations.summary,
        smsMessage: recommendations.smsMessage,
        riasecScores: riasecScores ? {
          scores: riasecScores.scores,
          top3: riasecScores.top3,
          ordered: riasecScores.ordered,
        } : undefined,
      };

      console.log(`Assessment completed for user: ${payload.userProfile.name}`);

      res.json(response);
    } catch (error: any) {
      console.error("Error processing assessment:", error);

      // Return fallback response
      const fallback: AssessmentResponse = {
        recommendations: [
          {
            title: "Career Exploration",
            confidence: 0.7,
            reason: "Continue exploring different fields",
            next_steps: ["Research careers", "Talk to professionals"],
          },
        ],
        summary:
          "Your assessment has been processed. We recommend exploring various career paths.",
      };

      res.status(500).json(fallback);
    }
  }
);

// GET /api/assessment/history - Get assessment history
router.get(
  "/history",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const assessments = await prisma.assessment.findMany({
        where: {
          user_id: userId,
          status: "completed",
        },
        orderBy: {
          completed_at: "desc", // Most recent first (will be re-sorted below)
        },
        include: {
          test_responses: {
            where: { is_completed: true },
          },
          chat_messages: {
            select: {
              id: true,
            },
          },
        },
      });

      // Sort: assessments with chat messages first, then by completed_at desc
      const sortedAssessments = assessments.sort((a, b) => {
        const aHasChat = a.chat_messages.length > 0;
        const bHasChat = b.chat_messages.length > 0;

        // If one has chat and the other doesn't, prioritize the one with chat
        if (aHasChat && !bHasChat) return -1;
        if (!aHasChat && bHasChat) return 1;

        // If both have chat or both don't, sort by completed_at desc
        return b.completed_at!.getTime() - a.completed_at!.getTime();
      });

      const assessmentsData = sortedAssessments.map((assessment) => ({
        id: assessment.id,
        assessment_number: assessment.assessment_number,
        completed_at: assessment.completed_at,
        status: assessment.status,
        test_count: assessment.test_responses.length,
        has_chat: assessment.chat_messages.length > 0,
      }));

      res.json({ completed_assessments: assessmentsData });
    } catch (error: any) {
      console.error("Error getting history:", error);
      res.status(500).json({ error: "Failed to get assessment history" });
    }
  }
);

// DELETE /api/assessment/:id - Delete an assessment and all related data
router.delete(
  "/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const assessmentId = parseInt(req.params.id);

      if (isNaN(assessmentId)) {
        return res.status(400).json({ error: "Invalid assessment ID" });
      }

      // Verify assessment belongs to user
      const assessment = await prisma.assessment.findFirst({
        where: {
          id: assessmentId,
          user_id: userId,
        },
      });

      if (!assessment) {
        return res.status(404).json({ error: "Assessment not found" });
      }

      // Delete all related data (cascade deletes will handle test_responses and chat_messages)
      await prisma.assessment.delete({
        where: { id: assessmentId },
      });

      res.json({
        success: true,
        message: "Assessment deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting assessment:", error);
      res.status(500).json({ error: "Failed to delete assessment" });
    }
  }
);

// GET /api/assessment/:id/responses - Get detailed responses for an assessment
router.get(
  "/:id/responses",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const assessmentId = parseInt(req.params.id);

      const assessment = await prisma.assessment.findFirst({
        where: {
          id: assessmentId,
          user_id: userId,
        },
        include: {
          test_responses: {
            where: { is_completed: true },
          },
        },
      });

      if (!assessment) {
        return res.status(404).json({ error: "Assessment not found" });
      }

      const testResponses = assessment.test_responses.map((tr) => {
        let answers: { [key: string]: any } = {};
        try {
          answers = JSON.parse(tr.responses || "{}");
        } catch (e) {
          console.error("Error parsing test responses:", e);
          answers = {};
        }

        // Clean answers - remove any chat message content that might have been accidentally included
        const cleanedAnswers: { [key: string]: string | string[] } = {};
        const chatPhrases = [
          "great job on the assessment",
          "career paths for you",
          "exciting career paths",
          "Based on your results",
          "Hey",
          "free to ask me any questions",
        ];

        for (const [key, value] of Object.entries(answers)) {
          if (!value) continue;

          const valueStr = Array.isArray(value)
            ? value.join(" ")
            : String(value);
          const isChatMessage = chatPhrases.some((phrase) =>
            valueStr.toLowerCase().includes(phrase.toLowerCase())
          );

          if (!isChatMessage && valueStr.trim().length > 0) {
            // Clean up the value - remove any appended chat content
            let cleanValue: string | string[] = value as string | string[];
            if (typeof value === "string") {
              const chatGreetingPattern =
                /(?:Hey\s+[^,]+,?\s*)?(?:Grade:\s*\w+,?\s*)?(?:Age:\s*\d+,?\s*)?(?:great job on the assessment[^]*?career paths[^]*?)/i;
              const cleaned = value.replace(chatGreetingPattern, "").trim();
              cleanValue = cleaned || value; // Use original if cleaning removes everything
            }
            cleanedAnswers[key] = cleanValue;
          }
        }

        return {
          test_type: tr.test_type,
          answers: cleanedAnswers,
          submitted_at: tr.submitted_at,
        };
      });

      res.json({
        assessment: {
          id: assessment.id,
          assessment_number: assessment.assessment_number,
          completed_at: assessment.completed_at,
        },
        test_responses: testResponses,
      });
    } catch (error: any) {
      console.error("Error getting responses:", error);
      res.status(500).json({ error: "Failed to get assessment responses" });
    }
  }
);

export default router;
