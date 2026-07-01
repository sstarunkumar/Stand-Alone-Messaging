/**
 * STUB AUTH — for local testing only.
 * When integrating into NOS: replace verifySocketToken and authenticateToken
 * with your real JWT verify logic. The shape { userId, role } must stay the same.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'nos-messaging-test-secret';

export type UserRole = 'CUSTOMER' | 'CASE_MANAGER';

export interface AuthUser {
  userId: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const user = verifyToken(token);
  if (!user) {
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = user;
  next();
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}
