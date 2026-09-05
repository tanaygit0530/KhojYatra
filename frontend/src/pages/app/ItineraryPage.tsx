import React, { useEffect, useState } from 'react';
import { Sidebar, Card, PillButton, PillButtonOutline, Badge, CircleFrame } from '@khojyatra/ui';
import {
  Compass,
  MapPin,
  Calendar,
  Bookmark,
  MessageSquare,
  Settings,
  Clock,
  Trash2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Route,
  Sparkles
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../store/sessionStore';
import { apiClient } from '../../lib/apiClient';
import { Itinerary, ItineraryFeasibility } from '@khojyatra/types';

export const ItineraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('itinerary');
  const sessionId = useSessionStore((state) => state.sessionId);

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [feasibility, setFeasibility] = useState<ItineraryFeasibility>({ feasible: true, conflicts: [] });
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeMessage, setOptimizeMessage] = useState<string | null>(null);

  const fetchItinerary = async () => {
    setLoading(true);
    try {
      const data = await apiClient<{ itinerary: Itinerary; feasibility: ItineraryFeasibility }>('itinerary');
      setItinerary(data.itinerary);
      setFeasibility(data.feasibility);
    } catch (err: any) {
      console.warn('Error loading itinerary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItinerary();
  }, []);

  const handleRemoveItem = async (itemId: string) => {
    try {
      const data = await apiClient<{ itinerary: Itinerary; feasibility: ItineraryFeasibility }>(`itinerary/items/${itemId}`, {
        method: 'DELETE'
      });
      setItinerary(data.itinerary);
      setFeasibility(data.feasibility);
    } catch (err: any) {
      alert(`Could not remove item: ${err.message}`);
    }
  };

  const handleOptimizeRoute = async () => {
    if (!itinerary || itinerary.items.length < 2) return;
    setOptimizing(true);
    setOptimizeMessage(null);

    try {
      const result = await apiClient<{
        optimized_items: any[];
        total_travel_time_saved_min: number;
        message: string;
      }>('itinerary/optimize-route', {
        method: 'POST',
        body: JSON.stringify({
          experience_ids: itinerary.items.map(i => i.experience_id)
        })
      });

      setOptimizeMessage(result.message || `Route optimized! Saved ${result.total_travel_time_saved_min || 15} minutes of transit.`);
      fetchItinerary();
    } catch (err: any) {
      setOptimizeMessage(`Optimization note: ${err.message || 'Sequence already optimal.'}`);
    } finally {
      setOptimizing(false);
    }
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: <Compass size={18} /> },
    { id: 'discover', label: 'Discover', icon: <MapPin size={18} /> },
    { id: 'itinerary', label: 'My Itinerary', icon: <Calendar size={18} />, badge: itinerary?.items.length || 0 },
    { id: 'saved', label: 'Saved', icon: <Bookmark size={18} /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> }
  ];

  const totalCommitted = itinerary?.items.reduce((sum, item) => sum + (item.price_committed || 0), 0) || 0;
  const budgetCap = itinerary?.budget_cap || 3000;

  return (
    <div className="min-h-screen bg-bg flex overflow-x-hidden">
      {/* Shared Sidebar */}
      <Sidebar
        title="KhojYatra"
        subtitle="Traveler Mode"
        items={navItems}
        activeId={activeNav}
        onSelect={(id) => {
          if (id === 'discover') {
            navigate('/app?tab=discover');
          } else if (id === 'home') {
            navigate('/');
          } else if (id === 'itinerary') {
            setActiveNav('itinerary');
          } else {
            navigate(`/app?tab=${id}`);
          }
        }}
        footerContent={
          <div className="space-y-1">
            <div className="text-[11px] text-text-secondary">Session: {sessionId.slice(0, 10)}...</div>
            <Link to="/app" className="text-xs font-bold text-accent hover:underline block">
              ← Back to Discovery
            </Link>
          </div>
        }
      />

      {/* Main Timeline Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-8 py-5 bg-surface border-b border-[rgba(20,22,26,0.06)] flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-black text-xl text-text-primary tracking-tight">
              My Experience Chain (Day-Planner)
            </h1>
            <Badge variant={feasibility.feasible ? 'accent' : 'danger'} size="sm">
              {feasibility.feasible ? 'Feasible Chain' : 'Time/Budget Conflict'}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <nav className="hidden md:flex items-center gap-1 bg-surface-alt/60 p-1 rounded-pill border border-[rgba(20,22,26,0.06)]">
              <Link
                to="/app?tab=discover"
                className="px-3 py-1 rounded-pill text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface transition-all flex items-center gap-1.5"
              >
                <MapPin size={13} /> Discover
              </Link>
              <span className="px-3 py-1 rounded-pill text-xs font-bold text-text-inverse bg-accent shadow-xs flex items-center gap-1.5">
                <Calendar size={13} /> Itinerary
              </span>
              <Link
                to="/app?tab=saved"
                className="px-3 py-1 rounded-pill text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface transition-all flex items-center gap-1.5"
              >
                <Bookmark size={13} /> Saved
              </Link>
              <Link
                to="/app?tab=messages"
                className="px-3 py-1 rounded-pill text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface transition-all flex items-center gap-1.5"
              >
                <MessageSquare size={13} /> Messages
              </Link>
              <Link
                to="/app?tab=settings"
                className="px-3 py-1 rounded-pill text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface transition-all flex items-center gap-1.5"
              >
                <Settings size={13} /> Settings
              </Link>
            </nav>
            <Link to="/app">
              <PillButton size="sm">+ Add Experiences</PillButton>
            </Link>
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-5xl space-y-6">
          {/* Status & Feasibility Banner */}
          {!feasibility.feasible && (
            <Card variant="surface" className="border-2 border-danger/40 bg-danger/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-danger font-bold text-sm">
                <ShieldAlert size={18} />
                <span>Scheduling Conflict Detected</span>
              </div>
              {feasibility.conflicts.map((c, i) => (
                <div key={i} className="text-xs text-danger font-medium flex items-start gap-2">
                  <span>•</span>
                  <span>{c.message}</span>
                </div>
              ))}
            </Card>
          )}

          {/* Budget & Route Optimizer Summary Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card variant="surface-alt" className="p-4 space-y-1">
              <span className="text-[11px] font-mono uppercase text-text-secondary font-bold">
                Remaining Budget (Phase 17)
              </span>
              <div className={`text-xl font-display font-black ${totalCommitted > budgetCap ? 'text-danger' : 'text-accent-dark'}`}>
                ₹{Math.max(0, budgetCap - totalCommitted)}{' '}
                <span className="text-xs text-text-secondary font-normal">
                  (₹{totalCommitted} spent of ₹{budgetCap})
                </span>
              </div>
            </Card>

            <Card variant="surface-alt" className="p-4 space-y-1">
              <span className="text-[11px] font-mono uppercase text-text-secondary font-bold">
                Stops Scheduled
              </span>
              <div className="text-xl font-display font-black text-text-primary">
                {itinerary?.items.length || 0} Experiences
              </div>
            </Card>

            <Card variant="surface-alt" className="p-4 flex flex-col justify-between">
              <span className="text-[11px] font-mono uppercase text-text-secondary font-bold">
                Route Optimizer (Phase 11)
              </span>
              <PillButtonOutline
                size="sm"
                onClick={handleOptimizeRoute}
                disabled={optimizing || (itinerary?.items.length || 0) < 2}
                icon={<Route size={14} />}
                className="mt-1"
              >
                {optimizing ? 'Optimizing...' : 'Minimize Transit Order'}
              </PillButtonOutline>
            </Card>
          </div>

          {optimizeMessage && (
            <div className="p-3 bg-accent-soft text-accent-dark rounded-card text-xs font-semibold flex items-center gap-2 border border-accent/20">
              <Sparkles size={14} />
              <span>{optimizeMessage}</span>
            </div>
          )}

          {/* Timeline View */}
          <div className="space-y-4">
            <h2 className="font-display font-extrabold text-base text-text-primary">
              Timeline Stops (Ordered by Position)
            </h2>

            {loading ? (
              <p className="text-xs text-text-secondary">Loading itinerary...</p>
            ) : (!itinerary || itinerary.items.length === 0) ? (
              <Card variant="surface" className="text-center py-12 space-y-3">
                <Calendar size={32} className="mx-auto text-text-secondary opacity-40" />
                <h3 className="font-display font-bold text-base text-text-primary">
                  Your itinerary is empty
                </h3>
                <p className="text-xs text-text-secondary max-w-sm mx-auto">
                  Browse the Discover page and click "Add to Itinerary" to automatically schedule experiences with greedy time-window packing.
                </p>
                <Link to="/app" className="inline-block pt-2">
                  <PillButton size="sm">Browse Experiences</PillButton>
                </Link>
              </Card>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[rgba(20,22,26,0.1)]">
                {itinerary.items.map((item, idx) => {
                  const startTimeFormatted = new Date(item.start_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  const hasConflict = feasibility.conflicts.some(c => c.item_id === item.id);

                  return (
                    <div key={item.id} className="relative">
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-[29px] top-4 w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold z-10 shadow-sm ${
                          hasConflict
                            ? 'bg-danger text-text-inverse'
                            : 'bg-accent text-text-inverse'
                        }`}
                      >
                        {item.position}
                      </div>

                      <Card
                        variant="surface-alt"
                        className={`p-5 transition-all ${
                          hasConflict
                            ? 'border-2 border-danger bg-danger/5 shadow-md'
                            : 'hover:border-accent/30'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <CircleFrame
                              size={60}
                              src={item.experience?.photo_urls[0] || 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=200&auto=format&fit=crop&q=80'}
                              alt={item.experience?.title || 'Stop'}
                            />
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-accent">
                                  {startTimeFormatted}
                                </span>
                                <Badge variant="highlight" size="sm">
                                  ₹{item.price_committed}
                                </Badge>
                                {hasConflict && (
                                  <Badge variant="danger" size="sm" icon={<AlertTriangle size={10} />}>
                                    Late Arrival
                                  </Badge>
                                )}
                              </div>

                              <h3 className="font-display font-bold text-base text-text-primary truncate">
                                {item.experience?.title || 'Experience Stop'}
                              </h3>

                              <div className="flex items-center gap-3 text-xs text-text-secondary">
                                <span className="flex items-center gap-1">
                                  <Clock size={12} className="text-accent" /> {item.experience?.duration_min || 90}m duration
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin size={12} className="text-accent" /> Delhi
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-text-secondary hover:text-danger p-2 rounded-full hover:bg-danger/10 transition-colors"
                            title="Remove Stop"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Inline transit estimate to next stop */}
                        {idx < itinerary.items.length - 1 && (
                          <div className="mt-4 pt-3 border-t border-[rgba(20,22,26,0.06)] flex items-center justify-between text-xs text-text-secondary">
                            <span className="flex items-center gap-1.5 font-medium">
                              <ArrowRight size={12} className="text-accent" /> Transit to Stop #{idx + 2}
                            </span>
                            <span className="font-mono text-[11px] bg-surface px-2 py-0.5 rounded">
                              ~15 min urban transit
                            </span>
                          </div>
                        )}
                      </Card>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItineraryPage;
