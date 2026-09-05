import { describe, it } from 'node:test';
import assert from 'node:assert';
import { frictionEngine } from '../src/services/frictionEngine.js';
import { itineraryPlanner } from '../src/services/itineraryPlanner.js';
import { store } from '../src/data/store.js';

store.resetToSeed();

describe('Friction Engine & Adaptive Itinerary Repair (Phase 12)', () => {
  it('Marks confirmed stop unavailable and repairs itinerary in < 2 seconds', () => {
    const sessionId = `friction-test-${Date.now()}`;

    // Add 2 stops to itinerary
    const exp1 = store.experiences[0]; // e1 (Old Delhi)
    const exp2 = store.experiences[6]; // e7 (Chor Bazaar)

    itineraryPlanner.addItem(sessionId, exp1.id);
    itineraryPlanner.addItem(sessionId, exp2.id);

    const startTime = Date.now();

    // Trigger repair by marking the first stop unavailable (e.g. host cancelled / capacity zero)
    const repairResult = frictionEngine.repair(sessionId, {
      unavailableExperienceId: exp1.id
    });

    const elapsed = Date.now() - startTime;

    assert.ok(elapsed < 2000, `Repair took ${elapsed}ms, under 2s limit`);
    assert.ok(repairResult.diff.removed.includes(exp1.id), 'Unavailable item was removed');
    assert.ok(repairResult.diff.added.length > 0, 'Feasible alternative was added');
    assert.ok(repairResult.repaired_itinerary.items.length >= 2, 'Itinerary retains active stops');

    // Confirm total cost fits within budget cap
    const totalCommitted = repairResult.repaired_itinerary.items.reduce(
      (sum, i) => sum + i.price_committed,
      0
    );
    assert.ok(
      totalCommitted <= (repairResult.repaired_itinerary.budget_cap || 3000),
      `Total cost (₹${totalCommitted}) fits within budget cap`
    );
  });
});
