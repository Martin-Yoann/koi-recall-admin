'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Shield, ExternalLink, CheckCircle2, FileText } from 'lucide-react';
import { seedOperations, getAllIncidents, getAllCases, type IncidentRecord, type CaseRecord } from '@/lib/operations-repository';
import { cn } from '@/lib/utils';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);

  useEffect(() => { seedOperations(); setIncidents(getAllIncidents()); setCases(getAllCases()); }, []);

  const pending = incidents.filter(i => i.reportabilityReview.status === 'pending');
  const filed = incidents.filter(i => i.reportabilityReview.status === 'filed');
  const nonReportable = incidents.filter(i => i.reportabilityReview.status === 'documented_non_reportable');

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto">
      <div><h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Incidents & Safety</h1><p className="text-sm text-text-secondary mt-0.5">{incidents.length} incidents · {pending.length} pending reportability review</p></div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[{ label: 'Pending Review', value: pending.length, color: 'bg-red-50 text-red-600' }, { label: 'Filed (CPSC)', value: filed.length, color: 'bg-amber-50 text-amber-600' }, { label: 'Non-Reportable', value: nonReportable.length, color: 'bg-slate-50 text-slate-600' }, { label: 'Total', value: incidents.length, color: 'bg-emerald-50 text-emerald-600' }].map(s => (
          <div key={s.label} className="rounded-xl border bg-surface-elevated p-4 card-lift cursor-default">
            <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">{s.label}</p><p className="text-2xl font-bold text-text-primary">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        <div className="px-5 py-4 border-b"><h2 className="text-sm font-bold text-text-primary">Incident Log</h2></div>
        {incidents.length > 0 ? (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="h-10 px-4 font-semibold text-text-secondary">Incident ID</th><th className="h-10 px-4 font-semibold text-text-secondary">Linked Case</th><th className="h-10 px-4 font-semibold text-text-secondary">Event Types</th><th className="h-10 px-4 font-semibold text-text-secondary">Reportability</th><th className="h-10 px-4 font-semibold text-text-secondary">Created</th></tr></thead>
            <tbody>{incidents.map(inc => { const linkedCase = cases.find(c => c.incidentId === inc.id); return (
              <tr key={inc.id} className="border-b hover:bg-surface-secondary transition-colors cursor-pointer" onClick={() => linkedCase && (window.location.href = `/cases/${linkedCase.id}`)}>
                <td className="px-4 py-3 font-mono text-sm font-semibold text-brand-emerald">{inc.id}</td>
                <td className="px-4 py-3">{linkedCase ? <span className="text-sm font-medium text-text-primary">{linkedCase.caseRef} · {linkedCase.consumerName}</span> : <span className="text-text-tertiary">—</span>}</td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{inc.eventTypes.map(t => <span key={t} className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-50 text-red-600">{t}</span>)}</div></td>
                <td className="px-4 py-3"><span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', inc.reportabilityReview.status === 'pending' && 'bg-red-50 text-red-700', inc.reportabilityReview.status === 'filed' && 'bg-amber-50 text-amber-700', inc.reportabilityReview.status === 'documented_non_reportable' && 'bg-slate-50 text-slate-700')}>{inc.reportabilityReview.status.replace(/_/g, ' ').toUpperCase()}</span></td>
                <td className="px-4 py-3 text-xs text-text-tertiary">{new Date(inc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
              </tr>
            );})}</tbody></table>
        ) : <div className="text-center py-14"><Shield className="h-8 w-8 mx-auto text-text-tertiary mb-3" /><p className="text-sm font-semibold text-text-primary mb-1">No incidents recorded</p><p className="text-xs text-text-tertiary">Incidents will appear here when linked to cases.</p></div>}
      </div>
    </div>
  );
}
