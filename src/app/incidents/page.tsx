'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shield, RefreshCw, CheckCircle2, X } from 'lucide-react';
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
        <button onClick={fetchIncidents} disabled={loading} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border text-sm text-text-secondary hover:text-text-primary cursor-pointer transition-colors">
          <RefreshCw className={loading ? 'animate-spin h-4 w-4' : 'h-4 w-4'} />
          Refresh
        </button>
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
          {error ? <span className="text-xs text-red-600">{error}</span> : null}
        </div>
        {!isAuthenticated && !authLoading ? (
          <div className="text-center py-14"><Shield className="h-8 w-8 mx-auto text-text-tertiary mb-3" /><p className="text-sm font-semibold text-text-primary mb-1">Sign in required</p><p className="text-xs text-text-tertiary mb-4">Sign in to review incident reportability.</p><button onClick={openLogin} className="rounded-lg bg-brand-emerald px-4 py-2 text-xs font-semibold text-white cursor-pointer">Sign In</button></div>
        ) : incidents.length > 0 ? (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="h-10 px-4 font-semibold text-text-secondary">Incident</th><th className="h-10 px-4 font-semibold text-text-secondary">Linked Case</th><th className="h-10 px-4 font-semibold text-text-secondary">Severity</th><th className="h-10 px-4 font-semibold text-text-secondary">Event Types</th><th className="h-10 px-4 font-semibold text-text-secondary">Reportability</th><th className="h-10 px-4 font-semibold text-text-secondary">Action</th></tr></thead><tbody>{incidents.map((incident) => (
            <tr key={incident.id} className="border-b hover:bg-surface-secondary transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-text-tertiary" title={incident.id}>{shortId(incident.id)}…</td>
              <td className="px-4 py-3"><button className="text-sm font-medium text-text-primary hover:text-brand-emerald hover:underline cursor-pointer" onClick={() => { window.location.href = `/cases/${encodeURIComponent(incident.caseReference)}`; }}>{incident.caseReference}</button></td>
              <td className="px-4 py-3 text-xs text-text-secondary">{incident.injurySeverity ? <span className="capitalize">{incident.injurySeverity}</span> : <span className="text-text-tertiary">—</span>}{incident.medicalTreatment ? <span className="block text-[10px] text-text-tertiary mt-0.5">treatment: {incident.medicalTreatment}</span> : null}</td>
              <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{incident.eventTypes.map((type) => <span key={type} className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-50 text-red-600">{type}</span>)}</div></td>
              <td className="px-4 py-3"><span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', REPORTABILITY_STYLES[incident.reportability?.status ?? ''] ?? 'bg-slate-50 text-slate-700')}>{reportabilityLabel(incident)}</span></td>
              <td className="px-4 py-3">{incident.reportability?.status === 'pending' && can('review.close') ? <button onClick={() => openReview(incident)} className="inline-flex items-center gap-1 rounded-md bg-brand-emerald px-2.5 py-1.5 text-xs font-semibold text-white cursor-pointer hover:bg-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" />Review</button> : incident.reportability?.status === 'pending' ? <span className="text-xs text-text-tertiary">Compliance role required</span> : <span className="text-xs text-text-tertiary">Completed</span>}</td>
            </tr>
          ))}</tbody></table></div>
        ) : <div className="text-center py-14"><Shield className="h-8 w-8 mx-auto text-text-tertiary mb-3" /><p className="text-sm font-semibold text-text-primary mb-1">No incidents recorded</p><p className="text-xs text-text-tertiary">{loading ? 'Loading incidents…' : 'Incidents will appear here when linked to cases.'}</p></div>}
      </div>

      {reviewing ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="review-title">
          <div className="w-full max-w-lg rounded-xl bg-surface-elevated p-5 shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div><h2 id="review-title" className="text-base font-bold text-text-primary">Close Reportability Review</h2><p className="text-xs text-text-tertiary mt-1">Incident {shortId(reviewing.id)}… · Case {reviewing.caseReference}</p></div>
              <button type="button" onClick={() => setReviewing(null)} className="text-text-tertiary hover:text-text-primary cursor-pointer" aria-label="Close review dialog"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-text-secondary">Outcome<select value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)} className="mt-1 h-9 w-full rounded-lg border bg-surface-elevated px-3 text-sm" style={{ borderColor: 'var(--border)' }}><option value="filed">Filed with CPSC</option><option value="documented_non_reportable">Documented non-reportable</option></select></label>
              {outcome === 'filed' ? <label className="block text-xs font-semibold text-text-secondary">CPSC reference<input value={cpscReference} onChange={(e) => setCpscReference(e.target.value)} className="mt-1 h-9 w-full rounded-lg border bg-surface-elevated px-3 text-sm" placeholder="CPSC-2026-001" maxLength={200} /></label> : null}
              <label className="block text-xs font-semibold text-text-secondary">Rationale<textarea value={rationale} onChange={(e) => setRationale(e.target.value)} className="mt-1 min-h-24 w-full rounded-lg border bg-surface-elevated p-3 text-sm" placeholder="Explain the decision (minimum 10 characters)." maxLength={2000} /></label>
              {dialogError ? <p className="text-xs text-red-600">{dialogError}</p> : null}
            </div>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setReviewing(null)} className="rounded-lg border px-3 py-2 text-xs font-semibold text-text-secondary cursor-pointer">Cancel</button><button type="button" onClick={submitReview} disabled={submitting} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-emerald px-3 py-2 text-xs font-semibold text-white cursor-pointer hover:bg-emerald-800 disabled:opacity-50">{submitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} {submitting ? 'Submitting…' : 'Close Review'}</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
