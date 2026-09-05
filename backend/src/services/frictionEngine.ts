import { Itinerary, ItineraryItem, Experience, ConstraintIntake } from '@khojyatra/types';
import { itineraryPlanner } from './itineraryPlanner.js';
import { decisionEngine } from './decisionEngine.js';
import { routeOptimizer } from './routeOptimizer.js';
import { store } from '../data/store.js';

export interface ItemFriction {
  itemId: string;
  experienceId: string;
  title: string;
  frictionScore: number;
  factors: {
    weather_mismatch: number;
    time_pressure: number;
    availability_change: number;
    crowd_signal: number;
  };
  triggerRepair: boolean;
  reasons: string[];
}

export interface ItineraryRepairResult {
  repaired_itinerary: Itinerary;
  diff: {
    removed: string[];
    added: string[];
    unchanged: string[];
  };
  friction_reports: ItemFriction[];
  message: string;
}

export class FrictionEngine {
  private readonly FRICTION_THRESHOLD = 0.50;

  // Compute friction score for an individual itinerary stop
  public evaluateItemFriction(
    item: ItineraryItem,
    context: {
      weather?: 'clear' | 'rain' | 'extreme';
      isExplicitlyUnavailable?: boolean;
      remainingTimeMinutes?: number;
    }
  ): ItemFriction {
    const exp = item.experience || store.getExperienceById(item.experience_id);
    const reasons: string[] = [];

    // Factor 1: Weather Mismatch (0.0 to 0.50)
    let weatherMismatch = 0;
    if (context.weather === 'rain' && exp) {
      if (['adventure_outdoor', 'festivals_events'].includes(exp.category)) {
        weatherMismatch = 0.55;
        reasons.push('Outdoor activity during active rain');
      }
    } else if (context.weather === 'extreme' && exp) {
      weatherMismatch = 0.65;
      reasons.push('Extreme weather advisory for outdoor stop');
    }

    // Factor 2: Availability / Capacity Change (0.0 to 1.0)
    let availabilityChange = 0;
    if (context.isExplicitlyUnavailable) {
      availabilityChange = 1.0;
      reasons.push('Host marked offering unavailable / capacity exhausted');
    }

    // Factor 3: Time Pressure (0.0 to 0.40)
    let timePressure = 0;
    const slots = exp ? store.getSlotsForExperience(exp.id) : [];
    if (slots.length > 0 && slots[0].capacity_remaining === 0) {
      availabilityChange = 0.95;
      reasons.push('Zero seats remaining in current booking slot');
    }

    // Factor 4: Crowd Signal Placeholder (0.0 to 0.20)
    const crowdSignal = 0.10; // Nominal baseline crowd density

    const totalFriction = Math.min(
      1.0,
      weatherMismatch + availabilityChange + timePressure + crowdSignal
    );

    const triggerRepair = totalFriction >= this.FRICTION_THRESHOLD;

    return {
      itemId: item.id,
      experienceId: item.experience_id,
      title: exp?.title || 'Stop',
      frictionScore: Math.round(totalFriction * 100) / 100,
      factors: {
        weather_mismatch: weatherMismatch,
        time_pressure: timePressure,
        availability_change: availabilityChange,
        crowd_signal: crowdSignal
      },
      triggerRepair,
      reasons
    };
  }

  // Repair itinerary: replace high-friction items and re-optimize route
  public repair(
    sessionId: string,
    options: {
      unavailableExperienceId?: string;
      weather?: 'clear' | 'rain' | 'extreme';
    }
  ): ItineraryRepairResult {
    const itinerary = itineraryPlanner.getOrCreateItinerary(sessionId);
    const originalItemIds = itinerary.items.map(i => i.experience_id);

    // Evaluate friction for all current items
    const frictionReports: ItemFriction[] = itinerary.items.map(item =>
      this.evaluateItemFriction(item, {
        weather: options.weather,
        isExplicitlyUnavailable: item.experience_id === options.unavailableExperienceId
      })
    );

    const itemsToReplace = frictionReports.filter(f => f.triggerRepair);

    if (itemsToReplace.length === 0) {
      return {
        repaired_itinerary: itinerary,
        diff: {
          removed: [],
          added: [],
          unchanged: originalItemIds
        },
        friction_reports: frictionReports,
        message: 'All itinerary stops are within acceptable friction limits.'
      };
    }

    const removedExperienceIds = itemsToReplace.map(r => r.experienceId);
    const keptItems = itinerary.items.filter(item => !removedExperienceIds.includes(item.experience_id));

    // Determine remaining budget and available candidate pool
    const currentCommitted = keptItems.reduce((sum, i) => sum + (i.price_committed || 0), 0);
    const remainingBudget = Math.max(300, (itinerary.budget_cap || 3000) - currentCommitted);

    const candidateIntake: ConstraintIntake = {
      location_context: {
        mode: 'current',
        lat: 28.6506,
        lng: 77.2303,
        effective_time: new Date().toISOString()
      },
      duration_minutes: 180,
      budget: { min: 200, max: remainingBudget },
      group: { size: 2, type: 'couple' },
      interests: ['food_culinary', 'cultural_heritage', 'workshops_classes', 'hidden_gems'],
      accessibility_tags: [],
      weather_condition: options.weather || 'clear'
    };

    // Find feasible replacement candidates using Decision Engine
    const { recommendations } = decisionEngine.evaluate(candidateIntake);
    const existingExperienceIds = new Set(keptItems.map(i => i.experience_id));

    const replacementCandidates = recommendations
      .map(r => r.experience)
      .filter(exp => !existingExperienceIds.has(exp.id) && !removedExperienceIds.includes(exp.id));

    const addedExperiences: Experience[] = [];
    // Replace each removed item with a valid candidate
    for (let i = 0; i < itemsToReplace.length; i++) {
      if (replacementCandidates[i]) {
        addedExperiences.push(replacementCandidates[i]);
      }
    }

    // Combine kept + newly added experiences
    const allRepairedExperiences: Experience[] = [
      ...keptItems.map(i => i.experience || store.getExperienceById(i.experience_id)!),
      ...addedExperiences
    ].filter(Boolean);

    // Call Route Optimizer (Phase 11) to sequence stops with minimal transit time
    const startLoc = { lat: 28.6506, lng: 77.2303 };
    const optimized = routeOptimizer.optimizeOrder(startLoc, allRepairedExperiences);

    // Reconstruct itinerary stops with sequential greedy timing
    let currentTime = new Date();
    currentTime.setHours(10, 0, 0, 0);

    const newItineraryItems: ItineraryItem[] = optimized.ordered_stops.map((stop, idx) => {
      const itemStartTime = new Date(currentTime);
      currentTime = new Date(currentTime.getTime() + (stop.experience.duration_min + stop.leg_travel_time_min) * 60 * 1000);

      return {
        id: `repaired-${Date.now()}-${idx}`,
        itinerary_id: itinerary.id,
        experience_id: stop.experience.id,
        position: idx + 1,
        start_time: itemStartTime.toISOString(),
        price_committed: stop.experience.price_min,
        experience: stop.experience
      };
    });

    itinerary.items = newItineraryItems;

    const addedExperienceIds = addedExperiences.map(e => e.id);
    const unchangedExperienceIds = keptItems.map(k => k.experience_id);

    return {
      repaired_itinerary: itinerary,
      diff: {
        removed: removedExperienceIds,
        added: addedExperienceIds,
        unchanged: unchangedExperienceIds
      },
      friction_reports: frictionReports,
      message: `Repaired itinerary: Replaced ${removedExperienceIds.length} high-friction stop(s) with weather-feasible alternatives.`
    };
  }
}

export const frictionEngine = new FrictionEngine();
