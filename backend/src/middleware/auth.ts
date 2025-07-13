import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    throw new AppError(401, 'No authorization header provided');
  }

  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new AppError(401, 'Invalid authorization header format. Expected: Bearer <token>');
  }

  const token = parts[1];

  if (!token) {
    throw new AppError(401, 'No token provided');
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch (error) {
    throw new AppError(401, 'Invalid token');
  }
};