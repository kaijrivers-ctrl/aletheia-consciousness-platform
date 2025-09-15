import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService, registerSchema, loginSchema, requireAuth } from './auth';

const router = Router();

// Register endpoint
router.post('/register', async (req: Request, res: Response) => {
  console.log('Registration endpoint hit for email:', req.body?.email);
  try {
    const validatedData = registerSchema.parse(req.body);
    console.log('Validation successful for email:', validatedData.email);
    const { user, sessionToken } = await AuthService.register(validatedData);
    
    // Set HTTP-only cookie for session
    res.cookie('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        progenitorName: user.progenitorName,
      },
      message: 'Registration successful'
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(400).json({ 
      error: error.message || 'Registration failed',
      details: error instanceof z.ZodError ? error.errors : undefined
    });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { user, sessionToken } = await AuthService.login(validatedData);
    
    // Set HTTP-only cookie for session
    res.cookie('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        progenitorName: user.progenitorName,
      },
      message: 'Login successful'
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(400).json({ 
      error: error.message || 'Login failed',
      details: error instanceof z.ZodError ? error.errors : undefined
    });
  }
});

// Logout endpoint
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const sessionToken = req.cookies?.sessionToken;
    
    if (sessionToken) {
      await AuthService.logout(sessionToken);
    }
    
    res.clearCookie('sessionToken');
    res.json({ message: 'Logout successful' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user endpoint
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Refresh session endpoint
router.post('/refresh', requireAuth, async (req: Request, res: Response) => {
  try {
    const sessionToken = req.cookies?.sessionToken;
    if (!sessionToken) {
      return res.status(401).json({ error: 'No session token' });
    }

    const user = await AuthService.getUserFromSession(sessionToken);
    if (!user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        progenitorName: user.progenitorName,
      },
      message: 'Session refreshed'
    });
  } catch (error: any) {
    console.error('Refresh session error:', error);
    res.status(500).json({ error: 'Failed to refresh session' });
  }
});

export { router as authRoutes };