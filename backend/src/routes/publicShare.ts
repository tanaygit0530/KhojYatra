import { Router, Request, Response } from 'express';
import { store } from '../data/store.js';
import { itineraryPlanner } from '../services/itineraryPlanner.js';
import { createSuccessResponse, createErrorResponse } from '@khojyatra/types';

const router = Router();

// GET /api/v1/share/:token
// Public unauthenticated live view of traveler itinerary
router.get('/share/:token', (req: Request, res: Response) => {
  const { token } = req.params;

  const checkin = store.safetyCheckins.find(c => c.share_token === token);
  if (!checkin) {
    return res.status(404).json(
      createErrorResponse('NOT_FOUND', 'Safety check-in link not found or invalid.')
    );
  }

  // Check expiration (24h default)
  if (new Date() > new Date(checkin.expires_at)) {
    return res.status(410).json(
      createErrorResponse('VALIDATION_ERROR', 'This safety check-in link has expired.')
    );
  }

  // Query live by itinerary_id (auto-reflects Phase 12 replanning & friction adaptations)
  const itinerary = itineraryPlanner.getItineraryById(checkin.itinerary_id);

  const enrichedItems = (itinerary?.items || []).map(item => {
    const exp = store.getExperienceById(item.experience_id);
    const provider = exp ? store.providers.find(p => p.id === exp.provider_id) : undefined;
    return {
      ...item,
      experience_title: exp?.title || 'Heritage Experience',
      category: exp?.category || 'cultural_heritage',
      lat: exp?.lat,
      lng: exp?.lng,
      photo_url: exp?.photo_urls[0],
      provider_name: provider?.name || 'Verified Host',
      provider_contact: '+91 98765 43210'
    };
  });

  return res.status(200).json(
    createSuccessResponse({
      itinerary_id: checkin.itinerary_id,
      date: itinerary?.date || new Date().toISOString().slice(0, 10),
      items: enrichedItems,
      total_items: enrichedItems.length,
      expires_at: checkin.expires_at,
      last_updated: new Date().toISOString(),
      safety_helplines: [
        { name: 'National Emergency Support', number: '112' },
        { name: 'Tourist Infoline (24x7 Multi-lingual)', number: '1363' },
        { name: 'Women Safety Helpline', number: '1091' }
      ]
    })
  );
});

export default router;
