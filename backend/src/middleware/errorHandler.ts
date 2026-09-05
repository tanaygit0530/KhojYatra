import { Request, Response, NextFunction } from 'express';
import { ErrorCode } from '@khojyatra/types';

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public override message: string,
    public status: number = 500,
    public details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
};

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('API Error:', err);

  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
  }

  // Zod validation error
  if (err?.name === 'ZodError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: err.errors
      }
    });
  }

  return res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: err?.message || 'An unexpected internal error occurred'
    }
  });
};
