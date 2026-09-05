import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { store } from '../data/store.js';
import { calculateLocalityScore, calculateTrustScore } from '../services/scoreService.js';
import { demandService } from '../services/demandService.js';
import { getSupabaseClient, isSupabaseConfigured } from '../db/supabaseClient.js';
import {
  createSuccessResponse,
  createErrorResponse,
  ExperienceCategorySchema,
  OfferingStatusSchema,
  Experience
} from '@khojyatra/types';

const router = Router();

const CreateOfferingSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: ExperienceCategorySchema,
  price_min: z.number().min(0),
  price_max: z.number().min(0),
  duration_min: z.number().int().min(15),
  lat: z.number().default(28.6506),
  lng: z.number().default(77.2303),
  accessibility_tags: z.array(z.string()).default([]),
  interest_tags: z.array(z.string()).default([]),
  photo_urls: z.array(z.string()).default([]),
  offering_status: OfferingStatusSchema.default('published')
});

const AddSlotSchema = z.object({
  start_time: z.string().datetime().or(z.string()),
  end_time: z.string().datetime().or(z.string()),
  capacity_remaining: z.number().int().min(0).default(10)
});

// GET /api/v1/providers/me
router.get('/providers/me', (_req: Request, res: Response) => {
  // Use first provider as active session provider (Jaipur Artisan Collective - pending, or Dilli Khana - verified)
  const provider = store.providers[1] || store.providers[0];
  return res.status(200).json(createSuccessResponse(provider));
});

// GET /api/v1/providers/offerings
router.get('/providers/offerings', (_req: Request, res: Response) => {
  const provider = store.providers[1] || store.providers[0];
  const offerings = store.experiences.filter(e => e.provider_id === provider.id);
  return res.status(200).json(createSuccessResponse(offerings, { total: offerings.length }));
});

// POST /api/v1/experiences (New Offering)
router.post('/experiences', async (req: Request, res: Response) => {
  const parseResult = CreateOfferingSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json(
      createErrorResponse('VALIDATION_ERROR', 'Invalid offering input fields', parseResult.error.format())
    );
  }

  const provider = store.providers[1] || store.providers[0];
  const data = parseResult.data;

  const interestTags = data.interest_tags.length > 0 ? data.interest_tags : ['artisan', 'host_verified'];
  const localityBreakdown = calculateLocalityScore({
    category: data.category,
    locally_operated: provider.locally_operated,
    interest_tags: interestTags
  }, provider);

  const newExperience: Experience = {
    id: `e-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    provider_id: provider.id,
    title: data.title,
    description: data.description,
    category: data.category,
    price_min: data.price_min,
    price_max: data.price_max,
    duration_min: data.duration_min,
    lat: data.lat,
    lng: data.lng,
    accessibility_tags: data.accessibility_tags,
    interest_tags: interestTags,
    rating_avg: 5.0,
    locality_score: localityBreakdown.total_score,
    offering_status: data.offering_status,
    photo_urls: data.photo_urls.length > 0 ? data.photo_urls : [
      'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&auto=format&fit=crop&q=80'
    ],
    provider_name: provider.name,
    provider_verified: provider.verification_status === 'verified',
    provider_trust_score: provider.trust_score
  };

  // Add to in-memory store
  store.addExperience(newExperience);

  // Add initial availability slot
  const now = new Date();
  const slotStart = new Date(now.getTime() + 24 * 3600 * 1000);
  slotStart.setHours(11, 0, 0, 0);
  const slotEnd = new Date(slotStart.getTime() + newExperience.duration_min * 60 * 1000);

  store.availabilitySlots.push({
    id: `slot-new-${newExperience.id}`,
    experience_id: newExperience.id,
    start_time: slotStart.toISOString(),
    end_time: slotEnd.toISOString(),
    capacity_remaining: 8
  });

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient()!;
      await supabase.from('experiences').insert(newExperience);
    } catch (err) {
      console.warn('Supabase remote insert error:', err);
    }
  }

  return res.status(201).json(createSuccessResponse(newExperience));
});

// PATCH /api/v1/experiences/:id/status
router.patch('/experiences/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { offering_status } = req.body;

  const exp = store.getExperienceById(id);
  if (!exp) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Experience ${id} not found`));
  }

  if (!['draft', 'published', 'paused'].includes(offering_status)) {
    return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid offering status'));
  }

  exp.offering_status = offering_status;
  return res.status(200).json(createSuccessResponse(exp));
});

// POST /api/v1/experiences/:id/availability
router.post('/experiences/:id/availability', (req: Request, res: Response) => {
  const { id } = req.params;
  const parseResult = AddSlotSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json(
      createErrorResponse('VALIDATION_ERROR', 'Invalid slot parameters', parseResult.error.format())
    );
  }

  const exp = store.getExperienceById(id);
  if (!exp) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Experience ${id} not found`));
  }

  const newSlot = {
    id: `slot-${Date.now()}`,
    experience_id: id,
    start_time: parseResult.data.start_time,
    end_time: parseResult.data.end_time,
    capacity_remaining: parseResult.data.capacity_remaining
  };

  store.availabilitySlots.push(newSlot);
  return res.status(201).json(createSuccessResponse(newSlot));
});

// GET /api/v1/providers/insights
router.get('/providers/insights', (_req: Request, res: Response) => {
  const provider = store.providers[1] || store.providers[0];
  const offerings = store.experiences.filter(e => e.provider_id === provider.id);

  const insights = offerings.map((exp, idx) => ({
    experience_id: exp.id,
    title: exp.title,
    view_count: 140 + idx * 85,
    recommendation_matches: 48 + idx * 22,
    booking_conversion_pct: 18.5,
    locality_score: exp.locality_score,
    status: exp.offering_status
  }));

  return res.status(200).json(createSuccessResponse({
    provider_name: provider.name,
    trust_score: provider.trust_score,
    verification_status: provider.verification_status,
    total_views: insights.reduce((s, i) => s + i.view_count, 0),
    total_recommendations: insights.reduce((s, i) => s + i.recommendation_matches, 0),
    breakdown: insights
  }));
});

// GET /api/v1/providers/:id/trust-breakdown (Phase 16)
router.get('/providers/:id/trust-breakdown', (req: Request, res: Response) => {
  const { id } = req.params;
  const provider = store.providers.find(p => p.id === id);
  if (!provider) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Provider ${id} not found`));
  }

  const breakdown = calculateTrustScore(provider);
  return res.status(200).json(createSuccessResponse(breakdown));
});

// GET /api/v1/providers/:id/demand-insights (Phase 22)
router.get('/providers/:id/demand-insights', (req: Request, res: Response) => {
  const { id } = req.params;
  const insights = demandService.getDemandInsights(id);
  return res.status(200).json(createSuccessResponse({
    provider_id: id,
    insights,
    total_insights: insights.length
  }));
});

export default router;
