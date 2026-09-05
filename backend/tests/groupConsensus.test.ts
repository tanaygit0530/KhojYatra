import test from 'node:test';
import assert from 'node:assert';
import { groupService } from '../src/services/groupService.js';
import { decisionEngine } from '../src/services/decisionEngine.js';
import { ConstraintIntake } from '@khojyatra/shared-types';

test('Phase 18 — Group Preference Reconciliation & Consensus', async (t) => {
  const hostSession = `session-host-${Date.now()}`;
  const member2Session = `session-mem2-${Date.now()}`;
  const member3Session = `session-mem3-${Date.now()}`;

  // 1. Create group session
  const group = groupService.createSession(hostSession, 'Varanasi Explorers');
  assert.ok(group.id.startsWith('grp-'));
  assert.ok(group.code.startsWith('GRP-'));

  // 2. Members join
  groupService.joinSession(group.code, member2Session, 'Aarav');
  groupService.joinSession(group.code, member3Session, 'Diya');

  const updatedGroup = groupService.getSession(group.id);
  assert.strictEqual(updatedGroup?.members.length, 3, 'Group should have 3 members');

  // 3. Three members with divergent interests located in Delhi:
  // Member 1 (Host): 'hidden_gems' & 'food_culinary'
  // Member 2 (Aarav): 'shopping_markets' & 'food_culinary'  <-- 'food_culinary' is shared by 2 members!
  // Member 3 (Diya): 'nightlife_entertainment' & 'food_culinary'   <-- 'food_culinary' is shared by all 3!

  const baseIntake: ConstraintIntake = {
    location_context: { lat: 28.6506, lng: 77.2303, mode: 'planned', effective_time: new Date().toISOString() },
    duration_minutes: 300,
    budget: { min: 0, max: 2000, currency: 'INR' },
    interests: [],
    group: { type: 'friends', size: 3 }
  };

  const intake1: ConstraintIntake = { ...baseIntake, interests: ['hidden_gems', 'food_culinary'] };
  const intake2: ConstraintIntake = { ...baseIntake, interests: ['shopping_markets', 'food_culinary'] };
  const intake3: ConstraintIntake = { ...baseIntake, interests: ['nightlife_entertainment', 'food_culinary'] };

  groupService.submitMemberIntake(group.id, hostSession, intake1);
  groupService.submitMemberIntake(group.id, member2Session, intake2);
  groupService.submitMemberIntake(group.id, member3Session, intake3);

  // Individual ranking for Member 1 (Solo)
  const soloResult1 = decisionEngine.evaluate(intake1);
  const soloTopCategory = soloResult1.recommendations[0]?.experience.category;

  // 4. Group Consensus evaluation
  const consensus = groupService.getConsensus(group.id);
  assert.ok(consensus.length > 0, 'Consensus list should not be empty');

  console.log('\n--- Group Consensus Results (Before Votes) ---');
  consensus.slice(0, 4).forEach((c, idx) => {
    console.log(`  ${idx + 1}. [${c.experience.category}] ${c.experience.title} (Score: ${c.score}, Group Pick: ${c.group_pick})`);
  });

  // Since 'food_culinary' is shared by all 3 members, food experiences receive the 2x consensus boost
  const topCategory = consensus[0].experience.category;
  assert.strictEqual(topCategory, 'food_culinary', 'Consensus top category should be the shared category (food_culinary)');

  // 5. Voting simulation:
  // Member 2 and Member 3 upvote a specific experience
  const targetExp = consensus.find(c => c.experience.category === 'hidden_gems')?.experience || consensus[1]?.experience;
  if (targetExp) {
    groupService.castVote(group.id, member2Session, targetExp.id, 1);
    groupService.castVote(group.id, member3Session, targetExp.id, 1);

    const votedConsensus = groupService.getConsensus(group.id);
    const votedItem = votedConsensus.find(c => c.experience.id === targetExp.id);
    assert.strictEqual(votedItem?.vote_count, 2, 'Should have 2 net upvotes');
    assert.strictEqual(votedItem?.group_pick, true, 'Upvoted experience should have group_pick: true');
    console.log(`\nAfter upvotes: "${votedItem?.experience.title}" elevated with score ${votedItem?.score} and group pick flag!`);
  }
});
