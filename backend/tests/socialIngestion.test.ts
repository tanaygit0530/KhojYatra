import test from 'node:test';
import assert from 'node:assert';
import { socialIngestionService } from '../src/services/socialIngestionService.js';
import { store } from '../src/data/store.js';

test('Phase 24 — Social-to-Geo Ingestion Pipeline & Admin Queue', async (t) => {
  await t.test('1. Ingests sample social post and stages with "social_signal_unverified" trust label', () => {
    const rawPost = {
      source_handle: '@heritage_delhi_insider',
      source_url: 'https://instagram.com/p/test_sample_1',
      caption: 'Visited the subterranean baoli in South Delhi. The stone arches date back to 1325 AD! #hidden #delhi',
      lat: 28.5200,
      lng: 77.1850,
      suggested_category: 'hidden_gems' as const,
      estimated_price: 350
    };

    const staged = socialIngestionService.ingestSocialPost(rawPost);
    assert.ok(staged.id);
    assert.strictEqual(staged.status, 'pending');
    assert.strictEqual(staged.trust_label, 'social_signal_unverified');
    assert.strictEqual(staged.category, 'hidden_gems');
  });

  await t.test('2. Admin approves staged item: creates published experience with "Social signal — unverified" badge', () => {
    const pendingItems = socialIngestionService.getStagedItems().filter(i => i.status === 'pending');
    assert.ok(pendingItems.length > 0, 'Should have pending staged items');

    const targetItem = pendingItems[0];
    const { stagedItem, experience } = socialIngestionService.approveStagedItem(targetItem.id);

    assert.strictEqual(stagedItem.status, 'approved');
    assert.strictEqual(experience.offering_status, 'published');
    assert.strictEqual(experience.badge_label, 'Social signal — unverified');
    assert.strictEqual(experience.provider_verified, false);

    // Verify it is in the catalog and searchable
    const foundInCatalog = store.getExperienceById(experience.id);
    assert.ok(foundInCatalog, 'Approved social experience should be added to experience store');
    assert.strictEqual(foundInCatalog.badge_label, 'Social signal — unverified');
  });

  await t.test('3. Admin rejects staged item: marked rejected and not published', () => {
    const rawPost = {
      source_handle: '@fake_spam_bot',
      source_url: 'https://instagram.com/p/spam_123',
      caption: 'Click here for cheap flight tickets discount offer!!!',
      suggested_category: 'hidden_gems' as const
    };

    const staged = socialIngestionService.ingestSocialPost(rawPost);
    const rejected = socialIngestionService.rejectStagedItem(staged.id);

    assert.strictEqual(rejected.status, 'rejected');
    const catalogItem = store.getExperienceById(`exp-social-${staged.id}`);
    assert.strictEqual(catalogItem, undefined, 'Rejected social item should NOT be published in experiences');
  });
});
