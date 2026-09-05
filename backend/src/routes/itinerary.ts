import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { itineraryPlanner } from '../services/itineraryPlanner.js';
import { routeOptimizer } from '../services/routeOptimizer.js';
import { frictionEngine } from '../services/frictionEngine.js';
import { detourService } from '../services/detourService.js';
import { store } from '../data/store.js';
import { createSuccessResponse, createErrorResponse } from '@khojyatra/types';

const router = Router();

const AddItemSchema = z.object({
  experience_id: z.string().uuid().or(z.string())
});

// GET /api/v1/itinerary
router.get('/itinerary', (req: Request, res: Response) => {
  const sessionId = req.khojContext.sessionId || 'default-session';
  const userId = req.khojContext.userId;

  const itinerary = itineraryPlanner.getOrCreateItinerary(sessionId, userId);
  const feasibility = itineraryPlanner.checkFeasibility(itinerary);

  return res.status(200).json(
    createSuccessResponse({
      itinerary,
      feasibility
    })
  );
});

// POST /api/v1/itinerary/add
router.post('/itinerary/add', (req: Request, res: Response) => {
  const parseResult = AddItemSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json(
      createErrorResponse('VALIDATION_ERROR', 'experience_id required', parseResult.error.format())
    );
  }

  const sessionId = req.khojContext.sessionId || 'default-session';
  const userId = req.khojContext.userId;

  try {
    const result = itineraryPlanner.addItem(sessionId, parseResult.data.experience_id, userId);
    return res.status(200).json(createSuccessResponse(result));
  } catch (err: any) {
    return res.status(400).json(createErrorResponse('CONFLICT', err.message));
  }
});

// GET /api/v1/itinerary/feasibility
router.get('/itinerary/feasibility', (req: Request, res: Response) => {
  const sessionId = req.khojContext.sessionId || 'default-session';
  const itinerary = itineraryPlanner.getOrCreateItinerary(sessionId);
  const feasibility = itineraryPlanner.checkFeasibility(itinerary);

  return res.status(200).json(createSuccessResponse(feasibility));
});

// DELETE /api/v1/itinerary/items/:id
router.delete('/itinerary/items/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const sessionId = req.khojContext.sessionId || 'default-session';

  const updatedItinerary = itineraryPlanner.removeItem(sessionId, id);
  const feasibility = itineraryPlanner.checkFeasibility(updatedItinerary);

  return res.status(200).json(
    createSuccessResponse({
      itinerary: updatedItinerary,
      feasibility
    })
  );
});

// GET /api/v1/itinerary/session/budget-status (Phase 17)
router.get('/itinerary/session/budget-status', (req: Request, res: Response) => {
  const sessionId = req.khojContext.sessionId || 'default-session';
  const budgetStatus = itineraryPlanner.getBudgetStatus(sessionId);
  return res.status(200).json(createSuccessResponse(budgetStatus));
});

// GET /api/v1/itinerary/:id/budget-status (Phase 17)
router.get('/itinerary/:id/budget-status', (req: Request, res: Response) => {
  const { id } = req.params;
  const sessionId = req.khojContext.sessionId || 'default-session';
  const budgetStatus = itineraryPlanner.getBudgetStatus(sessionId, id);
  return res.status(200).json(createSuccessResponse(budgetStatus));
});

// POST /api/v1/itinerary/optimize-route (Phase 11)
router.post('/itinerary/optimize-route', (req: Request, res: Response) => {
  const { experience_ids, start_location } = req.body;
  const sessionId = req.khojContext.sessionId || 'default-session';

  const itinerary = itineraryPlanner.getOrCreateItinerary(sessionId);
  const expIds: string[] = experience_ids || itinerary.items.map(i => i.experience_id);

  const experiences = expIds
    .map(id => store.getExperienceById(id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  const startLoc = start_location || {
    lat: experiences[0]?.lat || 28.6506,
    lng: experiences[0]?.lng || 77.2303
  };

  const optimization = routeOptimizer.optimizeOrder(startLoc, experiences);

  // Reorder itinerary items based on optimized stops
  const reorderedItems: typeof itinerary.items = [];
  let currTime = new Date();
  currTime.setHours(10, 0, 0, 0);

  optimization.ordered_stops.forEach((stop, idx) => {
    const existing = itinerary.items.find(i => i.experience_id === stop.experience.id);
    if (existing) {
      existing.position = idx + 1;
      existing.start_time = currTime.toISOString();
      reorderedItems.push(existing);

      currTime = new Date(currTime.getTime() + (stop.experience.duration_min + stop.leg_travel_time_min) * 60 * 1000);
    }
  });

  if (reorderedItems.length > 0) {
    itinerary.items = reorderedItems;
  }

  const feasibility = itineraryPlanner.checkFeasibility(itinerary);

  return res.status(200).json(
    createSuccessResponse({
      optimization,
      itinerary,
      feasibility,
      total_travel_time_saved_min: optimization.travel_time_saved_min,
      message: optimization.message
    })
  );
});

// POST /api/v1/itinerary/repair (Phase 12 Friction Engine)
router.post('/itinerary/repair', (req: Request, res: Response) => {
  const { unavailable_experience_id, weather } = req.body;
  const sessionId = req.khojContext.sessionId || 'default-session';

  const repairResult = frictionEngine.repair(sessionId, {
    unavailableExperienceId: unavailable_experience_id,
    weather
  });

  return res.status(200).json(createSuccessResponse(repairResult));
});

// POST /api/v1/itinerary/evaluate-detour (Phase 19)
router.post('/itinerary/evaluate-detour', (req: Request, res: Response) => {
  const { experience_id } = req.body;
  if (!experience_id) {
    return res.status(400).json(
      createErrorResponse('VALIDATION_ERROR', 'experience_id is required to evaluate detour')
    );
  }

  const sessionId = req.khojContext.sessionId || 'default-session';
  try {
    const result = detourService.evaluateDetour(sessionId, experience_id);
    return res.status(200).json(createSuccessResponse(result));
  } catch (err: any) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', err.message));
  }
});

// POST /api/v1/itinerary/:id/safety-checkin (Phase 26)
router.post('/itinerary/:id/safety-checkin', (req: Request, res: Response) => {
  const { id } = req.params;
  const sessionId = req.khojContext.sessionId || 'default-session';

  // Find itinerary by id or use session itinerary
  const itinerary = itineraryPlanner.getItineraryById(id) || itineraryPlanner.getOrCreateItinerary(sessionId);

  const shareToken = `ky-safe-${Math.random().toString(36).substring(2, 10)}`;
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  const checkin = {
    id: `checkin-${Date.now()}`,
    itinerary_id: itinerary.id,
    share_token: shareToken,
    expires_at: expiresAt,
    created_at: new Date().toISOString()
  };

  store.safetyCheckins.push(checkin);

  return res.status(200).json(
    createSuccessResponse({
      checkin_id: checkin.id,
      share_token: shareToken,
      share_url: `/share/${shareToken}`,
      expires_at: expiresAt,
      message: 'Safety check-in link created. Share this read-only view with emergency contacts.'
    })
  );
});

export default router;
