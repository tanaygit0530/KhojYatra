import test from 'node:test';
import assert from 'node:assert';
import { bookingService } from '../src/services/bookingService.js';
import { store } from '../src/data/store.js';

test('Phase 27 — Mock Reservation, Checkout & Payment', async (t) => {
  const exp = store.experiences.find(e => e.offering_status === 'published')!;
  
  // Create a dedicated slot with capacity 2 for precise race/exhaustion testing
  const testSlotId = `slot-test-booking-${Date.now()}`;
  store.availabilitySlots.unshift({
    id: testSlotId,
    experience_id: exp.id,
    start_time: new Date(Date.now() + 3600 * 1000 * 4).toISOString(),
    end_time: new Date(Date.now() + 3600 * 1000 * 6).toISOString(),
    capacity_remaining: 2
  });

  await t.test('1. Validates capacity and decrements optimistically upon reservation click', () => {
    const res = bookingService.reserveSlot({
      experience_id: exp.id,
      slot_id: testSlotId,
      session_id: 'session-traveler-alpha',
      traveler_name: 'Aarav Sharma',
      party_size: 2
    });

    assert.strictEqual(res.slot_id, testSlotId);
    assert.strictEqual(res.party_size, 2);
    assert.strictEqual(res.remaining_capacity, 0); // 2 - 2 = 0
    assert.strictEqual(res.total_amount, exp.price_min * 2);

    // Verify in store
    const slotInStore = store.availabilitySlots.find(s => s.id === testSlotId);
    assert.strictEqual(slotInStore?.capacity_remaining, 0);
  });

  await t.test('2. Completes simulated payment and generates official KY-DEMO-#### confirmation code', () => {
    const booking = bookingService.confirmPayment({
      experience_id: exp.id,
      slot_id: testSlotId,
      session_id: 'session-traveler-alpha',
      traveler_name: 'Aarav Sharma',
      party_size: 2,
      total_amount: exp.price_min * 2,
      payment_method: 'upi'
    });

    assert.ok(booking.booking_id.startsWith('KY-DEMO-'), `Booking ID must follow KY-DEMO-#### format (got ${booking.booking_id})`);
    assert.strictEqual(booking.status, 'confirmed');
    assert.strictEqual(booking.payment_method, 'upi');
    assert.strictEqual(booking.traveler_name, 'Aarav Sharma');

    // Verify lookup by code
    const retrieved = bookingService.getBookingByCode(booking.booking_id);
    assert.ok(retrieved);
    assert.strictEqual(retrieved.id, booking.id);
  });

  await t.test('3. Blocks double-booking attempt on now-zero-capacity slot with clear sold out message', () => {
    assert.throws(
      () => {
        bookingService.reserveSlot({
          experience_id: exp.id,
          slot_id: testSlotId,
          session_id: 'session-traveler-beta',
          traveler_name: 'Priya Verma',
          party_size: 1
        });
      },
      (err: Error) => {
        return err.message.includes('CAPACITY_EXHAUSTED') || err.message.includes('sold out') || err.message.includes('spots remaining');
      }
    );
  });
});
