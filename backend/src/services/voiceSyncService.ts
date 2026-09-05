import { WhatsAppVoiceExtraction } from '@khojyatra/types';
import { store } from '../data/store.js';

export interface ProcessVoiceInput {
  provider_id: string;
  transcript?: string;
  audio_base64?: string;
}

export class VoiceSyncService {
  public voiceLogs: WhatsAppVoiceExtraction[] = [];

  constructor() {
    // Seed an initial demo voice update for Jaipur pottery collective
    this.seedInitialVoiceLog();
  }

  private seedInitialVoiceLog() {
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    const dateStr = tomorrow.toISOString().slice(0, 10);

    this.voiceLogs.push({
      id: 'voice-log-demo-1',
      provider_id: store.providers[1]?.id || 'p2222222-2222-4222-8222-222222222222',
      transcript: 'Namaste, tomorrow 5pm pottery workshop we have 10 seats open at 400 rupees.',
      extracted_json: {
        experience_title: 'Jaipur Master Artisan Cobalt Blue Pottery',
        date: dateStr,
        time: '17:00',
        capacity: 10,
        price: 400
      },
      status: 'pending_confirmation',
      created_at: new Date().toISOString()
    });
  }

  /**
   * Phase 23: Voice Ingestion Pipeline
   * Discards raw audio after processing to comply with privacy consent policy.
   */
  public async processVoice(input: ProcessVoiceInput): Promise<WhatsAppVoiceExtraction> {
    // Consent policy: Discard raw audio immediately after intake
    if (input.audio_base64) {
      input.audio_base64 = undefined; // permanently release audio buffer
    }

    const raw = (input.transcript || 'tomorrow 5pm pottery workshop, 10 seats, ₹400').toLowerCase();

    // 1. Date extraction
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    let dateStr = tomorrow.toISOString().slice(0, 10);
    if (raw.includes('today')) {
      dateStr = new Date().toISOString().slice(0, 10);
    } else if (raw.includes('day after tomorrow')) {
      dateStr = new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 10);
    }

    // 2. Time extraction
    let timeStr = '17:00';
    const timeMatch = raw.match(/(\d{1,2})\s*(?:pm|am|:00)/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      if (raw.includes('pm') && hour < 12) hour += 12;
      timeStr = `${hour.toString().padStart(2, '0')}:00`;
    }

    // 3. Capacity extraction
    let capacity = 10;
    const capacityMatch = raw.match(/(\d+)\s*(?:seats|spots|people|capacity)/i);
    if (capacityMatch) {
      capacity = parseInt(capacityMatch[1], 10);
    }

    // 4. Price extraction
    let price = 400;
    const priceMatch = raw.match(/(?:₹|rs\.?|rupees)\s*(\d+)/i) || raw.match(/(\d+)\s*(?:rupees|rs|inr)/i);
    if (priceMatch) {
      price = parseInt(priceMatch[1], 10);
    }

    // 5. Experience Title Match
    const providerOfferings = store.experiences.filter(e => e.provider_id === input.provider_id);
    let matchedTitle = providerOfferings[0]?.title || 'Artisan Workshop';
    if (raw.includes('pottery') || raw.includes('blue pottery')) {
      const potExp = providerOfferings.find(e => e.title.toLowerCase().includes('pottery'));
      if (potExp) matchedTitle = potExp.title;
    } else if (raw.includes('boat') || raw.includes('chants')) {
      const boatExp = providerOfferings.find(e => e.title.toLowerCase().includes('boat'));
      if (boatExp) matchedTitle = boatExp.title;
    }

    const logEntry: WhatsAppVoiceExtraction = {
      id: `voice-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      provider_id: input.provider_id,
      transcript: input.transcript || 'tomorrow 5pm pottery workshop, 10 seats, ₹400',
      extracted_json: {
        experience_title: matchedTitle,
        date: dateStr,
        time: timeStr,
        capacity,
        price
      },
      status: 'pending_confirmation',
      created_at: new Date().toISOString()
    };

    this.voiceLogs.unshift(logEntry);
    return logEntry;
  }

  /**
   * Phase 23: Provider Explicit Confirmation Gate
   * Moves staged slot from review into live availability_slots table.
   */
  public confirmSlot(logId: string, providerId: string) {
    const log = this.voiceLogs.find(l => l.id === logId);
    if (!log) {
      throw new Error(`Voice log ${logId} not found`);
    }

    if (log.provider_id !== providerId) {
      throw new Error('Unauthorized provider confirmation');
    }

    // Find experience to attach
    const providerOfferings = store.experiences.filter(e => e.provider_id === providerId);
    const exp = providerOfferings.find(e => e.title === log.extracted_json.experience_title) || providerOfferings[0];
    if (!exp) {
      throw new Error('No valid experience found for provider');
    }

    const [hour, min] = log.extracted_json.time.split(':').map(Number);
    const startDate = new Date(log.extracted_json.date);
    startDate.setHours(hour, min, 0, 0);

    const endDate = new Date(startDate.getTime() + exp.duration_min * 60 * 1000);

    const newSlot = {
      id: `slot-voice-${Date.now()}`,
      experience_id: exp.id,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      capacity_remaining: log.extracted_json.capacity
    };

    store.availabilitySlots.push(newSlot);
    log.status = 'confirmed';

    return {
      log,
      slot: newSlot,
      message: `Confirmed! Published ${newSlot.capacity_remaining} seats for "${exp.title}" on ${log.extracted_json.date} at ${log.extracted_json.time}.`
    };
  }

  public getPendingLogs(providerId: string) {
    return this.voiceLogs.filter(l => l.provider_id === providerId && l.status === 'pending_confirmation');
  }
}

export const voiceSyncService = new VoiceSyncService();
