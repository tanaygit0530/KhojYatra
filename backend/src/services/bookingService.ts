import { Booking } from '@khojyatra/types';
import { store } from '../data/store.js';

export interface ReserveRequest {
  experience_id: string;
  slot_id?: string;
  session_id: string;
  traveler_name: string;
  party_size: number;
}

export interface ConfirmPaymentRequest {
  experience_id: string;
  slot_id: string;
  session_id: string;
  traveler_name: string;
  party_size: number;
  total_amount: number;
  payment_method: 'upi' | 'card' | 'netbanking';
}

export class BookingService {
  /**
   * Phase 27: Reserve slot
   * Validates capacity_remaining >= party_size at moment of click,
   * and decrements it optimistically. Blocks double-booking if capacity reaches 0.
   */
  public reserveSlot(req: ReserveRequest): {
    slot_id: string;
    experience_title: string;
    party_size: number;
    price_per_person: number;
    total_amount: number;
    slot_time: string;
    remaining_capacity: number;
  } {
    const exp = store.getExperienceById(req.experience_id);
    if (!exp) {
      throw new Error(`Experience ${req.experience_id} not found`);
    }

    if (exp.offering_status !== 'published') {
      throw new Error('This experience is currently unpublished and cannot be booked.');
    }

    // Find slot
    let slot = req.slot_id
      ? store.availabilitySlots.find(s => s.id === req.slot_id)
      : store.availabilitySlots.find(s => s.experience_id === req.experience_id && s.capacity_remaining >= req.party_size);

    if (!slot) {
      // Check if any slot exists with 0 capacity
      const soldOut = store.availabilitySlots.find(s => s.experience_id === req.experience_id);
      if (soldOut && soldOut.capacity_remaining === 0) {
        throw new Error('CAPACITY_EXHAUSTED: This experience is completely sold out for the selected window.');
      }
      throw new Error(`No available booking slot found with capacity for ${req.party_size} traveler(s).`);
    }

    if (slot.capacity_remaining < req.party_size) {
      throw new Error(`CAPACITY_EXHAUSTED: Only ${slot.capacity_remaining} spots remaining. Cannot book for ${req.party_size}.`);
    }

    // Optimistically decrement capacity
    slot.capacity_remaining -= req.party_size;

    const pricePerPerson = exp.price_min;
    const totalAmount = pricePerPerson * req.party_size;

    return {
      slot_id: slot.id,
      experience_title: exp.title,
      party_size: req.party_size,
      price_per_person: pricePerPerson,
      total_amount: totalAmount,
      slot_time: slot.start_time,
      remaining_capacity: slot.capacity_remaining
    };
  }

  /**
   * Completes checkout with simulated payment and issues official KY-DEMO-#### confirmation
   */
  public confirmPayment(req: ConfirmPaymentRequest): Booking {
    // Generate KY-DEMO-####
    const demoNumber = Math.floor(1000 + Math.random() * 9000);
    const bookingId = `KY-DEMO-${demoNumber}`;

    const booking: Booking = {
      id: `book-${Date.now()}-${demoNumber}`,
      booking_id: bookingId,
      experience_id: req.experience_id,
      slot_id: req.slot_id,
      session_id: req.session_id,
      traveler_name: req.traveler_name || 'Traveler',
      party_size: req.party_size,
      total_amount: req.total_amount,
      payment_method: req.payment_method,
      status: 'confirmed',
      created_at: new Date().toISOString()
    };

    store.bookings.unshift(booking);
    return booking;
  }

  public getBookingsForSession(sessionId: string): Booking[] {
    return store.bookings.filter(b => b.session_id === sessionId);
  }

  public getBookingByCode(bookingCode: string): Booking | undefined {
    return store.bookings.find(b => b.booking_id === bookingCode);
  }
}

export const bookingService = new BookingService();
