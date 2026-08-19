'use client';

// ============================================================
// KOI Recall Admin — Access & Audit v2.0 (live Neon data)
// GET /admin/audit-events · role overview
// ============================================================

import { useState } from 'react';
import { Users, Search, RefreshCw, ShieldAlert } from 'lucide-react';
import { queryAuditEvents, type AuditEvent } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useAdminAuth } from '@/lib/admin-auth';

const ROLE_DESCRIPTIONS = [
  { role: 'Authorized Back-office User', permissions: 'View cases, product-match decisions, queue routing, incident reviews, remedy authorization, export/reconciliation', color: 'bg-blue-50 text-blue-700' },
  { role: 'System Administrator', permissions: 'All back-office permissions + user management, rule configuration, API key management, audit log export', color: 'bg-emerald-50 text-emerald-700' },
];

// Backend resource types in admin_audit_events.resourceType
const FILTER_CATS = ['case', 'incident', 'reportability', 'document', 'staff', 'audit', 'export'] as const;

const DOT_COLOR: Record<string, string> = {
  case: 'bg-blue-500',
  incident: 'bg-red-500',
  reportability: 'bg-violet-500',
  document: 'bg-amber-500',
  staff: 'bg-emerald-500',
  audit: 'bg-slate-400',
  export: 'bg-cyan-500',
};

export default function AccessPage() {
  const { isAuthenticated } = useAdminAuth();
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const fetchAudit = async () => {
    setLoading(true);
    setError(null);
    const result = await queryAuditEvents({ limit: 200 });
    if (result.ok) {
      setAudit(result.data.events);
    } else if (result.status === 401 || result.status === 403) {
      setError('Please log in to view the audit log.');
    } else if (result.status === 0) {
      setError('Cannot reach the backend API — local :3002 and the online backend are both unreachable.');
    } else {
      setError(result.error?.detail || 'Failed to load audit log.');
    }
    setLoading(false);
  };


  const toggleFilter = (cat: string) => {
    setActiveFilters(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  let filtered = audit;
  if (activeFilters.length > 0) filtered = filtered.filter(a => activeFilters.includes(a.resourceType));
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(a =>
      a.action.toLowerCase().includes(q) ||
      (a.resourceId ?? '').toLowerCase().includes(q) ||
      a.actorRole.toLowerCase().includes(q),
    );
  }
  // Newest first
  filtered = [...filtered].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Access & Audit</h1>
          <p className="text-sm text-text-secondary mt-0.5">User roles · access control · live audit trail from Neon</p>
        </div>
        <button
          onClick={fetchAudit}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer hover:bg-surface-secondary text-text-secondary"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Roles */}
      <div className="grid md:grid-cols-2 gap-4">
        {ROLE_DESCRIPTIONS.map(r => (
          <div key={r.role} className="rounded-xl border bg-surface-elevated p-5 card-lift">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <Users className="h-4.5 w-4.5 text-emerald-700" />
              </div>
              <div><p className="text-sm font-bold text-text-primary">{r.role}</p></div>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">{r.permissions}</p>
          </div>
        ))}
      </div>

      {/* Audit */}
      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        <div className="px-5 py-4 border-b space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-text-primary">Audit Log</h2>
            <span className="text-xs text-text-tertiary">{filtered.length} of {audit.length} events</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {FILTER_CATS.map(cat => (
              <button
                key={cat}
                onClick={() => toggleFilter(cat)}
                className={cn(
                  'text-[10px] font-bold uppercase px-2 py-1 rounded-full border cursor-pointer transition-colors',
                  activeFilters.includes(cat)
                    ? 'bg-brand-emerald text-white border-brand-emerald'
                    : 'bg-surface-secondary text-text-tertiary border-border hover:border-brand-emerald/30',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search action, resource id, or role..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg border bg-surface-elevated text-xs outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
        </div>

        {error ? (
          <div className="py-10 text-center">
            <ShieldAlert className="h-8 w-8 mx-auto text-text-tertiary mb-2" />
            <p className="text-sm text-text-tertiary">{error}</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {filtered.map(a => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                <div className={cn('h-2 w-2 rounded-full mt-2 shrink-0', DOT_COLOR[a.resourceType] ?? 'bg-slate-400')} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary font-mono">{a.action}</p>
                  <p className="text-[11px] text-text-tertiary mt-0.5 flex items-center gap-1 flex-wrap">
                    <Users className="h-3 w-3" />{a.actorRole}
                    <span>·</span>
                    {new Date(a.occurredAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    <span>·</span>
                    <span className={cn('font-semibold', a.outcome === 'success' ? 'text-emerald-600' : 'text-red-600')}>{a.outcome}</span>
                    {a.resourceId && <><span>·</span><span className="font-mono">{a.resourceId}</span></>}
                  </p>
                  {a.reasonCode && <p className="text-xs text-text-tertiary mt-1 italic">{a.reasonCode}</p>}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary shrink-0">{a.resourceType}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-tertiary text-center py-10">
            {loading ? 'Loading…' : 'No matching audit events.'}
          </p>
        )}
      </div>

      {!isAuthenticated && !error && (
        <div className="rounded-xl border bg-surface-secondary/40 p-4 text-xs text-text-tertiary flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5" />
          Log in with a staff account (top right) to load the live audit trail.
        </div>
      )}
    </div>
  );
}
