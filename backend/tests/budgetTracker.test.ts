import test from 'node:test';
import assert from 'node:assert';
import { itineraryPlanner } from '../src/services/itineraryPlanner.js';
import { decisionEngine } from '../src/services/decisionEngine.js';
import { store } from '../src/data/store.js';
import { ConstraintIntake } from '@khojyatra/shared-types';

test('Phase 17 — Real-Time Budget Tracker', async (t) => {
  const sessionId = `test-session-budget-${Date.now()}`;
  const availableExps = store.getExperiences();
  assert.ok(availableExps.length >= 2, 'Needs at least 2 experiences');

  const expensiveExp = availableExps.find(e => e.price_min >= 600) || availableExps[0];
  const midExp = availableExps.find(e => e.id !== expensiveExp.id) || availableExps[1];

  const baseIntake: ConstraintIntake = {
    location_context: {
      lat: 28.6506,
      lng: 77.2303,
      mode: 'planned',
      effective_time: new Date().toISOString()
    },
    duration_minutes: 360,
    budget: { min: 0, max: 1500, currency: 'INR' },
    interests: [],
    group: { type: 'solo', size: 1 }
  };

  await t.test('1. Initial search without committed items uses full budget cap (₹1500)', () => {
    const { recommendations } = decisionEngine.evaluate(baseIntake);
    assert.ok(recommendations.length > 0, 'Should return recommendations initially');
    const hasPricedOver500 = recommendations.some(r => r.experience.price_min > 500);
    assert.ok(hasPricedOver500, 'Should have items priced > 500 within ₹1500 cap');
  });

  await t.test('2. Commits an itinerary item and checks budget status calculation', () => {
    const addResult = itineraryPlanner.addItem(sessionId, expensiveExp.id);
    assert.ok(addResult.itinerary.items.length === 1);

    const budgetStatus = itineraryPlanner.getBudgetStatus(sessionId);
    console.log(`Budget Cap: ₹${budgetStatus.budget_cap} | Committed: ₹${budgetStatus.total_committed} | Remaining: ₹${budgetStatus.remaining_budget}`);

    assert.strictEqual(budgetStatus.total_committed, expensiveExp.price_min);
    assert.strictEqual(budgetStatus.remaining_budget, budgetStatus.budget_cap - expensiveExp.price_min);
    assert.strictEqual(budgetStatus.is_exceeded, false);
  });

  await t.test('3. Subsequent search filtered against reduced remaining budget ceiling', () => {
    // Suppose traveler had a budget cap of 1000 and spent expensiveExp.price_min (e.g. 700) -> remaining is 300
    const remainingBudget = 400; // Constrained remaining budget
    const { recommendations: filteredRecs } = decisionEngine.evaluate(baseIntake, { remainingBudget });

    // Verify no returned recommendation has price_min exceeding 400
    filteredRecs.forEach(rec => {
      assert.ok(
        rec.experience.price_min <= remainingBudget,
        `Experience ${rec.experience.title} priced ₹${rec.experience.price_min} exceeds remaining budget ₹${remainingBudget}`
      );
    });

    console.log(`Filtered recommendations count within ₹${remainingBudget}: ${filteredRecs.length}`);
  });

  await t.test('4. Soft warning generated when budget cap is exceeded', () => {
    const itin = itineraryPlanner.getOrCreateItinerary(sessionId);
    itin.budget_cap = 500; // artificially lower cap below committed price
    const budgetStatus = itineraryPlanner.getBudgetStatus(sessionId);

    assert.strictEqual(budgetStatus.is_exceeded, true);
    assert.ok(budgetStatus.soft_warning !== null);
    console.log(`Soft warning: ${budgetStatus.soft_warning}`);
  });
});
