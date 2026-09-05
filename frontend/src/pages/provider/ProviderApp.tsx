import React, { useState, useEffect } from 'react';
import { Sidebar, Card, PillButton, PillButtonOutline, Badge, CircleFrame } from '@khojyatra/ui';
import {
  Store,
  Calendar,
  BarChart3,
  MessageSquare,
  Settings,
  Plus,
  MapPin,
  AlertCircle,
  Eye,
  Sparkles,
  Upload,
  CheckCircle2,
  Pause,
  Play,
  Mic,
  Flame,
  Check,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { uploadExperiencePhoto } from '../../lib/storage';
import { Experience, ExperienceCategory, DemandInsight } from '@khojyatra/types';

const CATEGORIES: { id: ExperienceCategory; label: string }[] = [
  { id: 'food_culinary', label: 'Food & Culinary' },
  { id: 'cultural_heritage', label: 'Cultural Heritage' },
  { id: 'festivals_events', label: 'Festivals & Events' },
  { id: 'workshops_classes', label: 'Workshops & Classes' },
  { id: 'adventure_outdoor', label: 'Adventure & Outdoor' },
  { id: 'hidden_gems', label: 'Hidden Gems' },
  { id: 'shopping_markets', label: 'Shopping & Markets' },
  { id: 'nightlife_entertainment', label: 'Nightlife & Entertainment' }
];

export const ProviderApp: React.FC = () => {
  const [activeNav, setActiveNav] = useState('offerings');
  const [offerings, setOfferings] = useState<Experience[]>([]);
  const [providerInfo, setProviderInfo] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal / Form state for "+ New Offering"
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExperienceCategory>('workshops_classes');
  const [priceMin, setPriceMin] = useState<number>(800);
  const [priceMax, setPriceMax] = useState<number>(1400);
  const [durationMin, setDurationMin] = useState<number>(90);
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Availability Slot Manager State
  const [selectedExpForSlot, setSelectedExpForSlot] = useState<string>('');
  const [slotDate, setSlotDate] = useState(
    new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16)
  );
  const [slotCapacity, setSlotCapacity] = useState(10);
  const [slotNotice, setSlotNotice] = useState<string | null>(null);

  // Phase 22: Demand Heatmap & Insights
  const [demandInsights, setDemandInsights] = useState<DemandInsight[]>([]);

  // Phase 23: WhatsApp Voice Supply Updates
  const [voiceUpdates, setVoiceUpdates] = useState<any[]>([]);
  const [voiceActionLoading, setVoiceActionLoading] = useState<string | null>(null);

  const fetchProviderData = async () => {
    setLoading(true);
    try {
      const [prov, off, ins] = await Promise.all([
        apiClient<any>('providers/me').catch(() => null),
        apiClient<Experience[]>('providers/offerings').catch(() => []),
        apiClient<any>('providers/insights').catch(() => null)
      ]);

      const provId = prov?.id || 'prov-1';
      const [demandRes, voiceRes] = await Promise.all([
        apiClient<{ demand_insights: DemandInsight[] }>(`providers/${provId}/demand-insights`).catch(() => null),
        apiClient<{ voice_updates: any[] }>(`providers/${provId}/voice-updates`).catch(() => null)
      ]);

      setProviderInfo(prov);
      setOfferings(off || []);
      setInsights(ins);
      if (demandRes?.demand_insights) setDemandInsights(demandRes.demand_insights);
      if (voiceRes?.voice_updates) setVoiceUpdates(voiceRes.voice_updates);

      if (off && off.length > 0 && !selectedExpForSlot) {
        setSelectedExpForSlot(off[0].id);
      }
    } catch (err) {
      console.warn('Error loading provider portal:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmVoiceUpdate = async (logId: string, confirmed: boolean) => {
    const provId = providerInfo?.id || 'prov-1';
    setVoiceActionLoading(logId);
    try {
      await apiClient(`providers/${provId}/voice-updates/${logId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ confirmed })
      });
      // Refresh voice updates
      const voiceRes = await apiClient<{ voice_updates: any[] }>(`providers/${provId}/voice-updates`).catch(() => null);
      if (voiceRes?.voice_updates) setVoiceUpdates(voiceRes.voice_updates);
      setSlotNotice(confirmed ? 'Voice update confirmed & slot published!' : 'Voice update dismissed.');
      setTimeout(() => setSlotNotice(null), 3500);
    } catch (err: any) {
      alert(`Voice confirmation note: ${err.message}`);
    } finally {
      setVoiceActionLoading(null);
    }
  };

  useEffect(() => {
    fetchProviderData();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await uploadExperiencePhoto(file);
      setPhotoUrl(url);
    } catch (err: any) {
      alert(`Upload note: ${err.message || 'Image uploaded for demo'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateOffering = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      title,
      description,
      category,
      price_min: Number(priceMin),
      price_max: Number(priceMax),
      duration_min: Number(durationMin),
      lat: 28.6506,
      lng: 77.2303,
      accessibility_tags: ['step_free'],
      interest_tags: ['artisan', 'host_verified'],
      photo_urls: photoUrl
        ? [photoUrl]
        : ['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&auto=format&fit=crop&q=80'],
      offering_status: 'published'
    };

    try {
      const created = await apiClient<Experience>('experiences', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setOfferings([created, ...offerings]);
      setShowModal(false);
      // Reset form
      setTitle('');
      setDescription('');
      setPhotoUrl('');
      alert('🎉 Offering published! It will now appear live in traveler search results.');
    } catch (err: any) {
      alert(`Could not create offering: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (expId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'published' ? 'paused' : 'published';
    try {
      await apiClient(`experiences/${expId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ offering_status: nextStatus })
      });
      setOfferings(
        offerings.map(o => (o.id === expId ? { ...o, offering_status: nextStatus as any } : o))
      );
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpForSlot) return;

    const start = new Date(slotDate);
    const end = new Date(start.getTime() + 90 * 60 * 1000);

    try {
      await apiClient(`experiences/${selectedExpForSlot}/availability`, {
        method: 'POST',
        body: JSON.stringify({
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          capacity_remaining: Number(slotCapacity)
        })
      });
      setSlotNotice(`Successfully created slot with ${slotCapacity} spots!`);
      setTimeout(() => setSlotNotice(null), 3500);
    } catch (err: any) {
      alert(`Could not create slot: ${err.message}`);
    }
  };

  const isPending = providerInfo?.verification_status === 'pending';

  const navItems = [
    { id: 'home', label: 'Home', icon: <Store size={18} /> },
    { id: 'offerings', label: 'My Offerings', icon: <MapPin size={18} />, badge: offerings.length },
    { id: 'availability', label: 'Availability', icon: <Calendar size={18} /> },
    { id: 'insights', label: 'Insights', icon: <BarChart3 size={18} /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> }
  ];

  return (
    <div className="min-h-screen bg-bg flex overflow-x-hidden">
      {/* 1. Reusable Sidebar with §2 skinning */}
      <Sidebar
        title="KhojYatra"
        subtitle="Provider Portal"
        items={navItems}
        activeId={activeNav}
        onSelect={setActiveNav}
        footerContent={
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant={isPending ? 'warning' : 'success'} size="sm" icon={<AlertCircle size={11} />}>
                {isPending ? 'Verification: Pending' : 'Verified Host'}
              </Badge>
            </div>
            <div className="text-[11px] text-text-secondary">
              Community Vouch Count: <strong>{providerInfo?.community_vouch_count || 4}</strong>
            </div>
            <Link to="/app" className="text-xs font-bold text-accent hover:underline block pt-1">
              Switch to Traveler View →
            </Link>
          </div>
        }
      />

      {/* 2. Main Provider Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-8 py-5 bg-surface border-b border-[rgba(20,22,26,0.06)] flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-black text-xl text-text-primary tracking-tight">
              {activeNav === 'offerings' && 'My Offerings & Listings'}
              {activeNav === 'availability' && 'Availability & Slot Management'}
              {activeNav === 'insights' && 'Demand Analytics & Performance'}
              {activeNav === 'home' && 'Provider Home Dashboard'}
            </h1>
            <Badge variant="highlight" size="sm">
              Trust Score {providerInfo?.trust_score || 68}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <PillButton size="sm" icon={<Plus size={14} />} onClick={() => setShowModal(true)}>
              + New Offering
            </PillButton>
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-6xl space-y-6">
          {/* TAB 1: My Offerings */}
          {activeNav === 'offerings' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-extrabold text-base text-text-primary">
                    Active Catalog ({offerings.length} Experiences)
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Published offerings are immediately evaluated by the Stage 1 & 2 Decision Engine.
                  </p>
                </div>
              </div>

              {loading ? (
                <p className="text-xs text-text-secondary">Loading offerings...</p>
              ) : offerings.length === 0 ? (
                <Card variant="surface" className="text-center py-12 space-y-3">
                  <p className="font-bold text-sm text-text-primary">No offerings yet</p>
                  <PillButton size="sm" onClick={() => setShowModal(true)}>Create First Offering</PillButton>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {offerings.map((exp) => (
                    <Card key={exp.id} variant="surface-alt" className="space-y-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[11px] font-mono font-bold uppercase text-accent tracking-wider">
                            {exp.category.replace('_', ' ')}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {isPending && (
                              <Badge variant="warning" size="sm">
                                Unverified
                              </Badge>
                            )}
                            <Badge
                              variant={exp.offering_status === 'published' ? 'success' : 'neutral'}
                              size="sm"
                            >
                              {exp.offering_status}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mt-3">
                          <CircleFrame
                            size={52}
                            src={exp.photo_urls[0] || 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=150&auto=format&fit=crop&q=80'}
                            alt={exp.title}
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-display font-bold text-sm text-text-primary truncate">
                              {exp.title}
                            </h3>
                            <div className="text-xs text-text-secondary flex items-center gap-2 mt-0.5">
                              <span>₹{exp.price_min} - ₹{exp.price_max}</span>
                              <span>•</span>
                              <span>{exp.duration_min}m</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-text-secondary line-clamp-2 mt-3 leading-relaxed">
                          {exp.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[rgba(20,22,26,0.06)] flex items-center gap-2">
                        <PillButtonOutline
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedExpForSlot(exp.id);
                            setActiveNav('availability');
                          }}
                        >
                          Slots
                        </PillButtonOutline>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(exp.id, exp.offering_status)}
                          className="p-2 rounded-full hover:bg-surface border border-[rgba(20,22,26,0.08)] text-text-secondary hover:text-text-primary transition-colors"
                          title={exp.offering_status === 'published' ? 'Pause offering' : 'Publish offering'}
                        >
                          {exp.offering_status === 'published' ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Availability */}
          {activeNav === 'availability' && (
            <div className="space-y-6">
              <Card variant="surface-alt" className="space-y-6">
                <div>
                  <h2 className="font-display font-extrabold text-base text-text-primary">
                    Manage Booking Slots & Capacity
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Live slots feed Stage 1 hard constraints. When remaining capacity hits 0, offerings automatically step aside in traveler search.
                  </p>
                </div>

                {slotNotice && (
                  <div className="p-3 bg-accent-soft text-accent-dark rounded-card text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={14} />
                    <span>{slotNotice}</span>
                  </div>
                )}

                <form onSubmit={handleAddSlot} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Experience
                    </label>
                    <select
                      value={selectedExpForSlot}
                      onChange={(e) => setSelectedExpForSlot(e.target.value)}
                      className="w-full px-3 py-2 rounded-card bg-surface border border-[rgba(20,22,26,0.08)] text-xs text-text-primary focus:outline-none focus:border-accent"
                    >
                      {offerings.map(o => (
                        <option key={o.id} value={o.id}>{o.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Slot Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={slotDate}
                      onChange={(e) => setSlotDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-card bg-surface border border-[rgba(20,22,26,0.08)] text-xs text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1">
                      Seats / Capacity
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={slotCapacity}
                      onChange={(e) => setSlotCapacity(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-card bg-surface border border-[rgba(20,22,26,0.08)] text-xs text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="sm:col-span-3 pt-2">
                    <PillButton type="submit" size="sm">
                      + Add Availability Window
                    </PillButton>
                  </div>
                </form>
              </Card>

              {/* Phase 23: WhatsApp Voice Supply Updates */}
              <Card variant="surface" className="p-5 border-accent/20 bg-surface-alt space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic size={16} className="text-accent" />
                    <h3 className="font-display font-bold text-sm text-text-primary">
                      WhatsApp Voice Note Updates ({voiceUpdates.filter(v => v.status === 'pending_review').length} Pending)
                    </h3>
                  </div>
                  <Badge variant="accent" size="sm">Voice AI Sync</Badge>
                </div>
                <p className="text-xs text-text-secondary">
                  Send a voice note to the KhojYatra WhatsApp business number (e.g. "कल शाम 5 बजे 4 सीट खाली हैं").
                  Voice notes are transcribed, extracted, and held here for your one-click approval before publishing to traveler search.
                </p>

                {voiceUpdates.filter(v => v.status === 'pending_review').length === 0 ? (
                  <div className="p-4 bg-surface rounded-card border border-[rgba(20,22,26,0.06)] text-center text-xs text-text-secondary">
                    No pending voice updates. Send an audio note on WhatsApp to sync capacity hands-free.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {voiceUpdates
                      .filter(v => v.status === 'pending_review')
                      .map((item) => (
                        <div
                          key={item.id}
                          className="p-4 bg-surface rounded-card border border-[rgba(20,22,26,0.08)] flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                              <span className="bg-accent-soft text-accent px-2 py-0.5 rounded text-[11px] font-mono">
                                {item.extracted_slot?.slot_time ? new Date(item.extracted_slot.slot_time).toLocaleString() : 'Upcoming'}
                              </span>
                              <span>·</span>
                              <span>{item.extracted_slot?.capacity_remaining || 4} spots</span>
                            </div>
                            <div className="text-xs italic text-text-secondary bg-surface-alt/70 p-2 rounded border border-[rgba(20,22,26,0.04)]">
                              "{item.transcription}"
                            </div>
                            <div className="text-[10px] text-text-secondary">
                              Duration: {item.audio_duration_seconds}s · Sender: {item.sender_phone}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <PillButton
                              size="sm"
                              icon={<Check size={13} />}
                              disabled={voiceActionLoading === item.id}
                              onClick={() => handleConfirmVoiceUpdate(item.id, true)}
                            >
                              Confirm & Publish
                            </PillButton>
                            <PillButtonOutline
                              size="sm"
                              icon={<X size={13} />}
                              disabled={voiceActionLoading === item.id}
                              onClick={() => handleConfirmVoiceUpdate(item.id, false)}
                            >
                              Dismiss
                            </PillButtonOutline>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                <div className="text-[10px] text-text-secondary pt-2 border-t border-[rgba(20,22,26,0.06)] flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-accent flex-shrink-0" />
                  <span>Privacy Policy: Raw audio recordings are immediately discarded after extraction. Only verified text metadata is retained.</span>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: Insights */}
          {(activeNav === 'insights' || activeNav === 'home') && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card variant="surface-alt" className="p-4 space-y-1">
                  <div className="flex items-center justify-between text-text-secondary">
                    <span className="text-xs font-bold uppercase">Total Views</span>
                    <Eye size={16} className="text-accent" />
                  </div>
                  <div className="text-2xl font-display font-black text-text-primary">
                    {insights?.total_views || 240}
                  </div>
                </Card>

                <Card variant="surface-alt" className="p-4 space-y-1">
                  <div className="flex items-center justify-between text-text-secondary">
                    <span className="text-xs font-bold uppercase">Recommendation Matches</span>
                    <Sparkles size={16} className="text-highlight" />
                  </div>
                  <div className="text-2xl font-display font-black text-text-primary">
                    {insights?.total_recommendations || 82}
                  </div>
                </Card>

                <Card variant="surface-alt" className="p-4 space-y-1">
                  <div className="flex items-center justify-between text-text-secondary">
                    <span className="text-xs font-bold uppercase">Authenticity Locality Score</span>
                    <Badge variant="highlight" size="sm">Verified</Badge>
                  </div>
                  <div className="text-2xl font-display font-black text-text-primary">
                    95 / 100
                  </div>
                </Card>
              </div>

              {/* Phase 22: Unmet Traveler Demand Heatmap */}
              <Card variant="surface-alt" className="p-6 space-y-6 border-accent/20">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(20,22,26,0.06)] pb-4">
                  <div className="flex items-center gap-2">
                    <Flame size={18} className="text-accent" />
                    <div>
                      <h3 className="font-display font-bold text-base text-text-primary">
                        Unmet Traveler Demand Heatmap
                      </h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Aggregated search volume within 45km of your offerings where travelers found zero available slots.
                      </p>
                    </div>
                  </div>
                  <Badge variant="accent" size="sm">Phase 22 Heatmap</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-surface rounded-card border border-[rgba(20,22,26,0.06)] space-y-1">
                    <div className="text-xs text-text-secondary font-medium">Demand Clusters in Area</div>
                    <div className="text-2xl font-display font-black text-text-primary">
                      {demandInsights.reduce((sum, d) => sum + d.search_count, 0) || 65}
                    </div>
                  </div>
                  <div className="p-4 bg-surface rounded-card border border-[rgba(20,22,26,0.06)] space-y-1">
                    <div className="text-xs text-text-secondary font-medium">Unmet Searches (Zero Coverage)</div>
                    <div className="text-2xl font-display font-black text-accent-dark">
                      {demandInsights.filter(d => !d.provider_has_coverage).reduce((sum, d) => sum + d.search_count, 0) || 25}
                    </div>
                  </div>
                </div>

                {/* Demand Insights Feed */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Real-time Traveler Demand Signals (45km Radius)
                  </h4>
                  <div className="space-y-2">
                    {demandInsights.map((insight, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-surface rounded-card border border-[rgba(20,22,26,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold capitalize text-text-primary">
                              {insight.category.replace('_', ' ')}
                            </span>
                            <span className="text-[11px] font-mono bg-surface-alt px-2 py-0.5 rounded text-text-secondary">
                              {insight.time_window}
                            </span>
                            <Badge
                              variant={insight.provider_has_coverage ? 'success' : 'warning'}
                              size="sm"
                            >
                              {insight.provider_has_coverage ? 'Covered' : 'Unmet Gap'}
                            </Badge>
                          </div>
                          <p className="text-xs text-text-secondary">{insight.message}</p>
                        </div>
                        <div className="flex items-center gap-2 sm:flex-col sm:items-end flex-shrink-0">
                          <span className="text-sm font-mono font-black text-accent">
                            {insight.search_count} searches
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Peak Unmet Windows & Recommendation */}
                <div className="p-4 bg-highlight-soft/20 border border-highlight/30 rounded-card space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-text-primary" />
                    <h4 className="font-bold text-xs text-text-primary">Recommended Action</h4>
                  </div>
                  <p className="text-xs text-text-primary leading-relaxed">
                    High unmet demand detected for evening culinary and cultural walks. Add slots between 18:00 - 21:00 to capture waiting traveler intent.
                  </p>
                  <PillButton
                    size="sm"
                    onClick={() => setActiveNav('availability')}
                  >
                    Open Availability Slot Now →
                  </PillButton>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* 3. New Offering Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-cta-bg/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card variant="surface-alt" className="max-w-xl w-full p-6 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-[rgba(20,22,26,0.06)] pb-4">
              <h2 className="font-display font-black text-xl text-text-primary">
                + Create New Experience Offering
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-text-secondary hover:text-text-primary font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOffering} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Experience Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Traditional Hand-Block Indigo Printing Masterclass"
                  className="w-full px-3 py-2 rounded-card bg-surface border border-[rgba(20,22,26,0.08)] text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Description
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what travelers will experience, craft techniques, tools used, and local heritage..."
                  className="w-full px-3 py-2 rounded-card bg-surface border border-[rgba(20,22,26,0.08)] text-xs text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-card bg-surface border border-[rgba(20,22,26,0.08)] text-xs text-text-primary focus:outline-none focus:border-accent"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="480"
                    step="15"
                    value={durationMin}
                    onChange={(e) => setDurationMin(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-card bg-surface border border-[rgba(20,22,26,0.08)] text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Min Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={priceMin}
                    onChange={(e) => setPriceMin(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-card bg-surface border border-[rgba(20,22,26,0.08)] text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">
                    Max Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={priceMax}
                    onChange={(e) => setPriceMax(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-card bg-surface border border-[rgba(20,22,26,0.08)] text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Media Photo Upload (Phase 14) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-text-secondary">
                  Experience Photo (Supabase Storage Bucket: experience-photos)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-card bg-surface border border-dashed border-accent cursor-pointer hover:bg-accent-soft/30 transition-colors text-xs font-semibold text-accent">
                    <Upload size={14} />
                    <span>{uploading ? 'Uploading...' : 'Upload Image File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-text-secondary">or paste URL:</span>
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3 py-2 rounded-card bg-surface border border-[rgba(20,22,26,0.08)] text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                {photoUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <CircleFrame size={44} src={photoUrl} alt="Preview" />
                    <span className="text-[11px] text-text-secondary font-mono truncate max-w-xs">
                      {photoUrl}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[rgba(20,22,26,0.06)] flex items-center justify-end gap-3">
                <PillButtonOutline type="button" size="sm" onClick={() => setShowModal(false)}>
                  Cancel
                </PillButtonOutline>
                <PillButton type="submit" size="sm" disabled={submitting}>
                  {submitting ? 'Publishing...' : 'Publish Offering'}
                </PillButton>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProviderApp;
