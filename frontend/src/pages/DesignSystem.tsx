import React, { useState } from 'react';
import {
  PillButton,
  PillButtonOutline,
  Card,
  CircleFrame,
  Badge,
  Sidebar,
  SidebarNavItem
} from '@khojyatra/ui';
import {
  Compass,
  MapPin,
  Calendar,
  Bookmark,
  MessageSquare,
  Settings,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2
} from 'lucide-react';

export const DesignSystemPage: React.FC = () => {
  const [activeSidebarItem, setActiveSidebarItem] = useState('discover');

  const navItems: SidebarNavItem[] = [
    { id: 'home', label: 'Home', icon: <Compass size={18} /> },
    { id: 'discover', label: 'Discover', icon: <MapPin size={18} />, badge: 'New' },
    { id: 'itinerary', label: 'My Itinerary', icon: <Calendar size={18} />, badge: 3 },
    { id: 'saved', label: 'Saved', icon: <Bookmark size={18} /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> }
  ];

  const colorTokens = [
    { name: '--color-bg', value: '#F6F1E7', label: 'Base Warm Cream BG' },
    { name: '--color-surface', value: '#FBF8F2', label: 'Surface (Sidebar & Nav)' },
    { name: '--color-surface-alt', value: '#FFFFFF', label: 'Surface Alt (Cards)' },
    { name: '--color-text-primary', value: '#14161A', label: 'Primary Deep Slate Text' },
    { name: '--color-text-secondary', value: '#5B5A55', label: 'Secondary Slate Gray' },
    { name: '--color-text-inverse', value: '#FBF8F2', label: 'Inverse Light Text' },
    { name: '--color-accent', value: '#2F5DE3', label: 'Sky Blue Accent (Replaces Green)' },
    { name: '--color-accent-dark', value: '#1E3A8A', label: 'Accent Dark' },
    { name: '--color-accent-soft', value: '#DCE6FB', label: 'Accent Soft Tint' },
    { name: '--color-highlight', value: '#F2A93B', label: 'Warm Balloon Orange' },
    { name: '--color-highlight-soft', value: '#FBEBD0', label: 'Highlight Soft Pill' },
    { name: '--color-cta-bg', value: '#14161A', label: 'CTA Pill Background' },
    { name: '--color-cta-text', value: '#FBF8F2', label: 'CTA Pill Text' },
    { name: '--color-success', value: '#2E9E6D', label: 'Semantic Success (Status Only)' },
    { name: '--color-warning', value: '#D98C2B', label: 'Semantic Warning' },
    { name: '--color-danger', value: '#D24B3C', label: 'Semantic Danger' }
  ];

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      {/* Header Bar */}
      <header className="border-b border-[rgba(20,22,26,0.06)] bg-surface px-8 py-5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <h1 className="font-display font-black text-2xl tracking-tight text-text-primary">
            KhojYatra
          </h1>
          <span className="bg-accent-soft text-accent-dark text-xs font-bold px-3 py-1 rounded-pill">
            Unified Design System §2
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/"
            className="text-sm font-semibold text-text-secondary hover:text-accent transition-colors"
          >
            ← Public Landing
          </a>
          <a
            href="/app"
            className="text-sm font-semibold text-text-secondary hover:text-accent transition-colors"
          >
            Traveler Dashboard →
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        {/* Section 1: Color Tokens */}
        <section className="space-y-6">
          <div>
            <h2 className="font-display font-extrabold text-2xl text-text-primary">
              0.1 Color System & Tokens
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              Defined strictly as CSS variables in <code>:root</code>. Zero hardcoded hex values in UI components.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {colorTokens.map((token) => (
              <div
                key={token.name}
                className="bg-surface-alt rounded-card p-4 shadow-card border border-[rgba(20,22,26,0.04)] flex flex-col gap-2"
              >
                <div
                  className="h-16 w-full rounded-xl border border-[rgba(20,22,26,0.08)] shadow-inner"
                  style={{ backgroundColor: `var(${token.name})` }}
                />
                <div>
                  <div className="text-xs font-mono font-bold text-text-primary">
                    {token.name}
                  </div>
                  <div className="text-xs text-text-secondary flex items-center justify-between mt-0.5">
                    <span>{token.value}</span>
                    <span className="text-[11px] font-medium">{token.label}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Typography */}
        <section className="space-y-6">
          <div>
            <h2 className="font-display font-extrabold text-2xl text-text-primary">
              0.2 Typography Standards
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              Display headlines use bold geometric sans (Poppins 800 / Clash Display). Body & UI use Inter.
            </p>
          </div>

          <Card variant="surface-alt" className="space-y-6">
            <div className="border-b border-[rgba(20,22,26,0.06)] pb-6">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent">
                Display / Headline Font: Poppins 800
              </span>
              <h1 className="font-display font-black text-4xl text-text-primary mt-2">
                Find what fits, right now.
              </h1>
              <p className="font-display font-bold text-xl text-text-secondary mt-1">
                Hyper-contextual travel decisions with real-time adaptive replanning.
              </p>
            </div>

            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent">
                Body & Interface Font: Inter
              </span>
              <p className="font-body text-base text-text-primary mt-2 leading-relaxed">
                KhojYatra reconciles hard constraints (time, budget, physical accessibility, opening hours) and soft preferences to deliver feasible, immediate experience chains across India’s cultural landscape.
              </p>
            </div>
          </Card>
        </section>

        {/* Section 3: Buttons */}
        <section className="space-y-6">
          <div>
            <h2 className="font-display font-extrabold text-2xl text-text-primary">
              0.3 Pill Buttons & Actions
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              Black pill CTA button for primary conversions; accent-blue outlined button for secondary tabs & actions.
            </p>
          </div>

          <Card variant="surface-alt" className="flex flex-wrap items-center gap-6">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-text-secondary">PillButton (Black CTA)</span>
              <div className="flex items-center gap-3">
                <PillButton size="sm">Get Started</PillButton>
                <PillButton size="md" icon={<Sparkles size={16} />}>Find Experiences</PillButton>
                <PillButton size="lg" icon={<ArrowRight size={18} />}>Book Experience</PillButton>
              </div>
            </div>

            <div className="flex flex-col gap-3 ml-auto">
              <span className="text-xs font-semibold text-text-secondary">PillButtonOutline (Accent Blue)</span>
              <div className="flex items-center gap-3">
                <PillButtonOutline size="sm">Explore</PillButtonOutline>
                <PillButtonOutline size="md" icon={<Compass size={16} />}>View Details</PillButtonOutline>
                <PillButtonOutline size="lg">Add to Itinerary</PillButtonOutline>
              </div>
            </div>
          </Card>
        </section>

        {/* Section 4: Badges & Scores */}
        <section className="space-y-6">
          <div>
            <h2 className="font-display font-extrabold text-2xl text-text-primary">
              0.4 Badges & Status Indicators
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              Highlight-orange for KhojYatra scores (Locality Score, Trust Score), and semantic tokens for operational status.
            </p>
          </div>

          <Card variant="surface-alt" className="flex flex-wrap gap-4 items-center">
            <Badge variant="highlight" icon={<Sparkles size={13} />}>
              Locality Score 94
            </Badge>
            <Badge variant="highlight" icon={<ShieldCheck size={13} />}>
              Trust Score 88
            </Badge>
            <Badge variant="accent" icon={<Zap size={13} />}>
              Confirmed Slot
            </Badge>
            <Badge variant="success" icon={<CheckCircle2 size={13} />}>
              Verified Provider
            </Badge>
            <Badge variant="warning">
              Unverified Listing
            </Badge>
            <Badge variant="danger">
              Full Capacity
            </Badge>
            <Badge variant="neutral">
              Draft
            </Badge>
          </Card>
        </section>

        {/* Section 5: Circle Frames & Imagery */}
        <section className="space-y-6">
          <div>
            <h2 className="font-display font-extrabold text-2xl text-text-primary">
              0.5 CircleFrame (Image Masks & Thumbnails)
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              Replaces square cards for hero imagery, experience avatars, and provider profiles.
            </p>
          </div>

          <Card variant="surface-alt" className="flex items-center gap-8">
            <CircleFrame
              size={120}
              src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&auto=format&fit=crop&q=80"
              alt="Mountain Lake"
              withOverlay
            />
            <CircleFrame
              size={90}
              src="https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=300&auto=format&fit=crop&q=80"
              alt="Cinque Terre"
              borderColor="var(--color-accent)"
            />
            <CircleFrame
              size={70}
              src="https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&auto=format&fit=crop&q=80"
              alt="Hot Air Balloons"
            />
            <CircleFrame size={54}>
              <span className="font-display font-bold text-accent text-sm">KY</span>
            </CircleFrame>
          </Card>
        </section>

        {/* Section 6: Sidebar Component */}
        <section className="space-y-6">
          <div>
            <h2 className="font-display font-extrabold text-2xl text-text-primary">
              0.6 Dashboard Shell: Sidebar
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              Cream background (<code>--color-surface</code>), active item styled as sky-blue pill (<code>--color-accent</code>). Zero green.
            </p>
          </div>

          <div className="border border-[rgba(20,22,26,0.06)] rounded-card overflow-hidden bg-bg shadow-card flex">
            <Sidebar
              title="KhojYatra"
              subtitle="Traveler Mode"
              items={navItems}
              activeId={activeSidebarItem}
              onSelect={setActiveSidebarItem}
              footerContent={
                <div className="flex items-center gap-3 px-2">
                  <div className="w-8 h-8 rounded-full bg-accent-soft text-accent-dark flex items-center justify-center font-bold text-xs">
                    TP
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text-primary">Tanay Patil</div>
                    <div className="text-[11px] text-text-secondary">Anonymous Session</div>
                  </div>
                </div>
              }
            />

            <div className="flex-1 p-8 bg-surface-alt">
              <h3 className="font-display font-bold text-xl text-text-primary">
                Active View: {activeSidebarItem.toUpperCase()}
              </h3>
              <p className="text-text-secondary text-sm mt-2">
                This sidebar is shared verbatim across both the Traveler Dashboard (Phase 7) and Provider Dashboard (Phase 13), ensuring unified product identity.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DesignSystemPage;
