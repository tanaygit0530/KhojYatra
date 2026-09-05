import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { groupService } from '../services/groupService.js';
import {
  createSuccessResponse,
  createErrorResponse,
  ConstraintIntakeSchema
} from '@khojyatra/types';

const router = Router();

const CreateGroupSchema = z.object({
  name: z.string().min(2).default('My Group Trip')
});

const JoinGroupSchema = z.object({
  code: z.string().min(4),
  name: z.string().min(1).default('Traveler')
});

const VoteSchema = z.object({
  experience_id: z.string(),
  vote: z.union([z.literal(1), z.literal(-1)])
});

// POST /api/v1/group-sessions
router.post('/group-sessions', (req: Request, res: Response) => {
  const sessionId = req.khojContext.sessionId || 'default-session';
  const { name } = CreateGroupSchema.parse(req.body || {});
  const session = groupService.createSession(sessionId, name);
  return res.status(201).json(createSuccessResponse(session));
});

// GET /api/v1/group-sessions/:id
router.get('/group-sessions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const session = groupService.getSession(id);
  if (!session) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Group session ${id} not found`));
  }
  return res.status(200).json(createSuccessResponse(session));
});

// POST /api/v1/group-sessions/join
router.post('/group-sessions/join', (req: Request, res: Response) => {
  const sessionId = req.khojContext.sessionId || 'default-session';
  const parseResult = JoinGroupSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json(
      createErrorResponse('VALIDATION_ERROR', 'Invalid join group input', parseResult.error.format())
    );
  }

  try {
    const session = groupService.joinSession(parseResult.data.code, sessionId, parseResult.data.name);
    return res.status(200).json(createSuccessResponse(session));
  } catch (err: any) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', err.message));
  }
});

// POST /api/v1/group-sessions/:id/join
router.post('/group-sessions/:id/join', (req: Request, res: Response) => {
  const { id } = req.params;
  const sessionId = req.khojContext.sessionId || 'default-session';
  const name = req.body?.name || 'Traveler';

  try {
    const session = groupService.joinSession(id, sessionId, name);
    return res.status(200).json(createSuccessResponse(session));
  } catch (err: any) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', err.message));
  }
});

// POST /api/v1/group-sessions/:id/intake
router.post('/group-sessions/:id/intake', (req: Request, res: Response) => {
  const { id } = req.params;
  const sessionId = req.khojContext.sessionId || 'default-session';

  const parseResult = ConstraintIntakeSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json(
      createErrorResponse('VALIDATION_ERROR', 'Invalid intake format', parseResult.error.format())
    );
  }

  try {
    const session = groupService.submitMemberIntake(id, sessionId, parseResult.data);
    return res.status(200).json(createSuccessResponse(session));
  } catch (err: any) {
    return res.status(400).json(createErrorResponse('INTERNAL', err.message));
  }
});

// POST /api/v1/group-sessions/:id/vote
router.post('/group-sessions/:id/vote', (req: Request, res: Response) => {
  const { id } = req.params;
  const sessionId = req.khojContext.sessionId || 'default-session';

  const parseResult = VoteSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json(
      createErrorResponse('VALIDATION_ERROR', 'Invalid vote format', parseResult.error.format())
    );
  }

  try {
    const session = groupService.castVote(
      id,
      sessionId,
      parseResult.data.experience_id,
      parseResult.data.vote
    );
    return res.status(200).json(createSuccessResponse(session));
  } catch (err: any) {
    return res.status(400).json(createErrorResponse('INTERNAL', err.message));
  }
});

// GET /api/v1/group-sessions/:id/consensus
router.get('/group-sessions/:id/consensus', (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const consensus = groupService.getConsensus(id);
    return res.status(200).json(createSuccessResponse({
      group_id: id,
      consensus_recommendations: consensus,
      count: consensus.length
    }));
  } catch (err: any) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', err.message));
  }
});

export default router;
