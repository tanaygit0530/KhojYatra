import { Router, Request, Response } from 'express';
import { store } from '../data/store.js';
import { calculateLocalityScore } from '../services/scoreService.js';
import { getSupabaseClient, isSupabaseConfigured } from '../db/supabaseClient.js';
import { createSuccessResponse, createErrorResponse } from '@khojyatra/types';

const router = Router();

// GET /api/v1/experiences
router.get('/experiences', async (req: Request, res: Response) => {
  const { category, featured, search } = req.query;

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient()!;
    let query = supabase.from('experiences').select('*, providers(*)').eq('offering_status', 'published');

    if (category) {
      query = query.eq('category', category as string);
    }
    if (featured === 'true') {
      query = query.order('locality_score', { ascending: false }).limit(4);
    }
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json(createErrorResponse('INTERNAL', error.message));
    }
    return res.status(200).json(createSuccessResponse(data, { total: data.length }));
  }

  // In-memory fallback
  const items = store.getExperiences({
    category: category as string,
    featured: featured === 'true',
    search: search as string
  });

  return res.status(200).json(createSuccessResponse(items, { total: items.length }));
});

// GET /api/v1/experiences/:id
router.get('/experiences/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from('experiences')
      .select('*, providers(*), availability_slots(*)')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json(createErrorResponse('NOT_FOUND', `Experience ${id} not found`));
    }
    return res.status(200).json(createSuccessResponse(data));
  }

  // In-memory fallback
  const exp = store.getExperienceById(id);
  if (!exp) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Experience ${id} not found`));
  }

  const slots = store.getSlotsForExperience(id);
  return res.status(200).json(createSuccessResponse({ ...exp, availability_slots: slots }));
});

// GET /api/v1/experiences/:id/locality-breakdown (Phase 16)
router.get('/experiences/:id/locality-breakdown', (req: Request, res: Response) => {
  const { id } = req.params;
  const exp = store.getExperienceById(id);
  if (!exp) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Experience ${id} not found`));
  }

  const provider = store.providers.find(p => p.id === exp.provider_id);
  const breakdown = calculateLocalityScore({
    category: exp.category,
    interest_tags: exp.interest_tags,
    provider_id: exp.provider_id || undefined
  }, provider);

  return res.status(200).json(createSuccessResponse(breakdown));
});

export default router;
