import test from 'node:test';
import assert from 'node:assert';
import { aiIntakeService } from '../src/services/aiIntakeService.js';

test('Phase 20 — Natural-Language Intake + AI Explanations', async (t) => {
  await t.test('1. Parses complex conversational sentence into structured ConstraintIntake', async () => {
    const rawPrompt = "I have 3 hours and ₹1200 in Old Delhi with my friend, love street food and cultural heritage, need step-free access";
    const result = await aiIntakeService.parseIntake(rawPrompt);

    console.log('Parsed Entities:', result.extracted_entities);
    console.log('Parsed Intake:', result.parsed_intake);

    assert.strictEqual(result.extracted_entities.duration_minutes, 180, 'Extracted 3 hours as 180 min');
    assert.strictEqual(result.extracted_entities.budget_max, 1200, 'Extracted ₹1200 budget');
    assert.strictEqual(result.extracted_entities.destination, 'Delhi');
    assert.strictEqual(result.extracted_entities.group_type, 'friends');
    assert.ok(result.extracted_entities.interests?.includes('food_culinary'));
    assert.ok(result.extracted_entities.interests?.includes('cultural_heritage'));
    assert.ok(result.extracted_entities.accessibility_tags?.includes('step_free'));

    assert.strictEqual(result.parsed_intake.duration_minutes, 180);
    assert.strictEqual(result.parsed_intake.budget?.max, 1200);
  });

  await t.test('2. Handles vague conversational inputs with fallback defaults', async () => {
    const rawPrompt = "Show me something quick and cheap in Jaipur alone";
    const result = await aiIntakeService.parseIntake(rawPrompt);

    assert.strictEqual(result.extracted_entities.duration_minutes, 90, 'Quick mapped to 90 min');
    assert.strictEqual(result.extracted_entities.group_type, 'solo');
    assert.strictEqual(result.extracted_entities.destination, 'Jaipur');
  });

  await t.test('3. Synthesizes deterministic reasons array into single natural prose sentence', () => {
    const reasons = [
      '1.8 km away (9m transit)',
      'Fits your 120m window',
      '₹500/person (within ₹1500)',
      'Locality Score 98/100'
    ];
    const sentence = aiIntakeService.synthesizeExplanation(reasons, 'Old Delhi Kebab Trail');
    console.log(`Synthesized explanation: "${sentence}"`);

    assert.ok(sentence.startsWith('Recommended for Old Delhi Kebab Trail'));
    assert.ok(sentence.includes('1.8 km away'));
  });
});
