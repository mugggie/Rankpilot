import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './requireAuth';

export function adminOnly(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
