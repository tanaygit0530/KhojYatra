import React, { useEffect, useState } from 'react';
import { Card, PillButton, Badge, CircleFrame } from '@khojyatra/ui';
import { Bookmark, Sparkles, MapPin, Clock, Trash2, CalendarPlus, Check } from 'lucide-react';
import { Experience } from '@khojyatra/types';
import { apiClient } from '../../lib/apiClient';
import { useSessionStore } from '../../store/sessionStore';

interface SavedTabProps {
  onAddToItinerary: (id: string) => void;
  onExploreClick: () => void;
}

export const SavedTab: React.FC<SavedTabProps> = ({ onAddToItinerary, onExploreClick }) => {
  const savedIds = useSessionStore((state) => state.savedExperienceIds);
  const toggleSave = useSessionStore((state) => state.toggleSaveExperience);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiClient<Experience[]>('experiences?featured=true');
        if (isMounted && res) {
          setExperiences(res);
        }
      } catch (err) {
        console.warn('Error loading experiences for saved tab:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const savedList = experiences.filter((e) => savedIds.includes(e.id));

  const handleAdd = (id: string) => {
    onAddToItinerary(id);
    setAddedIds((prev) => new Set([...prev, id]));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 2500);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between border-b border-[rgba(20,22,26,0.06)] pb-4">
        <div>
          <h2 className="font-display font-extrabold text-xl text-text-primary flex items-center gap-2">
            <Bookmark size={20} className="text-accent" />
            <span>Saved Experiences & Wishlist</span>
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Bookmarked local experiences saved for comparison and itinerary planning.
          </p>
        </div>
        <Badge variant="accent" size="sm">
          {savedList.length} Saved
        </Badge>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-text-secondary">
          Loading saved wishlist...
        </div>
      ) : savedList.length === 0 ? (
        <Card variant="surface" className="p-12 text-center space-y-4 max-w-lg mx-auto my-8">
          <div className="w-14 h-14 mx-auto rounded-full bg-accent-soft flex items-center justify-center text-accent">
            <Bookmark size={26} />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-text-primary">
              Your wishlist is empty
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Explore authentic local food walks, artisanal craft workshops, and hidden heritage trails to bookmark your favorites here.
            </p>
          </div>
          <PillButton size="md" icon={<Sparkles size={16} />} onClick={onExploreClick}>
            Discover Experiences
          </PillButton>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedList.map((exp) => {
            const isAdded = addedIds.has(exp.id);
            return (
              <Card
                key={exp.id}
                variant="surface-alt"
                className="p-5 flex flex-col justify-between space-y-4 hover:border-accent/40 transition-all"
              >
                <div className="flex items-start gap-4">
                  <CircleFrame
                    size={72}
                    src={exp.photo_urls?.[0] || 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=300&auto=format&fit=crop&q=80'}
                    alt={exp.title}
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="highlight" size="sm">
                        Score: {exp.locality_score || 95}/100
                      </Badge>
                      <span className="text-[11px] font-bold text-accent">
                        ₹{exp.price_min}/person
                      </span>
                    </div>
                    <h4 className="font-display font-bold text-sm text-text-primary truncate">
                      {exp.title}
                    </h4>
                    <div className="flex items-center gap-3 text-[11px] text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {exp.duration_min}m
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {exp.provider_name || 'Verified Host'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[rgba(20,22,26,0.06)] gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSave(exp.id)}
                    className="text-xs text-text-secondary hover:text-danger flex items-center gap-1 transition-colors p-1"
                    title="Remove from saved"
                  >
                    <Trash2 size={13} />
                    <span className="text-[11px]">Remove</span>
                  </button>

                  <PillButton
                    size="sm"
                    onClick={() => handleAdd(exp.id)}
                    icon={isAdded ? <Check size={13} /> : <CalendarPlus size={13} />}
                    className={isAdded ? 'bg-success text-white' : ''}
                  >
                    {isAdded ? 'Packed in Chain' : '+ Add to Itinerary'}
                  </PillButton>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
