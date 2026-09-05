import React, { useState } from 'react';
import { Card, PillButton, PillButtonOutline, Badge } from '@khojyatra/ui';
import { X, CheckCircle2, AlertCircle, CreditCard, Smartphone, Building2, Users } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { Experience, Booking } from '@khojyatra/types';

interface ReservationModalProps {
  experience: Experience;
  isOpen: boolean;
  onClose: () => void;
  onBookingConfirmed?: (booking: Booking) => void;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  experience,
  isOpen,
  onClose,
  onBookingConfirmed
}) => {
  const [step, setStep] = useState<'details' | 'payment' | 'confirmed'>('details');
  const [partySize, setPartySize] = useState<number>(1);
  const [travelerName, setTravelerName] = useState('Traveler');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');

  const [reservationData, setReservationData] = useState<any>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleReserve = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient<any>('bookings/reserve', {
        method: 'POST',
        body: JSON.stringify({
          experience_id: experience.id,
          traveler_name: travelerName,
          party_size: partySize
        })
      });
      setReservationData(res);
      setStep('payment');
    } catch (err: any) {
      setErrorMsg(err.message || 'Capacity exhausted or reservation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!reservationData) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient<{ booking: Booking }>('bookings/confirm-payment', {
        method: 'POST',
        body: JSON.stringify({
          experience_id: experience.id,
          slot_id: reservationData.slot_id,
          traveler_name: travelerName,
          party_size: partySize,
          total_amount: reservationData.total_amount,
          payment_method: paymentMethod
        })
      });

      setConfirmedBooking(res.booking);
      setStep('confirmed');
      if (onBookingConfirmed) onBookingConfirmed(res.booking);
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-cta-bg/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card variant="surface-alt" className="max-w-lg w-full p-6 space-y-6 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[rgba(20,22,26,0.06)] pb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-black text-lg text-text-primary">
              {step === 'details' && 'Reserve Experience'}
              {step === 'payment' && 'Simulate Payment'}
              {step === 'confirmed' && 'Reservation Confirmed!'}
            </h2>
            <Badge variant="accent" size="sm">
              Phase 27
            </Badge>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary font-bold text-sm"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-danger/10 border border-danger/20 rounded-card flex items-start gap-2 text-xs text-danger font-semibold">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Details & Party Size */}
        {step === 'details' && (
          <div className="space-y-4">
            <div className="p-3 bg-surface rounded-card border border-[rgba(20,22,26,0.06)] space-y-1">
              <span className="text-[11px] font-mono uppercase text-accent font-bold">
                {experience.category.replace('_', ' ')}
              </span>
              <h3 className="font-display font-bold text-base text-text-primary">
                {experience.title}
              </h3>
              <p className="text-xs text-text-secondary">
                Hosted by <strong>{experience.provider_name || 'Verified Artisan Host'}</strong>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Traveler Name
                </label>
                <input
                  type="text"
                  value={travelerName}
                  onChange={(e) => setTravelerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-card bg-surface border border-[rgba(20,22,26,0.08)] text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Travelers / Party Size
                </label>
                <div className="flex items-center justify-between bg-surface p-1.5 rounded-card border border-[rgba(20,22,26,0.08)]">
                  <div className="flex items-center gap-1 text-xs font-semibold px-2">
                    <Users size={13} className="text-accent" />
                    <span>{partySize}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPartySize(Math.max(1, partySize - 1))}
                      className="w-6 h-6 rounded-full bg-surface-alt flex items-center justify-center font-bold text-xs"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartySize(Math.min(6, partySize + 1))}
                      className="w-6 h-6 rounded-full bg-surface-alt flex items-center justify-center font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="p-3 bg-surface rounded-card border border-[rgba(20,22,26,0.06)] flex items-center justify-between text-xs">
              <span className="text-text-secondary">Total Payable (₹{experience.price_min} × {partySize}):</span>
              <span className="font-mono font-black text-base text-text-primary">
                ₹{experience.price_min * partySize}
              </span>
            </div>

            <div className="pt-3 border-t border-[rgba(20,22,26,0.06)] flex items-center justify-end gap-3">
              <PillButtonOutline size="sm" onClick={onClose}>
                Cancel
              </PillButtonOutline>
              <PillButton size="sm" onClick={handleReserve} disabled={loading}>
                {loading ? 'Checking Capacity...' : 'Proceed to Checkout →'}
              </PillButton>
            </div>
          </div>
        )}

        {/* STEP 2: Mock Payment */}
        {step === 'payment' && (
          <div className="space-y-4">
            <div className="p-3 bg-surface rounded-card border border-[rgba(20,22,26,0.06)] flex items-center justify-between text-xs">
              <span className="text-text-secondary">Total Amount Due:</span>
              <span className="font-mono font-black text-lg text-accent-dark">
                ₹{reservationData?.total_amount}
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-text-secondary">
                Select Mock Payment Method:
              </label>

              <div className="space-y-2">
                {[
                  { id: 'upi', label: 'UPI (Google Pay, PhonePe, BHIM)', icon: <Smartphone size={16} /> },
                  { id: 'card', label: 'Credit / Debit Card (Visa, RuPay, MasterCard)', icon: <CreditCard size={16} /> },
                  { id: 'netbanking', label: 'Net Banking (SBI, HDFC, ICICI)', icon: <Building2 size={16} /> }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`w-full p-3 rounded-card text-xs flex items-center justify-between border transition-all ${
                      paymentMethod === m.id
                        ? 'border-accent bg-accent-soft text-text-primary'
                        : 'border-[rgba(20,22,26,0.08)] bg-surface text-text-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-accent">{m.icon}</span>
                      <span className="font-semibold">{m.label}</span>
                    </div>
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${paymentMethod === m.id ? 'border-accent bg-accent' : 'border-[rgba(20,22,26,0.2)]'}`}>
                      {paymentMethod === m.id && <div className="w-1.5 h-1.5 rounded-full bg-surface" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-surface-alt rounded-card text-[11px] text-text-secondary">
              Demo Mode: No actual card or bank charges will occur. Click the simulation button below to trigger immediate server confirmation.
            </div>

            <div className="pt-3 border-t border-[rgba(20,22,26,0.06)] flex items-center justify-between">
              <PillButtonOutline size="sm" onClick={() => setStep('details')}>
                ← Back
              </PillButtonOutline>
              <PillButton size="sm" onClick={handleSimulatePayment} disabled={loading}>
                {loading ? 'Processing...' : 'Simulate Successful Payment'}
              </PillButton>
            </div>
          </div>
        )}

        {/* STEP 3: Confirmed */}
        {step === 'confirmed' && confirmedBooking && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-accent-soft text-accent mx-auto flex items-center justify-center">
              <CheckCircle2 size={28} />
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-black text-xl text-text-primary">
                Booking Confirmed!
              </h3>
              <p className="text-xs text-text-secondary">
                Your spot has been secured with the provider.
              </p>
            </div>

            <div className="p-4 bg-surface rounded-card border border-accent/30 space-y-2">
              <div className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">
                Official Booking ID
              </div>
              <div className="font-mono font-black text-2xl text-accent tracking-wider">
                {confirmedBooking.booking_id}
              </div>
              <div className="text-xs text-text-secondary pt-2 border-t border-[rgba(20,22,26,0.06)] flex justify-between">
                <span>Traveler: <strong>{confirmedBooking.traveler_name}</strong></span>
                <span>Party: <strong>{confirmedBooking.party_size} person(s)</strong></span>
                <span>Paid: <strong>₹{confirmedBooking.total_amount}</strong></span>
              </div>
            </div>

            <div className="pt-3 border-t border-[rgba(20,22,26,0.06)] flex items-center justify-center gap-3">
              <PillButton size="sm" onClick={onClose}>
                Done & Continue
              </PillButton>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ReservationModal;
