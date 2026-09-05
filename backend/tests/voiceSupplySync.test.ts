import test from 'node:test';
import assert from 'node:assert';
import { voiceSyncService } from '../src/services/voiceSyncService.js';
import { store } from '../src/data/store.js';

test('Phase 23 — WhatsApp Voice Supply Sync Pipeline', async (t) => {
  const provider = store.providers[1]; // Jaipur Craft Collective

  await t.test('1. Ingests simulated voice message, parses structured slot, and complies with audio disposal', async () => {
    const rawAudioSimulated = 'BASE64_SIMULATED_AUDIO_PAYLOAD_BUFFER';
    const transcript = 'tomorrow 5pm pottery workshop, 10 seats, ₹400';

    const input = {
      provider_id: provider.id,
      transcript,
      audio_base64: rawAudioSimulated
    };

    const extraction = await voiceSyncService.processVoice(input);

    console.log('Voice Extraction Result:', extraction.extracted_json);

    assert.strictEqual(extraction.provider_id, provider.id);
    assert.strictEqual(extraction.status, 'pending_confirmation', 'Must not be auto-published');
    assert.strictEqual(extraction.extracted_json.time, '17:00');
    assert.strictEqual(extraction.extracted_json.capacity, 10);
    assert.strictEqual(extraction.extracted_json.price, 400);
    assert.ok(extraction.extracted_json.experience_title?.toLowerCase().includes('pottery'));

    // Privacy compliance check: raw audio was discarded
    assert.strictEqual(input.audio_base64, undefined, 'Raw audio must be discarded immediately after processing');
  });

  await t.test('2. Requires explicit provider confirmation before publishing to live availability_slots', () => {
    const initialSlotCount = store.availabilitySlots.length;
    const pendingLogs = voiceSyncService.getPendingLogs(provider.id);
    assert.ok(pendingLogs.length > 0, 'Should have pending logs');

    const targetLog = pendingLogs[0];
    const confirmResult = voiceSyncService.confirmSlot(targetLog.id, provider.id);

    console.log(`Confirmation Message: "${confirmResult.message}"`);
    assert.strictEqual(confirmResult.log.status, 'confirmed');
    assert.strictEqual(store.availabilitySlots.length, initialSlotCount + 1, 'Live availability_slots must increase by 1');
    assert.strictEqual(confirmResult.slot.capacity_remaining, 10);
  });
});
