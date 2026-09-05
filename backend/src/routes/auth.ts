import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { store } from '../data/store.js';
import { getSupabaseClient, isSupabaseConfigured } from '../db/supabaseClient.js';
import { createSuccessResponse, createErrorResponse, UserRoleSchema, ExperienceCategorySchema } from '@khojyatra/types';

const router = Router();

const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: UserRoleSchema,
  name: z.string().optional()
});

const ProviderOnboardSchema = z.object({
  business_name: z.string().min(2),
  categories: z.array(ExperienceCategorySchema).min(1),
  user_id: z.string().optional()
});

// POST /api/v1/auth/signup
router.post('/auth/signup', async (req: Request, res: Response) => {
  const parseResult = SignUpSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid sign-up fields', parseResult.error.format()));
  }

  const { email, password, role, name } = parseResult.data;
  const sessionId = req.khojContext.sessionId;

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient()!;
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, name }
      }
    });

    if (authErr || !authData.user) {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', authErr?.message || 'Sign up failed'));
    }

    const userId = authData.user.id;

    // Create public users row
    await supabase.from('users').upsert({ id: userId, email, role, name });

    // Link anonymous session if present
    if (sessionId) {
      await supabase.from('sessions').update({ user_id: userId }).eq('id', sessionId);
    }

    return res.status(200).json(createSuccessResponse({
      user: { id: userId, email, role, name },
      sessionLinked: Boolean(sessionId)
    }));
  }

  // In-memory fallback
  const mockUserId = `user-${Date.now()}`;
  if (sessionId) {
    const sess = store.sessions.get(sessionId);
    if (sess) {
      sess.user_id = mockUserId;
    } else {
      store.sessions.set(sessionId, { id: sessionId, user_id: mockUserId, constraint_json: {} });
    }
  }

  return res.status(200).json(createSuccessResponse({
    user: { id: mockUserId, email, role, name: name || 'Demo Traveler' },
    sessionLinked: Boolean(sessionId)
  }));
});

// POST /api/v1/auth/link-session
router.post('/auth/link-session', (req: Request, res: Response) => {
  const { session_id, user_id } = req.body;
  if (!session_id || !user_id) {
    return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'session_id and user_id required'));
  }

  const sess = store.sessions.get(session_id);
  if (sess) {
    sess.user_id = user_id;
  } else {
    store.sessions.set(session_id, { id: session_id, user_id, constraint_json: {} });
  }

  return res.status(200).json(createSuccessResponse({ linked: true, session_id, user_id }));
});

// POST /api/v1/providers/onboard
router.post('/providers/onboard', async (req: Request, res: Response) => {
  const parseResult = ProviderOnboardSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid onboarding data', parseResult.error.format()));
  }

  const { business_name, categories } = parseResult.data;
  const newProviderId = `prov-${Date.now()}`;

  const providerRecord = {
    id: newProviderId,
    name: business_name,
    verification_status: 'pending' as const,
    locally_operated: true,
    community_vouch_count: 1,
    trust_score: 40
  };

  store.addProvider(providerRecord);

  return res.status(200).json(createSuccessResponse({
    provider: providerRecord,
    categories,
    note: 'Created with verification_status: pending'
  }));
});

export default router;
