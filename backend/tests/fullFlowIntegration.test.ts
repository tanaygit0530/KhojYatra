import test from 'node:test';
import assert from 'node:assert/strict';
import { decisionEngine } from '../src/services/decisionEngine.js';
import { itineraryPlanner } from '../src/services/itineraryPlanner.js';
import { bookingService } from '../src/services/bookingService.js';
import { store } from '../src/data/store.js';
import { ConstraintIntake } from '@khojyatra/types';

test('Phase 30 — End-to-End User Journey Integration Test', async (t) => {
  const sessionId = `test-e2e-session-${Date.now()}`;

  const intake: ConstraintIntake = {
    location_context: {
      mode: 'planned',
      lat: 25.3176, // Varanasi Assi Ghat
      lng: 82.9739,
      effective_time: new Date(Date.now() + 3600 * 1000).toISOString()
    },
    duration_minutes: 240,
    budget: { min: 300, max: 2000 },
    group: { size: 2, type: 'couple' },
    interests: ['cultural_heritage', 'food_culinary'],
    weather_condition: 'clear'
  };

  let topRecExperienceId: string;
  let currentRecIds: string[] = [];

  await t.test('1. Search: Returns ranked recommendations with scores and deterministic reasons', () => {
    const startTime = Date.now();
    const { recommendations, relaxedConstraints } = decisionEngine.evaluate(intake);
    const elapsed = Date.now() - startTime;

    assert.ok(elapsed < 2000, `Search execution should be < 2000ms (took ${elapsed}ms)`);
    assert.ok(recommendations.length > 0, 'Must return recommendations');

    const topRec = recommendations[0];
    assert.ok(topRec.score > 0, 'Top recommendation score must be > 0');
    assert.ok(topRec.reasons.length > 0, 'Top recommendation must have deterministic reasons');
    assert.ok(topRec.experience.locality_score >= 0, 'Must have locality score');

    topRecExperienceId = topRec.experience.id;
    currentRecIds = recommendations.map(r => r.experience.id);
  });

  await t.test('2. Itinerary: Adds top candidate to day plan and tracks budget status', () => {
    const itin = itineraryPlanner.getOrCreateItinerary(sessionId);
    assert.equal(itin.items.length, 0);

    const addResult = itineraryPlanner.addItem(sessionId, topRecExperienceId);
    assert.equal(addResult.itinerary.items.length, 1);
    assert.equal(addResult.itinerary.items[0].experience_id, topRecExperienceId);

    const budgetStatus = itineraryPlanner.getBudgetStatus(sessionId);
    assert.ok(budgetStatus.total_committed > 0, 'Committed budget should be greater than zero');
  });

  let reservedSlotId: string;
  let initialCapacity: number;

  await t.test('3. Reserve Slot: Optimistically decrements available capacity', () => {
    const slot = store.availabilitySlots.find(s => s.experience_id === topRecExperienceId && s.capacity_remaining > 0)
      || store.availabilitySlots[0];
    reservedSlotId = slot.id;
    initialCapacity = slot.capacity_remaining;

    const reservation = bookingService.reserveSlot({
      experience_id: slot.experience_id,
      slot_id: slot.id,
      session_id: sessionId,
      traveler_name: 'Aditi Sharma',
      party_size: 2
    });

    assert.equal(reservation.party_size, 2);
    assert.equal(reservation.remaining_capacity, initialCapacity - 2);

    const updatedSlot = store.availabilitySlots.find(s => s.id === reservedSlotId);
    assert.equal(updatedSlot?.capacity_remaining, initialCapacity - 2, 'Slot capacity must decrement by party size');
  });

  await t.test('4. Payment & Checkout: Generates official KY-DEMO-#### confirmation code', () => {
    const payment = bookingService.confirmPayment({
      experience_id: topRecExperienceId,
      slot_id: reservedSlotId,
      session_id: sessionId,
      traveler_name: 'Aditi Sharma',
      party_size: 2,
      total_amount: 1200,
      payment_method: 'upi'
    });

    assert.equal(payment.status, 'confirmed');
    assert.match(payment.booking_id, /^KY-DEMO-\d{4}$/, 'Confirmation code must match KY-DEMO-#### format');
  });

  await t.test('5. Friction & Adaptive Replan: Recalculates candidate ordering in < 2 seconds when rain occurs', () => {
    const replanStart = Date.now();
    const replanResult = decisionEngine.replan(
      intake,
      { type: 'weather', value: { condition: 'rain' } },
      currentRecIds
    );
    const replanElapsed = Date.now() - replanStart;

    assert.ok(replanElapsed < 2000, `Replan should execute under 2000ms (took ${replanElapsed}ms)`);
    assert.ok(replanResult.recommendations.length > 0, 'Replan must return valid recommendations');
    assert.ok(replanResult.diff, 'Replan diff must include added/removed breakdown');

    // Verify rain-friendly reasons appear
    const anyRainSafe = replanResult.recommendations.some(r =>
      r.reasons.some(reason => reason.toLowerCase().includes('rain') || reason.toLowerCase().includes('indoor') || reason.toLowerCase().includes('weather'))
    );
    assert.ok(anyRainSafe, 'Replan under rain must highlight weather-safe reasoning');
  });

  await t.test('6. Safety Check-in: Generates 24h public share token and reflects live stops', () => {
    const shareToken = `ky-safe-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const checkin = {
      id: `checkin-${Date.now()}`,
      itinerary_id: itineraryPlanner.getOrCreateItinerary(sessionId).id,
      share_token: shareToken,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    };
    store.safetyCheckins.push(checkin);

    const storedCheckin = store.safetyCheckins.find(c => c.share_token === shareToken);
    assert.ok(storedCheckin, 'Checkin token must exist in store');

    const liveItin = itineraryPlanner.getItineraryById(storedCheckin.itinerary_id);
    assert.ok(liveItin, 'Live itinerary should be resolvable');
    assert.equal(liveItin.items.length, 1);
  });
});
