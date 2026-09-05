import React, { useState, useEffect } from 'react';
import { Card, PillButton, PillButtonOutline, Badge } from '@khojyatra/ui';
import { ShieldCheck, Check, X, ArrowLeft, ExternalLink, MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { SocialStagingItem } from '@khojyatra/types';

export const AdminIngestionQueue: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'social_queue' | 'flagged_reports'>('social_queue');
  const [stagedItems, setStagedItems] = useState<SocialStagingItem[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const [stagedRes, repRes] = await Promise.all([
        apiClient<{ staged_items: SocialStagingItem[] }>('admin/social-staging').catch(() => ({ staged_items: [] })),
        apiClient<{ reports: any[] }>('admin/reports').catch(() => ({ reports: [] }))
      ]);
      setStagedItems(stagedRes.staged_items || []);
      setReports(repRes.reports || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await apiClient(`admin/social-staging/${id}/approve`, { method: 'POST' });
      setNotice('Approved! Created published experience with mandatory "Social signal — unverified" badge.');
      setTimeout(() => setNotice(null), 4000);
      await fetchQueue();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await apiClient(`admin/social-staging/${id}/reject`, { method: 'POST' });
      setNotice('Item rejected and dismissed.');
      setTimeout(() => setNotice(null), 4000);
      await fetchQueue();
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveReport = async (reportId: string, action: 'unpublish' | 'dismiss') => {
    setActionLoading(reportId);
    try {
      await apiClient(`admin/reports/${reportId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      setNotice(action === 'unpublish' ? 'Listing unpublished from catalog.' : 'Report dismissed.');
      setTimeout(() => setNotice(null), 4000);
      await fetchQueue();
    } catch (err: any) {
      alert(`Report action note: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text-primary p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(20,22,26,0.08)] pb-6">
          <div className="space-y-1">
            <Link to="/app" className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-accent mb-2">
              <ArrowLeft size={14} /> Back to Traveler App
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="font-display font-black text-2xl md:text-3xl tracking-tight">
                Social-to-Geo Ingestion Queue
              </h1>
              <Badge variant="accent" size="sm" icon={<ShieldCheck size={12} />}>
                Admin Review
              </Badge>
            </div>
            <p className="text-xs text-text-secondary">
              Review authorized social submissions before conversion to searchable experiences.
            </p>
          </div>

          <PillButtonOutline size="sm" icon={<RefreshCw size={13} />} onClick={fetchQueue} disabled={loading}>
            Refresh Queue
          </PillButtonOutline>
        </div>

        {/* Policy Callout */}
        <div className="p-4 bg-surface rounded-card border border-accent/20 flex items-start gap-3 text-xs">
          <AlertCircle size={16} className="text-accent flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-text-primary">Consent & Attribution Policy (Phase 24)</span>
            <p className="text-text-secondary leading-relaxed">
              No private accounts are ever scraped. Staged submissions originate exclusively from authorized API feeds or verified creators.
              All approved social items are permanently badged as <strong className="text-accent">"Social signal — unverified"</strong> until officially claimed by the operating host.
            </p>
          </div>
        </div>

        {notice && (
          <div className="p-3 bg-accent-soft text-accent-dark rounded-card text-xs font-semibold">
            {notice}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-3 border-b border-[rgba(20,22,26,0.08)] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('social_queue')}
            className={`px-4 py-2 rounded-pill text-xs font-bold transition-all ${
              activeTab === 'social_queue'
                ? 'bg-accent text-text-inverse'
                : 'bg-surface text-text-secondary hover:text-text-primary'
            }`}
          >
            Social Submissions ({stagedItems.filter(i => i.status === 'pending').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('flagged_reports')}
            className={`px-4 py-2 rounded-pill text-xs font-bold transition-all ${
              activeTab === 'flagged_reports'
                ? 'bg-accent text-text-inverse'
                : 'bg-surface text-text-secondary hover:text-text-primary'
            }`}
          >
            Flagged Reports ({reports.filter(r => r.status === 'pending').length})
          </button>
        </div>

        {/* TAB 1: Social Ingestion Queue */}
        {activeTab === 'social_queue' && (
          <>
            {loading ? (
              <p className="text-xs text-text-secondary">Loading pending submissions...</p>
            ) : stagedItems.length === 0 ? (
              <Card variant="surface" className="text-center py-12 space-y-2">
            <p className="font-bold text-sm">Queue is clean</p>
            <p className="text-xs text-text-secondary">No pending social submissions waiting for review.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {stagedItems.map((item) => (
              <Card
                key={item.id}
                variant="surface-alt"
                className={`p-6 space-y-4 border ${item.status === 'pending' ? 'border-[rgba(20,22,26,0.08)]' : 'opacity-70 border-transparent'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent">
                        {item.source_handle}
                      </span>
                      <span>·</span>
                      <span className="text-[11px] text-text-secondary">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      <Badge variant={item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'neutral' : 'warning'} size="sm">
                        {item.status.toUpperCase()}
                      </Badge>
                      <Badge variant="neutral" size="sm">
                        Social signal — unverified
                      </Badge>
                    </div>
                    <h3 className="font-display font-bold text-base text-text-primary">
                      {item.extracted_title}
                    </h3>
                  </div>

                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
                  >
                    View Source Post <ExternalLink size={12} />
                  </a>
                </div>

                {/* Raw Caption */}
                <div className="p-3 bg-surface rounded-card border border-[rgba(20,22,26,0.05)] text-xs text-text-secondary italic">
                  "{item.raw_caption}"
                </div>

                {/* Extracted Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-surface rounded-md border border-[rgba(20,22,26,0.04)]">
                    <div className="text-[10px] text-text-secondary uppercase font-semibold">Category</div>
                    <div className="font-bold text-text-primary capitalize mt-0.5">{item.category.replace('_', ' ')}</div>
                  </div>
                  <div className="p-2.5 bg-surface rounded-md border border-[rgba(20,22,26,0.04)]">
                    <div className="text-[10px] text-text-secondary uppercase font-semibold">Coordinates</div>
                    <div className="font-mono font-medium text-text-primary mt-0.5 flex items-center gap-1">
                      <MapPin size={11} className="text-accent" /> {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                    </div>
                  </div>
                  <div className="p-2.5 bg-surface rounded-md border border-[rgba(20,22,26,0.04)]">
                    <div className="text-[10px] text-text-secondary uppercase font-semibold">Est. Price</div>
                    <div className="font-bold text-text-primary mt-0.5">₹{item.price_estimate}</div>
                  </div>
                  <div className="p-2.5 bg-surface rounded-md border border-[rgba(20,22,26,0.04)]">
                    <div className="text-[10px] text-text-secondary uppercase font-semibold">Assigned Trust Badge</div>
                    <div className="font-semibold text-accent mt-0.5">Unverified Signal</div>
                  </div>
                </div>

                {/* Actions */}
                {item.status === 'pending' && (
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgba(20,22,26,0.06)]">
                    <PillButtonOutline
                      size="sm"
                      icon={<X size={13} />}
                      disabled={actionLoading === item.id}
                      onClick={() => handleReject(item.id)}
                    >
                      Reject Submission
                    </PillButtonOutline>
                    <PillButton
                      size="sm"
                      icon={<Check size={13} />}
                      disabled={actionLoading === item.id}
                      onClick={() => handleApprove(item.id)}
                    >
                      Approve & Publish to Search
                    </PillButton>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
        </>
      )}

      {/* TAB 2: Flagged Reports */}
      {activeTab === 'flagged_reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <Card variant="surface" className="text-center py-12 space-y-2">
              <p className="font-bold text-sm">No flagged reports</p>
              <p className="text-xs text-text-secondary">No listings have been flagged by travelers.</p>
            </Card>
          ) : (
            reports.map((rep) => (
              <Card key={rep.id} variant="surface-alt" className="p-5 space-y-3 border border-[rgba(20,22,26,0.08)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant={rep.reason === 'fraud' ? 'danger' : 'warning'} size="sm">
                        REASON: {rep.reason.toUpperCase()}
                      </Badge>
                      <Badge variant={rep.status === 'resolved' ? 'neutral' : 'accent'} size="sm">
                        STATUS: {rep.status.toUpperCase()}
                      </Badge>
                      <span className="text-text-secondary text-[11px]">
                        Reported {new Date(rep.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-base text-text-primary">
                      {rep.experience_title}
                    </h3>
                  </div>
                </div>

                <div className="p-3 bg-surface rounded-card border border-[rgba(20,22,26,0.06)] text-xs text-text-secondary">
                  <strong>Traveler Note:</strong> "{rep.details}"
                </div>

                {rep.status === 'pending' && (
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-[rgba(20,22,26,0.06)]">
                    <PillButtonOutline
                      size="sm"
                      disabled={actionLoading === rep.id}
                      onClick={() => handleResolveReport(rep.id, 'dismiss')}
                    >
                      Dismiss Report
                    </PillButtonOutline>
                    <PillButton
                      size="sm"
                      disabled={actionLoading === rep.id}
                      onClick={() => handleResolveReport(rep.id, 'unpublish')}
                    >
                      Unpublish Listing Immediately
                    </PillButton>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default AdminIngestionQueue;
