import { Request, Response, NextFunction } from 'express';
import { createErrorResponse } from '@khojyatra/types';

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 1. Check authenticated user context or mock test header
    const userRole =
      req.khojContext?.userRole ||
      (req.headers['x-user-role'] as string) ||
      undefined;

    const userId =
      req.khojContext?.userId ||
      (req.headers['x-user-id'] as string) ||
      undefined;

    // If not authenticated at all
    if (!userRole && !userId) {
      return res.status(401).json(
        createErrorResponse('UNAUTHORIZED', 'Authentication required to access this resource')
      );
    }

    // If role is present but not authorized
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json(
        createErrorResponse(
          'FORBIDDEN',
          `Insufficient permissions. Requires one of role: [${allowedRoles.join(', ')}]`,
          { current_role: userRole || 'anonymous' }
        )
      );
    }

    return next();
  };
};

export const requireAdmin = requireRole(['admin']);
export const requireProvider = requireRole(['provider', 'admin']);
