import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  console.warn('[Auth] NEXTAUTH_SECRET is not set. Using insecure fallback!');
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  tierId: string;
  isAdmin?: boolean;
  roles?: string[];
  permissions?: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  // Support cookie-based JWT (e.g., req.cookies.token)
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return undefined;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    console.warn(`[Auth] Missing token for request to ${req.originalUrl}`);
    return res.status(401).json({ error: 'Missing authentication token' });
  }
  try {
    // NextAuth.js JWTs use 'sub' for user ID
    const payload = jwt.verify(token, JWT_SECRET || 'changeme') as AuthenticatedUser & {
      sub?: string;
      exp?: number;
    };
    req.user = {
      id: payload.id || payload.sub || '',
      email: payload.email,
      tierId: payload.tierId,
      isAdmin: payload.isAdmin || false,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    };
    next();
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      console.warn(`[Auth] Expired token for request to ${req.originalUrl}`);
      return res.status(401).json({ error: 'Token expired' });
    }
    console.warn(
      `[Auth] Invalid token for request to ${req.originalUrl}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
}

// Optional auth: attaches req.user if present, but does not reject if missing/invalid
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return next();
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET || 'changeme') as AuthenticatedUser & {
      sub?: string;
      exp?: number;
    };
    req.user = {
      id: payload.id || payload.sub || '',
      email: payload.email,
      tierId: payload.tierId,
      isAdmin: payload.isAdmin || false,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    };
  } catch (err: unknown) {
    // Log but do not block request
    console.warn(
      `[Auth] Optional auth: invalid token for request to ${req.originalUrl}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  next();
}
