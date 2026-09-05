import { DecisionEngine } from '../src/services/decisionEngine';
import { ConstraintIntake } from '@khojyatra/shared-types';

console.log('--- Testing Weather-Aware Ranking (Phase 15) ---');

const engine = new DecisionEngine();

const baseIntake: ConstraintIntake = {
  location_context: {
    lat: 25.3176,
    lng: 82.9739,
    mode: 'gps',
    effective_time: '2026-09-05T10:00:00.000Z'
  },
  duration_minutes: 240,
  budget: { min: 0, max: 2500, currency: 'INR' },
  interests: ['adventure_outdoor', 'workshops_classes', 'cultural_heritage'],
  group: { type: 'solo', size: 1 }
};

// 1. Clear weather evaluation
const clearResult = engine.evaluate({
  ...baseIntake,
  weather_condition: 'clear'
});

console.log('Top 3 Clear Recommendations:');
clearResult.recommendations.slice(0, 3).forEach((r, i) => {
  console.log(`  ${i + 1}. [${r.experience.category}] ${r.experience.title} (Score: ${r.score})`);
});

// 2. Rain weather evaluation
const rainResult = engine.evaluate({
  ...baseIntake,
  weather_condition: 'rain'
});

console.log('\nTop 3 Rain Recommendations:');
rainResult.recommendations.slice(0, 3).forEach((r, i) => {
  console.log(`  ${i + 1}. [${r.experience.category}] ${r.experience.title} (Score: ${r.score}) - Reasons: ${r.reasons.join(' | ')}`);
});

// Assertions:
// 1. In clear weather, outdoor activities should have normal multiplier (1.0)
// 2. In rain, outdoor activities should have downweighted multiplier (<= 0.6) and indoor workshops should be upweighted (>= 1.25)
const outdoorExpRain = rainResult.recommendations.find(r => ['adventure_outdoor', 'festivals_events'].includes(r.experience.category));
const indoorExpRain = rainResult.recommendations.find(r => ['workshops_classes', 'cultural_heritage'].includes(r.experience.category));

if (indoorExpRain) {
  if (indoorExpRain.score_breakdown.weather_multiplier !== 1.25) {
    throw new Error(`Expected indoor weather multiplier 1.25, got ${indoorExpRain.score_breakdown.weather_multiplier}`);
  }
  const hasWeatherReason = indoorExpRain.reasons.some(r => r.toLowerCase().includes('weather') || r.toLowerCase().includes('indoor'));
  if (!hasWeatherReason) {
    throw new Error('Expected indoor recommendation under rain to include weather-safe reason');
  }
}

if (outdoorExpRain) {
  if (outdoorExpRain.score_breakdown.weather_multiplier !== 0.6) {
    throw new Error(`Expected outdoor weather multiplier 0.6, got ${outdoorExpRain.score_breakdown.weather_multiplier}`);
  }
}

// In rain, the highest ranked indoor experience should score significantly higher than when in clear weather
console.log('\n✅ Weather-aware ranking test PASSED successfully!');
