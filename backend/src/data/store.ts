import {
  seedProviders,
  seedExperiences,
  generateSeedSlots,
  seedCommunityItineraries,
  seedReviews,
  SeedProvider,
  SeedAvailabilitySlot,
  SeedCommunityItinerary,
  SeedReview
} from './seedData.js';
import { Experience, SocialStagingItem, SafetyCheckin, Booking } from '@khojyatra/types';

class DataStore {
  public providers: SeedProvider[] = [...seedProviders];
  public experiences: Experience[] = [...seedExperiences];
  public availabilitySlots: SeedAvailabilitySlot[] = generateSeedSlots();
  public communityItineraries: SeedCommunityItinerary[] = [...seedCommunityItineraries];
  public reviews: SeedReview[] = [...seedReviews];
  public sessions: Map<string, { id: string; user_id?: string | null; constraint_json: any }> = new Map();

  // Phase 24: Social Ingestion Staging
  public socialStaging: SocialStagingItem[] = [
    {
      id: 'social-1',
      source_handle: '@delhi_secret_heritage',
      source_url: 'https://instagram.com/p/sample123',
      raw_caption: 'Found this hidden 14th century stepwell in Mehrauli forest behind the dargah. Uncle sits with homemade masala chai at 5 PM every Saturday. Incredible acoustic echoes! 📍 Mehrauli Archaeological Park, Delhi',
      extracted_title: 'Mehrauli Forest Stepwell & Sufi Chai Baithak',
      extracted_description: 'An off-trail evening walk exploring an undisturbed 14th-century stepwell hidden in Mehrauli forest with acoustic echo demonstrations and artisanal spiced tea.',
      lat: 28.5204,
      lng: 77.1855,
      category: 'hidden_gems',
      price_estimate: 350,
      trust_label: 'social_signal_unverified',
      status: 'pending',
      created_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString()
    },
    {
      id: 'social-2',
      source_handle: '@jaipur_artisan_walks',
      source_url: 'https://instagram.com/p/sample456',
      raw_caption: 'Traditional hand-block stamp carver working out of his 120-year-old haveli workshop in Johari Bazaar. Free demonstrations, custom block carving on request! #jaipur #crafts',
      extracted_title: 'Johari Bazaar Heritage Sheesham Block Carving Atelier',
      extracted_description: 'Observe a 4th-generation woodblock carver shaping Sheesham teak blocks for Sanganeri textiles in a historic haveli workshop.',
      lat: 26.9196,
      lng: 75.8272,
      category: 'workshops_classes',
      price_estimate: 500,
      trust_label: 'social_signal_unverified',
      status: 'pending',
      created_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString()
    }
  ];

  // Phase 26: Safety Checkins
  public safetyCheckins: SafetyCheckin[] = [];

  // Phase 27: Bookings
  public bookings: Booking[] = [];

  // Phase 28: Experience Reports (Malicious/Inaccurate Listings)
  public reports: {
    id: string;
    experience_id: string;
    reporter_session_id: string;
    reason: 'fraud' | 'inaccurate' | 'safety' | 'other';
    details: string;
    status: 'pending' | 'resolved' | 'dismissed';
    created_at: string;
  }[] = [
    {
      id: 'rep-seed-1',
      experience_id: 'e1111111-1111-4111-8111-111111111111',
      reporter_session_id: 'sample-user-session',
      reason: 'inaccurate',
      details: 'Meeting location moved 200m down the road past the gate.',
      status: 'pending',
      created_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString()
    }
  ];

  public getExperiences(options?: { category?: string; featured?: boolean; search?: string }): Experience[] {
    let list = this.experiences.filter(e => e.offering_status === 'published');
    if (options?.category) {
      list = list.filter(e => e.category === options.category);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter(e => 
        e.title.toLowerCase().includes(q) || 
        (e.description && e.description.toLowerCase().includes(q)) ||
        e.interest_tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (options?.featured) {
      // Return top locality score experiences
      list = [...list].sort((a, b) => b.locality_score - a.locality_score).slice(0, 4);
    }
    return list;
  }

  public getExperienceById(id: string): Experience | undefined {
    return this.experiences.find(e => e.id === id);
  }

  public getSlotsForExperience(experienceId: string): SeedAvailabilitySlot[] {
    return this.availabilitySlots.filter(s => s.experience_id === experienceId);
  }

  public addExperience(experience: Experience) {
    this.experiences.unshift(experience);
    return experience;
  }

  public addProvider(provider: SeedProvider) {
    this.providers.push(provider);
    return provider;
  }

  public resetToSeed() {
    this.providers = [...seedProviders];
    this.experiences = [...seedExperiences];
    this.availabilitySlots = generateSeedSlots();
    this.communityItineraries = [...seedCommunityItineraries];
    this.reviews = [...seedReviews];
  }
}

export const store = new DataStore();
