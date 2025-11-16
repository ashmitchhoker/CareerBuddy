import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

// GET /api/profile - Get user profile
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

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

    res.json({ user });
  } catch (error: any) {
    console.error('Error getting profile:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// PATCH /api/profile/update - Update user profile
router.patch('/update', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, grade, age, email, phone, currentPassword, newPassword } = req.body;

    // Get current user to verify password if changing password
    const currentUser = await prisma.customUser.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If trying to change password, validate current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ 
          error: 'Current password is required to change password' 
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, currentUser.password);
      if (!isValidPassword) {
        return res.status(401).json({ 
          error: 'Current password is incorrect' 
        });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (grade) updateData.grade = grade;
    if (age !== undefined) updateData.age = parseInt(age) || null;
    if (email !== undefined) updateData.email = email || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (newPassword) {
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const user = await prisma.customUser.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        grade: true,
        age: true,
        email: true,
        phone: true,
        is_setup_complete: true,
      },
    });

    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// DELETE /api/profile/delete - Delete user account
router.delete('/delete', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Delete user (cascade will delete assessments, messages, etc.)
    await prisma.customUser.delete({
      where: { id: userId },
    });

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;

