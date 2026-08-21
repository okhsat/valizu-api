import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,

  ) {
    super(message);
    
    this.name = 'AppError';
  }
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,

) {
  if ( error instanceof ZodError ) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: error.issues,
    });

    return;
  }

  if ( error instanceof AppError ) {
    res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
    });

    return;
  }

  console.error(error);

  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
}
