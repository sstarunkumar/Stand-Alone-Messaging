/**
 * TEST-ONLY auth routes.
 * Issues JWTs for any userId + role — no real user validation.
 * Remove this entire file when integrating into NOS.
 */
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { JWT_SECRET, UserRole } from '../middleware/auth';
import { USER_ALIASES } from '../testAliases';

const router = Router();

router.post('/token', (req, res) => {
  const { userId: rawUserId, role: rawRole } = req.body as { userId?: string; role?: string };

  if (!rawUserId?.trim()) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  // Test aliases (cust1, cm1, ...) resolve to real seeded ids and their canonical role.
  const alias = USER_ALIASES[rawUserId.trim().toLowerCase()];
  const userId = alias ? alias.id.toString() : rawUserId.trim();
  const role = alias ? alias.role : rawRole;

  const validRoles: UserRole[] = ['CUSTOMER', 'CASE_MANAGER', 'ADMIN'];
  if (!role || !validRoles.includes(role as UserRole)) {
    res.status(400).json({ error: 'role must be CUSTOMER or CASE_MANAGER' });
    return;
  }

  if (!alias && !Types.ObjectId.isValid(userId)) {
    res.status(400).json({ error: 'userId must be a known test alias (e.g. cust1, cm1) or a valid id' });
    return;
  }

  const token = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, userId, role });
});

export default router;
