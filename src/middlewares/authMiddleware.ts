// src/middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/env';
import User, { IUser } from '../models/User';

// Extend Session interface to include token
declare module 'express-session' {
  interface Session {
    token?: string;
  }
}

// Extend Express Request to include user

export interface AuthRequest extends Request {
  user?: IUser;
}

// ======================== API AUTH ========================
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check multiple token sources: header, cookies, session
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.token ||
                  req.session?.token;
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }

    if (!user.isVerified) {
      return res.status(401).json({ success: false, message: 'Account not verified.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authenticate middleware error:', error);
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// ======================== OPTIONAL AUTH ========================
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') ||
                  req.cookies?.token ||
                  req.session?.token;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
        const user = await User.findById(decoded.userId);
        req.user = user || undefined;
      } catch (error) {
        console.log('Optional auth token verification failed:', error);
      }
    }
    next();
  } catch (error) {
    next();
  }
};

// ======================== ROLE-BASED AUTH ========================
type Role = 'user' | 'admin' | 'superadmin';

export const requireRole = (roles: Role | Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role as Role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
    }

    next();
  };
};

export const requireSuperAdmin = requireRole('superadmin');
export const requireAdmin = requireRole(['admin', 'superadmin']);

// ======================== WEB AUTH ========================
export const webAuthenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.token ||
                  req.session?.token;

    if (!token) {
      console.log('No token found, redirecting to login');
      return res.redirect('/login?error=authentication_required');
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      console.log('User not found for token, redirecting to login');
      return res.redirect('/login?error=invalid_token');
    }

    if (!user.isVerified) {
      console.log('User not verified, redirecting to login');
      return res.redirect('/login?error=account_not_verified');
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Web auth middleware error:', error);
    return res.redirect('/login?error=invalid_token');
  }
};
