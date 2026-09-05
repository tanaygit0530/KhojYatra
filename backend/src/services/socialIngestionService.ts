import { SocialStagingItem, Experience, ExperienceCategory } from '@khojyatra/types';
import { store } from '../data/store.js';

export interface RawSocialInput {
  source_handle: string;
  source_url: string;
  caption: string;
  suggested_category?: ExperienceCategory;
  lat?: number;
  lng?: number;
  estimated_price?: number;
}

export class SocialIngestionService {
  /**
   * Ingests an authorized or explicitly submitted sample social post,
   * performs entity extraction, and writes to social_staging with
   * trust_label='social_signal_unverified'.
   */
  public ingestSocialPost(input: RawSocialInput): SocialStagingItem {
    const id = `social-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const caption = input.caption;

    // Entity extraction heuristics (deterministic fallback for LLM)
    let extractedTitle = 'Secret Local Discovery';
    let category: ExperienceCategory = input.suggested_category || 'hidden_gems';
    let lat = input.lat || 28.6506;
    let lng = input.lng || 77.2303;
    let price = input.estimated_price || 400;

    const lower = caption.toLowerCase();
    if (lower.includes('baoli') || lower.includes('stepwell') || lower.includes('monument') || lower.includes('ruins')) {
      category = 'hidden_gems';
      extractedTitle = 'Ancient Stepwell & Architecture Discovery';
      if (lower.includes('mehrauli')) {
        lat = 28.5204;
        lng = 77.1855;
      }
    } else if (lower.includes('kebab') || lower.includes('chai') || lower.includes('food') || lower.includes('mithai') || lower.includes('rasgulla')) {
      category = 'food_culinary';
      extractedTitle = 'Hidden Street Taste Trail';
      price = 300;
    } else if (lower.includes('artisan') || lower.includes('carv') || lower.includes('pottery') || lower.includes('block') || lower.includes('workshop')) {
      category = 'workshops_classes';
      extractedTitle = 'Master Artisan Heritage Atelier';
      price = 600;
    } else if (lower.includes('temple') || lower.includes('ghat') || lower.includes('fort') || lower.includes('palace')) {
      category = 'cultural_heritage';
      extractedTitle = 'Historic Heritage Walk';
      price = 500;
    }

    // Extract first sentence as title if meaningful
    const firstSentence = caption.split(/[.!?\n]/)[0].trim();
    if (firstSentence.length > 10 && firstSentence.length < 65) {
      extractedTitle = firstSentence.replace(/^📍\s*/, '');
    }

    const stagedItem: SocialStagingItem = {
      id,
      source_handle: input.source_handle,
      source_url: input.source_url,
      raw_caption: caption,
      extracted_title: extractedTitle,
      extracted_description: caption.slice(0, 280),
      lat,
      lng,
      category,
      price_estimate: price,
      trust_label: 'social_signal_unverified',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    store.socialStaging.unshift(stagedItem);
    return stagedItem;
  }

  public getStagedItems(): SocialStagingItem[] {
    return store.socialStaging;
  }

  public getStagedItemById(id: string): SocialStagingItem | undefined {
    return store.socialStaging.find(s => s.id === id);
  }

  /**
   * Approves a staged entry, generating a published Experience carrying the
   * required 'Social signal — unverified' badge.
   */
  public approveStagedItem(id: string): { stagedItem: SocialStagingItem; experience: Experience } {
    const item = this.getStagedItemById(id);
    if (!item) {
      throw new Error(`Staged item ${id} not found`);
    }

    item.status = 'approved';

    const experienceId = `exp-social-${item.id}`;
    const newExperience: Experience = {
      id: experienceId,
      provider_id: 'prov-social-unverified',
      title: item.extracted_title,
      description: `${item.extracted_description} (Discovered via verified social signal from ${item.source_handle}).`,
      category: item.category,
      lat: item.lat,
      lng: item.lng,
      duration_min: 90,
      price_min: Math.max(100, item.price_estimate - 100),
      price_max: item.price_estimate + 200,
      photo_urls: [
        'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&auto=format&fit=crop&q=80'
      ],
      accessibility_tags: ['step_free'],
      interest_tags: ['social_discovery', 'unverified_signal', item.category],
      offering_status: 'published',
      rating_avg: 4.5,
      locality_score: 55,
      badge_label: 'Social signal — unverified',
      provider_name: item.source_handle,
      provider_verified: false,
      provider_trust_score: 35
    };

    // Add experience to catalog
    store.addExperience(newExperience);

    // Create an availability slot for travelers to book or plan
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    tomorrow.setHours(17, 0, 0, 0);
    const endTime = new Date(tomorrow.getTime() + 90 * 60 * 1000);

    store.availabilitySlots.push({
      id: `slot-social-${item.id}`,
      experience_id: experienceId,
      start_time: tomorrow.toISOString(),
      end_time: endTime.toISOString(),
      capacity_remaining: 8
    });

    return { stagedItem: item, experience: newExperience };
  }

  public rejectStagedItem(id: string): SocialStagingItem {
    const item = this.getStagedItemById(id);
    if (!item) {
      throw new Error(`Staged item ${id} not found`);
    }
    item.status = 'rejected';
    return item;
  }
}

export const socialIngestionService = new SocialIngestionService();
