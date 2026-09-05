import { describe, it } from 'node:test';
import assert from 'node:assert';
import { checkHardConstraints, decisionEngine } from '../src/services/decisionEngine.js';
import { store } from '../src/data/store.js';
import { ConstraintIntake, Experience } from '@khojyatra/types';

// Seed store before tests
store.resetToSeed();

const baseExperience: Experience = {
  id: 'test-exp-1',
  provider_id: 'p1',
  title: 'Test Experience',
  description: 'Test description',
  category: 'food_culinary',
  price_min: 500,
  price_max: 800,
  duration_min: 60,
  lat: 28.6506,
  lng: 77.2303,
  accessibility_tags: ['step_free'],
  interest_tags: ['street_food'],
  rating_avg: 4.8,
  locality_score: 90,
  offering_status: 'published',
  photo_urls: []
};

const baseIntake: ConstraintIntake = {
  location_context: {
    mode: 'current',
    lat: 28.6506,
    lng: 77.2303,
    effective_time: new Date().toISOString()
  },
  duration_minutes: 120,
  budget: { min: 200, max: 1000 },
  group: { size: 2, type: 'couple' },
  interests: ['food_culinary'],
  accessibility_tags: ['step_free'],
  weather_condition: 'clear'
};

describe('Decision Engine — Stage 1 Hard Constraints Independent Rejections', () => {
  it('Rule 1: Rejects unpublished draft offerings', () => {
    const draftExp: Experience = { ...baseExperience, offering_status: 'draft' };
    const res = checkHardConstraints(draftExp, baseIntake, new Date());
    assert.strictEqual(res.passed, false);
    assert.strictEqual(res.rejectionReason, 'NOT_PUBLISHED');
  });

  it('Rule 2: Rejects when price_min exceeds budget.max', () => {
    const expensiveExp: Experience = { ...baseExperience, price_min: 1500 };
    const res = checkHardConstraints(expensiveExp, baseIntake, new Date());
    assert.strictEqual(res.passed, false);
    assert.match(res.rejectionReason!, /PRICE_EXCEEDS_BUDGET/);
  });

  it('Rule 3: Rejects when duration + travel time exceeds available time window', () => {
    // 180 min duration > 120 min intake window
    const longExp: Experience = { ...baseExperience, duration_min: 180 };
    const res = checkHardConstraints(longExp, baseIntake, new Date());
    assert.strictEqual(res.passed, false);
    assert.match(res.rejectionReason!, /TIME_WINDOW_EXCEEDED/);
  });

  it('Rule 4: Rejects when required accessibility tags are missing', () => {
    const noAccessExp: Experience = { ...baseExperience, accessibility_tags: [] };
    const intakeNeedingWheelchair: ConstraintIntake = {
      ...baseIntake,
      accessibility_tags: ['wheelchair_accessible']
    };
    const res = checkHardConstraints(noAccessExp, intakeNeedingWheelchair, new Date());
    assert.strictEqual(res.passed, false);
    assert.match(res.rejectionReason!, /MISSING_ACCESSIBILITY/);
  });

  it('Stage 2 Soft Ranking: Produces scores and deterministic reasons', () => {
    const broadIntake: ConstraintIntake = {
      ...baseIntake,
      duration_minutes: 180,
      accessibility_tags: [],
      interests: ['food_culinary', 'hidden_gems', 'shopping_markets']
    };
    const result = decisionEngine.evaluate(broadIntake);
    assert.ok(result.recommendations.length >= 3, `Expected >= 3 recommendations, got ${result.recommendations.length}`);
    const first = result.recommendations[0];
    assert.ok(first.score > 0 && first.score <= 1.0, 'Score is between 0 and 1');
    assert.ok(first.reasons.length >= 2, 'Has deterministic reasons generated');
    assert.ok(first.reasons.some(r => r.includes('budget') || r.includes('window') || r.includes('Locality') || r.includes('transit')));
  });

  it('/replan returns feasible diffs in under 2 seconds', () => {
    const start = Date.now();
    const evaluated = decisionEngine.evaluate(baseIntake);
    const activeIds = evaluated.recommendations.map(r => r.experience.id);

    const replanResult = decisionEngine.replan(
      baseIntake,
      { type: 'budget_reduced', value: 400 },
      activeIds
    );

    const elapsed = Date.now() - start;
    assert.ok(elapsed < 2000, `Replan took ${elapsed}ms, under 2s limit`);
    assert.ok(replanResult.diff, 'Contains diff object');
    assert.ok(Array.isArray(replanResult.diff.removed), 'Has removed array');
    assert.ok(Array.isArray(replanResult.diff.added), 'Has added array');
    assert.ok(Array.isArray(replanResult.diff.unchanged), 'Has unchanged array');
  });
});
