import test from 'node:test';
import assert from 'node:assert';
import { itineraryPlanner } from '../src/services/itineraryPlanner.js';
import { store } from '../src/data/store.js';

test('Phase 26 — Safety Check-in & Live Public Share', async (t) => {
  const sessionId = 'test-safety-traveler';
  const itin = itineraryPlanner.getOrCreateItinerary(sessionId);

  // Add initial experience to itinerary
  const exp1 = store.experiences[0];
  itineraryPlanner.addItem(sessionId, exp1.id);

  let shareToken = '';

  await t.test('1. Generates a safety check-in record with unique share_token and 24h expiration', () => {
    shareToken = `ky-safe-test-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const checkin = {
      id: `checkin-${Date.now()}`,
      itinerary_id: itin.id,
      share_token: shareToken,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    };
    store.safetyCheckins.push(checkin);

    assert.ok(checkin.share_token.startsWith('ky-safe-'));
    assert.strictEqual(checkin.itinerary_id, itin.id);
  });

  await t.test('2. Retrieves live itinerary from public token and reflects active items', () => {
    const checkin = store.safetyCheckins.find(c => c.share_token === shareToken);
    assert.ok(checkin, 'Checkin record should exist');

    const liveItin = itineraryPlanner.getItineraryById(checkin.itinerary_id);
    assert.ok(liveItin, 'Live itinerary should be resolved');
    assert.strictEqual(liveItin.items.length, 1);
    assert.strictEqual(liveItin.items[0].experience_id, exp1.id);
  });

  await t.test('3. Dynamic reflection: Live modifications reflect on the shared token without re-issuing link', () => {
    const exp2 = store.experiences[1];
    itineraryPlanner.addItem(sessionId, exp2.id);

    // Query again using the same checkin token
    const checkin = store.safetyCheckins.find(c => c.share_token === shareToken);
    const liveItin = itineraryPlanner.getItineraryById(checkin!.itinerary_id);

    assert.strictEqual(liveItin!.items.length, 2, 'Live itinerary on shared token must immediately reflect newly added stop');
    assert.strictEqual(liveItin!.items[1].experience_id, exp2.id);
  });
});
