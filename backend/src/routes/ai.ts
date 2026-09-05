import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { aiIntakeService } from '../services/aiIntakeService.js';
import { createSuccessResponse, createErrorResponse } from '@khojyatra/types';
import { intakeRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const ParseIntakeSchema = z.object({
  text: z.string().min(3)
});

// POST /api/v1/ai/parse-intake (Phase 20)
router.post('/ai/parse-intake', intakeRateLimiter, async (req: Request, res: Response) => {
  const parseResult = ParseIntakeSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json(
      createErrorResponse('VALIDATION_ERROR', 'text query is required', parseResult.error.format())
    );
  }

  try {
    const result = await aiIntakeService.parseIntake(parseResult.data.text);
    return res.status(200).json(createSuccessResponse(result));
  } catch (err: any) {
    return res.status(500).json(createErrorResponse('INTERNAL', err.message));
  }
});

export default router;
