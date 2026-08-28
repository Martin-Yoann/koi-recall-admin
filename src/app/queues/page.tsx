'use client';

// ============================================================
// KOI Recall Admin — Routing Queues v3.1 (live Neon data)
// Queue cards + in-queue search, backed by GET /admin/cases
//
// Queue derivation (backend case list exposes status / subtype /
// incidentFlag only, so queues are derived client-side). Aligned with the
// backend QUEUE_STATUS map (drizzle-admin-service.ts):
//   urgent_injury_safety  ← incidentFlag && case still active (= backend incident queue)
//   standard              ← submitted (= backend standard queue)
//   manual_review         ← triage / under_review (backend manual_review, with
//                            need_info split into its own queue below)
//   unable_to_confirm     ← need_info (awaiting consumer information)
//   possible_duplicate    ← duplicate
//   remedy_exception      ← approved / closure_review
// ============================================================

import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, Search, XCircle, Copy, Package, Inbox, ArrowRight,
  Flame, ListFilter, X, RefreshCw,
} from 'lucide-react';
import { listCases, type CaseSummary } from '@/lib/api-client';
import { StatusBadge } from '@/components/shared/status-badge';
import { useAdminAuth } from '@/lib/admin-auth';
import { cn } from '@/lib/utils';

type QueueKind =
  | 'urgent_injury_safety'
  | 'standard'
  | 'manual_review'
  | 'unable_to_confirm'
  | 'possible_duplicate'
  | 'remedy_exception';

type QIcons = Record<string, React.ComponentType<{ className?: string }>>;
const ICONS: QIcons = { AlertTriangle, Search, XCircle, Copy, Package, Inbox };

interface QueueDef {
  kind: QueueKind;
  label: string;
  description: string;
  sla: string;
  icon: string;
}

const QUEUE_DEFS: QueueDef[] = [
  { kind: 'urgent_injury_safety', label: 'Urgent Injury / Safety', description: 'Cases with reported injuries or safety hazards', sla: '4h', icon: 'AlertTriangle' },
  { kind: 'standard', label: 'Standard Intake', description: 'New submissions awaiting first review', sla: '24h', icon: 'Inbox' },
  { kind: 'manual_review', label: 'Manual Review', description: 'Cases in triage or active review', sla: '24h', icon: 'Search' },
  { kind: 'unable_to_confirm', label: 'Need Info', description: 'Cases waiting on additional consumer information', sla: '48h', icon: 'XCircle' },
  { kind: 'possible_duplicate', label: 'Possible Duplicate', description: 'Potential duplicate submissions', sla: '24h', icon: 'Copy' },
  { kind: 'remedy_exception', label: 'Remedy Exception', description: 'Approved cases pending remedy or closure review', sla: '8h', icon: 'Package' },
];

const TERMINAL = ['closed', 'withdrawn', 'rejected', 'duplicate'];

function queueCases(kind: QueueKind, cases: CaseSummary[]): CaseSummary[] {
  switch (kind) {
    case 'urgent_injury_safety':
      return cases.filter(c => c.incidentFlag && !TERMINAL.includes(c.status));
    case 'standard':
      return cases.filter(c => c.status === 'submitted');
    case 'manual_review':
      return cases.filter(c => ['triage', 'under_review'].includes(c.status));
    case 'unable_to_confirm':
      return cases.filter(c => c.status === 'need_info');
    case 'possible_duplicate':
      return cases.filter(c => c.status === 'duplicate');
    case 'remedy_exception':
      return cases.filter(c => ['approved', 'closure_review'].includes(c.status));
    default:
      return [];
  }
}

// Per-queue accent colors (border/dot/badge)
const QUEUE_STYLES: Record<QueueKind, { accent: string; icon: string; badge: string; selectedRing: string }> = {
  urgent_injury_safety: { accent: 'border-l-red-500', icon: 'text-red-600', badge: 'bg-red-100 text-red-700', selectedRing: 'ring-red-400' },
  standard: { accent: 'border-l-sky-500', icon: 'text-sky-600', badge: 'bg-sky-100 text-sky-700', selectedRing: 'ring-sky-400' },
  manual_review: { accent: 'border-l-amber-500', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', selectedRing: 'ring-amber-400' },
  unable_to_confirm: { accent: 'border-l-orange-500', icon: 'text-orange-600', badge: 'bg-orange-100 text-orange-700', selectedRing: 'ring-orange-400' },
  possible_duplicate: { accent: 'border-l-blue-500', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', selectedRing: 'ring-blue-400' },
  remedy_exception: { accent: 'border-l-rose-500', icon: 'text-rose-600', badge: 'bg-rose-100 text-rose-700', selectedRing: 'ring-rose-400' },
};

export default function QueuesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<QueueKind | null>(null);
  const [query, setQuery] = useState('');
  const mountedRef = useRef(true);
  const initialLoadStartedRef = useRef(false);

  useEffect(() => {
    // Reset on every setup so React StrictMode's dev double-invoke (setup →
    // cleanup → setup) cannot permanently poison the flag and stall the page
    // on "Unable to load case".
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchCases = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    setError(null);
    const result = await listCases({ limit: 200 });
    if (!mountedRef.current) return;
    if (result.ok) {
      setCases(result.data.cases);
    } else if (result.status === 401) {
      setError('Please sign in with a staff account to view queues.');
    } else if (result.status === 403) {
      setError('Your staff role does not have permission to view queues.');
    } else if (result.status === 0) {
      setError('Cannot reach the backend API — local :3002 and the online backend are both unreachable.');
    } else {
      setError(result.error?.detail || 'Failed to load cases.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated || initialLoadStartedRef.current || loading || cases.length > 0 || error) {
      return;
    }
    initialLoadStartedRef.current = true;
    const timer = window.setTimeout(() => {
      void fetchCases();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [authLoading, cases.length, error, fetchCases, isAuthenticated, loading]);

  const queues = useMemo(
    () =>
      QUEUE_DEFS.map(def => {
        const members = queueCases(def.kind, cases);
        const oldest = members.reduce<string | undefined>(
          (acc, c) => (!acc || c.submittedAt < acc ? c.submittedAt : acc),
          undefined,
        );
        return { ...def, count: members.length, oldestAt: oldest };
      }),
    [cases],
  );

  const sq = queues.find(q => q.kind === selected);

  const filtered = useMemo(() => {
    if (!selected) return [];
    const base = queueCases(selected, cases);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(c =>
      c.caseReference.toLowerCase().includes(q) ||
      c.subtype.toLowerCase().includes(q) ||
      c.status.toLowerCase().includes(q),
    );
  }, [selected, cases, query]);

  const totalOpen = cases.filter(c => !['closed', 'rejected', 'withdrawn'].includes(c.status)).length;
  const urgentCount = queues.find(q => q.kind === 'urgent_injury_safety')?.count ?? 0;

  const selectQueue = (kind: QueueKind) => {
    setSelected(prev => (prev === kind ? null : kind));
    setQuery('');
  };

  if (!isAuthenticated && !loading) {
    return (
      <div className="max-w-screen-2xl mx-auto py-16 text-center">
        <Inbox className="h-10 w-10 mx-auto text-text-tertiary mb-3" />
        <p className="text-sm font-semibold text-text-primary mb-1">Sign in required</p>
        <p className="text-xs text-text-tertiary">Log in with a staff account to view live queues.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Queues</h1>
          <p className="text-sm text-text-secondary mt-0.5">6 routing queues · Live data from Neon · Click a queue to see its cases</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-surface-elevated px-3 py-1 text-xs font-medium text-text-secondary">
            <Inbox className="h-3.5 w-3.5 text-text-tertiary" />
            {totalOpen} open case{totalOpen !== 1 ? 's' : ''}
          </span>
          {urgentCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-700">
              <Flame className="h-3.5 w-3.5" />
              {urgentCount} urgent
            </span>
          )}
          <button
            onClick={fetchCases}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer hover:bg-surface-secondary text-text-secondary"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>
      )}

      {/* Queue cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {queues.map(q => {
          const Icon = ICONS[q.icon] || Package;
          const style = QUEUE_STYLES[q.kind];
          const isSelected = selected === q.kind;
          const hasCases = q.count > 0;
          return (
            <button
              key={q.kind}
              onClick={() => selectQueue(q.kind)}
              aria-pressed={isSelected}
              className={cn(
                'text-left rounded-xl border border-l-4 bg-surface-elevated p-4 card-lift cursor-pointer transition-all',
                style.accent,
                isSelected ? cn('ring-2', style.selectedRing, 'shadow-md') : 'hover:shadow-sm',
                !hasCases && 'opacity-75',
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={cn('h-4 w-4 shrink-0', hasCases ? style.icon : 'text-text-tertiary')} />
                  <h3 className="text-sm font-semibold text-text-primary truncate">{q.label}</h3>
                </div>
                <span className={cn(
                  'text-xs font-bold px-2 py-0.5 rounded-full shrink-0 tabular-nums',
                  hasCases ? style.badge : 'bg-surface-secondary text-text-tertiary',
                )}>
                  {q.count}
                </span>
              </div>
              <p className="text-xs text-text-tertiary mb-3 line-clamp-2">{q.description}</p>
              <div className="flex items-center justify-between text-xs text-text-tertiary">
                <span className="inline-flex items-center gap-1">
                  <ListFilter className="h-3 w-3" />
                  SLA: {q.sla}
                </span>
                {q.oldestAt && (
                  <span>Oldest: {new Date(q.oldestAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected queue case list */}
      {selected && sq && (
        <div className="rounded-xl border bg-surface-elevated overflow-hidden animate-[fadeIn_150ms]">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b flex-wrap">
            <h2 className="text-sm font-bold text-text-primary">
              {sq.label} — {filtered.length} case{filtered.length !== 1 ? 's' : ''}
              {query && <span className="font-normal text-text-tertiary"> (filtered)</span>}
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search case # or status..."
                  className="h-8 w-56 rounded-lg border bg-surface-secondary/50 pl-8 pr-7 text-xs text-text-primary outline-none focus:border-brand-emerald placeholder:text-text-tertiary"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <span className="text-xs text-text-tertiary hidden sm:inline">SLA: {sq.sla}</span>
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left bg-surface-secondary/40">
                    <th className="h-10 px-4 font-semibold text-text-secondary">Case #</th>
                    <th className="h-10 px-4 font-semibold text-text-secondary">Subtype</th>
                    <th className="h-10 px-4 font-semibold text-text-secondary">Incident</th>
                    <th className="h-10 px-4 font-semibold text-text-secondary">Status</th>
                    <th className="h-10 px-4 font-semibold text-text-secondary">Submitted</th>
                    <th className="h-10 px-4 font-semibold text-text-secondary" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.caseReference} className="border-b last:border-0 hover:bg-surface-secondary transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/cases/${encodeURIComponent(c.caseReference)}`} className="font-mono text-sm font-semibold text-brand-emerald hover:underline">
                          {c.caseReference}
                        </Link>
                      </td>
                      <td className="px-4 py-3"><p className="text-xs text-text-secondary">{c.subtype.replace(/_/g, ' ')}</p></td>
                      <td className="px-4 py-3">
                        {c.incidentFlag
                          ? <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">Incident</span>
                          : <span className="text-xs text-text-tertiary">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge variant={c.status as never} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-text-tertiary">
                          {new Date(c.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/cases/${encodeURIComponent(c.caseReference)}`} className="inline-flex items-center gap-1 text-xs font-medium text-text-tertiary hover:text-brand-emerald transition-colors">
                          Open <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <Inbox className="h-8 w-8 mx-auto text-text-tertiary mb-2" />
              <p className="text-sm text-text-tertiary">
                {query ? `No cases match "${query}".` : 'No cases in this queue.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
