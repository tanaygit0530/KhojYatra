import test from 'node:test';
import assert from 'node:assert';
import { calculateLocalityScore, calculateTrustScore } from '../src/services/scoreService.js';

test('Phase 16 — Locality / Authenticity Score & Cold-Start Trust Score', async (t) => {
  await t.test('Two otherwise-identical experiences with different locally_operated flags show visibly different scores', () => {
    const expBase = {
      category: 'workshops_classes',
      community_hosted: false,
      interest_tags: ['craft', 'pottery'],
      review_sentiment_score: 0.9
    };

    const localScore = calculateLocalityScore({
      ...expBase,
      locally_operated: true
    });

    const nonLocalScore = calculateLocalityScore({
      ...expBase,
      locally_operated: false
    });

    console.log(`Local score: ${localScore.total_score} | Non-local score: ${nonLocalScore.total_score}`);
    assert.strictEqual(localScore.locally_operated, 30, 'Locally operated should receive 30 points');
    assert.strictEqual(nonLocalScore.locally_operated, 0, 'Non-locally operated should receive 0 points');
    assert.ok(
      localScore.total_score - nonLocalScore.total_score >= 30,
      'Difference between local and non-local should be at least 30 points'
    );
    assert.ok(localScore.explanation.includes('KhojYatra Score'), 'Explanation must explicitly state KhojYatra Score');
  });

  await t.test('Hidden gem and community hosted receive their respective bonuses', () => {
    const gemScore = calculateLocalityScore({
      category: 'hidden_gems',
      locally_operated: true,
      community_hosted: true,
      interest_tags: ['local', 'heritage', 'handcrafted']
    });

    assert.strictEqual(gemScore.hidden_gem, 15);
    assert.strictEqual(gemScore.community_hosted, 20);
    assert.strictEqual(gemScore.tag_authenticity, 15);
    assert.strictEqual(gemScore.total_score, 100);
  });

  await t.test('Provider Cold-Start Trust Score accounts for verification, locality, and vouches', () => {
    const unverifiedLocalNew = calculateTrustScore({
      verification_status: 'pending',
      locally_operated: true,
      community_vouch_count: 0
    });

    const verifiedLocalVouched = calculateTrustScore({
      verification_status: 'verified',
      locally_operated: true,
      community_vouch_count: 5
    });

    console.log(`Unverified Trust: ${unverifiedLocalNew.total_score} | Verified Vouched Trust: ${verifiedLocalVouched.total_score}`);
    assert.strictEqual(unverifiedLocalNew.total_score, 30); // 0 + 20 + 0 + 10
    assert.strictEqual(verifiedLocalVouched.total_score, 95); // 40 + 20 + 25 + 10
    assert.ok(verifiedLocalVouched.explanation.includes('verified'));
  });
});
