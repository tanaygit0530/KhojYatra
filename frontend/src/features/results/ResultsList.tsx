import React, { useState } from 'react';
import { Card, PillButton, PillButtonOutline, Badge, CircleFrame } from '@khojyatra/ui';
import {
  Clock,
  MapPin,
  Star,
  Sparkles,
  CloudRain,
  DollarSign,
  CheckCircle2,
  Info,
  CalendarPlus,
  Compass,
  Users,
  ThumbsUp,
  X,
  AlertTriangle,
  HelpCircle,
  CreditCard
} from 'lucide-react';
import {
  RecommendationItem,
  ReplanChangeType,
  DetourEvaluationResult,
  LocalityBreakdown,
  Experience
} from '@khojyatra/types';
import { apiClient } from '../../lib/apiClient';
import ReservationModal from '../booking/ReservationModal';

export interface ResultsListProps {
  recommendations: RecommendationItem[];
  sessionId: string;
  onUpdateRecommendations: (newRecs: RecommendationItem[]) => void;
  onAddToItinerary: (experienceId: string) => void;
  isGroupMode?: boolean;
  onVote?: (experienceId: string, vote: 1 | -1) => void;
}

export const ResultsList: React.FC<ResultsListProps> = ({
  recommendations,
  sessionId,
  onUpdateRecommendations,
  onAddToItinerary,
  isGroupMode = false,
  onVote
}) => {
  const [replanning, setReplanning] = useState(false);
  const [replanNotice, setReplanNotice] = useState<string | null>(null);
  const [recentlyAddedIds, setRecentlyAddedIds] = useState<Set<string>>(new Set());

  // Phase 19: Detour evaluation state
  const [evaluatingDetourId, setEvaluatingDetourId] = useState<string | null>(null);
  const [detourResult, setDetourResult] = useState<DetourEvaluationResult | null>(null);
  const [isDetourModalOpen, setIsDetourModalOpen] = useState(false);

  // Phase 16: Locality breakdown popover
  const [activeLocalityExpId, setActiveLocalityExpId] = useState<string | null>(null);
  const [localityBreakdown, setLocalityBreakdown] = useState<LocalityBreakdown | null>(null);

  // Phase 27: Reservation checkout modal state
  const [selectedBookingExp, setSelectedBookingExp] = useState<Experience | null>(null);

  const handleQuickReplan = async (type: ReplanChangeType, value?: any, label?: string) => {
    setReplanning(true);
    setReplanNotice(`Applying: ${label || type}...`);

    const currentIds = recommendations.map(r => r.experience.id);

    try {
      const response = await apiClient<{
        recommendations: RecommendationItem[];
        diff: { removed: string[]; added: string[]; unchanged: string[] };
        explanation?: string;
      }>('recommendations/replan', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          change: { type, value },
          current_experience_ids: currentIds
        })
      });

      if (response.diff?.added) {
        setRecentlyAddedIds(new Set(response.diff.added));
        setTimeout(() => setRecentlyAddedIds(new Set()), 3000);
      }

      onUpdateRecommendations(response.recommendations || []);
      setReplanNotice(response.explanation || `List updated successfully (${response.recommendations.length} matches)`);
    } catch (err: any) {
      setReplanNotice(`Replan note: ${err.message || 'Updated candidate ordering'}`);
    } finally {
      setReplanning(false);
    }
  };

  const handleEvaluateDetour = async (experienceId: string) => {
    setEvaluatingDetourId(experienceId);
    try {
      const result = await apiClient<DetourEvaluationResult>('itinerary/evaluate-detour', {
        method: 'POST',
        body: JSON.stringify({ experience_id: experienceId })
      });
      setDetourResult(result);
      setIsDetourModalOpen(true);
    } catch (err: any) {
      alert(`Detour evaluation: ${err.message || 'Failed to calculate detour'}`);
    } finally {
      setEvaluatingDetourId(null);
    }
  };

  const handleInspectLocality = async (experienceId: string) => {
    if (activeLocalityExpId === experienceId) {
      setActiveLocalityExpId(null);
      return;
    }
    setActiveLocalityExpId(experienceId);
    try {
      const breakdown = await apiClient<LocalityBreakdown>(`experiences/${experienceId}/locality-breakdown`);
      setLocalityBreakdown(breakdown);
    } catch (err) {
      // Fallback local breakdown
      const exp = recommendations.find(r => r.experience.id === experienceId)?.experience;
      setLocalityBreakdown({
        total_score: exp?.locality_score || 85,
        locally_operated: 30,
        community_hosted: 20,
        hidden_gem: exp?.category === 'hidden_gems' ? 15 : 0,
        tag_authenticity: 15,
        sentiment_base: 20,
        explanation: 'KhojYatra Score: +30 locally operated, +20 community hosted, +15 authentic tags, +20 community feedback'
      });
    }
  };

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 pt-2">
      {/* 1. Persistent "Something changed?" bar */}
      <div className="bg-surface p-3 sm:p-4 rounded-xl border border-[rgba(20,22,26,0.08)] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-highlight animate-pulse" />
            <span className="text-xs font-display font-bold uppercase tracking-wider text-text-primary">
              Something changed?
            </span>
          </div>
          <span className="text-[11px] text-text-secondary hidden sm:inline">
            Sub-second adaptive recalculation
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <PillButtonOutline
            size="sm"
            onClick={() => handleQuickReplan('time_reduced', { duration_reduction_min: 45 }, '45m less time')}
            disabled={replanning}
            icon={<Clock size={13} />}
          >
            Less time (-45m)
          </PillButtonOutline>

          <PillButtonOutline
            size="sm"
            onClick={() => handleQuickReplan('budget_reduced', { budget_reduction_amount: 300 }, '₹300 lower budget')}
            disabled={replanning}
            icon={<DollarSign size={13} />}
          >
            Lower budget (-₹300)
          </PillButtonOutline>

          <PillButtonOutline
            size="sm"
            onClick={() => handleQuickReplan('weather', { condition: 'rain' }, '🌧️ Rain in Varanasi')}
            disabled={replanning}
            icon={<CloudRain size={13} />}
          >
            🌧️ It's raining
          </PillButtonOutline>
        </div>

        {replanNotice && (
          <div className="flex items-center gap-2 p-2.5 bg-accent-soft/50 rounded-lg text-xs text-accent-dark font-medium border border-accent/20 transition-all">
            <Info size={14} className="flex-shrink-0" />
            <span>{replanNotice}</span>
          </div>
        )}
      </div>

      {/* 2. Vertical list of Ranked Cards */}
      <div className="space-y-4">
        {recommendations.map((rec, index) => {
          const isNewlyAdded = recentlyAddedIds.has(rec.experience.id);
          const isConsensusPick = (rec as any).group_pick;
          const isLocalityOpen = activeLocalityExpId === rec.experience.id;

          return (
            <Card
              key={rec.experience.id}
              variant="surface-alt"
              className={`transition-all duration-300 relative ${
                isNewlyAdded
                  ? 'border-2 border-accent ring-2 ring-accent-soft scale-[1.01]'
                  : 'hover:border-accent/30'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Photo & Core Information */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <CircleFrame
                    size={76}
                    src={rec.experience.photo_urls[0] || 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=300&auto=format&fit=crop&q=80'}
                    alt={rec.experience.title}
                  />

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-mono font-bold uppercase text-accent">
                        Rank #{index + 1}
                      </span>

                      {/* Phase 18: Group Pick Badge */}
                      {isConsensusPick && (
                        <Badge variant="highlight" size="sm" icon={<Users size={12} />}>
                          Group Pick
                        </Badge>
                      )}

                      {/* Phase 16: KhojYatra Score Badge with Tooltip trigger */}
                      <button
                        type="button"
                        onClick={() => handleInspectLocality(rec.experience.id)}
                        className="inline-flex items-center gap-1 focus:outline-none"
                        title="Click to view KhojYatra Score breakdown"
                      >
                        <Badge variant="highlight" size="sm">
                          KhojYatra Score: {rec.experience.locality_score}/100
                          <HelpCircle size={10} className="ml-1 opacity-70" />
                        </Badge>
                      </button>

                      {/* Provider Trust Score Badge */}
                      <Badge variant="accent" size="sm">
                        Trust: {rec.experience.provider_trust_score || 88}/100
                      </Badge>

                      {rec.experience.provider_verified ? (
                        <Badge variant="success" size="sm" icon={<CheckCircle2 size={11} />}>
                          Verified Host
                        </Badge>
                      ) : (
                        <Badge variant="highlight" size="sm">
                          Unverified
                        </Badge>
                      )}

                      {rec.experience.badge_label && (
                        <Badge variant="warning" size="sm">
                          {rec.experience.badge_label}
                        </Badge>
                      )}

                      {isNewlyAdded && (
                        <Badge variant="accent" size="sm">
                          ✨ Newly Added via Replan
                        </Badge>
                      )}
                    </div>

                    <h4 className="font-display font-bold text-base text-text-primary truncate">
                      {rec.experience.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                      <span className="font-bold text-text-primary">
                        ₹{rec.experience.price_min} – ₹{rec.experience.price_max}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-accent" /> {rec.experience.duration_min} min
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-accent" />{' '}
                        {rec.experience.distance_km ? `${rec.experience.distance_km} km away` : 'Nearby'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star size={12} className="text-highlight" /> {rec.experience.rating_avg}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-[rgba(20,22,26,0.06)]">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <PillButtonOutline
                      size="sm"
                      icon={<CalendarPlus size={14} />}
                      onClick={() => onAddToItinerary(rec.experience.id)}
                      className="flex-1 sm:flex-initial"
                    >
                      Add to Plan
                    </PillButtonOutline>

                    {/* Phase 27: Reserve button */}
                    <PillButton
                      size="sm"
                      icon={<CreditCard size={14} />}
                      onClick={() => setSelectedBookingExp(rec.experience)}
                      className="flex-1 sm:flex-initial"
                    >
                      Reserve
                    </PillButton>

                    {/* Phase 19: Worth the Detour action */}
                    <PillButtonOutline
                      size="sm"
                      icon={<Compass size={14} />}
                      onClick={() => handleEvaluateDetour(rec.experience.id)}
                      disabled={evaluatingDetourId === rec.experience.id}
                      className="flex-1 sm:flex-initial"
                    >
                      {evaluatingDetourId === rec.experience.id ? 'Checking...' : 'Detour?'}
                    </PillButtonOutline>

                    {/* Phase 18: Group Voting Button */}
                    {isGroupMode && onVote && (
                      <button
                        type="button"
                        onClick={() => onVote(rec.experience.id, 1)}
                        className="p-2 rounded-pill bg-accent-soft text-accent hover:bg-accent hover:text-white transition-colors"
                        title="Upvote for group consensus"
                      >
                        <ThumbsUp size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Phase 16: Locality Score Breakdown Popover */}
              {isLocalityOpen && localityBreakdown && (
                <div className="mt-3 p-3 bg-surface rounded-xl border border-highlight/30 text-xs space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-text-primary">
                      KhojYatra Authenticity Score Breakdown
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveLocalityExpId(null)}
                      className="text-text-secondary hover:text-text-primary"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="text-text-secondary text-[11px]">
                    KhojYatra Score is an internal curation metric emphasizing community empowerment and authenticity, never an objective universal rating.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="bg-surface-alt p-2 rounded-lg">
                      <span className="text-[10px] text-text-secondary block">Locally Operated</span>
                      <span className="font-mono font-bold text-highlight">+{localityBreakdown.locally_operated} pts</span>
                    </div>
                    <div className="bg-surface-alt p-2 rounded-lg">
                      <span className="text-[10px] text-text-secondary block">Community Hosted</span>
                      <span className="font-mono font-bold text-highlight">+{localityBreakdown.community_hosted} pts</span>
                    </div>
                    <div className="bg-surface-alt p-2 rounded-lg">
                      <span className="text-[10px] text-text-secondary block">Hidden Gem</span>
                      <span className="font-mono font-bold text-highlight">+{localityBreakdown.hidden_gem} pts</span>
                    </div>
                    <div className="bg-surface-alt p-2 rounded-lg">
                      <span className="text-[10px] text-text-secondary block">Heritage & Sentiment</span>
                      <span className="font-mono font-bold text-highlight">+{localityBreakdown.tag_authenticity + localityBreakdown.sentiment_base} pts</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Deterministic Reasons Tags */}
              <div className="flex flex-wrap gap-1.5 pt-3 mt-3 border-t border-[rgba(20,22,26,0.05)]">
                {rec.reasons.map((reason, rIdx) => (
                  <span
                    key={rIdx}
                    className="text-[11px] font-semibold bg-accent-soft/70 text-accent-dark px-2.5 py-0.5 rounded-pill flex items-center gap-1"
                  >
                    <span>✓</span>
                    <span>{reason}</span>
                  </span>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Phase 19: Worth the Detour Modal */}
      {isDetourModalOpen && detourResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface border border-[rgba(20,22,26,0.1)] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Compass size={22} className="text-accent" />
                <div>
                  <h3 className="font-display font-bold text-lg text-text-primary">
                    Worth the Detour?
                  </h3>
                  <span className="text-xs text-text-secondary">
                    Real-time transit & commitment feasibility analysis
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetourModalOpen(false)}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>

            {/* Verdict Banner */}
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                detourResult.worth_it
                  ? 'bg-accent-soft/60 border-accent/30 text-accent-dark'
                  : 'bg-highlight-soft/60 border-highlight/30 text-text-primary'
              }`}
            >
              {detourResult.worth_it ? (
                <CheckCircle2 size={20} className="text-accent flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={20} className="text-highlight flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-display font-bold text-sm block">
                  {detourResult.worth_it ? 'Recommended Detour' : 'High Transit Risk'}
                </span>
                <p className="text-xs leading-relaxed">
                  {detourResult.reason}
                </p>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-alt p-3 rounded-xl border border-[rgba(20,22,26,0.06)] text-center">
                <span className="text-[11px] text-text-secondary block">Added Time</span>
                <span className="font-display font-bold text-base text-text-primary">
                  +{detourResult.added_minutes} min
                </span>
              </div>
              <div className="bg-surface-alt p-3 rounded-xl border border-[rgba(20,22,26,0.06)] text-center">
                <span className="text-[11px] text-text-secondary block">Added Cost</span>
                <span className="font-display font-bold text-base text-text-primary">
                  ₹{detourResult.added_cost}
                </span>
              </div>
              <div className="bg-surface-alt p-3 rounded-xl border border-[rgba(20,22,26,0.06)] text-center">
                <span className="text-[11px] text-text-secondary block">Next Cushion</span>
                <span className={`font-display font-bold text-base ${detourResult.still_on_time ? 'text-accent' : 'text-danger'}`}>
                  {detourResult.buffer_remaining_minutes} min
                </span>
              </div>
            </div>

            {/* Next Commitment Info */}
            {detourResult.next_commitment && (
              <div className="text-xs bg-surface-alt/70 p-3 rounded-xl border border-[rgba(20,22,26,0.06)] flex items-center justify-between">
                <span className="text-text-secondary">Protected Commitment:</span>
                <span className="font-bold text-text-primary truncate max-w-[240px]">
                  {detourResult.next_commitment.title}
                </span>
              </div>
            )}

            {/* Action CTAs */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <PillButtonOutline
                size="md"
                onClick={() => setIsDetourModalOpen(false)}
              >
                Close
              </PillButtonOutline>
              <PillButton
                size="md"
                onClick={() => {
                  onAddToItinerary(detourResult.candidate_experience_id);
                  setIsDetourModalOpen(false);
                }}
                icon={<CalendarPlus size={16} />}
              >
                Add Detour to Plan
              </PillButton>
            </div>
          </div>
        </div>
      )}

      {/* Phase 27: Reservation Modal */}
      {selectedBookingExp && (
        <ReservationModal
          experience={selectedBookingExp}
          isOpen={true}
          onClose={() => setSelectedBookingExp(null)}
          onBookingConfirmed={() => {
            onAddToItinerary(selectedBookingExp.id);
          }}
        />
      )}
    </section>
  );
};

export default ResultsList;
