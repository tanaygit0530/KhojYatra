import test from 'node:test';
import assert from 'node:assert';
import { demandService } from '../src/services/demandService.js';
import { store } from '../src/data/store.js';

test('Phase 22 — Provider Demand Heatmap Insights', async (t) => {
  // Provider 0: Dilli Khana Guild (covers 'food_culinary' in Delhi)
  // Provider 1: Jaipur Craft Collective (covers 'workshops_classes' in Jaipur, NO food coverage)
  const providerFood = store.providers[0];
  const providerCraft = store.providers[1];

  await t.test('1. Detects unmet demand for provider lacking category coverage', () => {
    // Seed a surge of evening food searches near Jaipur
    for (let i = 0; i < 15; i++) {
      demandService.searchLogs.push({
        id: `surge-food-${i}`,
        lat: 26.9124,
        lng: 75.7873,
        category: 'food_culinary',
        time_window: '18:00-21:00',
        created_at: new Date().toISOString(),
        constraint_json: { interests: ['food_culinary'] }
      });
    }

    const craftInsights = demandService.getDemandInsights(providerCraft.id);
    console.log(`Craft Provider Insights count: ${craftInsights.length}`);
    craftInsights.forEach((ins, idx) => {
      console.log(`  ${idx + 1}. [${ins.category}] ${ins.time_window} (Searches: ${ins.search_count}, Covered: ${ins.provider_has_coverage})`);
      console.log(`     Message: "${ins.message}"`);
    });

    const unmetFoodInsight = craftInsights.find(i => i.category === 'food_culinary' && !i.provider_has_coverage);
    assert.ok(unmetFoodInsight, 'Must generate unmet demand card for food_culinary in evening');
    assert.ok(unmetFoodInsight.message.includes('you currently have no listings in that window'));
  });

  await t.test('2. Recognizes covered demand when provider already operates in that category', () => {
    const foodInsights = demandService.getDemandInsights(providerFood.id);
    const coveredFoodInsight = foodInsights.find(i => i.category === 'food_culinary');
    assert.ok(coveredFoodInsight, 'Should detect food search volume in Delhi');
    assert.strictEqual(coveredFoodInsight.provider_has_coverage, true, 'Food provider should have coverage: true');
    assert.ok(coveredFoodInsight.message.includes('you have active offerings ready'));
  });
});
