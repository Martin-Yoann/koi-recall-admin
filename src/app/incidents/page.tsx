'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Select, Skeleton } from 'antd';
import { Shield, ShieldAlert, RefreshCw, CheckCircle2, X } from 'lucide-react';
import Link from 'next/link';
import { closeReportabilityReview, listIncidents, type IncidentSummary } from '@/lib/api-client';
import { useAdminAuth } from '@/lib/admin-auth';
import { usePermissions } from '@/lib/rbac';
import { cn } from '@/lib/utils';

const REPORTABILITY_STYLES: Record<string, string> = {
  pending: 'bg-red-50 text-red-700',
  filed: 'bg-amber-50 text-amber-700',
  documented_non_reportable: 'bg-slate-50 text-slate-700',
};

function reportabilityLabel(incident: IncidentSummary): string {
  return (incident.reportability?.status ?? 'none').replace(/_/g, ' ').toUpperCase();
}

/** Short incident id for table display (uuid prefix). */
function shortId(id: string): string {
  return id.slice(0, 8);
}

export default function IncidentsPage() {
  const { isAuthenticated, isLoading: authLoading, openLogin } = useAdminAuth();
  const { can } = usePermissions();
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<IncidentSummary | null>(null);
  const [outcome, setOutcome] = useState<'filed' | 'documented_non_reportable'>('filed');
  const [rationale, setRationale] = useState('');
  const [cpscReference, setCpscReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listIncidents();
    if (result.ok) {
      setIncidents(result.data.incidents);
    } else if (result.status === 401) {
      setError('Please sign in with a staff account to view incidents.');
    } else if (result.status === 403) {
      setError('Your staff role does not have permission to view incidents.');
    } else {
      setError(result.error?.detail || 'Failed to load incidents.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const timer = window.setTimeout(() => {
      void fetchIncidents();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, fetchIncidents, isAuthenticated]);

  const openReview = (incident: IncidentSummary) => {
    setReviewing(incident);
    setOutcome('filed');
    setRationale('');
    setCpscReference('');
    setDialogError(null);
  };

  const submitReview = async () => {
    if (!reviewing?.reportability) return;
    if (rationale.trim().length < 10) {
      setDialogError('Rationale must be at least 10 characters.');
      return;
    }
    if (outcome === 'filed' && !cpscReference.trim()) {
      setDialogError('CPSC reference is required when the outcome is Filed.');
      return;
    }
    setSubmitting(true);
    setDialogError(null);
    const result = await closeReportabilityReview(reviewing.reportability.id, {
      outcome,
      rationale: rationale.trim(),
      ...(cpscReference.trim() ? { cpscReference: cpscReference.trim() } : {}),
    });
    if (result.ok) {
      setReviewing(null);
      await fetchIncidents();
    } else {
      setDialogError(result.error?.detail || 'Failed to close reportability review.');
    }
    setSubmitting(false);
  };

  const pending = useMemo(() => incidents.filter((incident) => incident.reportability?.status === 'pending'), [incidents]);
  const filed = useMemo(() => incidents.filter((incident) => incident.reportability?.status === 'filed'), [incidents]);
  const nonReportable = useMemo(() => incidents.filter((incident) => incident.reportability?.status === 'documented_non_reportable'), [incidents]);

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Incidents & Safety</h1>
          <p className="text-sm text-text-secondary mt-0.5">{incidents.length} incidents · {pending.length} pending reportability review</p>
        </div>
        <Button
          icon={<RefreshCw className="h-4 w-4" />}
          loading={loading}
          onClick={fetchIncidents}
          className="admin-btn"
        >
          Refresh
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[{ label: 'Pending Review', value: pending.length }, { label: 'Filed (CPSC)', value: filed.length }, { label: 'Non-Reportable', value: nonReportable.length }, { label: 'Total', value: incidents.length }].map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-surface-elevated p-4 card-lift cursor-default">
            <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">{stat.label}</p>
            <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-text-primary">Incident Log</h2>
          {error ? <span role="alert" aria-live="polite" className="text-xs text-red-600">{error}</span> : null}
        </div>
        {!isAuthenticated && !authLoading ? (
          <div className="text-center py-14"><Shield className="h-8 w-8 mx-auto text-text-tertiary mb-3" aria-hidden="true" /><p className="text-sm font-semibold text-text-primary mb-1">Sign In Required</p><p className="text-xs text-text-tertiary mb-4">Sign in to review incident reportability.</p><Button type="primary" onClick={openLogin}>Sign In</Button></div>
        ) : loading ? (
          <div className="p-6" aria-busy="true"><Skeleton active title={false} paragraph={{ rows: 6 }} /></div>
        ) : error ? (
          <div className="text-center py-14" role="alert" aria-live="polite"><Shield className="h-8 w-8 mx-auto text-text-tertiary mb-3" aria-hidden="true" /><p className="text-sm font-semibold text-text-primary mb-1">Could Not Load Incidents</p><p className="text-xs text-text-tertiary max-w-sm mx-auto">{error}</p></div>
        ) : incidents.length > 0 ? (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th scope="col" className="h-10 px-4 font-semibold text-text-secondary">Incident</th><th scope="col" className="h-10 px-4 font-semibold text-text-secondary">Linked Case</th><th scope="col" className="h-10 px-4 font-semibold text-text-secondary">Severity</th><th scope="col" className="h-10 px-4 font-semibold text-text-secondary">Event Types</th><th scope="col" className="h-10 px-4 font-semibold text-text-secondary">Reportability</th><th scope="col" className="h-10 px-4 font-semibold text-text-secondary">Action</th></tr></thead><tbody>{incidents.map((incident) => (
            <tr key={incident.id} className="border-b hover:bg-surface-secondary transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-text-tertiary" title={incident.id}>{shortId(incident.id)}…</td>
              <td className="px-4 py-3"><Link href={`/cases/${encodeURIComponent(incident.caseReference)}`} className="text-sm font-medium text-text-primary hover:text-brand-emerald hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/30 rounded-sm">{incident.caseReference}</Link></td>
              <td className="px-4 py-3 text-xs text-text-secondary">{incident.injurySeverity ? <span className="capitalize">{incident.injurySeverity}</span> : <span className="text-text-tertiary">—</span>}{incident.medicalTreatment ? <span className="block text-[10px] text-text-tertiary mt-0.5">treatment: {incident.medicalTreatment}</span> : null}</td>
              <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{incident.eventTypes.map((type) => <span key={type} className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-50 text-red-600">{type}</span>)}</div></td>
              <td className="px-4 py-3"><span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', REPORTABILITY_STYLES[incident.reportability?.status ?? ''] ?? 'bg-slate-50 text-slate-700')}>{reportabilityLabel(incident)}</span></td>
              <td className="px-4 py-3">{incident.reportability?.status === 'pending' && can('review.close') ? <Button type="primary" size="small" icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => openReview(incident)}>Review</Button> : incident.reportability?.status === 'pending' ? <span className="text-xs text-text-tertiary">Compliance role required</span> : <span className="text-xs text-text-tertiary">Completed</span>}</td>
            </tr>
          ))}</tbody></table></div>
        ) : <div className="text-center py-14"><Shield className="h-8 w-8 mx-auto text-text-tertiary mb-3" /><p className="text-sm font-semibold text-text-primary mb-1">No incidents recorded</p><p className="text-xs text-text-tertiary">{loading ? 'Loading incidents…' : 'Incidents will appear here when linked to cases.'}</p></div>}
      </div>

      {reviewing ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="review-title">
          <div className="w-full max-w-lg rounded-2xl shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden bg-[var(--surface-elevated)] backdrop-blur-md">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600/10">
                  <ShieldAlert className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 id="review-title" className="text-base font-bold text-text-primary">Close Reportability Review</h2>
                  <p className="text-xs text-text-tertiary mt-0.5">Incident {shortId(reviewing.id)}… · Case {reviewing.caseReference}</p>
                </div>
              </div>
              <button type="button" onClick={() => setReviewing(null)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-surface-secondary cursor-pointer transition-colors" aria-label="Close review dialog">
                <X className="h-4 w-4 text-text-tertiary" />
              </button>
            </div>

            {/* Body — scrolls; header + footer stay fixed */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto min-h-0 flex-1" style={{ scrollbarGutter: 'stable' }}>
              <div className="space-y-1.5">
                <label htmlFor="rep-outcome" className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Outcome</label>
                <Select
                  id="rep-outcome"
                  value={outcome}
                  onChange={(val) => setOutcome(val as typeof outcome)}
                  className="w-full"
                  options={[
                    { value: 'filed', label: 'Filed with CPSC' },
                    { value: 'documented_non_reportable', label: 'Documented non-reportable' },
                  ]}
                />
              </div>

              {outcome === 'filed' && (
                <div className="space-y-1.5">
                  <label htmlFor="rep-cpsc" className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">CPSC reference</label>
                  <Input id="rep-cpsc" value={cpscReference} onChange={(e) => setCpscReference(e.target.value)} placeholder="CPSC-2026-001" maxLength={200} />
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="rep-rationale" className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Rationale</label>
                <Input.TextArea id="rep-rationale" value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Explain the decision (minimum 10 characters)." maxLength={2000} autoSize={{ minRows: 4, maxRows: 8 }} />
                <p className="text-[10px] text-text-tertiary">Minimum 10 characters · recorded in the audit trail</p>
              </div>

              {dialogError && (
                <div className="p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700" role="alert">{dialogError}</div>
              )}
            </div>

            {/* Footer — always visible */}
            <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t bg-[var(--surface-elevated)]" style={{ borderColor: 'var(--border)' }}>
              <Button onClick={() => setReviewing(null)} className="text-text-secondary hover:text-text-primary">Cancel</Button>
              <Button
                type="primary"
                icon={submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                loading={submitting}
                disabled={submitting}
                onClick={submitReview}
                className="!bg-emerald-600 !hover:bg-emerald-800"
              >
                {submitting ? 'Submitting…' : 'Close Review'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
