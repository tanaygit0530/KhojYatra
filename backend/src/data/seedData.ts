import { Experience, ExperienceCategory } from '@khojyatra/types';

export interface SeedProvider {
  id: string;
  name: string;
  verification_status: 'pending' | 'verified';
  locally_operated: boolean;
  community_vouch_count: number;
  trust_score: number;
}

export interface SeedAvailabilitySlot {
  id: string;
  experience_id: string;
  start_time: string;
  end_time: string;
  capacity_remaining: number;
}

export interface SeedReview {
  id: string;
  experience_id: string;
  rating: number;
  text: string;
  user_name: string;
}

export interface SeedCommunityItinerary {
  id: string;
  title: string;
  destination: string;
  duration_days: number;
  budget: number;
  group_type: string;
  interests: ExperienceCategory[];
  travel_style: string;
  visibility: 'public' | 'anonymous' | 'private';
  items: {
    experience_id: string;
    day_number: number;
    position: number;
    notes: string;
  }[];
}

// 1. Providers
export const seedProviders: SeedProvider[] = [
  {
    id: 'p1111111-1111-4111-8111-111111111111',
    name: 'Dilli Khana & Heritage Guild',
    verification_status: 'verified',
    locally_operated: true,
    community_vouch_count: 24,
    trust_score: 92
  },
  {
    id: 'p2222222-2222-4222-8222-222222222222',
    name: 'Jaipur Craft & Clay Collective',
    verification_status: 'pending',
    locally_operated: true,
    community_vouch_count: 7,
    trust_score: 68
  },
  {
    id: 'p3333333-3333-4333-8333-333333333333',
    name: 'Ganga Living Culture Guild',
    verification_status: 'verified',
    locally_operated: true,
    community_vouch_count: 31,
    trust_score: 96
  }
];

// 2. Experiences across all 8 categories
export const seedExperiences: Experience[] = [
  {
    id: 'e1111111-1111-4111-8111-111111111111',
    provider_id: seedProviders[0].id,
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
      'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80'
    ],
    provider_name: seedProviders[0].name,
    provider_verified: true,
    provider_trust_score: seedProviders[0].trust_score
  },
  {
    id: 'e2222222-2222-4222-8222-222222222222',
    provider_id: seedProviders[2].id,
    title: 'Varanasi Subah-e-Banaras Boat & Vedic Chants',
    description: 'Witness sunrise boat rituals along Dashashwamedh Ghat with Vedic flute acoustics and sacred morning ceremonies.',
    category: 'cultural_heritage',
    price_min: 700,
    price_max: 1200,
    duration_min: 150,
    lat: 25.3076,
    lng: 83.0107,
    accessibility_tags: ['visual_aid'],
    interest_tags: ['spirituality', 'boat_ride', 'sunrise', 'ancient_history'],
    rating_avg: 4.95,
    locality_score: 99,
    offering_status: 'published',
    photo_urls: [
      'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=600&auto=format&fit=crop&q=80'
    ],
    provider_name: seedProviders[2].name,
    provider_verified: true,
    provider_trust_score: seedProviders[2].trust_score
  },
  {
    id: 'e3333333-3333-4333-8333-333333333333',
    provider_id: seedProviders[1].id,
    title: 'Pushkar Desert Folk Fire & Music Gathering',
    description: 'Campfire acoustic storytelling and Kalbelia folk performance under star-filled dunes with traditional chai.',
    category: 'festivals_events',
    price_min: 900,
    price_max: 1600,
    duration_min: 180,
    lat: 26.4883,
    lng: 74.5511,
    accessibility_tags: ['wheelchair_accessible'],
    interest_tags: ['folk_music', 'campfire', 'desert', 'performance'],
    rating_avg: 4.8,
    locality_score: 91,
    offering_status: 'published',
    photo_urls: [
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80'
    ],
    provider_name: seedProviders[1].name,
    provider_verified: false,
    provider_trust_score: seedProviders[1].trust_score
  },
  {
    id: 'e4444444-4444-4444-8444-444444444444',
    provider_id: seedProviders[1].id,
    title: 'Jaipur Master Artisan Cobalt Blue Pottery',
    description: 'Hands-on potter wheel training shaping natural quartz clay, with traditional cobalt oxide motifs firing techniques.',
    category: 'workshops_classes',
    price_min: 1100,
    price_max: 1800,
    duration_min: 120,
    lat: 26.9124,
    lng: 75.7873,
    accessibility_tags: ['step_free'],
    interest_tags: ['pottery', 'crafts', 'hands_on', 'art'],
    rating_avg: 4.85,
    locality_score: 95,
    offering_status: 'published',
    photo_urls: [
      'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&auto=format&fit=crop&q=80'
    ],
    provider_name: seedProviders[1].name,
    provider_verified: false,
    provider_trust_score: seedProviders[1].trust_score
  },
  {
    id: 'e5555555-5555-4555-8555-555555555555',
    provider_id: seedProviders[2].id,
    title: 'Rishikesh Secret Pine Valley & Sacred Cave Trek',
    description: 'Trek upstream along a hidden tributary to the sage Vashistha cave through untouched deodar forests.',
    category: 'adventure_outdoor',
    price_min: 800,
    price_max: 1400,
    duration_min: 240,
    lat: 30.0869,
    lng: 78.2676,
    accessibility_tags: [],
    interest_tags: ['trekking', 'nature', 'himalayas', 'cave'],
    rating_avg: 4.75,
    locality_score: 89,
    offering_status: 'published',
    photo_urls: [
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80'
    ],
    provider_name: seedProviders[2].name,
    provider_verified: true,
    provider_trust_score: seedProviders[2].trust_score
  },
  {
    id: 'e6666666-6666-4666-8666-666666666666',
    provider_id: seedProviders[0].id,
    title: 'Agrasen ki Baori Secret Acoustic Echo Chamber',
    description: 'Explore subterranean medieval water architecture and historical acoustic chambers with an architectural archivist.',
    category: 'hidden_gems',
    price_min: 400,
    price_max: 700,
    duration_min: 75,
    lat: 28.6258,
    lng: 77.2250,
    accessibility_tags: ['step_free'],
    interest_tags: ['architecture', 'stepwell', 'hidden_spot', 'history'],
    rating_avg: 4.7,
    locality_score: 96,
    offering_status: 'published',
    photo_urls: [
      'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600&auto=format&fit=crop&q=80'
    ],
    provider_name: seedProviders[0].name,
    provider_verified: true,
    provider_trust_score: seedProviders[0].trust_score
  },
  {
    id: 'e7777777-7777-4777-8777-777777777777',
    provider_id: seedProviders[0].id,
    title: 'Chor Bazaar Vintage Brass & Antique Vinyl Safari',
    description: 'Navigate collector corners discovering 1950s Bollywood press gramophone records, antique clocks, and brass lanterns.',
    category: 'shopping_markets',
    price_min: 350,
    price_max: 600,
    duration_min: 90,
    lat: 28.6473,
    lng: 77.2384,
    accessibility_tags: [],
    interest_tags: ['antiques', 'vinyl', 'markets', 'thrifting'],
    rating_avg: 4.65,
    locality_score: 93,
    offering_status: 'published',
    photo_urls: [
      'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&auto=format&fit=crop&q=80'
    ],
    provider_name: seedProviders[0].name,
    provider_verified: true,
    provider_trust_score: seedProviders[0].trust_score
  },
  {
    id: 'e8888888-8888-4888-8888-888888888888',
    provider_id: seedProviders[0].id,
    title: 'Hauz Khas Heritage Indie Sitar & Spoken Word Baithak',
    description: 'An intimate rooftop session blending classical sitar alaap with contemporary Hindustani spoken-word poetry.',
    category: 'nightlife_entertainment',
    price_min: 650,
    price_max: 1100,
    duration_min: 120,
    lat: 28.5494,
    lng: 77.2001,
    accessibility_tags: ['wheelchair_accessible'],
    interest_tags: ['live_music', 'sitar', 'poetry', 'rooftop'],
    rating_avg: 4.88,
    locality_score: 90,
    offering_status: 'published',
    photo_urls: [
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
    ],
    provider_name: seedProviders[0].name,
    provider_verified: true,
    provider_trust_score: seedProviders[0].trust_score
  }
];

// 3. Availability Slots (14 days, including capacity=0 test case)
export function generateSeedSlots(): SeedAvailabilitySlot[] {
  const slots: SeedAvailabilitySlot[] = [];
  const now = new Date();

  seedExperiences.forEach((exp, expIdx) => {
    for (let day = 0; day < 14; day++) {
      const slotDate = new Date(now);
      slotDate.setDate(now.getDate() + day);

      // Morning slot
      const morningStart = new Date(slotDate);
      morningStart.setHours(9, 0, 0, 0);
      const morningEnd = new Date(morningStart);
      morningEnd.setMinutes(morningStart.getMinutes() + exp.duration_min);

      // Afternoon / Evening slot
      const eveStart = new Date(slotDate);
      eveStart.setHours(17, 30, 0, 0);
      const eveEnd = new Date(eveStart);
      eveEnd.setMinutes(eveStart.getMinutes() + exp.duration_min);

      // Intentionally set capacity = 0 for 1st experience tomorrow morning to test hard constraint rejection!
      const isCapacityDepleted = expIdx === 0 && day === 1;

      slots.push({
        id: `slot-${expIdx}-${day}-1`,
        experience_id: exp.id,
        start_time: morningStart.toISOString(),
        end_time: morningEnd.toISOString(),
        capacity_remaining: isCapacityDepleted ? 0 : 8
      });

      slots.push({
        id: `slot-${expIdx}-${day}-2`,
        experience_id: exp.id,
        start_time: eveStart.toISOString(),
        end_time: eveEnd.toISOString(),
        capacity_remaining: 12
      });
    }
  });

  return slots;
}

// 4. Sample Community Itineraries (Phase 21 Traveler Intelligence)
export const seedCommunityItineraries: SeedCommunityItinerary[] = [
  {
    id: 'c1111111-1111-4111-8111-111111111111',
    title: 'Delhi Heritage Culinary Odyssey',
    destination: 'Delhi',
    duration_days: 1,
    budget: 2000,
    group_type: 'couple',
    interests: ['food_culinary', 'hidden_gems', 'nightlife_entertainment'],
    travel_style: 'slow_culture',
    visibility: 'public',
    items: [
      { experience_id: seedExperiences[5].id, day_number: 1, position: 1, notes: 'Morning stepwell acoustics' },
      { experience_id: seedExperiences[6].id, day_number: 1, position: 2, notes: 'Afternoon antique hunt' },
      { experience_id: seedExperiences[0].id, day_number: 1, position: 3, notes: 'Late evening feast' }
    ]
  },
  {
    id: 'c2222222-2222-4222-8222-222222222222',
    title: 'Rajasthan Artisan Deep-Dive',
    destination: 'Jaipur',
    duration_days: 2,
    budget: 3500,
    group_type: 'solo',
    interests: ['workshops_classes', 'festivals_events', 'cultural_heritage'],
    travel_style: 'hands_on_craft',
    visibility: 'public',
    items: [
      { experience_id: seedExperiences[3].id, day_number: 1, position: 1, notes: 'Intensive pottery workshop' },
      { experience_id: seedExperiences[2].id, day_number: 1, position: 2, notes: 'Night desert folk music' }
    ]
  },
  {
    id: 'c3333333-3333-4333-8333-333333333333',
    title: 'Sacred Ganga & Himalayan Trails',
    destination: 'Rishikesh & Varanasi',
    duration_days: 2,
    budget: 2800,
    group_type: 'friends',
    interests: ['adventure_outdoor', 'cultural_heritage'],
    travel_style: 'active_spiritual',
    visibility: 'public',
    items: [
      { experience_id: seedExperiences[1].id, day_number: 1, position: 1, notes: 'Sunrise Vedic chanting' },
      { experience_id: seedExperiences[4].id, day_number: 2, position: 1, notes: 'Himalayan cave trek' }
    ]
  }
];

// 5. Sample Reviews
export const seedReviews: SeedReview[] = [
  {
    id: 'r1',
    experience_id: seedExperiences[0].id,
    rating: 5,
    text: 'Unbelievable flavors. The nihari and parathas in Old Delhi were genuinely the best food I have ever tasted in my life.',
    user_name: 'Aarav M.'
  },
  {
    id: 'r2',
    experience_id: seedExperiences[1].id,
    rating: 5,
    text: 'Watching the dawn break over Dashashwamedh Ghat with the flute melodies gave me chills. Essential experience.',
    user_name: 'Priya K.'
  },
  {
    id: 'r3',
    experience_id: seedExperiences[3].id,
    rating: 5,
    text: 'The master potter gave us personalized instruction. Taking home a cobalt bowl I threw myself was unforgettable.',
    user_name: 'Rohan D.'
  }
];
