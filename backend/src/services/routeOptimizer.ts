import { Experience } from '@khojyatra/types';
import { calculateDistanceKm, estimateTravelTimeMinutes } from './decisionEngine.js';

export interface RouteStop {
  experience: Experience;
  leg_distance_km: number;
  leg_travel_time_min: number;
}

export interface RouteOptimizationResult {
  ordered_stops: RouteStop[];
  total_distance_before_km: number;
  total_distance_after_km: number;
  total_travel_time_before_min: number;
  total_travel_time_after_min: number;
  travel_time_saved_min: number;
  message: string;
}

export class RouteOptimizer {
  // Nearest-Neighbor Heuristic to minimize sequential transit distances
  public optimizeOrder(
    startLocation: { lat: number; lng: number },
    experiences: Experience[]
  ): RouteOptimizationResult {
    if (experiences.length <= 1) {
      const singleStop: RouteStop[] = experiences.map(e => {
        const d = calculateDistanceKm(startLocation.lat, startLocation.lng, e.lat, e.lng);
        return {
          experience: e,
          leg_distance_km: d,
          leg_travel_time_min: estimateTravelTimeMinutes(d)
        };
      });

      const dist = singleStop[0]?.leg_distance_km || 0;
      const time = singleStop[0]?.leg_travel_time_min || 0;

      return {
        ordered_stops: singleStop,
        total_distance_before_km: dist,
        total_distance_after_km: dist,
        total_travel_time_before_min: time,
        total_travel_time_after_min: time,
        travel_time_saved_min: 0,
        message: 'Sequence optimal (single stop).'
      };
    }

    // 1. Calculate unoptimized (input order) total distance
    let distBefore = 0;
    let currLat = startLocation.lat;
    let currLng = startLocation.lng;

    experiences.forEach(e => {
      distBefore += calculateDistanceKm(currLat, currLng, e.lat, e.lng);
      currLat = e.lat;
      currLng = e.lng;
    });

    const timeBefore = estimateTravelTimeMinutes(distBefore);

    // 2. Nearest-Neighbor Heuristic Ordering
    const unvisited = [...experiences];
    const orderedStops: RouteStop[] = [];

    currLat = startLocation.lat;
    currLng = startLocation.lng;

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const dist = calculateDistanceKm(currLat, currLng, unvisited[i].lat, unvisited[i].lng);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }

      const nextExp = unvisited.splice(nearestIdx, 1)[0];
      const legDist = calculateDistanceKm(currLat, currLng, nextExp.lat, nextExp.lng);
      const legTime = estimateTravelTimeMinutes(legDist);

      orderedStops.push({
        experience: nextExp,
        leg_distance_km: legDist,
        leg_travel_time_min: legTime
      });

      currLat = nextExp.lat;
      currLng = nextExp.lng;
    }

    // 3. Calculate optimized total distance
    const distAfter = orderedStops.reduce((sum, s) => sum + s.leg_distance_km, 0);
    const timeAfter = orderedStops.reduce((sum, s) => sum + s.leg_travel_time_min, 0);

    const distBeforeRounded = Math.round(distBefore * 10) / 10;
    const distAfterRounded = Math.round(distAfter * 10) / 10;
    const timeSavedMin = Math.max(0, timeBefore - timeAfter);

    return {
      ordered_stops: orderedStops,
      total_distance_before_km: distBeforeRounded,
      total_distance_after_km: distAfterRounded,
      total_travel_time_before_min: timeBefore,
      total_travel_time_after_min: timeAfter,
      travel_time_saved_min: timeSavedMin,
      message: distAfterRounded < distBeforeRounded
        ? `Optimized visit order reduced transit by ${(distBeforeRounded - distAfterRounded).toFixed(1)} km (~${timeSavedMin}m saved).`
        : 'Stops were already in near-optimal transit sequence.'
    };
  }
}

export const routeOptimizer = new RouteOptimizer();
