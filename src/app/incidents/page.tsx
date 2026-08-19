'use client';

import { useMemo, useState } from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import { listIncidents, type IncidentSummary } from '@/lib/api-client';
import { cn } from '@/lib/utils';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    const result = await listIncidents();
    if (result.ok) {
      setIncidents(result.data.incidents);
    } else if (result.status === 401 || result.status === 403) {
      setError('Please log in to view incidents.');
    } else {
      setError(result.error?.detail || 'Failed to load incidents.');
    }
    setLoading(false);
  };

  if (!loading && incidents.length === 0 && !error) {
    void fetchIncidents();
  }

  const pending = useMemo(() => incidents.filter((incident) => incident.reportabilityStatus === 'pending'), [incidents]);
  const filed = useMemo(() => incidents.filter((incident) => incident.reportabilityStatus === 'filed'), [incidents]);
  const nonReportable = useMemo(() => incidents.filter((incident) => incident.reportabilityStatus === 'documented_non_reportable'), [incidents]);

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
        {incidents.length > 0 ? (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="h-10 px-4 font-semibold text-text-secondary">Incident ID</th><th className="h-10 px-4 font-semibold text-text-secondary">Linked Case</th><th className="h-10 px-4 font-semibold text-text-secondary">Event Types</th><th className="h-10 px-4 font-semibold text-text-secondary">Reportability</th><th className="h-10 px-4 font-semibold text-text-secondary">Next Action</th><th className="h-10 px-4 font-semibold text-text-secondary">Obtained</th></tr></thead>
            <tbody>{incidents.map((incident) => (
              <tr key={incident.incidentId} className="border-b hover:bg-surface-secondary transition-colors cursor-pointer" onClick={() => { window.location.href = `/cases/${incident.caseReference}`; }}>
                <td className="px-4 py-3 font-mono text-sm font-semibold text-brand-emerald">{incident.incidentId}</td>
                <td className="px-4 py-3"><span className="text-sm font-medium text-text-primary">{incident.caseReference}</span></td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{incident.eventTypes.map((type) => <span key={type} className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-50 text-red-600">{type}</span>)}</div></td>
                <td className="px-4 py-3"><span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', incident.reportabilityStatus === 'pending' && 'bg-red-50 text-red-700', incident.reportabilityStatus === 'filed' && 'bg-amber-50 text-amber-700', incident.reportabilityStatus === 'documented_non_reportable' && 'bg-slate-50 text-slate-700')}>{(incident.reportabilityStatus ?? 'none').replace(/_/g, ' ').toUpperCase()}</span></td>
                <td className="px-4 py-3 text-xs text-text-secondary">{incident.nextAction}</td>
                <td className="px-4 py-3 text-xs text-text-tertiary">{incident.companyObtainedAt ? new Date(incident.companyObtainedAt).toLocaleDateString('en-US') : '—'}</td>
              </tr>
            ))}</tbody></table>
        ) : <div className="text-center py-14"><Shield className="h-8 w-8 mx-auto text-text-tertiary mb-3" /><p className="text-sm font-semibold text-text-primary mb-1">No incidents recorded</p><p className="text-xs text-text-tertiary">{loading ? 'Loading incidents…' : 'Incidents will appear here when linked to cases.'}</p></div>}
      </div>
    </div>
  );
}
