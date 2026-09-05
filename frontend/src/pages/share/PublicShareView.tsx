import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Badge, PillButtonOutline } from '@khojyatra/ui';
import { ShieldCheck, PhoneCall, Clock, RefreshCw, AlertCircle, Compass, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

interface SharedStop {
  id: string;
  experience_id: string;
  experience_title: string;
  category: string;
  start_time: string;
  end_time: string;
  price_committed: number;
  provider_name: string;
  provider_contact: string;
  photo_url?: string;
  status: string;
}

interface ShareResponse {
  itinerary_id: string;
  date: string;
  items: SharedStop[];
  total_items: number;
  expires_at: string;
  last_updated: string;
  safety_helplines: { name: string; number: string }[];
}

export const PublicShareView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchSharedPlan = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient<ShareResponse>(`share/${token}`);
      setData(res);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to access shared itinerary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedPlan();
  }, [token]);

  return (
    <div className="min-h-screen bg-bg text-text-primary p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(20,22,26,0.08)] pb-5">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-display font-black text-xl text-text-primary tracking-tight">
              KhojYatra
            </Link>
            <Badge variant="accent" size="sm" icon={<ShieldCheck size={12} />}>
              Live Safety Check-in
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-text-secondary hidden sm:inline">
              Refreshed {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <PillButtonOutline
              size="sm"
              icon={<RefreshCw size={12} />}
              onClick={fetchSharedPlan}
              disabled={loading}
            >
              Refresh
            </PillButtonOutline>
          </div>
        </div>

        {errorMsg ? (
          <Card variant="surface" className="p-8 text-center space-y-3">
            <AlertCircle size={32} className="text-danger mx-auto" />
            <h2 className="font-display font-bold text-lg text-text-primary">Safety Check-in Unavailable</h2>
            <p className="text-xs text-text-secondary">{errorMsg}</p>
            <p className="text-[11px] text-text-secondary">Safety links expire 24 hours after creation.</p>
          </Card>
        ) : loading && !data ? (
          <p className="text-xs text-text-secondary">Loading live shared itinerary...</p>
        ) : (
          <div className="space-y-6">
            {/* Live Status Card */}
            <Card variant="surface" className="p-5 border-accent/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-accent" />
                  <h2 className="font-display font-bold text-sm text-text-primary">
                    Live Travel Day Plan
                  </h2>
                </div>
                <Badge variant="neutral" size="sm">
                  {data?.items.length || 0} Confirmed Stops
                </Badge>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                This read-only view reflects the traveler's active plan. Any replanning, traffic reroutes, or friction adaptations automatically update here.
              </p>
              <div className="text-[11px] text-text-secondary flex items-center gap-2 pt-1 border-t border-[rgba(20,22,26,0.06)]">
                <Clock size={12} className="text-accent" />
                <span>Link active until: {data?.expires_at ? new Date(data.expires_at).toLocaleString() : '24h'}</span>
              </div>
            </Card>

            {/* Timeline Stops */}
            <div className="space-y-4">
              <h3 className="font-display font-bold text-sm uppercase tracking-wider text-text-secondary">
                Scheduled Stops & Locations
              </h3>

              {(!data?.items || data.items.length === 0) ? (
                <Card variant="surface-alt" className="p-6 text-center text-xs text-text-secondary">
                  No confirmed stops in this itinerary yet.
                </Card>
              ) : (
                data.items.map((item, idx) => (
                  <Card key={item.id} variant="surface-alt" className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-accent">
                            Stop {idx + 1}
                          </span>
                          <span>·</span>
                          <span className="text-xs font-bold capitalize text-text-primary">
                            {item.category.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="font-display font-bold text-base text-text-primary">
                          {item.experience_title}
                        </h4>
                      </div>
                      <Badge variant="accent" size="sm">
                        {item.start_time} - {item.end_time}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-[rgba(20,22,26,0.06)]">
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Compass size={14} className="text-accent flex-shrink-0" />
                        <span>Host: <strong>{item.provider_name}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-text-secondary">
                        <PhoneCall size={14} className="text-accent flex-shrink-0" />
                        <span>Contact: <strong>{item.provider_contact}</strong></span>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Emergency Support Helplines Card */}
            <Card variant="surface" className="p-5 border-highlight/30 bg-highlight-soft/10 space-y-4">
              <div className="flex items-center gap-2">
                <PhoneCall size={16} className="text-text-primary" />
                <h3 className="font-display font-bold text-sm text-text-primary">
                  Official Safety & Emergency Helplines (India)
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {data?.safety_helplines?.map((h) => (
                  <div key={h.number} className="p-3 bg-surface rounded-card border border-[rgba(20,22,26,0.06)] space-y-1">
                    <div className="text-[10px] text-text-secondary uppercase font-semibold">{h.name}</div>
                    <div className="font-mono font-black text-base text-accent">
                      {h.number}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicShareView;
