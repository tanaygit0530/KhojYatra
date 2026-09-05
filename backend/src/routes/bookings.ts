import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { bookingService } from '../services/bookingService.js';
import { createSuccessResponse, createErrorResponse } from '@khojyatra/types';

const router = Router();

const ReserveSchema = z.object({
  experience_id: z.string(),
  slot_id: z.string().optional(),
  traveler_name: z.string().default('Traveler'),
  party_size: z.number().min(1).default(1)
});

const ConfirmPaymentSchema = z.object({
  experience_id: z.string(),
  slot_id: z.string(),
  traveler_name: z.string().default('Traveler'),
  party_size: z.number().min(1),
  total_amount: z.number().min(0),
  payment_method: z.enum(['upi', 'card', 'netbanking'])
});

// POST /api/v1/bookings/reserve
router.post('/bookings/reserve', (req: Request, res: Response) => {
  const parse = ReserveSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json(
      createErrorResponse('VALIDATION_ERROR', 'Invalid reserve parameters', parse.error.format())
    );
  }

  const sessionId = req.khojContext.sessionId || 'default-session';
  try {
    const reservation = bookingService.reserveSlot({
      ...parse.data,
      session_id: sessionId
    });
    return res.status(200).json(createSuccessResponse(reservation));
  } catch (err: any) {
    const isExhausted = err.message.includes('CAPACITY_EXHAUSTED');
    return res.status(isExhausted ? 409 : 400).json(
      createErrorResponse(isExhausted ? 'CONFLICT' : 'VALIDATION_ERROR', err.message)
    );
  }
});

// POST /api/v1/bookings/confirm-payment
router.post('/bookings/confirm-payment', (req: Request, res: Response) => {
  const parse = ConfirmPaymentSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json(
      createErrorResponse('VALIDATION_ERROR', 'Invalid payment confirmation payload', parse.error.format())
    );
  }

  const sessionId = req.khojContext.sessionId || 'default-session';
  try {
    const booking = bookingService.confirmPayment({
      ...parse.data,
      session_id: sessionId
    });
    return res.status(200).json(
      createSuccessResponse({
        booking,
        message: `Booking successfully confirmed! Your confirmation code is ${booking.booking_id}.`
      })
    );
  } catch (err: any) {
    return res.status(400).json(createErrorResponse('INTERNAL', err.message));
  }
});

// GET /api/v1/bookings/my-bookings
router.get('/bookings/my-bookings', (req: Request, res: Response) => {
  const sessionId = req.khojContext.sessionId || 'default-session';
  const bookings = bookingService.getBookingsForSession(sessionId);
  return res.status(200).json(createSuccessResponse({ bookings }));
});

// GET /api/v1/bookings/:code
router.get('/bookings/:code', (req: Request, res: Response) => {
  const { code } = req.params;
  const booking = bookingService.getBookingByCode(code.toUpperCase());
  if (!booking) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Booking ${code} not found`));
  }
  return res.status(200).json(createSuccessResponse({ booking }));
});

export default router;
