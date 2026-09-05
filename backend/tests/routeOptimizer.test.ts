import { describe, it } from 'node:test';
import assert from 'node:assert';
import { routeOptimizer } from '../src/services/routeOptimizer.js';
import { Experience } from '@khojyatra/types';

describe('Route Optimizer — Nearest-Neighbor Heuristic (Phase 11)', () => {
  it('Optimizes 4 scattered stops to reduce total transit distance & time', () => {
    // Starting point: Connaught Place, Central Delhi (28.6315, 77.2167)
    const startLocation = { lat: 28.6315, lng: 77.2167 };

    // 4 unordered stops arranged in zigzag fashion:
    // Stop A: Old Delhi / Chandni Chowk (North) (28.6506, 77.2303)
    // Stop B: Hauz Khas Village (South) (28.5494, 77.2001)
    // Stop C: Red Fort / Daryaganj (North, right near Stop A) (28.6562, 77.2410)
    // Stop D: Qutub Minar / Mehrauli (Deep South, near Stop B) (28.5245, 77.1855)
    // Unoptimized order: North -> South -> North -> Deep South (severe ping-pong zigzag!)
    const unorderedExperiences: Experience[] = [
      {
        id: 'stop-1-north',
        title: 'Old Delhi Chandni Chowk',
        category: 'food_culinary',
        price_min: 500,
        price_max: 800,
        duration_min: 90,
        lat: 28.6506,
        lng: 77.2303,
        accessibility_tags: [],
        interest_tags: [],
        rating_avg: 4.8,
        locality_score: 95,
        offering_status: 'published',
        photo_urls: []
      },
      {
        id: 'stop-2-south',
        title: 'Hauz Khas Village',
        category: 'nightlife_entertainment',
        price_min: 600,
        price_max: 1000,
        duration_min: 120,
        lat: 28.5494,
        lng: 77.2001,
        accessibility_tags: [],
        interest_tags: [],
        rating_avg: 4.7,
        locality_score: 90,
        offering_status: 'published',
        photo_urls: []
      },
      {
        id: 'stop-3-north',
        title: 'Red Fort Heritage Walk',
        category: 'cultural_heritage',
        price_min: 400,
        price_max: 700,
        duration_min: 90,
        lat: 28.6562,
        lng: 77.2410,
        accessibility_tags: [],
        interest_tags: [],
        rating_avg: 4.9,
        locality_score: 98,
        offering_status: 'published',
        photo_urls: []
      },
      {
        id: 'stop-4-south',
        title: 'Qutub Minar Architecture',
        category: 'cultural_heritage',
        price_min: 500,
        price_max: 900,
        duration_min: 100,
        lat: 28.5245,
        lng: 77.1855,
        accessibility_tags: [],
        interest_tags: [],
        rating_avg: 4.9,
        locality_score: 97,
        offering_status: 'published',
        photo_urls: []
      }
    ];

    const result = routeOptimizer.optimizeOrder(startLocation, unorderedExperiences);

    console.log(`\nRoute Optimization Benchmark:`);
    console.log(`- Total Distance Before (Zigzag): ${result.total_distance_before_km} km`);
    console.log(`- Total Distance After (Optimized): ${result.total_distance_after_km} km`);
    console.log(`- Travel Time Saved: ${result.travel_time_saved_min} minutes\n`);

    // Verification assertion: Distance after MUST be strictly less than before!
    assert.ok(
      result.total_distance_after_km < result.total_distance_before_km,
      `Optimized distance (${result.total_distance_after_km} km) must be less than unoptimized distance (${result.total_distance_before_km} km)`
    );

    assert.ok(
      result.travel_time_saved_min > 0,
      `Travel time saved (${result.travel_time_saved_min} mins) must be positive`
    );

    assert.strictEqual(
      result.ordered_stops.length,
      4,
      'All 4 stops must be preserved in the optimized route'
    );
  });
});
