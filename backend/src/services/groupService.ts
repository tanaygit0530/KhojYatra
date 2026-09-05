import {
  GroupSession,
  GroupMember,
  GroupVote,
  ConstraintIntake,
  ConsensusRecommendation,
  ExperienceCategory
} from '@khojyatra/types';
import { decisionEngine } from './decisionEngine.js';
import { store } from '../data/store.js';

class GroupService {
  private sessions: Map<string, GroupSession> = new Map();

  public createSession(creatorSessionId: string, name: string = 'Trip Group'): GroupSession {
    const id = `grp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const code = `GRP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const creator: GroupMember = {
      id: `mem-${creatorSessionId.slice(0, 8)}`,
      session_id: creatorSessionId,
      name: 'Host',
      joined_at: new Date().toISOString()
    };

    const groupSession: GroupSession = {
      id,
      code,
      name,
      creator_session_id: creatorSessionId,
      created_at: new Date().toISOString(),
      members: [creator],
      votes: []
    };

    this.sessions.set(id, groupSession);
    return groupSession;
  }

  public getSession(idOrCode: string): GroupSession | undefined {
    // Lookup by ID or code
    let session = this.sessions.get(idOrCode);
    if (!session) {
      session = Array.from(this.sessions.values()).find(s => s.code.toUpperCase() === idOrCode.toUpperCase());
    }
    return session;
  }

  public joinSession(idOrCode: string, memberSessionId: string, memberName: string = 'Traveler'): GroupSession {
    const session = this.getSession(idOrCode);
    if (!session) {
      throw new Error(`Group session ${idOrCode} not found`);
    }

    const existing = session.members.find(m => m.session_id === memberSessionId);
    if (!existing) {
      session.members.push({
        id: `mem-${memberSessionId.slice(0, 8)}-${Date.now()}`,
        session_id: memberSessionId,
        name: memberName,
        joined_at: new Date().toISOString()
      });
    }

    return session;
  }

  public submitMemberIntake(groupId: string, memberSessionId: string, intake: ConstraintIntake): GroupSession {
    const session = this.getSession(groupId);
    if (!session) {
      throw new Error(`Group session ${groupId} not found`);
    }

    const member = session.members.find(m => m.session_id === memberSessionId);
    if (!member) {
      throw new Error(`Member ${memberSessionId} not in group`);
    }

    member.intake = intake;
    return session;
  }

  public castVote(groupId: string, memberSessionId: string, experienceId: string, voteValue: 1 | -1): GroupSession {
    const session = this.getSession(groupId);
    if (!session) {
      throw new Error(`Group session ${groupId} not found`);
    }

    // Upsert vote for this member & experience
    const existingIdx = session.votes.findIndex(
      v => v.member_session_id === memberSessionId && v.experience_id === experienceId
    );

    if (existingIdx >= 0) {
      session.votes[existingIdx].vote = voteValue;
    } else {
      session.votes.push({
        member_session_id: memberSessionId,
        experience_id: experienceId,
        vote: voteValue
      });
    }

    return session;
  }

  // Phase 18: Preference Reconciliation & Overlap Scoring
  public getConsensus(groupId: string): ConsensusRecommendation[] {
    const session = this.getSession(groupId);
    if (!session) {
      throw new Error(`Group session ${groupId} not found`);
    }

    const membersWithIntake = session.members.filter(m => Boolean(m.intake));
    if (membersWithIntake.length === 0) {
      // Fallback: Return top recommendations from candidates
      const allExps = store.getExperiences().slice(0, 5);
      return allExps.map(exp => ({
        experience: exp,
        score: 0.8,
        vote_count: 0,
        group_pick: false,
        matched_interests: [],
        reasons: ['Popular group pick across Varanasi travelers']
      }));
    }

    // 1. Calculate category overlap counts across members
    const categoryCounts = new Map<ExperienceCategory, number>();
    membersWithIntake.forEach(m => {
      (m.intake?.interests || []).forEach(cat => {
        categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
      });
    });

    // 2. Synthesize merged ConstraintIntake
    const primaryIntake = membersWithIntake[0].intake!;
    const allCategories = Array.from(categoryCounts.keys());
    const minBudgetMax = Math.min(...membersWithIntake.map(m => m.intake?.budget.max || 3000));
    const avgDuration = Math.round(
      membersWithIntake.reduce((sum, m) => sum + (m.intake?.duration_minutes || 240), 0) / membersWithIntake.length
    );

    const mergedIntake: ConstraintIntake = {
      ...primaryIntake,
      interests: allCategories,
      budget: { min: 0, max: minBudgetMax },
      duration_minutes: avgDuration,
      group: { type: 'friends', size: session.members.length }
    };

    // 3. Evaluate candidate pool
    const { recommendations } = decisionEngine.evaluate(mergedIntake);

    // 4. Overlap & Vote Weighting
    // An interest present in >= 2 members gets 2x weight multiplier!
    const consensusRecs: ConsensusRecommendation[] = recommendations.map(rec => {
      const exp = rec.experience;
      const count = categoryCounts.get(exp.category) || 0;
      const overlapMultiplier = count >= 2 ? 1.4 : (count === 1 ? 1.0 : 0.7);

      // Compute net votes for this experience
      const expVotes = session.votes.filter(v => v.experience_id === exp.id);
      const netVotes = expVotes.reduce((sum, v) => sum + v.vote, 0);
      const voteMultiplier = 1 + netVotes * 0.2;

      const finalScore = Math.min(1.0, Math.round(rec.score * overlapMultiplier * voteMultiplier * 100) / 100);
      const groupPick = count >= 2 || netVotes > 0;

      const matched: string[] = [];
      if (count >= 2) {
        matched.push(`Shared interest by ${count}/${membersWithIntake.length} members (2x consensus boost)`);
      } else if (count === 1) {
        matched.push('Selected by 1 member');
      }

      if (netVotes > 0) {
        matched.push(`+${netVotes} group upvote${netVotes > 1 ? 's' : ''}`);
      }

      const reasons = [...matched, ...rec.reasons.slice(0, 2)];

      return {
        experience: exp,
        score: finalScore,
        vote_count: netVotes,
        group_pick: groupPick,
        matched_interests: matched,
        reasons
      };
    });

    // Sort by group_pick first, then final consensus score desc
    consensusRecs.sort((a, b) => {
      if (a.group_pick && !b.group_pick) return -1;
      if (!a.group_pick && b.group_pick) return 1;
      return b.score - a.score;
    });

    return consensusRecs;
  }
}

export const groupService = new GroupService();
