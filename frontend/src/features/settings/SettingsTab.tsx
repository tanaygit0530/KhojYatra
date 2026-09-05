import React, { useState } from 'react';
import { Card, PillButton, PillButtonOutline, Badge } from '@khojyatra/ui';
import { Settings, Shield, Globe, Bell, Check, Copy, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSessionStore } from '../../store/sessionStore';

export const SettingsTab: React.FC = () => {
  const sessionId = useSessionStore((state) => state.sessionId);
  const resetSession = useSessionStore((state) => state.resetSession);
  const userId = useSessionStore((state) => state.userId);

  // Preference states with persistence
  const [currency, setCurrency] = useState('INR');
  const [pace, setPace] = useState<'relaxed' | 'moderate' | 'packed'>('moderate');
  const [diet, setDiet] = useState('vegetarian');
  const [weatherAlerts, setWeatherAlerts] = useState(true);
  const [bufferMin, setBufferMin] = useState(10);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset your anonymous session? This generates a fresh session identifier.')) {
      resetSession();
    }
  };

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between border-b border-[rgba(20,22,26,0.06)] pb-4">
        <div>
          <h2 className="font-display font-extrabold text-xl text-text-primary flex items-center gap-2">
            <Settings size={20} className="text-accent" />
            <span>Traveler Preferences & Settings</span>
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Configure default planning constraints, notification alerts, and anonymous session keys.
          </p>
        </div>
        {savedNotice && (
          <Badge variant="accent" size="sm" icon={<Check size={12} />}>
            Preferences Saved
          </Badge>
        )}
      </div>

      <div className="space-y-6">
        {/* 1. Identity & Session Card */}
        <Card variant="surface" className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-accent" />
              <h3 className="font-display font-bold text-sm text-text-primary">
                Session & Account Identity
              </h3>
            </div>
            <Badge variant={userId ? 'accent' : 'highlight'} size="sm">
              {userId ? 'Authenticated' : 'Anonymous Traveler Session'}
            </Badge>
          </div>

          <div className="p-4 rounded-xl bg-surface-alt/70 border border-[rgba(20,22,26,0.06)] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block">
                  Current Session Identifier
                </span>
                <span className="font-mono text-xs text-text-primary">
                  {sessionId || 'Initializing...'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <PillButtonOutline size="sm" icon={copied ? <Check size={12} /> : <Copy size={12} />} onClick={handleCopy}>
                  {copied ? 'Copied' : 'Copy Key'}
                </PillButtonOutline>
                <PillButtonOutline size="sm" icon={<RotateCcw size={12} />} onClick={handleReset}>
                  New Session
                </PillButtonOutline>
              </div>
            </div>

            <div className="pt-2 border-t border-[rgba(20,22,26,0.06)] flex items-center justify-between text-xs">
              <span className="text-text-secondary">
                Want to access your itinerary across phone and desktop?
              </span>
              <Link to="/auth" className="text-accent font-bold hover:underline">
                Sign in with Supabase →
              </Link>
            </div>
          </div>
        </Card>

        {/* 2. Planning & Travel Preferences */}
        <Card variant="surface" className="p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-[rgba(20,22,26,0.06)] pb-3">
            <Globe size={16} className="text-accent" />
            <h3 className="font-display font-bold text-sm text-text-primary">
              Planning Defaults
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">
                Display Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-card bg-surface-alt border border-[rgba(20,22,26,0.08)] text-xs text-text-primary focus:outline-none focus:border-accent font-medium"
              >
                <option value="INR">INR (₹) — Indian Rupee</option>
                <option value="USD">USD ($) — US Dollar</option>
                <option value="EUR">EUR (€) — Euro</option>
                <option value="GBP">GBP (£) — British Pound</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">
                Default Travel Pace
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['relaxed', 'moderate', 'packed'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPace(p)}
                    className={`py-2 text-xs font-bold rounded-pill capitalize transition-all border ${
                      pace === p
                        ? 'bg-accent text-white border-accent shadow-xs'
                        : 'bg-surface-alt text-text-secondary border-transparent hover:bg-surface'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">
                Dietary Preference
              </label>
              <select
                value={diet}
                onChange={(e) => setDiet(e.target.value)}
                className="w-full px-3 py-2 rounded-card bg-surface-alt border border-[rgba(20,22,26,0.08)] text-xs text-text-primary focus:outline-none focus:border-accent font-medium"
              >
                <option value="none">No Restrictions (Omnivore)</option>
                <option value="vegetarian">Pure Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="halal">Halal</option>
                <option value="jain">Jain Friendly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5">
                Transit Safety Cushion (Minutes)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="5"
                  max="25"
                  step="5"
                  value={bufferMin}
                  onChange={(e) => setBufferMin(parseInt(e.target.value, 10))}
                  className="flex-1 accent-accent"
                />
                <span className="text-xs font-mono font-bold text-text-primary w-12 text-right">
                  +{bufferMin}m
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* 3. Real-Time Friction & Weather Alerts */}
        <Card variant="surface" className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[rgba(20,22,26,0.06)] pb-3">
            <Bell size={16} className="text-accent" />
            <h3 className="font-display font-bold text-sm text-text-primary">
              Adaptive Friction Engine & Live Alerts
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-card bg-surface-alt/60 cursor-pointer">
              <div>
                <span className="font-bold text-text-primary block">Real-time Weather & Rain Notifications</span>
                <span className="text-text-secondary text-[11px]">Suggest indoor cultural alternatives automatically if rainfall occurs</span>
              </div>
              <input
                type="checkbox"
                checked={weatherAlerts}
                onChange={(e) => setWeatherAlerts(e.target.checked)}
                className="w-4 h-4 accent-accent rounded"
              />
            </label>

            <div className="flex items-center justify-between p-3 rounded-card bg-surface-alt/60">
              <div>
                <span className="font-bold text-text-primary block">Locality Trust Score Threshold</span>
                <span className="text-text-secondary text-[11px]">Prioritize verified neighborhood hosts with trust scores &gt; 80/100</span>
              </div>
              <Badge variant="accent" size="sm">Active (Min 80)</Badge>
            </div>
          </div>
        </Card>

        {/* Save button CTA */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <PillButton size="md" icon={<Check size={16} />} onClick={handleSave}>
            Save Preferences
          </PillButton>
        </div>
      </div>
    </div>
  );
};
