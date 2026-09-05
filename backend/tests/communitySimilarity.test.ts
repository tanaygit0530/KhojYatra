import test from 'node:test';
import assert from 'node:assert';
import { communityService } from '../src/services/communityService.js';
import { itineraryPlanner } from '../src/services/itineraryPlanner.js';

test('Phase 21 — Travelers Like You (Community Itinerary Intelligence)', async (t) => {
  await t.test('1. Finds top similar community itinerary with high similarity score', () => {
    // Parameters matching seed item 1: Delhi Heritage Culinary Odyssey
    // (destination: 'Delhi', duration_days: 1, budget: 2000, group: 'couple', interests: ['food_culinary'])
    const results = communityService.findSimilar({
      destination: 'Delhi',
      duration_days: 1,
      budget: 2000,
      group_type: 'couple',
      interests: ['food_culinary', 'hidden_gems']
    });

    assert.ok(results.length > 0, 'Should find similar itineraries');
    const top = results[0];
    console.log(`Top match: "${top.itinerary.title}" - Similarity: ${top.similarity_pct}%`);
    console.log('Matched dimensions:', top.matched_dimensions);

    assert.strictEqual(top.itinerary.title, 'Delhi Heritage Culinary Odyssey');
    assert.ok(top.similarity_pct >= 90, 'Close match should exceed 90% similarity');
    assert.ok(top.matched_dimensions.some(d => d.includes('Destination: Delhi')));
    assert.ok(top.matched_dimensions.some(d => d.includes('Duration: 1 day')));
    assert.ok(top.matched_dimensions.some(d => d.includes('Group: couple')));
  });

  await t.test('2. Multi-dimensional ranking respects divergent parameters', () => {
    // Parameters matching Jaipur artisan trip (seed item 2)
    const results = communityService.findSimilar({
      destination: 'Jaipur',
      duration_days: 2,
      budget: 3500,
      group_type: 'solo',
      interests: ['workshops_classes']
    });

    const top = results[0];
    console.log(`Jaipur search match: "${top.itinerary.title}" (${top.similarity_pct}%)`);
    assert.strictEqual(top.itinerary.title, 'Rajasthan Artisan Deep-Dive');
  });

  await t.test('3. Cloning clones items into the user session itinerary', () => {
    const sessionId = `session-clone-test-${Date.now()}`;
    const communityItinId = 'c1111111-1111-4111-8111-111111111111';

    const cloneResult = communityService.cloneToSession(communityItinId, sessionId);
    assert.ok(cloneResult.itinerary.items.length >= 2, 'Should clone community items');

    const userItin = itineraryPlanner.getOrCreateItinerary(sessionId);
    assert.strictEqual(userItin.items.length, cloneResult.itinerary.items.length);
    console.log(`Successfully cloned ${userItin.items.length} stops from "${cloneResult.cloned_from}"`);
  });
});
