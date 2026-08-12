'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Search, XCircle, Copy, Package, Wifi, ArrowRight } from 'lucide-react';
import { seedOperations, getQueues, getAllCases, type QueueCard, type CaseRecord } from '@/lib/operations-repository';
import { cn } from '@/lib/utils';

type QIcons = Record<string, React.ComponentType<{ className?: string }>>;
const ICONS: QIcons = { AlertTriangle, Search, XCircle, Copy, Package, Wifi };

export default function QueuesPage() {
  const [queues, setQueues] = useState<QueueCard[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => { seedOperations(); setQueues(getQueues()); setCases(getAllCases()); }, []);

  const sq = queues.find(q => q.kind === selected);
  const qc = selected ? (() => {
    const q = sq!;
    if (q.kind === 'urgent_injury_safety') return cases.filter(c => c.incidentId && c.status !== 'closed');
    if (q.kind === 'manual_review') return cases.filter(c => c.productMatchDecision === 'pending' && c.status !== 'rejected' && c.status !== 'closed');
    if (q.kind === 'unable_to_confirm') return cases.filter(c => c.productMatchDecision === 'unable_to_confirm');
    if (q.kind === 'possible_duplicate') return cases.filter(c => c.productMatchDecision === 'possible_duplicate');
    if (q.kind === 'remedy_exception') return cases.filter(c => c.status === 'remedy_issued');
    return [];
  })() : [];

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto">
      <div><h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Queues</h1><p className="text-sm text-text-secondary mt-0.5">6 routing queues · Click a queue to see its cases</p></div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {queues.map(q => {
          const Icon = ICONS[q.icon] || Package;
          return (
            <button key={q.kind} onClick={() => setSelected(selected === q.kind ? null : q.kind)}
              className={cn('text-left rounded-xl border p-4 card-lift cursor-pointer transition-colors',
                q.count > 0 && q.kind === 'urgent_injury_safety' && 'border-red-300 bg-red-50/30',
                q.count > 0 && q.kind === 'remedy_exception' && 'border-red-200 bg-red-50/20',
                selected === q.kind && 'ring-2 ring-brand-emerald')}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><Icon className={cn('h-4 w-4', q.count > 0 ? 'text-amber-600' : 'text-text-tertiary')} /><h3 className="text-sm font-semibold text-text-primary">{q.label}</h3></div>
                <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', q.count > 0 ? 'bg-amber-100 text-amber-700' : 'bg-surface-secondary text-text-tertiary')}>{q.count}</span>
              </div>
              <p className="text-xs text-text-tertiary mb-2">{q.description}</p>
              <div className="flex items-center justify-between text-xs text-text-tertiary"><span>SLA: {q.sla}</span>{q.oldestAt && <span>Oldest: {new Date(q.oldestAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}</div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="rounded-xl border bg-surface-elevated overflow-hidden animate-[fadeIn_150ms]">
          <div className="flex items-center justify-between px-5 py-4 border-b"><h2 className="text-sm font-bold text-text-primary">{sq?.label} — {qc.length} case{qc.length !== 1 ? 's' : ''}</h2><span className="text-xs text-text-tertiary">SLA: {sq?.sla}</span></div>
          {qc.length > 0 ? (
            <table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="h-10 px-4 font-semibold text-text-secondary">Case #</th><th className="h-10 px-4 font-semibold text-text-secondary">Consumer</th><th className="h-10 px-4 font-semibold text-text-secondary">Route Reason</th><th className="h-10 px-4 font-semibold text-text-secondary">Status</th><th className="h-10 px-4 font-semibold text-text-secondary" /></tr></thead>
              <tbody>{qc.map(c => (
                <tr key={c.id} className="border-b hover:bg-surface-secondary transition-colors cursor-pointer" onClick={() => window.location.href = `/cases/${c.id}`}>
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-brand-emerald">{c.caseRef}</td>
                  <td className="px-4 py-3"><p className="text-sm font-medium text-text-primary">{c.consumerName}</p></td>
                  <td className="px-4 py-3"><p className="text-xs text-text-secondary">{c.queueReason || (c.productMatchDecision === 'pending' ? 'Pending product match review' : c.productMatchDecision.replace(/_/g, ' '))}</p></td>
                  <td className="px-4 py-3"><span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', c.status === 'submitted' && 'bg-blue-50 text-blue-700', c.status === 'under_review' && 'bg-amber-50 text-amber-700')}>{c.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span></td>
                  <td className="px-4 py-3 text-right"><ArrowRight className="h-4 w-4 text-text-tertiary inline" /></td>
                </tr>
              ))}</tbody></table>
          ) : <p className="text-sm text-text-tertiary text-center py-10">No cases in this queue.</p>}
        </div>
      )}
    </div>
  );
}
