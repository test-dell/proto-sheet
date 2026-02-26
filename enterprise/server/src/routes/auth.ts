import { Router, Request, Response } from 'express';
import { validate } from '../middleware/validation.js';
import { loginSchema, registerSchema } from '../models/schemas.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { registerUser, loginUser, refreshAccessToken, logoutUser } from '../services/auth.js';
import logger from '../utils/logger.js';

const router = Router();

// POST /api/auth/register — Admin only can create users
router.post(
  '/register',
  authenticate,
  authorize('admin'),
  validate(registerSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { empCode, email, password, role } = req.body;
      const user = await registerUser(empCode, email, password, role);
      res.status(201).json({ user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      if (message.includes('already exists')) {
        res.status(409).json({ error: message });
        return;
      }
      logger.error({ error }, 'Registration error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { empCode, password } = req.body;
      const result = await loginUser(empCode, password);

      // Set refresh token as HttpOnly cookie
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/auth/refresh',
      });

      res.json({
        user: result.user,
        accessToken: result.tokens.accessToken,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      if (message === 'Invalid credentials') {
        res.status(401).json({ error: message });
        return;
      }
      logger.error({ error }, 'Login error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/auth/refresh — Get new access token using refresh token
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token required' });
      return;
    }

    const tokens = await refreshAccessToken(refreshToken);

    // Rotate refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth/refresh',
    });

    res.json({ accessToken: tokens.accessToken });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token refresh failed';
    res.status(401).json({ error: message });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await logoutUser(req.user!.userId);

    res.clearCookie('refreshToken', {
      path: '/api/auth/refresh',
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error({ error }, 'Logout error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me — Get current user info
router.get('/me', authenticate, (req: Request, res: Response): void => {
  res.json({ user: req.user });
});

export default router;
