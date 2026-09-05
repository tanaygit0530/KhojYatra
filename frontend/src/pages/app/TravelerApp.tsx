import React, { useState, useEffect } from 'react';
import { Sidebar, Card, PillButton, PillButtonOutline, Badge } from '@khojyatra/ui';
import {
  Compass,
  MapPin,
  Calendar,
  Bookmark,
  MessageSquare,
  Settings,
  Sparkles,
  Clock,
  Wallet,
  Users,
  CheckCircle2,
  Navigation,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Check,
  ShieldCheck
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSessionStore } from '../../store/sessionStore';
import { apiClient } from '../../lib/apiClient';
import { SavedTab } from '../../features/saved/SavedTab';
import { MessagesTab } from '../../features/messages/MessagesTab';
import { SettingsTab } from '../../features/settings/SettingsTab';
import {
  ConstraintIntake,
  ExperienceCategory,
  RecommendationItem,
  BudgetStatus,
  GroupSession
} from '@khojyatra/types';
import ResultsList from '../../features/results/ResultsList';

const CATEGORIES: { id: ExperienceCategory; label: string; icon: string }[] = [
  { id: 'food_culinary', label: 'Food & Culinary', icon: '🍲' },
  { id: 'cultural_heritage', label: 'Cultural Heritage', icon: '🏛️' },
  { id: 'festivals_events', label: 'Festivals & Events', icon: '🎪' },
  { id: 'workshops_classes', label: 'Workshops & Classes', icon: '🏺' },
  { id: 'adventure_outdoor', label: 'Adventure & Outdoor', icon: '🧗' },
  { id: 'hidden_gems', label: 'Hidden Gems', icon: '💎' },
  { id: 'shopping_markets', label: 'Shopping & Markets', icon: '🛍️' },
  { id: 'nightlife_entertainment', label: 'Nightlife & Shows', icon: '🎶' }
];

const ACCESSIBILITY_OPTIONS = [
  { id: 'step_free', label: 'Step-Free Access' },
  { id: 'wheelchair_accessible', label: 'Wheelchair Accessible' },
  { id: 'visual_aid', label: 'Audio / Visual Guidance' }
];

export interface TravelerAppProps {
  defaultTab?: string;
}

export const TravelerApp: React.FC<TravelerAppProps> = ({ defaultTab }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = searchParams.get('tab');
  const initialTab = paramTab || defaultTab || 'discover';
  const [activeNav, setActiveNav] = useState(initialTab);
  const sessionId = useSessionStore((state) => state.sessionId);
  const savedCount = useSessionStore((state) => state.savedExperienceIds?.length || 0);

  useEffect(() => {
    const tab = searchParams.get('tab') || defaultTab;
    if (tab && ['discover', 'saved', 'messages', 'settings', 'home'].includes(tab)) {
      setActiveNav(tab);
    }
  }, [searchParams, defaultTab]);

  // Constraint Intake State
  const [locationMode, setLocationMode] = useState<'current' | 'planned'>('current');
  const [lat, setLat] = useState<number>(28.6506); // Default: Delhi
  const [lng, setLng] = useState<number>(77.2303);
  const [plannedLocationName, setPlannedLocationName] = useState('Central Delhi');
  const [effectiveTime, setEffectiveTime] = useState<string>(
    new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16)
  );

  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [budgetMin, setBudgetMin] = useState<number>(300);
  const [budgetMax, setBudgetMax] = useState<number>(1500);
  const [groupSize, setGroupSize] = useState<number>(2);
  const [groupType, setGroupType] = useState<'solo' | 'couple' | 'family' | 'friends'>('couple');
  const [selectedInterests, setSelectedInterests] = useState<ExperienceCategory[]>([
    'food_culinary',
    'cultural_heritage'
  ]);
  const [selectedAccessibility, setSelectedAccessibility] = useState<string[]>([]);
  const [weatherCondition, setWeatherCondition] = useState<'clear' | 'rain' | 'extreme'>('clear');

  // Submission & Recommendation State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [relaxedConstraints, setRelaxedConstraints] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Phase 17: Live Budget Status state
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);

  // Phase 18: Group Sessions & Consensus state
  const [activeGroup, setActiveGroup] = useState<GroupSession | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupCodeInput, setGroupCodeInput] = useState('');
  const [groupNameInput, setGroupNameInput] = useState('Delhi Heritage Squad');
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupLoading, setGroupLoading] = useState(false);

  // Phase 20: Natural-Language Intake state
  const [nlpInput, setNlpInput] = useState('');
  const [nlpLoading, setNlpLoading] = useState(false);
  const [nlpNotice, setNlpNotice] = useState<string | null>(null);

  // Phase 21: Community Itineraries ("Travelers Like You")
  const [similarCommunityItins, setSimilarCommunityItins] = useState<any[]>([]);

  // Phase 25: Surprise Me Mode state
  const [isSurpriseMode, setIsSurpriseMode] = useState(false);
  const [surpriseLoading, setSurpriseLoading] = useState(false);

  // Phase 26: Safety Check-in state
  const [safetyLink, setSafetyLink] = useState<string | null>(null);
  const [safetyNotice, setSafetyNotice] = useState<string | null>(null);

  // Auto geolocate when "current" is active
  useEffect(() => {
    if (locationMode === 'current' && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
        },
        () => {
          // Fallback to Delhi coordinates gracefully
          setLat(28.6506);
          setLng(77.2303);
        }
      );
    }
  }, [locationMode]);

  const toggleInterest = (cat: ExperienceCategory) => {
    if (selectedInterests.includes(cat)) {
      setSelectedInterests(selectedInterests.filter((c) => c !== cat));
    } else {
      setSelectedInterests([...selectedInterests, cat]);
    }
  };

  const toggleAccessibility = (tag: string) => {
    if (selectedAccessibility.includes(tag)) {
      setSelectedAccessibility(selectedAccessibility.filter((t) => t !== tag));
    } else {
      setSelectedAccessibility([...selectedAccessibility, tag]);
    }
  };

  const handleFindExperiences = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    let effectiveIso: string;
    try {
      const d = effectiveTime ? new Date(effectiveTime) : new Date();
      effectiveIso = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } catch {
      effectiveIso = new Date().toISOString();
    }

    const payload: ConstraintIntake = {
      location_context: {
        mode: locationMode,
        lat,
        lng,
        effective_time: effectiveIso
      },
      duration_minutes: durationMinutes,
      budget: { min: budgetMin, max: budgetMax },
      group: { size: groupSize, type: groupType },
      interests: selectedInterests,
      accessibility_tags: selectedAccessibility,
      weather_condition: weatherCondition
    };

    try {
      const response = await apiClient<{ recommendations: RecommendationItem[]; relaxed_constraints?: string[] }>('recommendations', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setRecommendations(response.recommendations || []);
      setRelaxedConstraints(response.relaxed_constraints || []);
      setHasSearched(true);

      // Smooth scroll down to results
      setTimeout(() => {
        const el = document.getElementById('traveler-results-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

      // Phase 21: Query similar community itineraries ("Travelers Like You")
      try {
        const sim = await apiClient<{ data: any[] }>(
          `community-itineraries/similar?destination=${plannedLocationName || 'Delhi'}&duration=${Math.round(durationMinutes / 1440) || 1}&budget=${budgetMax}&group_type=${groupType}&interests=${selectedInterests.join(',')}`
        );
        setSimilarCommunityItins(sim.data || []);
      } catch {
        // graceful fallback
      }
    } catch (err: any) {
      console.error('Failed to fetch recommendations:', err);
      setErrorMsg(err.message || 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  // Phase 20: Natural-Language Intake Parser
  const handleNlpParse = async () => {
    if (!nlpInput.trim()) return;
    setNlpLoading(true);
    setNlpNotice(null);
    try {
      const res = await apiClient<{
        parsed_intake: Partial<ConstraintIntake>;
        explanation: string;
      }>('ai/parse-intake', {
        method: 'POST',
        body: JSON.stringify({ text: nlpInput })
      });

      const p = res.parsed_intake;
      if (p.duration_minutes) setDurationMinutes(p.duration_minutes);
      if (p.budget?.max) setBudgetMax(p.budget.max);
      if (p.group?.size) setGroupSize(p.group.size);
      if (p.group?.type) setGroupType(p.group.type);
      if (p.interests && p.interests.length > 0) setSelectedInterests(p.interests);
      if (p.accessibility_tags) setSelectedAccessibility(p.accessibility_tags);
      if (p.location_context) {
        setLocationMode('planned');
        setLat(p.location_context.lat);
        setLng(p.location_context.lng);
      }

      setNlpNotice(`Form pre-filled: ${res.explanation} Please review constraints below and click "Find Experiences".`);
    } catch (err: any) {
      alert(`AI Intake Error: ${err.message}`);
    } finally {
      setNlpLoading(false);
    }
  };

  // Phase 21: Clone Community Itinerary
  const handleCloneCommunityItinerary = async (communityItinId: string) => {
    try {
      await apiClient(`community-itineraries/${communityItinId}/clone`, {
        method: 'POST'
      });
      await fetchBudgetStatus();
      alert('Community itinerary cloned into your day plan! Check "My Itinerary" to customize.');
    } catch (err: any) {
      alert(`Clone note: ${err.message}`);
    }
  };

  // Phase 25: Surprise Me Mode (Bypasses constraint form)
  const handleSurpriseMe = async () => {
    setSurpriseLoading(true);
    setErrorMsg('');
    try {
      const res = await apiClient<{ recommendations: RecommendationItem[]; explanation?: string }>(
        `recommendations/surprise?lat=${lat}&lng=${lng}&duration_minutes=${durationMinutes}`
      );
      setRecommendations(res.recommendations || []);
      setHasSearched(true);
      setIsSurpriseMode(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Surprise Me failed');
    } finally {
      setSurpriseLoading(false);
    }
  };

  // Phase 26: Generate Safety Check-in Link
  const handleSafetyCheckin = async () => {
    try {
      const res = await apiClient<{ share_url: string; share_token: string }>(
        `itinerary/${sessionId}/safety-checkin`,
        { method: 'POST' }
      );
      const fullUrl = `${window.location.origin}${res.share_url}`;
      setSafetyLink(fullUrl);
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(fullUrl);
      }
      setSafetyNotice('Safety check-in link copied to clipboard! Share it with family/friends for real-time unauthenticated itinerary tracking.');
      setTimeout(() => setSafetyNotice(null), 6000);
    } catch (err: any) {
      alert(`Safety check-in note: ${err.message}`);
    }
  };

  // Phase 17: Fetch live budget status
  const fetchBudgetStatus = async () => {
    try {
      const status = await apiClient<BudgetStatus>('itinerary/session/budget-status');
      setBudgetStatus(status);
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    fetchBudgetStatus();
  }, [sessionId]);

  const handleAddToItinerary = async (experienceId: string) => {
    try {
      await apiClient('itinerary/add', {
        method: 'POST',
        body: JSON.stringify({ experience_id: experienceId })
      });
      await fetchBudgetStatus();
      alert('Experience successfully packed into your active itinerary!');
    } catch (err: any) {
      alert(`Itinerary note: ${err.message || 'Added to draft'}`);
    }
  };

  // Phase 18: Group Sessions
  const handleCreateGroup = async () => {
    setGroupLoading(true);
    try {
      const res = await apiClient<GroupSession>('group-sessions', {
        method: 'POST',
        body: JSON.stringify({ name: groupNameInput })
      });
      setActiveGroup(res);
      setIsGroupMode(true);
    } catch (err: any) {
      alert(`Create group error: ${err.message}`);
    } finally {
      setGroupLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!groupCodeInput.trim()) return;
    setGroupLoading(true);
    try {
      const res = await apiClient<GroupSession>('group-sessions/join', {
        method: 'POST',
        body: JSON.stringify({ code: groupCodeInput.trim().toUpperCase(), name: 'Traveler' })
      });
      setActiveGroup(res);
      setIsGroupMode(true);
    } catch (err: any) {
      alert(`Join group error: ${err.message}`);
    } finally {
      setGroupLoading(false);
    }
  };

  const handleFetchConsensus = async () => {
    if (!activeGroup) return;
    setLoading(true);
    try {
      // First submit our current intake to group
      const payload: ConstraintIntake = {
        location_context: {
          mode: locationMode,
          lat,
          lng,
          effective_time: new Date(effectiveTime).toISOString()
        },
        duration_minutes: durationMinutes,
        budget: { min: budgetMin, max: budgetMax },
        group: { size: groupSize, type: groupType },
        interests: selectedInterests,
        accessibility_tags: selectedAccessibility,
        weather_condition: weatherCondition
      };

      await apiClient(`group-sessions/${activeGroup.id}/intake`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const res = await apiClient<{ consensus_recommendations: any[] }>(`group-sessions/${activeGroup.id}/consensus`);
      const mapped = res.consensus_recommendations.map(c => ({
        ...c,
        experience: c.experience,
        score: c.score,
        reasons: c.reasons,
        score_breakdown: {
          preference_match: c.score,
          time_fit: 0.9,
          budget_fit: 0.9,
          distance_fit: 0.9,
          availability_confidence: 0.95,
          rating_avg_normalized: 0.9,
          locality_score_factor: 0.9,
          weather_multiplier: 1.0
        }
      }));
      setRecommendations(mapped);
      setHasSearched(true);
      setIsGroupModalOpen(false);
    } catch (err: any) {
      alert(`Consensus error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (experienceId: string, vote: 1 | -1) => {
    if (!activeGroup) return;
    try {
      await apiClient(`group-sessions/${activeGroup.id}/vote`, {
        method: 'POST',
        body: JSON.stringify({ experience_id: experienceId, vote })
      });
      await handleFetchConsensus();
    } catch (err: any) {
      console.error(err);
    }
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: <Compass size={18} /> },
    { id: 'discover', label: 'Discover', icon: <MapPin size={18} /> },
    { id: 'itinerary', label: 'My Itinerary', icon: <Calendar size={18} />, badge: budgetStatus ? (budgetStatus.total_committed > 0 ? 1 : 0) : 0 },
    { id: 'saved', label: 'Saved', icon: <Bookmark size={18} />, badge: savedCount },
    { id: 'messages', label: 'Messages', icon: <MessageSquare size={18} />, badge: 1 },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> }
  ];

  return (
    <div className="min-h-screen bg-bg flex overflow-x-hidden">
      {/* 1. Travelora-Structure Sidebar with §2 Warm Palette (Zero Green) */}
      <Sidebar
        title="KhojYatra"
        subtitle="Traveler Mode"
        items={navItems}
        activeId={activeNav}
        onSelect={(id) => {
          if (id === 'itinerary') {
            navigate('/itinerary');
          } else if (id === 'home') {
            navigate('/');
          } else {
            setActiveNav(id);
            setSearchParams({ tab: id });
          }
        }}
        footerContent={
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-text-secondary">
              <span>Anonymous Session</span>
              <Badge variant="accent" size="sm">Active</Badge>
            </div>
            <div className="text-[11px] font-mono text-text-secondary truncate bg-surface-alt/70 p-2 rounded-lg">
              {sessionId ? sessionId.slice(0, 16) + '...' : 'initializing...'}
            </div>
            <Link to="/auth" className="text-xs font-bold text-accent hover:underline block pt-1">
              Log in to sync trips →
            </Link>
            {/* Phase 26: Safety Check-in Trigger */}
            <button
              type="button"
              onClick={handleSafetyCheckin}
              className="w-full mt-2 py-1.5 px-2.5 rounded-pill bg-accent-soft text-accent-dark hover:bg-accent hover:text-text-inverse transition-all text-[11px] font-bold flex items-center justify-center gap-1.5 border border-accent/20"
            >
              <ShieldCheck size={12} /> Share Live Safety Link
            </button>
          </div>
        }
      />

      {/* 2. Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="px-8 py-5 bg-surface border-b border-[rgba(20,22,26,0.06)] flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-black text-xl text-text-primary tracking-tight">
              {activeNav === 'saved' && 'Saved Experiences & Wishlist'}
              {activeNav === 'messages' && 'Host & Community Messages'}
              {activeNav === 'settings' && 'Traveler Preferences & Settings'}
              {(activeNav === 'discover' || activeNav === 'home') && 'Constraint Intake & Discover'}
            </h1>
            <Badge variant="highlight" size="sm" icon={<Sparkles size={12} />}>
              {activeNav === 'saved' && `${savedCount} Bookmarks`}
              {activeNav === 'messages' && 'Live Host Chat'}
              {activeNav === 'settings' && 'Configuration'}
              {(activeNav === 'discover' || activeNav === 'home') && 'Phase 7 Complete'}
            </Badge>
          </div>

          {/* Desktop Tab Switcher */}
          <nav className="hidden md:flex items-center gap-1 bg-surface-alt/70 p-1 rounded-pill border border-[rgba(20,22,26,0.06)]">
            <button
              type="button"
              onClick={() => {
                setActiveNav('discover');
                setSearchParams({ tab: 'discover' });
              }}
              className={`px-3 py-1 rounded-pill text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeNav === 'discover' || activeNav === 'home'
                  ? 'bg-accent text-text-inverse font-bold shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              }`}
            >
              <MapPin size={13} /> Discover
            </button>
            <button
              type="button"
              onClick={() => navigate('/itinerary')}
              className="px-3 py-1 rounded-pill text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface transition-all flex items-center gap-1.5"
            >
              <Calendar size={13} /> Itinerary
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveNav('saved');
                setSearchParams({ tab: 'saved' });
              }}
              className={`px-3 py-1 rounded-pill text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeNav === 'saved'
                  ? 'bg-accent text-text-inverse font-bold shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              }`}
            >
              <Bookmark size={13} /> Saved
              {savedCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeNav === 'saved' ? 'bg-white/30 text-white' : 'bg-accent-soft text-accent'
                  }`}
                >
                  {savedCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveNav('messages');
                setSearchParams({ tab: 'messages' });
              }}
              className={`px-3 py-1 rounded-pill text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeNav === 'messages'
                  ? 'bg-accent text-text-inverse font-bold shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              }`}
            >
              <MessageSquare size={13} /> Messages
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeNav === 'messages' ? 'bg-white/30 text-white' : 'bg-accent-soft text-accent'
                }`}
              >
                1
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveNav('settings');
                setSearchParams({ tab: 'settings' });
              }}
              className={`px-3 py-1 rounded-pill text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeNav === 'settings'
                  ? 'bg-accent text-text-inverse font-bold shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              }`}
            >
              <Settings size={13} /> Settings
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {activeNav !== 'discover' && activeNav !== 'home' ? (
              <PillButton size="sm" icon={<MapPin size={13} />} onClick={() => { setActiveNav('discover'); setSearchParams({ tab: 'discover' }); }}>
                Back to Discovery
              </PillButton>
            ) : (
              <>
                <Link
                  to="/admin/ingestion-queue"
                  className="text-xs font-semibold text-text-secondary hover:text-accent transition-colors hidden md:block"
                >
                  Admin Queue (§24)
                </Link>
                <Link
                  to="/design-system"
                  className="text-xs font-semibold text-text-secondary hover:text-accent transition-colors hidden sm:block"
                >
                  Tokens & Showcase (§2)
                </Link>
                {/* Phase 25: Surprise Me Mode 1-click button */}
                <PillButton
                  size="sm"
                  icon={<Sparkles size={13} />}
                  onClick={handleSurpriseMe}
                  disabled={surpriseLoading}
                >
                  {surpriseLoading ? 'Surprising...' : '✨ Surprise Me'}
                </PillButton>
                <PillButtonOutline
                  size="sm"
                  icon={<RotateCcw size={13} />}
                  onClick={() => {
                    setDurationMinutes(120);
                    setBudgetMax(1500);
                    setSelectedInterests(['food_culinary', 'cultural_heritage']);
                    setIsSurpriseMode(false);
                  }}
                >
                  Reset Form
                </PillButtonOutline>
              </>
            )}
          </div>
        </header>

        {/* Mobile Horizontal Tab Navigation */}
        <div className="md:hidden flex items-center gap-2 overflow-x-auto px-4 py-2.5 bg-surface border-b border-[rgba(20,22,26,0.06)]">
          <button
            type="button"
            onClick={() => {
              setActiveNav('discover');
              setSearchParams({ tab: 'discover' });
            }}
            className={`px-3 py-1.5 rounded-pill text-xs font-semibold shrink-0 transition-all flex items-center gap-1 ${
              activeNav === 'discover' || activeNav === 'home'
                ? 'bg-accent text-text-inverse font-bold'
                : 'bg-surface-alt text-text-secondary'
            }`}
          >
            <MapPin size={12} /> Discover
          </button>
          <button
            type="button"
            onClick={() => navigate('/itinerary')}
            className="px-3 py-1.5 rounded-pill text-xs font-semibold shrink-0 bg-surface-alt text-text-secondary transition-all flex items-center gap-1"
          >
            <Calendar size={12} /> Itinerary
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveNav('saved');
              setSearchParams({ tab: 'saved' });
            }}
            className={`px-3 py-1.5 rounded-pill text-xs font-semibold shrink-0 transition-all flex items-center gap-1 ${
              activeNav === 'saved' ? 'bg-accent text-text-inverse font-bold' : 'bg-surface-alt text-text-secondary'
            }`}
          >
            <Bookmark size={12} /> Saved ({savedCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveNav('messages');
              setSearchParams({ tab: 'messages' });
            }}
            className={`px-3 py-1.5 rounded-pill text-xs font-semibold shrink-0 transition-all flex items-center gap-1 ${
              activeNav === 'messages' ? 'bg-accent text-text-inverse font-bold' : 'bg-surface-alt text-text-secondary'
            }`}
          >
            <MessageSquare size={12} /> Messages
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveNav('settings');
              setSearchParams({ tab: 'settings' });
            }}
            className={`px-3 py-1.5 rounded-pill text-xs font-semibold shrink-0 transition-all flex items-center gap-1 ${
              activeNav === 'settings' ? 'bg-accent text-text-inverse font-bold' : 'bg-surface-alt text-text-secondary'
            }`}
          >
            <Settings size={12} /> Settings
          </button>
        </div>

        {safetyNotice && (
          <div className="mx-8 mt-4 p-3 bg-accent-soft text-accent-dark rounded-card text-xs font-semibold flex items-center justify-between border border-accent/20">
            <span className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-accent" />
              <span>{safetyNotice}</span>
            </span>
            {safetyLink && (
              <a href={safetyLink} target="_blank" rel="noreferrer" className="underline font-bold text-accent">
                Open Link ↗
              </a>
            )}
          </div>
        )}

        {/* Tab Views: Saved, Messages, Settings */}
        {activeNav === 'saved' && (
          <SavedTab
            onAddToItinerary={(id) => handleAddToItinerary(id)}
            onExploreClick={() => {
              setActiveNav('discover');
              setSearchParams({ tab: 'discover' });
            }}
          />
        )}

        {activeNav === 'messages' && <MessagesTab />}

        {activeNav === 'settings' && <SettingsTab />}

        {/* Dashboard Content Grid (Discover/Home mode) */}
        {(activeNav === 'discover' || activeNav === 'home') && (
          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto max-w-7xl">
          {/* Left Column: Constraint Intake Form (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <Card variant="surface-alt" className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(20,22,26,0.06)] pb-4">
                <div>
                  <h2 className="font-display font-extrabold text-lg text-text-primary">
                    Find your next experience
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Stage 1 hard constraint intake: location, time window, budget & group
                  </p>
                </div>

                {/* Location Toggle: Current vs. Planned */}
                <div className="flex bg-surface p-1 rounded-pill border border-[rgba(20,22,26,0.08)]">
                  <button
                    type="button"
                    onClick={() => setLocationMode('current')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-pill transition-all ${
                      locationMode === 'current'
                        ? 'bg-accent text-text-inverse shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Navigation size={12} />
                    <span>Current</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode('planned')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-pill transition-all ${
                      locationMode === 'planned'
                        ? 'bg-accent text-text-inverse shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <MapPin size={12} />
                    <span>Planned</span>
                  </button>
                </div>
              </div>

              {/* Phase 20: Natural-Language Intake Bar */}
              <div className="p-4 bg-surface rounded-card border border-accent/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <Sparkles size={14} className="text-accent" /> Or tell us in plain words:
                  </span>
                  <Badge variant="accent" size="sm">Phase 20 AI Parser</Badge>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nlpInput}
                    onChange={(e) => setNlpInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleNlpParse();
                      }
                    }}
                    placeholder="e.g. 2 hours in Delhi under 800 rupees, we love heritage food walks"
                    className="flex-1 px-3 py-2 rounded-card bg-surface-alt border border-[rgba(20,22,26,0.08)] text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                  <PillButton
                    type="button"
                    size="sm"
                    onClick={handleNlpParse}
                    disabled={nlpLoading || !nlpInput.trim()}
                    icon={<Sparkles size={13} />}
                  >
                    {nlpLoading ? 'Parsing...' : 'Fill Form'}
                  </PillButton>
                </div>
                {nlpNotice && (
                  <div className="text-[11px] text-accent-dark bg-accent-soft p-2 rounded-md flex items-start gap-1.5 border border-accent/20">
                    <CheckCircle2 size={13} className="text-accent flex-shrink-0 mt-0.5" />
                    <span>{nlpNotice}</span>
                  </div>
                )}
              </div>

              {/* Location Input Fields */}
              {locationMode === 'planned' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-surface rounded-card border border-[rgba(20,22,26,0.06)]">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Target City / Area
                    </label>
                    <input
                      type="text"
                      value={plannedLocationName}
                      onChange={(e) => setPlannedLocationName(e.target.value)}
                      placeholder="e.g. Old Delhi, Jaipur Pink City"
                      className="w-full px-3 py-2 rounded-card bg-surface-alt border border-[rgba(20,22,26,0.08)] text-xs text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Effective Start Time
                    </label>
                    <input
                      type="datetime-local"
                      value={effectiveTime}
                      onChange={(e) => setEffectiveTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-card bg-surface-alt border border-[rgba(20,22,26,0.08)] text-xs text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-surface rounded-card border border-[rgba(20,22,26,0.05)] text-xs text-text-secondary">
                  <span className="flex items-center gap-2">
                    <Navigation size={14} className="text-accent" />
                    Auto-geolocated coordinates: <strong>{lat.toFixed(4)}° N, {lng.toFixed(4)}° E</strong>
                  </span>
                  <Badge variant="accent" size="sm">GPS Active</Badge>
                </div>
              )}

              {/* Duration Slider & Budget */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Available Time */}
                <div className="space-y-3 bg-surface/50 p-4 rounded-card border border-[rgba(20,22,26,0.04)]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-text-primary flex items-center gap-1.5">
                      <Clock size={14} className="text-accent" /> Available Window
                    </span>
                    <span className="font-mono font-bold text-accent-dark bg-accent-soft px-2 py-0.5 rounded-md">
                      {durationMinutes} mins ({Math.round((durationMinutes / 60) * 10) / 10} hrs)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="360"
                    step="15"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full accent-accent cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-text-secondary">
                    <span>30m quick bite</span>
                    <span>2h standard walk</span>
                    <span>6h half-day</span>
                  </div>
                </div>

                {/* Budget Range */}
                <div className="space-y-3 bg-surface/50 p-4 rounded-card border border-[rgba(20,22,26,0.04)]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-text-primary flex items-center gap-1.5">
                      <Wallet size={14} className="text-accent" /> Budget per Person
                    </span>
                    <span className="font-mono font-bold text-text-primary bg-surface-alt px-2 py-0.5 rounded-md border border-[rgba(20,22,26,0.08)]">
                      ₹{budgetMin} – ₹{budgetMax}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="50"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(Math.min(Number(e.target.value), budgetMax - 100))}
                      className="w-1/2 accent-accent cursor-pointer"
                    />
                    <input
                      type="range"
                      min="500"
                      max="5000"
                      step="100"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(Math.max(Number(e.target.value), budgetMin + 100))}
                      className="w-1/2 accent-accent cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-text-secondary">
                    <span>Min: ₹{budgetMin}</span>
                    <span>Max: ₹{budgetMax}</span>
                  </div>
                </div>
              </div>

              {/* Weather Condition Toggle */}
              <div className="flex items-center justify-between p-3 bg-surface rounded-card border border-[rgba(20,22,26,0.06)] text-xs">
                <span className="font-bold text-text-secondary">Simulated Weather Condition:</span>
                <div className="flex bg-surface-alt p-1 rounded-pill border border-[rgba(20,22,26,0.06)]">
                  {(['clear', 'rain', 'extreme'] as const).map((w) => (
                    <button
                      type="button"
                      key={w}
                      onClick={() => setWeatherCondition(w)}
                      className={`px-3 py-1 text-xs font-semibold rounded-pill capitalize transition-all ${
                        weatherCondition === w
                          ? 'bg-accent text-text-inverse'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {w === 'clear' ? '☀️ Clear' : w === 'rain' ? '🌧️ Rain' : '⚡ Extreme'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Group Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-2">
                    Group Type
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['solo', 'couple', 'family', 'friends'] as const).map((type) => (
                      <button
                        type="button"
                        key={type}
                        onClick={() => setGroupType(type)}
                        className={`py-2 px-1 text-xs font-bold capitalize rounded-card border transition-all ${
                          groupType === type
                            ? 'border-accent bg-accent text-text-inverse'
                            : 'border-[rgba(20,22,26,0.08)] bg-surface text-text-secondary hover:border-accent/40'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-2">
                    Group Size
                  </label>
                  <div className="flex items-center justify-between bg-surface p-2 rounded-card border border-[rgba(20,22,26,0.08)]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-text-primary px-2">
                      <Users size={14} className="text-accent" />
                      <span>{groupSize} Travelers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
                        className="w-7 h-7 rounded-full bg-surface-alt border border-[rgba(20,22,26,0.1)] flex items-center justify-center font-bold text-xs hover:border-accent"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => setGroupSize(Math.min(10, groupSize + 1))}
                        className="w-7 h-7 rounded-full bg-surface-alt border border-[rgba(20,22,26,0.1)] flex items-center justify-center font-bold text-xs hover:border-accent"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 8 Experience Category Chips */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-text-secondary">
                  Interests & Experience Categories ({selectedInterests.length} selected)
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedInterests.includes(cat.id);
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => toggleInterest(cat.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-cta-bg text-cta-text border-cta-bg shadow-sm'
                            : 'bg-surface text-text-primary border-[rgba(20,22,26,0.08)] hover:border-accent/40'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                        {isSelected && <Check size={11} className="text-highlight" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accessibility Multi-Select Chips */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-text-secondary">
                  Accessibility Preferences
                </label>
                <div className="flex flex-wrap gap-2">
                  {ACCESSIBILITY_OPTIONS.map((acc) => {
                    const isSelected = selectedAccessibility.includes(acc.id);
                    return (
                      <button
                        type="button"
                        key={acc.id}
                        onClick={() => toggleAccessibility(acc.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-accent-soft text-accent-dark border-accent'
                            : 'bg-surface text-text-secondary border-[rgba(20,22,26,0.06)]'
                        }`}
                      >
                        {acc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-[rgba(20,22,26,0.06)] flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-text-secondary">
                  Ready to compute candidate survivals across live capacity & travel constraints.
                </div>
                <PillButton
                  type="button"
                  size="md"
                  onClick={() => handleFindExperiences()}
                  disabled={loading}
                  icon={<Sparkles size={16} />}
                >
                  {loading ? 'Evaluating Feasibility...' : 'Find Experiences'}
                </PillButton>
              </div>
            </Card>

            {/* Error Message */}
            {errorMsg && (
              <Card variant="surface" className="border-danger/20 bg-danger/5 p-4 flex items-center gap-3">
                <AlertCircle size={18} className="text-danger flex-shrink-0" />
                <span className="text-xs text-danger font-semibold">{errorMsg}</span>
              </Card>
            )}

            {/* Phase 21: Travelers Like You (Community Itineraries) */}
            {hasSearched && similarCommunityItins.length > 0 && (
              <Card variant="surface" className="p-5 border-highlight/30 bg-highlight-soft/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-accent" />
                    <h3 className="font-display font-bold text-sm text-text-primary">
                      Travelers Like You
                    </h3>
                  </div>
                  <Badge variant="highlight" size="sm">Community Itineraries</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {similarCommunityItins.map((itin) => (
                    <div key={itin.id} className="p-4 rounded-card bg-surface border border-[rgba(20,22,26,0.06)] space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-xs text-text-primary">{itin.title}</h4>
                          <p className="text-[11px] text-text-secondary mt-0.5">{itin.description}</p>
                        </div>
                        {itin.match_score && (
                          <Badge variant="accent" size="sm">{Math.round(itin.match_score * 100)}% Match</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-text-secondary pt-1 border-t border-[rgba(20,22,26,0.04)]">
                        <span>{itin.experience_count || itin.experience_ids?.length || 2} stops · {itin.destination}</span>
                        <PillButton
                          size="sm"
                          onClick={() => handleCloneCommunityItinerary(itin.id)}
                        >
                          Use this Itinerary
                        </PillButton>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Phase 25: Surprise Me Active Banner */}
            {hasSearched && isSurpriseMode && (
              <div className="p-4 bg-accent-soft border border-accent/30 rounded-card flex items-center justify-between text-xs text-accent-dark">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-accent flex-shrink-0" />
                  <div>
                    <strong className="block font-display">Surprise Me Mode Active</strong>
                    <span className="text-[11px] text-text-secondary">Scoring is strongly weighted for high locality authenticity and undiscovered local gems.</span>
                  </div>
                </div>
                <PillButtonOutline size="sm" onClick={() => setIsSurpriseMode(false)}>
                  Standard Mode
                </PillButtonOutline>
              </div>
            )}

            {/* Results Preview with Persistent Something Changed Bar */}
            {hasSearched && (
              <div id="traveler-results-section" className="scroll-mt-6">
                <ResultsList
                  recommendations={recommendations}
                  sessionId={sessionId}
                  onUpdateRecommendations={(newRecs) => setRecommendations(newRecs)}
                  onAddToItinerary={(id) => handleAddToItinerary(id)}
                  isGroupMode={isGroupMode}
                  onVote={handleVote}
                  relaxedConstraints={relaxedConstraints}
                />
              </div>
            )}
          </div>

          {/* Right Column: Trip Snapshot & Promo Card (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Phase 18: Group Sessions Card */}
            <Card variant="surface" className="space-y-4 border-accent/30 bg-accent-soft/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-accent" />
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">
                    Group Trip Mode
                  </h3>
                </div>
                {activeGroup ? (
                  <Badge variant="accent" size="sm">{activeGroup.code}</Badge>
                ) : (
                  <Badge variant="highlight" size="sm">Solo</Badge>
                )}
              </div>

              {activeGroup ? (
                <div className="space-y-3">
                  <div className="text-xs text-text-secondary">
                    Active Group: <span className="font-bold text-text-primary">{activeGroup.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs bg-surface p-2.5 rounded-lg border border-[rgba(20,22,26,0.06)]">
                    <span className="text-text-secondary">Share Code:</span>
                    <span className="font-mono font-bold text-accent">{activeGroup.code}</span>
                  </div>
                  <div className="text-[11px] text-text-secondary">
                    {activeGroup.members.length} members joined. Overlapping interests receive a 2x weight boost!
                  </div>
                  <PillButton
                    size="sm"
                    className="w-full"
                    onClick={handleFetchConsensus}
                    disabled={loading}
                  >
                    Fetch Group Consensus
                  </PillButton>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Collaborate in real-time with friends. Merge preferences and vote on candidate stops.
                  </p>
                  <PillButtonOutline
                    size="sm"
                    className="w-full"
                    onClick={() => setIsGroupModalOpen(true)}
                  >
                    Start or Join Group
                  </PillButtonOutline>
                </div>
              )}
            </Card>

            {/* Trip Snapshot Card (Phase 17 Live Budget Tracker) */}
            <Card variant="surface" className="space-y-4">
              <div className="flex items-center justify-between border-b border-[rgba(20,22,26,0.06)] pb-3">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">
                  Trip Snapshot & Budget
                </h3>
                <Badge variant="accent" size="sm">Live</Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Budget Cap</span>
                  <span className="font-bold text-text-primary">₹{budgetStatus?.budget_cap || budgetMax}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Committed Amount</span>
                  <span className="font-bold text-text-primary">₹{budgetStatus?.total_committed ?? 0}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Remaining Budget</span>
                  <span className="font-mono font-bold text-accent-dark">
                    ₹{budgetStatus?.remaining_budget ?? budgetMax}
                  </span>
                </div>

                {/* Progress Indicator */}
                <div className="w-full bg-surface-alt h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      budgetStatus?.is_exceeded ? 'bg-danger' : 'bg-accent'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (((budgetStatus?.total_committed ?? 0) / (budgetStatus?.budget_cap || budgetMax)) * 100)
                      )}%`
                    }}
                  />
                </div>

                {/* Phase 17: Soft warning on budget excess */}
                {budgetStatus?.soft_warning && (
                  <div className="p-2.5 rounded-lg bg-danger-soft/60 border border-danger/20 text-[11px] text-danger font-medium flex items-center gap-1.5">
                    <AlertCircle size={13} className="flex-shrink-0" />
                    <span>{budgetStatus.soft_warning}</span>
                  </div>
                )}
              </div>

              <Link to="/itinerary" className="block w-full">
                <PillButtonOutline size="sm" className="w-full">
                  View Full Itinerary →
                </PillButtonOutline>
              </Link>
            </Card>

            {/* Promo / Explore Deals Card */}
            <Card
              variant="surface-alt"
              className="space-y-3 bg-gradient-to-br from-surface-alt via-accent-soft/30 to-highlight-soft/20 border-accent/20"
            >
              <div className="flex items-center justify-between">
                <Badge variant="highlight" size="sm" icon={<CheckCircle2 size={12} />}>
                  Host Verified
                </Badge>
                <span className="text-[10px] font-bold text-text-secondary">FEATURED</span>
              </div>

              <div>
                <h4 className="font-display font-bold text-base text-text-primary">
                  Varanasi Dawn Vedic Chants
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed mt-1">
                  Sacred morning ceremony with Vedic flute acoustics and Dashashwamedh boat rituals.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="font-bold text-text-primary">₹700 / person</span>
                <span className="text-accent font-semibold flex items-center gap-0.5">
                  150m <ArrowRight size={12} />
                </span>
              </div>

              <PillButtonOutline size="sm" className="w-full">
                Quick Add to Chain
              </PillButtonOutline>
            </Card>
          </div>
        </div>
        )}

        {/* Phase 18: Group Modal */}
        {isGroupModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-surface border border-[rgba(20,22,26,0.1)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={20} className="text-accent" />
                  <h3 className="font-display font-bold text-lg text-text-primary">
                    Group Preference Consensus
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="p-1 rounded-lg text-text-secondary hover:text-text-primary"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Option 1: Create Group */}
                <div className="p-4 bg-surface-alt rounded-xl border border-[rgba(20,22,26,0.06)] space-y-3">
                  <span className="font-display font-bold text-xs uppercase tracking-wider text-text-primary block">
                    Create New Group
                  </span>
                  <input
                    type="text"
                    value={groupNameInput}
                    onChange={(e) => setGroupNameInput(e.target.value)}
                    placeholder="Group name"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[rgba(20,22,26,0.1)] bg-surface text-text-primary focus:outline-none focus:border-accent"
                  />
                  <PillButton
                    size="sm"
                    className="w-full"
                    onClick={handleCreateGroup}
                    disabled={groupLoading}
                  >
                    {groupLoading ? 'Creating...' : 'Create Group Session'}
                  </PillButton>
                </div>

                <div className="text-center text-xs text-text-secondary font-bold uppercase tracking-wider">
                  — OR —
                </div>

                {/* Option 2: Join Group by Code */}
                <div className="p-4 bg-surface-alt rounded-xl border border-[rgba(20,22,26,0.06)] space-y-3">
                  <span className="font-display font-bold text-xs uppercase tracking-wider text-text-primary block">
                    Join with Group Code
                  </span>
                  <input
                    type="text"
                    value={groupCodeInput}
                    onChange={(e) => setGroupCodeInput(e.target.value)}
                    placeholder="Enter code e.g. GRP-A1B2"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[rgba(20,22,26,0.1)] bg-surface text-text-primary font-mono uppercase focus:outline-none focus:border-accent"
                  />
                  <PillButtonOutline
                    size="sm"
                    className="w-full"
                    onClick={handleJoinGroup}
                    disabled={groupLoading || !groupCodeInput.trim()}
                  >
                    {groupLoading ? 'Joining...' : 'Join Group'}
                  </PillButtonOutline>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TravelerApp;
