'use client';

import { useEffect, useState } from 'react';
import { Shield, Users, FileCheck, Search } from 'lucide-react';
import { seedOperations, getAllAudit, type AuditEvent } from '@/lib/operations-repository';
import { cn } from '@/lib/utils';

const ROLE_DESCRIPTIONS = [
  { role: 'Authorized Back-office User', permissions: 'View cases, product-match decisions, queue routing, incident reviews, remedy authorization, export/reconciliation', color: 'bg-blue-50 text-blue-700' },
  { role: 'System Administrator', permissions: 'All back-office permissions + user management, rule configuration, API key management, audit log export', color: 'bg-emerald-50 text-emerald-700' },
];

const FILTER_CATS = ['case', 'incident', 'remedy', 'job', 'export', 'pii', 'rule'] as const;

export default function AccessPage() {
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { seedOperations(); setAudit(getAllAudit()); }, []);

  const toggleFilter = (cat: string) => {
    setActiveFilters(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  let filtered = audit;
  if (activeFilters.length > 0) filtered = filtered.filter(a => activeFilters.includes(a.category));
  if (search) { const q = search.toLowerCase(); filtered = filtered.filter(a => a.action.toLowerCase().includes(q) || a.actor.toLowerCase().includes(q) || a.reference?.toLowerCase().includes(q)); }

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto">
      <div><h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Access & Audit</h1><p className="text-sm text-text-secondary mt-0.5">User roles · access control · full audit trail</p></div>

      {/* Roles */}
      <div className="grid md:grid-cols-2 gap-4">
        {ROLE_DESCRIPTIONS.map(r => (
          <div key={r.role} className="rounded-xl border bg-surface-elevated p-5 card-lift">
            <div className="flex items-center gap-3 mb-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50"><Users className="h-4.5 w-4.5 text-emerald-700" /></div><div><p className="text-sm font-bold text-text-primary">{r.role}</p></div></div>
            <p className="text-xs text-text-secondary leading-relaxed">{r.permissions}</p>
          </div>
        ))}
      </div>

      {/* Audit */}
      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        <div className="px-5 py-4 border-b space-y-3">
          <h2 className="text-sm font-bold text-text-primary">Audit Log</h2>
          <div className="flex flex-wrap items-center gap-2">
            {FILTER_CATS.map(cat => (
              <button key={cat} onClick={() => toggleFilter(cat)} className={cn('text-[10px] font-bold uppercase px-2 py-1 rounded-full border cursor-pointer transition-colors', activeFilters.includes(cat) ? 'bg-brand-emerald text-white border-brand-emerald' : 'bg-surface-secondary text-text-tertiary border-border hover:border-brand-emerald/30')}>{cat}</button>
            ))}
          </div>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
            <input type="text" placeholder="Search audit..." value={search} onChange={e => setSearch(e.target.value)} className="w-full h-8 pl-8 pr-3 rounded-lg border bg-surface-elevated text-xs outline-none" style={{ borderColor: 'var(--border)' }} />
          </div>
        </div>
        {filtered.length > 0 ? (
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {filtered.map(a => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                <div className={cn('h-2 w-2 rounded-full mt-2 shrink-0', a.category === 'case' && 'bg-blue-500', a.category === 'incident' && 'bg-red-500', a.category === 'remedy' && 'bg-emerald-500', a.category === 'job' && 'bg-amber-500', a.category === 'pii' && 'bg-purple-500', a.category === 'system' && 'bg-slate-400')} />
                <div className="min-w-0 flex-1"><p className="text-sm text-text-primary">{a.action}</p><p className="text-[11px] text-text-tertiary mt-0.5 flex items-center gap-1"><Users className="h-3 w-3" />{a.actor}<span>·</span>{new Date(a.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>{a.details && <p className="text-xs text-text-tertiary mt-1 italic">{a.details}</p>}</div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary shrink-0">{a.category}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-text-tertiary text-center py-10">No matching audit events.</p>}
      </div>
    </div>
  );
}
