import type { NextFunction, Request, Response } from 'express';
import { AppError } from './error.handler.js';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

export function requireUser(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const userId = req.header('X-User-Id');

  if (!userId) {
    return next(
      new AppError(
        401,
        'UNAUTHENTICATED',
        'User authentication is required',
      ),
    );
  }

  (req as AuthenticatedRequest).userId = userId;

  next();
}
