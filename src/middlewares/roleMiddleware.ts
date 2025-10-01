// src/middlewares/roleMiddleware.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

type Role = 'user' | 'admin' | 'superadmin';

export const requireRole = (roles: Role | Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role as Role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions.' 
      });
    }

    next();
  };
};

export const requireSuperAdmin = requireRole('superadmin');
export const requireAdmin = requireRole(['admin', 'superadmin']);