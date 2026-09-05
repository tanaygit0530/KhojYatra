import { RecommendationItem } from '@khojyatra/types';

export const OFFLINE_SEED_RECOMMENDATIONS: RecommendationItem[] = [
  {
    experience: {
      id: 'e1111111-1111-4111-8111-111111111111',
      provider_id: 'p1111111-1111-4111-8111-111111111111',
      title: 'Old Delhi Midnight Kebab & Paratha Trail',
      description: 'Walk through narrow alleyways of Chandni Chowk sampling 6 legendary family recipes made over charcoal since 1912.',
      category: 'food_culinary',
      price_min: 500,
      price_max: 850,
      duration_min: 120,
      lat: 28.6506,
      lng: 77.2303,
      accessibility_tags: ['step_free'],
      interest_tags: ['street_food', 'heritage', 'night_walk', 'local_guide'],
      rating_avg: 4.9,
      locality_score: 98,
      offering_status: 'published',
      photo_urls: [
        'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80'
      ],
      provider_name: 'Dilli Khana & Heritage Guild',
      provider_verified: true,
      provider_trust_score: 92
    },
    score: 0.98,
    reasons: [
      'High authenticity score: 98/100',
      '2.4 km away (12m transit)',
      '₹500/person (within budget)',
      'Local cooperative operated'
    ],
    score_breakdown: {
      preference_match: 1.0,
      time_fit: 0.95,
      budget_fit: 0.92,
      distance_fit: 0.95,
      availability_confidence: 0.95,
      rating_avg_normalized: 0.98,
      locality_score_factor: 0.98
    }
  },
  {
    experience: {
      id: 'e4444444-4444-4444-8444-444444444444',
      provider_id: 'p2222222-2222-4222-8222-222222222222',
      title: 'Jaipur Master Artisan Cobalt Blue Pottery',
      description: 'Hands-on molding and quartz glaze hand-painting in a 4th-generation Kot Jewar artisan workshop.',
      category: 'workshops_classes',
      price_min: 400,
      price_max: 950,
      duration_min: 90,
      lat: 26.9124,
      lng: 75.7873,
      accessibility_tags: ['step_free'],
      interest_tags: ['artisan', 'craft', 'pottery', 'hands_on'],
      rating_avg: 4.95,
      locality_score: 96,
      offering_status: 'published',
      photo_urls: [
        'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&auto=format&fit=crop&q=80'
      ],
      provider_name: 'Jaipur Craft & Clay Collective',
      provider_verified: false,
      provider_trust_score: 68
    },
    score: 0.92,
    reasons: [
      'Authentic workshop session (96 locality score)',
      'Hands-on craft preservation',
      'Fits your 120m window'
    ],
    score_breakdown: {
      preference_match: 0.9,
      time_fit: 0.9,
      budget_fit: 0.95,
      distance_fit: 0.9,
      availability_confidence: 0.95,
      rating_avg_normalized: 0.99,
      locality_score_factor: 0.96
    }
  }
];

export function getOfflineFallback(endpoint: string, _options: any = {}): any | null {
  if (endpoint.includes('recommendations/surprise')) {
    return {
      recommendations: OFFLINE_SEED_RECOMMENDATIONS,
      mode: 'surprise_me_offline',
      explanation: 'Offline Demo Mode: Serving verified local gems from seed cache.'
    };
  }

  if (endpoint.includes('recommendations/replan')) {
    return {
      recommendations: OFFLINE_SEED_RECOMMENDATIONS,
      diff: { removed: [], added: [], unchanged: [OFFLINE_SEED_RECOMMENDATIONS[0].experience.id] },
      explanation: 'Offline Demo Mode: Replan evaluated from local seed cache.'
    };
  }

  if (endpoint.includes('recommendations')) {
    return {
      recommendations: OFFLINE_SEED_RECOMMENDATIONS,
      session_id: 'offline-demo-session',
      offline_mode: true
    };
  }

  return null;
}
