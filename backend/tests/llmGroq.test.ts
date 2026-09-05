import test from 'node:test';
import assert from 'node:assert';
import { aiIntakeService } from '../src/services/aiIntakeService.js';
import { llmService, GroqLLMService } from '../src/services/llmService.js';
import { decisionEngine } from '../src/services/decisionEngine.js';
import { itineraryPlanner } from '../src/services/itineraryPlanner.js';
import { routeOptimizer } from '../src/services/routeOptimizer.js';
import { frictionEngine } from '../src/services/frictionEngine.js';
import { store } from '../src/data/store.js';
import { ConstraintIntake } from '@khojyatra/types';

test('Groq LLM Migration & AI Planning Pipeline Suite', async (t) => {
  // Test Case 1: Example 1 — Pune Food & Culture
  await t.test('1. Example 1: "I have ₹2000 and 6 hours in Pune. I want local food and culture."', async () => {
    const prompt = 'I have ₹2000 and 6 hours in Pune. I want local food and culture.';
    const result = await aiIntakeService.parseIntake(prompt);

    assert.ok(result, 'Result should be returned');
    assert.strictEqual(result.extracted_entities.budget_max, 2000, 'Parsed budget max should be 2000');
    assert.strictEqual(result.extracted_entities.duration_minutes, 360, '6 hours should parse to 360 minutes');
    assert.strictEqual(result.extracted_entities.destination, 'Pune', 'Destination should be Pune');
    assert.ok(result.extracted_entities.interests?.includes('food_culinary'), 'Interests include food_culinary');
    assert.ok(result.extracted_entities.interests?.includes('cultural_heritage'), 'Interests include cultural_heritage');
    assert.strictEqual(result.parsed_intake.duration_minutes, 360);
    assert.strictEqual(result.parsed_intake.budget?.max, 2000);
  });

  // Test Case 2: Example 2 — Train connection & nearby cheap requirement
  await t.test('2. Example 2: "I have 3 hours before my train. I want something nearby and cheap."', async () => {
    const prompt = 'I have 3 hours before my train. I want something nearby and cheap.';
    const result = await aiIntakeService.parseIntake(prompt);

    assert.ok(result, 'Result should be returned');
    assert.strictEqual(result.extracted_entities.duration_minutes, 180, '3 hours should parse to 180 minutes');
    assert.ok(result.extracted_entities.transport_constraint, 'Should extract transport constraint (train)');
    assert.ok(result.extracted_entities.nearby_required, 'Should extract nearby requirement');
    assert.ok(result.extracted_entities.budget_max! <= 500, 'Cheap preference sets modest budget cap <= ₹500');
    assert.strictEqual(result.parsed_intake.duration_minutes, 180);
  });

  // Test Case 3: Example 3 — Group size 5 and wheelchair accessibility
  await t.test('3. Example 3: "We are 5 people and one person needs wheelchair accessibility."', async () => {
    const prompt = 'We are 5 people and one person needs wheelchair accessibility.';
    const result = await aiIntakeService.parseIntake(prompt);

    assert.ok(result, 'Result should be returned');
    assert.strictEqual(result.extracted_entities.group_size, 5, 'Group size should be 5');
    assert.ok(result.extracted_entities.accessibility_tags?.includes('wheelchair_accessible'), 'Accessibility tag includes wheelchair_accessible');
    assert.strictEqual(result.parsed_intake.group?.size, 5);
    assert.ok(result.parsed_intake.accessibility_tags?.includes('wheelchair_accessible'));
  });

  // Test Case 4: Provider Abstraction & GroqLLMService Mock Integration
  await t.test('4. GroqLLMService: Handles structured completions & graceful error handling', async () => {
    // Instantiate with dummy key for isolated client unit testing
    const testLlm = new GroqLLMService('gsk_test_mock_key');
    assert.strictEqual(testLlm.isConfigured(), true, 'Service reports configured when key provided');

    // Test fallback behavior without throwing
    const explanation = testLlm.fallbackSynthesizeExplanation(
      ['1.5 km away (8m transit)', 'Matches your ₹1200 budget ceiling'],
      'Old Delhi Secret Spice Route'
    );
    assert.ok(explanation.includes('Old Delhi Secret Spice Route'));
    assert.ok(explanation.includes('1.5 km away'));

    const replanExplanation = testLlm.fallbackSynthesizeReplan(
      'weather',
      'Swapped outdoor boat ride with indoor craft atelier',
      { weather: 'rain' }
    );
    assert.ok(replanExplanation.includes('indoor cultural experiences during rain'));
  });

  // Test Case 5: Architecture Rule 17 — LLM does NOT make feasibility decisions
  await t.test('5. Architectural Rule: Deterministic Engine enforces hard constraints independently of LLM', () => {
    const sampleIntake: ConstraintIntake = {
      location_context: { mode: 'current', lat: 28.6506, lng: 77.2303, effective_time: new Date().toISOString() },
      duration_minutes: 120,
      budget: { min: 0, max: 800 },
      group: { size: 2, type: 'couple' },
      interests: ['food_culinary'],
      accessibility_tags: []
    };

    const { recommendations } = decisionEngine.evaluate(sampleIntake);
    assert.ok(recommendations.length > 0, 'Returns feasible recommendations');

    for (const rec of recommendations) {
      assert.ok(rec.experience.price_min <= sampleIntake.budget.max, 'Backend enforces price_min <= budget.max');
      assert.strictEqual(rec.experience.offering_status, 'published', 'Backend enforces published status');
      assert.ok(rec.reasons.length > 0, 'Backend generates deterministic match factors');
    }
  });

  // Test Case 6: Full Application Pipeline
  // Traveler input → Intent extraction → Candidate filtering → Ranking → Explanation → Day Planner → Route Optimization
  await t.test('6. Complete Application Flow: Input -> Parse -> Feasibility -> Day Planner -> Route Optimization', async () => {
    const travelerInput = 'I have ₹1500 and 4 hours in Delhi for food and cultural heritage';
    const intakeResult = await aiIntakeService.parseIntake(travelerInput);
    assert.strictEqual(intakeResult.parsed_intake.duration_minutes, 240);
    const fullIntake: ConstraintIntake = {
      location_context: { mode: 'current', lat: 28.6506, lng: 77.2303, effective_time: new Date().toISOString() },
      duration_minutes: intakeResult.parsed_intake.duration_minutes || 240,
      budget: intakeResult.parsed_intake.budget as { min: number; max: number },
      group: intakeResult.parsed_intake.group as { size: number; type: 'couple' },
      interests: intakeResult.parsed_intake.interests as any,
      accessibility_tags: intakeResult.parsed_intake.accessibility_tags || []
    };

    // 2. Deterministic candidate evaluation & ranking
    const { recommendations } = decisionEngine.evaluate(fullIntake);
    assert.ok(recommendations.length >= 2, 'Found candidate experiences meeting constraints');

    // 3. AI Explanation synthesis
    const topRec = recommendations[0];
    const explanation = aiIntakeService.synthesizeExplanation(topRec.reasons, topRec.experience.title);
    assert.ok(explanation.length > 10, 'Synthesized natural explanation');

    // 4. AI Day Planner insertion
    const testSessionId = `test-groq-${Date.now()}`;
    const add1 = itineraryPlanner.addItem(testSessionId, recommendations[0].experience.id);
    assert.strictEqual(add1.itinerary.items.length, 1);
    const add2 = itineraryPlanner.addItem(testSessionId, recommendations[1].experience.id);
    assert.strictEqual(add2.itinerary.items.length, 2);

    // 5. Best Route Optimization (Nearest Neighbor)
    const exps = [recommendations[0].experience, recommendations[1].experience];
    const optimized = routeOptimizer.optimizeOrder({ lat: 28.6506, lng: 77.2303 }, exps);
    assert.strictEqual(optimized.ordered_stops.length, 2);
    assert.ok(optimized.total_travel_time_after_min >= 0);
  });

  // Test Case 7: Context Change -> Friction Engine Repair -> Deterministic Replan -> AI Replan Explanation
  await t.test('7. Context Change -> Friction Engine -> Replan -> Explanation', async () => {
    const sessionId = `friction-test-${Date.now()}`;
    // Add two experiences
    const exp1 = store.experiences[0];
    const exp2 = store.experiences[1];
    itineraryPlanner.addItem(sessionId, exp1.id);
    itineraryPlanner.addItem(sessionId, exp2.id);

    // Friction trigger: weather changes to rain
    const repairResult = frictionEngine.repair(sessionId, { weather: 'rain' });
    assert.ok(repairResult.repaired_itinerary, 'Itinerary repaired');
    assert.ok(repairResult.friction_reports.length > 0, 'Friction reports generated');

    // Deterministic replan with Groq explanation fallback
    const baseIntake: ConstraintIntake = {
      location_context: { mode: 'current', lat: 28.6506, lng: 77.2303, effective_time: new Date().toISOString() },
      duration_minutes: 180,
      budget: { min: 200, max: 2000 },
      group: { size: 2, type: 'couple' },
      interests: ['cultural_heritage', 'workshops_classes'],
      accessibility_tags: []
    };

    const replanResult = decisionEngine.replan(
      baseIntake,
      { type: 'weather', value: { condition: 'rain' } },
      [exp1.id, exp2.id]
    );

    assert.ok(replanResult.diff, 'Diff generated');
    const aiReplanExplanation = llmService.fallbackSynthesizeReplan('weather', 'Adjusted for rain', { weather: 'rain' });
    assert.ok(aiReplanExplanation.includes('indoor cultural experiences during rain'));
  });
});
