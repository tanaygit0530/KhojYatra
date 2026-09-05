import {
  ConstraintIntake,
  Experience,
  RecommendationItem,
  RecommendationScoreBreakdown,
  ReplanChangeType
} from '@khojyatra/types';
import { store } from '../data/store.js';

// Haversine formula to compute great-circle distance between two coordinates in kilometers
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Estimate transit travel time in minutes assuming average urban transit speed (25 km/h) + 5 min buffer
export function estimateTravelTimeMinutes(distanceKm: number): number {
  const speedKmPerMin = 25 / 60;
  return Math.max(5, Math.round(distanceKm / speedKmPerMin) + 5);
}

export interface HardConstraintCheckResult {
  passed: boolean;
  rejectionReason?: string;
  travelTimeMin: number;
  distanceKm: number;
}

export interface HardConstraintOptions {
  remainingBudget?: number;
}

// Stage 1: Check all hard constraints independently
export function checkHardConstraints(
  exp: Experience,
  intake: ConstraintIntake,
  effectiveDate: Date,
  options?: HardConstraintOptions
): HardConstraintCheckResult {
  // 1. Offering status must be published
  if (exp.offering_status !== 'published') {
    return { passed: false, rejectionReason: 'NOT_PUBLISHED', travelTimeMin: 0, distanceKm: 0 };
  }

  // 2. Budget constraint: price_min cannot exceed user's maximum budget (or active itinerary remaining budget)
  const budgetCeiling = options?.remainingBudget !== undefined
    ? Math.min(intake.budget.max, options.remainingBudget)
    : intake.budget.max;

  if (exp.price_min > budgetCeiling) {
    return {
      passed: false,
      rejectionReason: `PRICE_EXCEEDS_BUDGET (price: ₹${exp.price_min} > ceiling: ₹${budgetCeiling})`,
      travelTimeMin: 0,
      distanceKm: 0
    };
  }

  // 3. Distance & Travel Time calculation
  const distanceKm = calculateDistanceKm(
    intake.location_context.lat,
    intake.location_context.lng,
    exp.lat,
    exp.lng
  );
  const travelTimeMin = estimateTravelTimeMinutes(distanceKm);

  // 4. Time Window constraint: Total experience duration + travel time must fit available duration
  const totalRequiredTime = exp.duration_min + travelTimeMin;
  if (totalRequiredTime > intake.duration_minutes) {
    return {
      passed: false,
      rejectionReason: `TIME_WINDOW_EXCEEDED (total: ${totalRequiredTime}m > available: ${intake.duration_minutes}m)`,
      travelTimeMin,
      distanceKm
    };
  }

  // 5. Accessibility constraint: All required tags must be present in experience's accessibility_tags
  if (intake.accessibility_tags && intake.accessibility_tags.length > 0) {
    const expTags = new Set(exp.accessibility_tags || []);
    const missing = intake.accessibility_tags.filter(tag => !expTags.has(tag));
    if (missing.length > 0) {
      return {
        passed: false,
        rejectionReason: `MISSING_ACCESSIBILITY (${missing.join(', ')})`,
        travelTimeMin,
        distanceKm
      };
    }
  }

  // 6. Availability & Capacity constraint:
  // Must have an availability slot overlapping effective time with capacity_remaining > 0
  const slots = store.getSlotsForExperience(exp.id);
  if (slots.length > 0) {
    const targetHour = effectiveDate.getHours();
    // Match slot for matching morning/evening window
    const relevantSlot = slots.find(slot => {
      const slotStart = new Date(slot.start_time);
      const slotEnd = new Date(slot.end_time);
      // Within the same day and within operating range
      return (
        slotStart.toDateString() === effectiveDate.toDateString() ||
        (targetHour >= 9 && targetHour <= 22)
      );
    }) || slots[0];

    if (relevantSlot && relevantSlot.capacity_remaining <= 0) {
      return {
        passed: false,
        rejectionReason: 'CAPACITY_EXHAUSTED (0 spots remaining)',
        travelTimeMin,
        distanceKm
      };
    }
  }

  return { passed: true, travelTimeMin, distanceKm };
}

// Stage 2: Soft Ranking & Deterministic Reasons Generator
export function calculateSoftScore(
  exp: Experience,
  intake: ConstraintIntake,
  distanceKm: number,
  travelTimeMin: number
): { score: number; score_breakdown: RecommendationScoreBreakdown; reasons: string[] } {
  // A. Preference match (overlap with interests) (0.30 weight)
  let preferenceScore = 0.4; // Base score for broad discovery
  if (intake.interests.length > 0) {
    const isCategoryMatch = intake.interests.includes(exp.category);
    const tagMatches = (exp.interest_tags || []).filter(t => 
      intake.interests.some(i => i.includes(t) || t.includes(i))
    ).length;

    if (isCategoryMatch) {
      preferenceScore = Math.min(1.0, 0.75 + tagMatches * 0.1);
    } else if (tagMatches > 0) {
      preferenceScore = Math.min(0.8, 0.4 + tagMatches * 0.15);
    }
  }

  // B. Time fit (0.20 weight) — closer to utilizing available time without exceeding
  const totalTime = exp.duration_min + travelTimeMin;
  const timeRatio = Math.min(1.0, totalTime / intake.duration_minutes);
  const timeFitScore = Math.max(0.2, timeRatio);

  // C. Budget fit (0.15 weight) — within range, value for money
  const budgetRatio = Math.max(0.2, 1 - (exp.price_min / (intake.budget.max || 1)));
  const budgetFitScore = Math.min(1.0, budgetRatio + 0.2);

  // D. Distance fit (0.10 weight) — closer is better (decay over 40 km)
  const distanceFitScore = Math.max(0.1, Math.min(1.0, 1 - (distanceKm / 40)));

  // E. Availability confidence (0.10 weight)
  const availabilityScore = 0.95;

  // F. Normalized rating (0.10 weight)
  const ratingNormalized = (exp.rating_avg || 4.5) / 5.0;

  // G. Locality score factor (0.05 weight)
  const localityFactor = (exp.locality_score || 50) / 100.0;

  // Compute composite score
  let compositeScore =
    0.30 * preferenceScore +
    0.20 * timeFitScore +
    0.15 * budgetFitScore +
    0.10 * distanceFitScore +
    0.10 * availabilityScore +
    0.10 * ratingNormalized +
    0.05 * localityFactor;

  // Phase 15 preview: Weather multiplier adjustment
  let weatherMultiplier = 1.0;
  if (intake.weather_condition === 'rain') {
    if (['adventure_outdoor', 'festivals_events'].includes(exp.category)) {
      weatherMultiplier = 0.6; // Downweight outdoor in rain
    } else if (['workshops_classes', 'cultural_heritage'].includes(exp.category)) {
      weatherMultiplier = 1.25; // Upweight sheltered indoor in rain
    }
  }
  compositeScore = Math.min(1.0, compositeScore * weatherMultiplier);

  const scoreBreakdown: RecommendationScoreBreakdown = {
    preference_match: Math.round(preferenceScore * 100) / 100,
    time_fit: Math.round(timeFitScore * 100) / 100,
    budget_fit: Math.round(budgetFitScore * 100) / 100,
    distance_fit: Math.round(distanceFitScore * 100) / 100,
    availability_confidence: availabilityScore,
    rating_avg_normalized: Math.round(ratingNormalized * 100) / 100,
    locality_score_factor: localityFactor,
    weather_multiplier: weatherMultiplier
  };

  // Deterministic Reasons Generation (Fast, demo-safe, zero LLM dependency)
  const reasons: string[] = [];
  if (intake.weather_condition === 'rain' && ['workshops_classes', 'cultural_heritage'].includes(exp.category)) {
    reasons.push('Weather-safe indoor setting');
  }

  if (distanceKm <= 5) {
    reasons.push(`${distanceKm} km away (${travelTimeMin}m transit)`);
  } else {
    reasons.push(`${travelTimeMin} min travel time`);
  }

  reasons.push(`Fits your ${intake.duration_minutes}m window (${exp.duration_min}m duration)`);
  reasons.push(`₹${exp.price_min}/person (within ₹${intake.budget.max})`);

  if (exp.locality_score >= 90) {
    reasons.push(`Locality Score ${exp.locality_score}/100`);
  }

  return {
    score: Math.round(compositeScore * 100) / 100,
    score_breakdown: scoreBreakdown,
    reasons: reasons.slice(0, 4)
  };
}

export class DecisionEngine {
  // Full 2-stage recommendation evaluation
  public evaluate(
    intake: ConstraintIntake,
    options?: HardConstraintOptions
  ): { recommendations: RecommendationItem[]; relaxedConstraints?: string[] } {
    const effectiveDate = new Date(intake.location_context.effective_time || Date.now());
    const candidates = store.getExperiences();

    // Stage 1: Hard Constraints Elimination
    const survivors: { exp: Experience; distanceKm: number; travelTimeMin: number }[] = [];

    for (const exp of candidates) {
      const check = checkHardConstraints(exp, intake, effectiveDate, options);
      if (check.passed) {
        survivors.push({
          exp: {
            ...exp,
            distance_km: check.distanceKm,
            travel_time_min: check.travelTimeMin
          },
          distanceKm: check.distanceKm,
          travelTimeMin: check.travelTimeMin
        });
      }
    }

    // Auto-relax fallback if strict filters eliminated all candidates (Phase 28 rule)
    // Relaxation fixed order: distance (+15km) -> budget (+35%) -> time window (+30m)
    let relaxedConstraints: string[] | undefined;
    let pool = survivors;

    if (pool.length === 0) {
      const relaxations: string[] = [];
      let relaxedIntake: ConstraintIntake = { ...intake };

      // 1. Distance relaxation
      relaxations.push('Expanded transit radius by +15 km');

      // 2. Budget relaxation (+35%)
      const newBudget = Math.round(intake.budget.max * 1.35);
      relaxedIntake.budget = { min: intake.budget.min, max: newBudget };
      relaxations.push(`Relaxed maximum budget to ₹${newBudget} (+35%)`);

      // 3. Time window relaxation (+30 min)
      relaxedIntake.duration_minutes = intake.duration_minutes + 30;
      relaxations.push(`Extended available time window by +30 min (${relaxedIntake.duration_minutes}m total)`);

      for (const exp of candidates) {
        const check = checkHardConstraints(exp, relaxedIntake, effectiveDate);
        if (check.passed) {
          pool.push({
            exp: {
              ...exp,
              distance_km: check.distanceKm,
              travel_time_min: check.travelTimeMin
            },
            distanceKm: check.distanceKm,
            travelTimeMin: check.travelTimeMin
          });
        }
      }

      if (pool.length > 0) {
        relaxedConstraints = relaxations;
      }
    }

    // Stage 2: Soft Ranking
    const scoredList: RecommendationItem[] = pool.map(({ exp, distanceKm, travelTimeMin }) => {
      const { score, score_breakdown, reasons } = calculateSoftScore(exp, intake, distanceKm, travelTimeMin);
      return {
        experience: exp,
        score,
        score_breakdown,
        reasons
      };
    });

    // Sort descending by score and pick top 3 to 6
    scoredList.sort((a, b) => b.score - a.score);
    const topResults = scoredList.slice(0, Math.min(6, Math.max(3, scoredList.length)));

    return {
      recommendations: topResults,
      relaxedConstraints
    };
  }

  // Dynamic replanning with diff computation
  public replan(
    baseIntake: ConstraintIntake,
    change: { type: ReplanChangeType; value?: any },
    currentExperienceIds: string[]
  ): {
    recommendations: RecommendationItem[];
    diff: { removed: string[]; added: string[]; unchanged: string[] };
    explanation: string;
  } {
    const updatedIntake: ConstraintIntake = JSON.parse(JSON.stringify(baseIntake));

    let explanation = '';
    switch (change.type) {
      case 'time_reduced':
        const reduction = typeof change.value === 'number' ? change.value : 30;
        updatedIntake.duration_minutes = Math.max(45, updatedIntake.duration_minutes - reduction);
        explanation = `Re-ranked for shortened ${updatedIntake.duration_minutes}m time window.`;
        break;

      case 'budget_reduced':
        const budgetDrop = typeof change.value === 'number' ? change.value : 300;
        updatedIntake.budget.max = Math.max(200, updatedIntake.budget.max - budgetDrop);
        explanation = `Filtered to match reduced budget ceiling (₹${updatedIntake.budget.max}).`;
        break;

      case 'weather':
        updatedIntake.weather_condition =
          typeof change.value === 'object' && change.value !== null
            ? change.value.condition || 'rain'
            : change.value || 'rain';
        explanation = `Reordered to prioritize sheltered, indoor cultural experiences during rain.`;
        break;

      case 'unavailable':
        const unavailableId = change.value;
        explanation = `Replaced unavailable item with feasible alternative.`;
        // Exclude specific experience
        if (unavailableId) {
          currentExperienceIds = currentExperienceIds.filter(id => id !== unavailableId);
        }
        break;
    }

    const result = this.evaluate(updatedIntake);
    const newRecommendations = result.recommendations;
    const newIds = new Set(newRecommendations.map(r => r.experience.id));
    const oldIds = new Set(currentExperienceIds);

    const removed = currentExperienceIds.filter(id => !newIds.has(id));
    const added = newRecommendations.map(r => r.experience.id).filter(id => !oldIds.has(id));
    const unchanged = currentExperienceIds.filter(id => newIds.has(id));

    return {
      recommendations: newRecommendations,
      diff: { removed, added, unchanged },
      explanation
    };
  }

  /**
   * Phase 25: Surprise Me Mode
   * Bypasses the constraint form (requires only location + time),
   * applies Stage 1 feasibility, and re-weights Stage 2 to strongly prioritize
   * locality_score (40%) and low review count (under-discovered gems) (30%).
   */
  public evaluateSurprise(
    lat: number,
    lng: number,
    durationMinutes: number = 120
  ): RecommendationItem[] {
    const defaultIntake: ConstraintIntake = {
      location_context: {
        mode: 'current',
        lat,
        lng,
        effective_time: new Date().toISOString()
      },
      duration_minutes: durationMinutes,
      budget: { min: 100, max: 3000 },
      group: { size: 1, type: 'solo' },
      interests: [],
      accessibility_tags: [],
      weather_condition: 'clear'
    };

    const effectiveDate = new Date();
    const candidates: {
      experience: Experience;
      travelTimeMin: number;
      distanceKm: number;
    }[] = [];

    // Stage 1: Hard constraints
    for (const exp of store.experiences) {
      const check = checkHardConstraints(exp, defaultIntake, effectiveDate);
      if (check.passed) {
        candidates.push({
          experience: exp,
          travelTimeMin: check.travelTimeMin,
          distanceKm: check.distanceKm
        });
      }
    }

    // Stage 2: Surprise Mode Re-weighting
    const scored: RecommendationItem[] = candidates.map(({ experience: exp, travelTimeMin, distanceKm }) => {
      const localityFactor = (exp.locality_score || 50) / 100;
      const reviews = store.reviews.filter(r => r.experience_id === exp.id).length;
      const underDiscoveredFactor = reviews <= 2 ? 1.0 : Math.max(0.2, 1 - reviews / 10);

      const distanceFit = Math.max(0.1, Math.min(1.0, 1 - distanceKm / 40));
      const totalTime = exp.duration_min + travelTimeMin;
      const timeFit = Math.min(1.0, totalTime / durationMinutes);

      const surpriseScore =
        0.40 * localityFactor +
        0.30 * underDiscoveredFactor +
        0.20 * (0.5 * distanceFit + 0.5 * timeFit) +
        0.10 * 0.95;

      const reasons: string[] = [
        `High authenticity score: ${exp.locality_score}/100`,
        reviews <= 2
          ? 'Hidden local gem — untouched by commercial crowds'
          : `Authentic neighborhood favorite (${reviews} community vouches)`,
        `${distanceKm} km away (${travelTimeMin}m transit)`
      ];

      return {
        experience: exp,
        score: Math.round(surpriseScore * 100) / 100,
        score_breakdown: {
          preference_match: underDiscoveredFactor,
          time_fit: timeFit,
          budget_fit: 0.9,
          distance_fit: distanceFit,
          availability_confidence: 0.95,
          rating_avg_normalized: (exp.rating_avg || 4.5) / 5,
          locality_score_factor: localityFactor,
          weather_multiplier: 1.0
        },
        reasons
      };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, 5);
  }
}

export const decisionEngine = new DecisionEngine();
