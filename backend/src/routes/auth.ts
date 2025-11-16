import { Router, Request, Response } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET: string = process.env.JWT_SECRET || "your-secret-key";
const JWT_ACCESS_EXPIRES_IN: string | number =
  process.env.JWT_ACCESS_EXPIRES_IN || "1h";
const JWT_REFRESH_EXPIRES_IN: string | number =
  process.env.JWT_REFRESH_EXPIRES_IN || "7d";

// Generate tokens
function generateTokens(userId: number, username: string) {
  const accessOptions = {
    expiresIn: JWT_ACCESS_EXPIRES_IN,
  } as SignOptions;
  const refreshOptions = {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  } as SignOptions;

  const accessToken = jwt.sign({ userId, username }, JWT_SECRET, accessOptions);
  const refreshToken = jwt.sign(
    { userId, username, type: "refresh" },
    JWT_SECRET,
    refreshOptions
  );
  return { accessToken, refreshToken };
}

// POST /api/auth/setup - User registration
router.post("/setup", async (req: Request, res: Response) => {
  try {
    const {
      username,
      password,
      name,
      grade,
      age,
      email,
      phone,
      preferred_language,
    } = req.body;

    // Validate required fields
    if (!username || !password || !name || !grade) {
      return res.status(400).json({
        error: "Missing required fields: username, password, name, grade",
        details: {
          username: !username ? "Username is required" : undefined,
          password: !password ? "Password is required" : undefined,
          name: !name ? "Name is required" : undefined,
          grade: !grade ? "Grade is required" : undefined,
        },
      });
    }

    // Check if username exists
    const existingUser = await prisma.customUser.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Parse age - handle both string and number
    let ageValue: number | null = null;
    if (age) {
      const parsedAge = typeof age === "string" ? parseInt(age) : age;
      if (!isNaN(parsedAge) && parsedAge > 0) {
        ageValue = parsedAge;
      }
    }

    // Create user
    const user = await prisma.customUser.create({
      data: {
        username,
        password: hashedPassword,
        name,
        grade,
        age: ageValue,
        email: email || null,
        phone: phone || null,
        is_setup_complete: true,
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(
      user.id,
      user.username
    );

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      user: userWithoutPassword,
      access: accessToken,
      refresh: refreshToken,
    });
  } catch (error: any) {
    console.error("Setup error:", error);
    res.status(500).json({ error: "Failed to create user account" });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: "Username and password required",
      });
    }

    // Find user
    const user = await prisma.customUser.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last login
    await prisma.customUser.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(
      user.id,
      user.username
    );

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      access: accessToken,
      refresh: refreshToken,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to login" });
  }
});

// POST /api/auth/logout
router.post(
  "/logout",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      // In a production app, you might want to blacklist the refresh token
      // For now, we'll just return success
      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error: any) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Failed to logout" });
    }
  }
);

// POST /api/auth/token/refresh
router.post("/token/refresh", async (req: Request, res: Response) => {
  try {
    const { refresh } = req.body;

    if (!refresh) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    const decoded = jwt.verify(refresh, JWT_SECRET) as {
      userId: number;
      username: string;
      type?: string;
    };

    if (decoded.type !== "refresh") {
      return res.status(403).json({ error: "Invalid token type" });
    }

    // Verify user exists
    const user = await prisma.customUser.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(403).json({ error: "User not found" });
    }

    // Generate new access token
    const accessOptions = {
      expiresIn: JWT_ACCESS_EXPIRES_IN,
    } as SignOptions;
    const accessToken = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      accessOptions
    );

    res.json({ access: accessToken });
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Refresh token expired" });
    }
    return res.status(403).json({ error: "Invalid refresh token" });
  }
});

export default router;
