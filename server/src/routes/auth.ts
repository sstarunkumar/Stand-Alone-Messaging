/**
 * TEST-ONLY auth routes.
 * Issues JWTs for any userId + role — no real user validation.
 * Remove this entire file when integrating into NOS.
 */
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, UserRole } from '../middleware/auth';

const router = Router();

router.post('/token', (req, res) => {
  const { userId, role } = req.body as { userId?: string; role?: string };

  if (!userId?.trim()) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  const validRoles: UserRole[] = ['CUSTOMER', 'CASE_MANAGER'];
  if (!role || !validRoles.includes(role as UserRole)) {
    res.status(400).json({ error: 'role must be CUSTOMER or CASE_MANAGER' });
    return;
  }

  const token = jwt.sign({ userId: userId.trim(), role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, userId: userId.trim(), role });
});

export default router;
