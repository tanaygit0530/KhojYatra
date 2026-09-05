import React, { useEffect, useState } from 'react';
import { PillButton, PillButtonOutline, Card, CircleFrame, Badge } from '@khojyatra/ui';
import {
  Compass,
  ArrowDown,
  Play,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  RotateCcw,
  MapPin,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { Experience } from '@khojyatra/types';

export const LandingPage: React.FC = () => {
  const [featuredExperience, setFeaturedExperience] = useState<Experience | null>(null);

  useEffect(() => {
    apiClient<Experience[]>('experiences?featured=true')
      .then((data) => {
        if (data && data.length > 0) {
          setFeaturedExperience(data[0]);
        }
      })
      .catch((err) => console.warn('Could not load featured experience:', err));
  }, []);

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col justify-between selection:bg-accent-soft selection:text-accent-dark overflow-x-hidden">
      {/* 1. Top Navigation Bar */}
      <header className="px-6 md:px-12 py-6 flex items-center justify-between border-b border-[rgba(20,22,26,0.06)] bg-surface/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-10">
          <Link
            to="/"
            className="font-display font-black text-2xl md:text-3xl tracking-tight text-text-primary flex items-center gap-2"
          >
            KhojYatra
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-text-secondary">
            <Link to="/app" className="hover:text-text-primary transition-colors">
              Discover
            </Link>
            <Link to="/app" className="hover:text-text-primary transition-colors">
              Experiences
            </Link>
            <Link to="/provider" className="hover:text-text-primary transition-colors">
              For Providers
            </Link>
            <a href="#how-it-works" className="hover:text-text-primary transition-colors">
              How it Works
            </a>
            <Link to="/design-system" className="text-accent hover:underline transition-colors flex items-center gap-1">
              <span>Tokens (§2)</span>
              <ArrowUpRight size={14} />
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/app" className="hidden sm:inline-block">
            <PillButtonOutline size="sm">Explore App</PillButtonOutline>
          </Link>
          <Link to="/auth">
            <PillButton size="sm">Get Started</PillButton>
          </Link>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative w-full">
        {/* Left Column: Headline & Value Proposition */}
        <div className="lg:col-span-6 space-y-6 z-10">
          <div className="flex items-center gap-2">
            <Badge variant="highlight" icon={<Sparkles size={13} />}>
              Autonomous Dynamic Travel Engine
            </Badge>
            <Badge variant="accent" icon={<ShieldCheck size={13} />}>
              Locality-Verified
            </Badge>
          </div>

          <h1 className="font-display font-black text-5xl sm:text-6xl md:text-7xl text-text-primary tracking-tight leading-[1.04]">
            Find what fits, <br />
            <span className="text-accent relative inline-block">
              right now.
              <svg
                className="absolute -bottom-2 left-0 w-full h-3 text-accent-soft"
                viewBox="0 0 200 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 9C40 2 120 2 198 9"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p className="font-body text-lg text-text-secondary max-w-lg leading-relaxed pt-1">
            Zero planning fatigue. KhojYatra balances opening hours, live capacity, real travel times, and your exact budget into adaptive, feasible experience chains.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link to="/app">
              <PillButton size="lg" icon={<Compass size={18} />}>
                Explore Experiences
              </PillButton>
            </Link>
            <Link to="/provider">
              <PillButtonOutline size="lg">
                For Local Hosts
              </PillButtonOutline>
            </Link>
          </div>

          <div className="pt-4 flex items-center gap-6 text-xs text-text-secondary font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-accent" /> Feasibility Checked
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-accent" /> Greedy Window Packing
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-accent" /> &lt;2s Dynamic Replan
            </span>
          </div>
        </div>

        {/* Right Column: Overlapping CircleFrames with Curved Rotated Text */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center relative">
          <div className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] flex items-center justify-center">
            {/* Circle 1: Cultural landmark / street food (Large) */}
            <div className="absolute top-0 left-2 z-10">
              <CircleFrame
                size={260}
                src="https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80"
                alt="Old Delhi Spice Food Trail"
                withOverlay
              >
                <span className="text-text-inverse font-bold text-xs bg-cta-bg/70 px-3 py-1 rounded-pill backdrop-blur-sm">
                  Culinary Walks
                </span>
              </CircleFrame>
            </div>

            {/* SVG Curved Text Path running organically between the circles */}
            <div className="absolute inset-0 pointer-events-none z-30 hidden sm:block">
              <svg viewBox="0 0 400 400" className="w-full h-full">
                <path
                  id="curved-text-path"
                  d="M 60 220 A 130 130 0 1 0 320 220"
                  fill="transparent"
                />
                <text
                  className="font-display font-extrabold text-[12.5px] uppercase tracking-[0.25em]"
                  fill="var(--color-text-primary)"
                >
                  <textPath href="#curved-text-path" startOffset="10%">
                    • KHOJYATRA HERITAGE • UNFILTERED DISCOVERY • HYPER LOCAL
                  </textPath>
                </text>
              </svg>
            </div>

            {/* Circle 2: Ghat boat / hot air balloons (Overlapping Offset) */}
            <div className="absolute bottom-2 right-2 z-20">
              <CircleFrame
                size={210}
                src="https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=600&auto=format&fit=crop&q=80"
                alt="Varanasi Sunrise Boat Experience"
                borderColor="var(--color-surface-alt)"
              >
                <span className="text-text-inverse font-bold text-xs bg-accent/80 px-3 py-1 rounded-pill backdrop-blur-sm">
                  Sacred Ghats
                </span>
              </CircleFrame>
            </div>

            {/* Floating Trust Indicator Pill */}
            <div className="absolute -bottom-2 -left-2 z-30 bg-surface-alt py-2 px-4 rounded-pill shadow-card border border-[rgba(20,22,26,0.06)] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-bold text-text-primary">Locality Score 98</span>
            </div>
          </div>

          {/* Right-side small panel: "Ready to explore?" structure */}
          <div className="mt-8 bg-surface-alt p-4 rounded-card shadow-card border border-[rgba(20,22,26,0.05)] flex items-center gap-4 max-w-sm w-full">
            <CircleFrame
              size={46}
              src="https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=120&auto=format&fit=crop&q=80"
              alt="Blue Pottery Masterclass"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black uppercase tracking-wider text-text-primary">
                Ready to explore?
              </h4>
              <p className="text-[12px] text-text-secondary truncate mt-0.5">
                Curated artisan sessions available today in your city.
              </p>
            </div>
            <Link to="/app" className="text-accent hover:text-accent-dark">
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>

        {/* Scroll Down Indicator (Bottom Right) */}
        <div className="hidden lg:flex absolute bottom-4 right-12 flex-col items-center gap-2 text-text-secondary text-xs font-bold uppercase tracking-widest pointer-events-none">
          <span style={{ writingMode: 'vertical-rl' }}>Scroll Down</span>
          <ArrowDown size={14} className="animate-bounce mt-1 text-accent" />
        </div>
      </main>

      {/* 3. Bottom Row: Three Standard Spec Cards */}
      <footer id="how-it-works" className="max-w-7xl mx-auto px-6 md:px-12 py-10 w-full border-t border-[rgba(20,22,26,0.06)] grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Top experiences near you (live API data) */}
        <Card variant="surface-alt" className="space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-accent">
              Top Experience Near You
            </span>
            <Badge variant="highlight" size="sm">Featured</Badge>
          </div>

          <div className="flex items-center gap-4 pt-1">
            <div className="relative flex-shrink-0">
              <CircleFrame
                size={58}
                src={featuredExperience?.photo_urls[0] || "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=200&auto=format&fit=crop&q=80"}
                alt="Featured Experience"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-6 h-6 rounded-full bg-cta-bg/80 text-cta-text flex items-center justify-center">
                  <Play size={11} fill="currentColor" />
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="font-display font-bold text-sm text-text-primary truncate">
                {featuredExperience?.title || "Old Delhi Midnight Kebab Trail"}
              </h4>
              <div className="flex items-center gap-3 text-xs text-text-secondary mt-1">
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-accent" /> Delhi
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {featuredExperience?.duration_min || 120}m
                </span>
                <span className="font-bold text-text-primary">
                  ₹{featuredExperience?.price_min || 500}
                </span>
              </div>
            </div>
          </div>

          <Link to="/app" className="pt-2 text-xs font-bold text-accent hover:underline flex items-center gap-1">
            <span>View available slots</span>
            <ArrowUpRight size={13} />
          </Link>
        </Card>

        {/* Card 2: Rotating "Explore More →" circular badge */}
        <Card variant="surface-alt" className="flex items-center justify-between p-6">
          <div className="space-y-1">
            <h4 className="font-display font-bold text-base text-text-primary">
              Autonomous Discovery
            </h4>
            <p className="text-xs text-text-secondary max-w-[180px] leading-relaxed">
              Step into immediate, dynamic itineraries crafted around you.
            </p>
          </div>

          <Link to="/app" className="group relative flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-accent flex items-center justify-center group-hover:rotate-45 transition-transform duration-500 bg-accent-soft/40">
              <div className="w-12 h-12 rounded-full bg-cta-bg text-cta-text flex items-center justify-center shadow-md">
                <ArrowUpRight size={20} />
              </div>
            </div>
          </Link>
        </Card>

        {/* Card 3: "How KhojYatra Works" loop */}
        <Card variant="surface-alt" className="space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-accent">
              The KhojYatra Loop
            </span>
            <RotateCcw size={14} className="text-accent" />
          </div>

          <div>
            <h4 className="font-display font-bold text-sm text-text-primary">
              Constraint → Decision → Replan
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed mt-1">
              Input time, budget, and accessibility. Our engine solves hard availability barriers, ranks authentic local gems, and replans on-the-fly when plans shift.
            </p>
          </div>

          <Link to="/app" className="text-xs font-bold text-text-primary hover:text-accent transition-colors">
            Try dynamic planner →
          </Link>
        </Card>
      </footer>
    </div>
  );
};

export default LandingPage;
