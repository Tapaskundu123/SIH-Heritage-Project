import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email: string;
  role: 'artisan' | 'buyer' | 'admin';
}

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: 'artisan' | 'buyer' | 'admin';
  user?: AuthUser;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Access token required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      id: string;
      email: string;
      role?: 'artisan' | 'buyer' | 'admin';
    };
    req.userId = decoded.id;
    req.userRole = decoded.role || 'artisan';
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'artisan',
    };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const optionalAuthenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      id: string;
      email: string;
      role?: 'artisan' | 'buyer' | 'admin';
    };
    req.userId = decoded.id;
    req.userRole = decoded.role || 'artisan';
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'artisan',
    };
  } catch {
    // For optional auth, proceed even if token is invalid or expired
  }
  next();
};

export const authorize = (...roles: Array<'artisan' | 'buyer' | 'admin'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role || req.userRole;
    if (!userRole || !roles.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Requires one of [${roles.join(', ')}] role.`,
      });
      return;
    }
    next();
  };
};
