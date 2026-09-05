import { Router, Request, Response } from 'express';
import { communityService } from '../services/communityService.js';
import { createSuccessResponse, createErrorResponse } from '@khojyatra/types';

const router = Router();

// GET /api/v1/community-itineraries/similar (Phase 21)
router.get('/community-itineraries/similar', (req: Request, res: Response) => {
  const { destination, duration, budget, group_type, interests } = req.query;

  const interestsArray = typeof interests === 'string'
    ? interests.split(',').map(s => s.trim())
    : (Array.isArray(interests) ? (interests as string[]) : undefined);

  const results = communityService.findSimilar({
    destination: destination as string,
    duration_days: duration ? parseInt(duration as string, 10) : undefined,
    budget: budget ? parseFloat(budget as string) : undefined,
    group_type: group_type as string,
    interests: interestsArray
  });

  return res.status(200).json(createSuccessResponse(results, { count: results.length }));
});

// POST /api/v1/community-itineraries/:id/clone (Phase 21)
router.post('/community-itineraries/:id/clone', (req: Request, res: Response) => {
  const { id } = req.params;
  const sessionId = req.khojContext.sessionId || 'default-session';

  try {
    const result = communityService.cloneToSession(id, sessionId);
    return res.status(200).json(createSuccessResponse(result));
  } catch (err: any) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', err.message));
  }
});

export default router;
