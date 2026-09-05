import { CommunityItinerarySimilarity } from '@khojyatra/types';
import { store } from '../data/store.js';
import { itineraryPlanner } from './itineraryPlanner.js';

export interface SimilarSearchParams {
  destination?: string;
  duration_days?: number;
  budget?: number;
  group_type?: string;
  interests?: string[];
}

export class CommunityService {
  /**
   * Phase 21: Multi-Dimensional Similarity Scoring
   */
  public findSimilar(params: SimilarSearchParams): CommunityItinerarySimilarity[] {
    const list = store.communityItineraries.filter(c => c.visibility !== 'private');

    const scored = list.map(itin => {
      let score = 0;
      const matched: string[] = [];

      // 1. Destination match (25 pts)
      if (params.destination) {
        const destParam = params.destination.toLowerCase();
        const itinDest = itin.destination.toLowerCase();
        if (itinDest.includes(destParam) || destParam.includes(itinDest)) {
          score += 25;
          matched.push(`Destination: ${itin.destination}`);
        }
      } else {
        score += 15; // neutral baseline
      }

      // 2. Duration match (25 pts)
      if (params.duration_days !== undefined) {
        const diff = Math.abs(params.duration_days - itin.duration_days);
        if (diff === 0) {
          score += 25;
          matched.push(`Duration: ${itin.duration_days} day${itin.duration_days > 1 ? 's' : ''}`);
        } else if (diff === 1) {
          score += 15;
          matched.push(`Duration: ±1 day (${itin.duration_days} days)`);
        }
      } else {
        score += 15;
      }

      // 3. Budget range match (20 pts)
      if (params.budget !== undefined && params.budget > 0) {
        const budgetRatio = Math.min(params.budget, itin.budget) / Math.max(params.budget, itin.budget);
        if (budgetRatio >= 0.7) {
          const pts = Math.round(20 * budgetRatio);
          score += pts;
          matched.push(`Budget match (~₹${itin.budget})`);
        }
      } else {
        score += 15;
      }

      // 4. Group type match (15 pts)
      if (params.group_type) {
        if (params.group_type.toLowerCase() === itin.group_type.toLowerCase()) {
          score += 15;
          matched.push(`Group: ${itin.group_type}`);
        }
      } else {
        score += 10;
      }

      // 5. Interests overlap (15 pts)
      if (params.interests && params.interests.length > 0) {
        const overlap = itin.interests.filter(i => params.interests?.includes(i));
        if (overlap.length > 0) {
          const pts = Math.min(15, Math.round((overlap.length / params.interests.length) * 15));
          score += pts;
          matched.push(`${overlap.length} shared interest${overlap.length > 1 ? 's' : ''}`);
        }
      } else {
        score += 10;
      }

      const similarityPct = Math.min(100, Math.max(0, score));

      // Resolve full experience objects for items (omitting owner_user_id for privacy)
      const populatedItems = itin.items.map(item => ({
        ...item,
        experience: store.getExperienceById(item.experience_id)
      }));

      return {
        itinerary: {
          ...itin,
          items: populatedItems
        },
        similarity_pct: similarityPct,
        matched_dimensions: matched
      };
    });

    // Sort by similarity percentage descending
    return scored.sort((a, b) => b.similarity_pct - a.similarity_pct).slice(0, 3);
  }

  /**
   * Phase 21: Clone community itinerary into active user itinerary
   */
  public cloneToSession(communityItineraryId: string, sessionId: string) {
    const communityItin = store.communityItineraries.find(c => c.id === communityItineraryId);
    if (!communityItin) {
      throw new Error(`Community itinerary ${communityItineraryId} not found`);
    }

    const userItin = itineraryPlanner.getOrCreateItinerary(sessionId);
    // Clear current items or append
    userItin.items = [];

    // Clone each community item
    for (const item of communityItin.items) {
      itineraryPlanner.addItem(sessionId, item.experience_id);
    }

    const updated = itineraryPlanner.getOrCreateItinerary(sessionId);
    const feasibility = itineraryPlanner.checkFeasibility(updated);

    return {
      itinerary: updated,
      feasibility,
      cloned_from: communityItin.title
    };
  }
}

export const communityService = new CommunityService();
