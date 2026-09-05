import { Experience, LocalityBreakdown, ProviderTrustBreakdown } from '@khojyatra/types';
import { SeedProvider } from '../data/seedData.js';

/**
 * Phase 16: Locality / Authenticity Score & Cold-Start Trust Score
 * 
 * NOTE: Labeled strictly as "KhojYatra Score" (never claimed as a universal truth).
 */

export interface ExperienceScoreInput {
  category: string;
  locally_operated?: boolean;
  community_hosted?: boolean;
  interest_tags?: string[];
  provider_id?: string;
  review_sentiment_score?: number; // 0 to 1
}

export function calculateLocalityScore(
  input: ExperienceScoreInput,
  provider?: Partial<SeedProvider>
): LocalityBreakdown {
  // 1. Locally operated: +30
  const isLocallyOperated = input.locally_operated ?? provider?.locally_operated ?? true;
  const locallyOperatedPoints = isLocallyOperated ? 30 : 0;

  // 2. Community hosted: +20
  const isCommunityHosted = input.community_hosted ?? (
    input.interest_tags?.some(t => ['community', 'cooperative', 'collective', 'family', 'artisan'].includes(t.toLowerCase())) ?? false
  );
  const communityHostedPoints = isCommunityHosted ? 20 : 0;

  // 3. Category is hidden_gems: +15
  const isHiddenGem = input.category === 'hidden_gems';
  const hiddenGemPoints = isHiddenGem ? 15 : 0;

  // 4. Authenticity tag overlap (+15)
  const authenticKeywords = ['local', 'authentic', 'heritage', 'traditional', 'indigenous', 'folk', 'handcrafted'];
  const tagMatches = (input.interest_tags || []).filter(t => 
    authenticKeywords.some(k => t.toLowerCase().includes(k))
  ).length;
  const tagAuthenticityPoints = Math.min(15, tagMatches * 5);

  // 5. Review sentiment base: +20
  const sentimentScore = input.review_sentiment_score ?? 1.0;
  const sentimentBasePoints = Math.round(20 * sentimentScore);

  const total = Math.min(100, Math.max(0,
    locallyOperatedPoints +
    communityHostedPoints +
    hiddenGemPoints +
    tagAuthenticityPoints +
    sentimentBasePoints
  ));

  const explanation = `KhojYatra Score: ${total}/100 ` +
    `(${locallyOperatedPoints ? '+30 locally operated, ' : ''}` +
    `${communityHostedPoints ? '+20 community hosted, ' : ''}` +
    `${hiddenGemPoints ? '+15 hidden gem, ' : ''}` +
    `+${tagAuthenticityPoints} authentic tags, +${sentimentBasePoints} community feedback)`;

  return {
    total_score: total,
    locally_operated: locallyOperatedPoints,
    community_hosted: communityHostedPoints,
    hidden_gem: hiddenGemPoints,
    tag_authenticity: tagAuthenticityPoints,
    sentiment_base: sentimentBasePoints,
    explanation
  };
}

export function calculateTrustScore(
  provider: {
    verification_status: 'pending' | 'verified';
    locally_operated: boolean;
    community_vouch_count: number;
  }
): ProviderTrustBreakdown {
  // 1. Verification status (+40 if verified)
  const verificationBonus = provider.verification_status === 'verified' ? 40 : 0;

  // 2. Locally operated (+20)
  const locallyOperatedBonus = provider.locally_operated ? 20 : 0;

  // 3. Community vouch count (+min(30, count * 5))
  const communityVouchBonus = Math.min(30, (provider.community_vouch_count || 0) * 5);

  // 4. Reputation base (+10)
  const reputationBase = 10;

  const total = Math.min(100, Math.max(0,
    verificationBonus +
    locallyOperatedBonus +
    communityVouchBonus +
    reputationBase
  ));

  const explanation = `Trust Score: ${total}/100 ` +
    `(${verificationBonus ? '+40 verified, ' : 'pending verification (+0), '}` +
    `${locallyOperatedBonus ? '+20 local host, ' : ''}` +
    `+${communityVouchBonus} from ${provider.community_vouch_count || 0} vouches, +10 base reputation)`;

  return {
    total_score: total,
    verification_bonus: verificationBonus,
    locally_operated_bonus: locallyOperatedBonus,
    community_vouch_bonus: communityVouchBonus,
    reputation_base: reputationBase,
    explanation
  };
}
