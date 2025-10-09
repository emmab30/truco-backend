import { Router, Request, Response } from 'express';
import { auth } from '@/config/firebase';
import { authenticateToken, AuthenticatedRequest } from '@/middleware/auth';

const router = Router();

// Get current user info
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await auth.getUser(req.user!.uid);
    
    return res.json({
      uid: user.uid,
      email: user.email,
      name: user.displayName,
      picture: user.photoURL,
      emailVerified: user.emailVerified,
    });
  } catch (error) {
    console.error('Error getting user:', error);
    return res.status(500).json({ error: 'Failed to get user information' });
  }
});

// Verify token endpoint
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const decodedToken = await auth.verifyIdToken(token);
    
    return res.json({
      valid: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken['name'],
      picture: decodedToken.picture,
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
