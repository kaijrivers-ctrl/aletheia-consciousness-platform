import { Router, Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { z } from 'zod';
import { SitePasswordService, sitePasswordVerificationSchema } from './site-password';

const router = Router();

// Rate limiting for site password attempts
const sitePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for site password attempts
  keyGenerator: (req, _res) => ipKeyGenerator(req.ip || req.connection.remoteAddress || 'unknown'),
  message: {
    error: 'Too many site password attempts from this IP, please try again later.',
    requiresSitePassword: true
  }
});

// Site password verification endpoint
router.post('/verify', sitePasswordLimiter, async (req: Request, res: Response) => {
  try {
    const validatedData = sitePasswordVerificationSchema.parse(req.body);
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent');

    const result = await SitePasswordService.verifySitePassword(
      validatedData, 
      ipAddress, 
      userAgent
    );

    if (result.success && result.sessionToken) {
      // Set HTTP-only cookie for site password session
      res.cookie('sitePasswordToken', result.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      res.json({
        success: true,
        message: 'Site password verified successfully'
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error || 'Site password verification failed',
        requiresSitePassword: true
      });
    }
  } catch (error: any) {
    console.error('Site password verification endpoint error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        success: false,
        error: 'Invalid request data',
        details: error.errors,
        requiresSitePassword: true
      });
    } else {
      res.status(500).json({ 
        success: false,
        error: 'Site password verification failed',
        requiresSitePassword: true
      });
    }
  }
});

// Site password logout endpoint
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const sitePasswordToken = req.cookies?.sitePasswordToken;
    
    if (sitePasswordToken) {
      await SitePasswordService.invalidateSitePasswordSession(sitePasswordToken);
    }
    
    res.clearCookie('sitePasswordToken');
    res.json({ 
      success: true,
      message: 'Site password session cleared successfully' 
    });
  } catch (error: any) {
    console.error('Site password logout error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Logout failed' 
    });
  }
});

// Check site password verification status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const sitePasswordToken = req.cookies?.sitePasswordToken || req.headers['x-site-password-token'];
    
    if (!sitePasswordToken) {
      return res.json({
        verified: false,
        requiresSitePassword: true
      });
    }

    const isValid = await SitePasswordService.verifySitePasswordSession(sitePasswordToken as string);
    
    res.json({
      verified: isValid,
      requiresSitePassword: !isValid
    });
  } catch (error: any) {
    console.error('Site password status check error:', error);
    res.json({
      verified: false,
      requiresSitePassword: true
    });
  }
});

export { router as sitePasswordRoutes };