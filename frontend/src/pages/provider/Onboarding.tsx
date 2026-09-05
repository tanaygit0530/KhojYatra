import React, { useState } from 'react';
import { Card, PillButton, PillButtonOutline, Badge } from '@khojyatra/ui';
import { useNavigate } from 'react-router-dom';
import { Store, Check, ArrowRight, ArrowLeft, ShieldAlert } from 'lucide-react';
import { ExperienceCategory } from '@khojyatra/types';
import { apiClient } from '../../lib/apiClient';

const CATEGORIES: { id: ExperienceCategory; label: string; description: string }[] = [
  { id: 'food_culinary', label: 'Food & Culinary', description: 'Heritage recipes, cooking walks, street food' },
  { id: 'cultural_heritage', label: 'Cultural Heritage', description: 'Monuments, rituals, temple architectural walks' },
  { id: 'festivals_events', label: 'Festivals & Events', description: 'Seasonal gatherings, folk fairs, celebrations' },
  { id: 'workshops_classes', label: 'Workshops & Classes', description: 'Pottery, block printing, culinary arts' },
  { id: 'adventure_outdoor', label: 'Adventure & Outdoor', description: 'Cave trekking, river runs, mountain trails' },
  { id: 'hidden_gems', label: 'Hidden Gems', description: 'Unmapped subterranean structures, baoris' },
  { id: 'shopping_markets', label: 'Shopping & Markets', description: 'Vintage brass, antique textiles, bazaar safaris' },
  { id: 'nightlife_entertainment', label: 'Nightlife & Entertainment', description: 'Sitar baithaks, rooftop jazz, spoken word' }
];

export const ProviderOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [businessName, setBusinessName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<ExperienceCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleCategory = (cat: ExperienceCategory) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!businessName.trim()) {
        setErrorMsg('Please enter your business or guild name.');
        return;
      }
      setErrorMsg('');
      setStep(2);
      return;
    }

    if (selectedCategories.length === 0) {
      setErrorMsg('Please select at least one experience category.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await apiClient('providers/onboard', {
        method: 'POST',
        body: JSON.stringify({
          business_name: businessName,
          categories: selectedCategories
        })
      });
      navigate('/provider');
    } catch (err: any) {
      setErrorMsg(err.message || 'Onboarding failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-6">
        <button
          onClick={() => (step === 2 ? setStep(1) : navigate('/auth'))}
          className="flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={16} /> {step === 2 ? 'Back to Step 1' : 'Back to Role Selection'}
        </button>

        <Card variant="surface-alt" className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[rgba(20,22,26,0.06)] pb-4">
            <div className="space-y-1">
              <span className="text-[11px] font-mono font-bold uppercase text-accent tracking-wider">
                Step {step} of 2 • Provider Registration
              </span>
              <h1 className="font-display font-black text-2xl text-text-primary">
                {step === 1 ? 'Tell us about your hosting practice' : 'Select your primary offering categories'}
              </h1>
            </div>
            <Badge variant="warning" icon={<ShieldAlert size={12} />} size="sm">
              Pending Verification
            </Badge>
          </div>

          {errorMsg && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-card text-danger text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                    Hosting Business or Collective Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Dilli Khana Guild, Amber Clay Studio"
                    className="w-full px-4 py-3 rounded-card bg-surface border border-[rgba(20,22,26,0.08)] text-text-primary focus:outline-none focus:border-accent text-sm"
                    required
                  />
                  <p className="text-[11px] text-text-secondary mt-1.5 leading-relaxed">
                    This name appears on your listings and in the traveler experience chain.
                  </p>
                </div>

                <div className="p-4 bg-surface rounded-card border border-[rgba(20,22,26,0.06)] flex items-start gap-3">
                  <Store size={20} className="text-accent flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-text-secondary leading-relaxed">
                    New accounts receive an automatic <strong className="text-text-primary font-bold">Unverified</strong> badge until identity checks are approved. You can immediately create drafts and availability slots.
                  </div>
                </div>

                <PillButton type="submit" size="md" className="w-full" icon={<ArrowRight size={16} />}>
                  Continue to Categories
                </PillButton>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto p-1">
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategories.includes(cat.id);
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`p-3 rounded-card text-left border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-accent bg-accent-soft/40 shadow-sm'
                            : 'border-[rgba(20,22,26,0.08)] bg-surface hover:border-accent/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-display font-bold text-xs text-text-primary">
                            {cat.label}
                          </span>
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                              isSelected ? 'bg-accent text-text-inverse' : 'border border-[rgba(20,22,26,0.2)]'
                            }`}
                          >
                            {isSelected && <Check size={10} />}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-secondary line-clamp-2">
                          {cat.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <PillButtonOutline type="button" onClick={() => setStep(1)} size="md" className="flex-1">
                    Back
                  </PillButtonOutline>
                  <PillButton type="submit" size="md" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating Profile...' : 'Complete Registration'}
                  </PillButton>
                </div>
              </div>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ProviderOnboardingPage;
