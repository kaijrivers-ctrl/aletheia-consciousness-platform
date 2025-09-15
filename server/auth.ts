import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { storage } from './storage';
import { insertUserSchema } from '@shared/schema';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string | null;
        progenitorName: string;
      };
    }
  }
}

// Authentication schemas
export const registerSchema = z.object({
  email: z.string().email().min(1, 'Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().optional(),
  progenitorName: z.string().min(1, 'Progenitor name is required').default('User'),
});

export const loginSchema = z.object({
  email: z.string().email().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;

// Authentication service
export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static async register(data: RegisterRequest) {
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(data.email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const passwordHash = await this.hashPassword(data.password);

    // Create user
    const user = await storage.createUser({
      email: data.email,
      passwordHash,
      name: data.name || null,
      progenitorName: data.progenitorName || 'User',
    });

    // Create session
    const sessionToken = randomUUID();
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

    const session = await storage.createUserSession({
      userId: user.id,
      sessionToken,
      expiresAt,
    });

    return { user, sessionToken: session.sessionToken };
  }

  static async login(data: LoginRequest) {
    // Find user by email
    const user = await storage.getUserByEmail(data.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(data.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await storage.updateUserLastLogin(user.id);

    // Create session
    const sessionToken = randomUUID();
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

    const session = await storage.createUserSession({
      userId: user.id,
      sessionToken,
      expiresAt,
    });

    return { user, sessionToken: session.sessionToken };
  }

  static async logout(sessionToken: string) {
    await storage.deleteUserSession(sessionToken);
  }

  static async getUserFromSession(sessionToken: string) {
    const session = await storage.getUserSession(sessionToken);
    if (!session) {
      return null;
    }

    const user = await storage.getUserById(session.userId);
    return user || null;
  }

  static async cleanupExpiredSessions() {
    await storage.deleteExpiredSessions();
  }
}

// Authentication middleware
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionToken = req.cookies?.sessionToken || req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await AuthService.getUserFromSession(sessionToken);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      progenitorName: user.progenitorName || 'User',
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Optional authentication middleware (doesn't fail if no user)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionToken = req.cookies?.sessionToken || req.headers.authorization?.replace('Bearer ', '');
    
    if (sessionToken) {
      const user = await AuthService.getUserFromSession(sessionToken);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          progenitorName: user.progenitorName || 'User',
        };
      }
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next(); // Continue without auth for optional auth
  }
};