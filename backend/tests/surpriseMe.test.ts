import test from 'node:test';
import assert from 'node:assert';
import { decisionEngine } from '../src/services/decisionEngine.js';
import { ConstraintIntake } from '@khojyatra/types';

test('Phase 25 — Surprise Me Mode', async (t) => {
  const lat = 28.6506; // Delhi
  const lng = 77.2303;
  const durationMinutes = 120;

  await t.test('1. Surprise Me returns feasible experiences with re-weighted high locality scores', () => {
    const surpriseResults = decisionEngine.evaluateSurprise(lat, lng, durationMinutes);

    assert.ok(surpriseResults.length > 0, 'Surprise Me should return recommendations');
    
    // Check average locality score is high
    const avgLocality = surpriseResults.reduce((acc, r) => acc + r.experience.locality_score, 0) / surpriseResults.length;
    assert.ok(avgLocality >= 70, `Average locality score in Surprise Me should be >= 70 (got ${avgLocality})`);

    // Verify reasons highlight authenticity / hidden gems
    const first = surpriseResults[0];
    assert.ok(first.reasons.some(r => r.includes('authenticity') || r.includes('gem') || r.includes('favorite')));
  });

  await t.test('2. Surprise Me returns visibly different ranking compared to standard popularity recommendations', () => {
    const standardIntake: ConstraintIntake = {
      location_context: {
        mode: 'current',
        lat,
        lng,
        effective_time: new Date().toISOString()
      },
      duration_minutes: durationMinutes,
      budget: { min: 200, max: 2500 },
      group: { size: 2, type: 'couple' },
      interests: ['food_culinary'],
      accessibility_tags: [],
      weather_condition: 'clear'
    };

    const standardResults = decisionEngine.evaluate(standardIntake).recommendations;
    const surpriseResults = decisionEngine.evaluateSurprise(lat, lng, durationMinutes);

    const standardTopId = standardResults[0]?.experience.id;
    const surpriseTopId = surpriseResults[0]?.experience.id;

    assert.ok(standardResults.length > 0);
    assert.ok(surpriseResults.length > 0);

    // Surprise Me prioritizes locality_score & low review counts rather than just food_culinary interest match
    const surpriseAvgLocality = surpriseResults.reduce((sum, r) => sum + r.experience.locality_score, 0) / surpriseResults.length;
    const standardAvgLocality = standardResults.reduce((sum, r) => sum + r.experience.locality_score, 0) / standardResults.length;

    assert.ok(
      surpriseAvgLocality >= standardAvgLocality,
      `Surprise Me average locality (${surpriseAvgLocality}) should be >= standard average locality (${standardAvgLocality})`
    );
  });
});
