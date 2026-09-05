import test from 'node:test';
import assert from 'node:assert';
import { detourService } from '../src/services/detourService.js';
import { itineraryPlanner } from '../src/services/itineraryPlanner.js';
import { store } from '../src/data/store.js';

test('Phase 19 — Worth the Detour Evaluation', async (t) => {
  const sessionId = `session-detour-${Date.now()}`;
  const allExps = store.getExperiences();
  assert.ok(allExps.length >= 3, 'Needs at least 3 experiences');

  const exp1 = allExps.find(e => e.category === 'food_culinary') || allExps[0];
  const exp2 = allExps.find(e => e.category === 'shopping_markets') || allExps[1];
  const detourCandidate = allExps.find(e => e.category === 'hidden_gems') || allExps[2];

  await t.test('1. Free schedule allows detour without delay', () => {
    const result = detourService.evaluateDetour(sessionId, detourCandidate.id);
    assert.strictEqual(result.worth_it, true);
    assert.strictEqual(result.still_on_time, true);
    assert.ok(result.added_minutes > 0);
    assert.ok(result.reason.includes('wide open') || result.reason.includes('comfortably'));
    console.log(`Empty itinerary detour: worth_it = ${result.worth_it}, reason = "${result.reason}"`);
  });

  await t.test('2. Populates itinerary with an upcoming commitment', () => {
    // Add first item
    itineraryPlanner.addItem(sessionId, exp1.id);
    // Add second item
    itineraryPlanner.addItem(sessionId, exp2.id);

    const itin = itineraryPlanner.getOrCreateItinerary(sessionId);
    assert.strictEqual(itin.items.length, 2);

    // Give a generous 3-hour window between stop 1 and stop 2
    const stop1 = itin.items[0];
    const stop2 = itin.items[1];
    const startTime1 = new Date();
    startTime1.setHours(10, 0, 0, 0);
    stop1.start_time = startTime1.toISOString();

    const startTime2 = new Date();
    startTime2.setHours(14, 30, 0, 0); // 4.5 hours later
    stop2.start_time = startTime2.toISOString();

    const generousResult = detourService.evaluateDetour(sessionId, detourCandidate.id);
    console.log(`Generous window detour: worth_it = ${generousResult.worth_it}, buffer = ${generousResult.buffer_remaining_minutes}m, reason = "${generousResult.reason}"`);
    assert.strictEqual(generousResult.still_on_time, true);
    assert.strictEqual(generousResult.worth_it, true);
    assert.ok(generousResult.reason.includes('safety cushion') || generousResult.reason.includes('cushion'));
  });

  await t.test('3. Tight/impossible window correctly triggers worth_it: false with delay reason', () => {
    const itin = itineraryPlanner.getOrCreateItinerary(sessionId);
    const stop1 = itin.items[0];
    const stop2 = itin.items[1];

    // Tighten window so candidate experience duration (e.g. 120m) cannot fit into a 45m gap!
    const startTime1 = new Date();
    startTime1.setHours(10, 0, 0, 0);
    stop1.start_time = startTime1.toISOString();

    const startTime2 = new Date();
    startTime2.setHours(11, 45, 0, 0); // only 1h 45m from stop1 start, leaving < 30m after stop 1 finishes!
    stop2.start_time = startTime2.toISOString();

    const tightResult = detourService.evaluateDetour(sessionId, detourCandidate.id);
    console.log(`Tight window detour: worth_it = ${tightResult.worth_it}, buffer = ${tightResult.buffer_remaining_minutes}m, reason = "${tightResult.reason}"`);

    assert.strictEqual(tightResult.worth_it, false, 'Tight detour must return worth_it: false');
    assert.strictEqual(tightResult.still_on_time, false, 'Detour should fail on-time check');
    assert.ok(
      tightResult.reason.includes('delay') || tightResult.reason.includes('Not recommended'),
      'Must explain delay in reason string'
    );
  });
});
