// src/middlewares/debugMiddleware.ts
import { Request, Response, NextFunction } from 'express';

export const debugUserMiddleware = (req: any, res: Response, next: NextFunction) => {
  console.log('=== DEBUG USER MIDDLEWARE ===');
  console.log('User object exists:', !!req.user);
  console.log('User data:', req.user);
  console.log('User ID:', req.user?._id);
  console.log('User firstName:', req.user?.firstName);
  console.log('User lastName:', req.user?.lastName);
  console.log('User avatar:', req.user?.avatar);
  console.log('=============================');
  next();
};