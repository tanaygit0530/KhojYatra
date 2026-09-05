import { Router, Request, Response } from 'express';
import {
  ConstraintIntakeSchema,
  ReplanRequestSchema,
  createSuccessResponse,
  createErrorResponse
} from '@khojyatra/types';
import { decisionEngine } from '../services/decisionEngine.js';
import { store } from '../data/store.js';
import { searchRateLimiter, bookingRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Store last active session intake in memory for fast replan lookups
const sessionIntakes = new Map<string, any>();

import { itineraryPlanner } from '../services/itineraryPlanner.js';
import { demandService } from '../services/demandService.js';

// POST /api/v1/recommendations
router.post('/recommendations', searchRateLimiter, (req: Request, res: Response) => {
  const parseResult = ConstraintIntakeSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json(
      createErrorResponse('VALIDATION_ERROR', 'Invalid constraint intake schema', parseResult.error.format())
    );
  }

  const intake = parseResult.data;
  const sessionId = req.khojContext.sessionId || 'default-session';

  // Cache intake for replan
  sessionIntakes.set(sessionId, intake);

  // Phase 17: If active session itinerary has committed items, cap search to remaining budget
  const budgetStatus = itineraryPlanner.getBudgetStatus(sessionId);
  const options = budgetStatus.total_committed > 0
    ? { remainingBudget: budgetStatus.remaining_budget }
    : undefined;

  const { recommendations, relaxedConstraints } = decisionEngine.evaluate(intake, options);

  // Phase 22: Log traveler search to search_logs for demand heatmap aggregation
  demandService.logSearch(intake.location_context.lat, intake.location_context.lng, intake);

  // Log recommendation events (Phase 8 spec: one row per returned experience)
  recommendations.forEach(rec => {
    // In demo mode or remote supabase, log recommendation event
  });

  return res.status(200).json(
    createSuccessResponse({
      recommendations,
      session_id: sessionId,
      relaxed_constraints: relaxedConstraints,
      remaining_budget: budgetStatus.total_committed > 0 ? budgetStatus.remaining_budget : undefined
    })
  );
});

// POST /api/v1/recommendations/replan
router.post('/recommendations/replan', bookingRateLimiter, (req: Request, res: Response) => {
  const parseResult = ReplanRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json(
      createErrorResponse('VALIDATION_ERROR', 'Invalid replan payload', parseResult.error.format())
    );
  }

  const { session_id, change, current_experience_ids } = parseResult.data;

  // Retrieve previous intake or construct default
  const baseIntake = sessionIntakes.get(session_id) || {
    location_context: { mode: 'current', lat: 28.6506, lng: 77.2303, effective_time: new Date().toISOString() },
    duration_minutes: 120,
    budget: { min: 200, max: 1500 },
    group: { size: 2, type: 'couple' },
    interests: ['food_culinary', 'cultural_heritage'],
    accessibility_tags: []
  };

  const { recommendations, diff, explanation } = decisionEngine.replan(
    baseIntake,
    change,
    current_experience_ids
  );

  return res.status(200).json(
    createSuccessResponse({
      recommendations,
      diff,
      explanation
    })
  );
});

// GET /api/v1/recommendations/surprise
router.get('/recommendations/surprise', (req: Request, res: Response) => {
  const lat = req.query.lat ? parseFloat(req.query.lat as string) : 28.6506;
  const lng = req.query.lng ? parseFloat(req.query.lng as string) : 77.2303;
  const durationMinutes = req.query.duration_minutes ? parseInt(req.query.duration_minutes as string) : 120;

  const surpriseRecommendations = decisionEngine.evaluateSurprise(lat, lng, durationMinutes);

  return res.status(200).json(
    createSuccessResponse({
      recommendations: surpriseRecommendations,
      mode: 'surprise_me',
      explanation: 'Re-weighted for maximum locality authenticity and hidden local discoveries.'
    })
  );
});

export default router;
