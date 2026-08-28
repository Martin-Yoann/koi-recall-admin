'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, FolderOpen, Search, RefreshCw, Hand } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { assignCase, exportCases, listCases, type CaseSummary } from '@/lib/api-client';
import { useAdminAuth } from '@/lib/admin-auth';
import { usePermissions } from '@/lib/rbac';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

/** The full case status set (mirrors the backend recall_case_status enum). */
const CASE_STATUSES = [
  'submitted', 'triage', 'under_review', 'need_info', 'approved',
  'closure_review', 'closed', 'rejected', 'duplicate', 'withdrawn',
] as const;

const TERMINAL = ['closed', 'rejected', 'duplicate', 'withdrawn'];

interface Stats {
  open: number;
  pendingReview: number;
  incidents: number;
  closed: number;
}

export default function CasesPage() {
  const { user } = useAdminAuth();
  const { can } = usePermissions();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [queueFilter, setQueueFilter] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  // One unfiltered fetch feeds both the stat chips and the (client-side)
  // filtered table, so counts always match the visible rows' universe.
  const fetchCases = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    setError(null);
    const result = await listCases({ limit: 200 });
    if (!mountedRef.current) return;
    if (result.ok) {
      setCases(result.data.cases);
    } else if (result.status === 401 || result.status === 403) {
      setError('Please log in to view cases.');
    } else if (result.status === 501) {
      setError('Backend case service is not available yet. Starting the backend with DATABASE_URL will enable this page.');
    } else {
      setError(result.error?.detail || 'Failed to load cases.');
    }
    setLoading(false);
  }, []);

  const handleExport = async () => {
    setExporting(true);
    const result = await exportCases();
    if (result.ok) {
      const url = URL.createObjectURL(result.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'koi-cases.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } else {
      setError(result.error?.detail || 'Failed to export cases.');
    }
    setExporting(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchCases();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchCases]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (queueFilter === 'standard' && c.status !== 'submitted') return false;
      if (queueFilter === 'manual_review' && !['triage', 'need_info'].includes(c.status)) return false;
      if (queueFilter === 'incident' && !(c.incidentFlag && !TERMINAL.includes(c.status))) return false;
      if (q && !c.caseReference.toLowerCase().includes(q) && !c.subtype.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cases, search, statusFilter, queueFilter]);

  const stats: Stats = useMemo(() => ({
    open: cases.filter((c) => !TERMINAL.includes(c.status)).length,
    pendingReview: cases.filter((c) => ['submitted', 'triage', 'under_review', 'need_info'].includes(c.status)).length,
    incidents: cases.filter((c) => c.incidentFlag && !TERMINAL.includes(c.status)).length,
    closed: cases.filter((c) => c.status === 'closed').length,
  }), [cases]);

  /** Assign the case to the signed-in staff user (intake triage shortcut). */
  const handleClaim = async (caseRef: string) => {
    if (!user?.staffUserId) return;
    setClaiming(caseRef);
    setError(null);
    const result = await assignCase(caseRef, { staffUserId: user.staffUserId });
    if (!result.ok && mountedRef.current) {
      setError(result.error?.detail || `Failed to claim ${caseRef}.`);
    }
    if (mountedRef.current) setClaiming(null);
  };

  const isMine = (c: CaseSummary) =>
    !!user?.staffUserId && c.assignedToStaffUserId === user.staffUserId;

  return (
    <div className="space-y-6 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Cases</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {cases.length} case{cases.length !== 1 ? 's' : ''} · Manage and review recall cases
          </p>
        </div>
        <div className="flex items-center gap-2">
          {can('case.export') && (
            <button onClick={handleExport} disabled={exporting} className="flex items-center gap-2 h-9 px-3 rounded-lg border text-sm text-text-secondary hover:text-text-primary cursor-pointer transition-colors disabled:opacity-50">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          )}
          <button onClick={fetchCases} disabled={loading} className="flex items-center gap-2 h-9 px-3 rounded-lg border text-sm text-text-secondary hover:text-text-primary cursor-pointer transition-colors">
            <RefreshCw className={loading ? 'animate-spin h-4 w-4' : 'h-4 w-4'} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Open Cases', value: stats.open },
          { label: 'Pending Review', value: stats.pendingReview },
          { label: 'With Incidents', value: stats.incidents },
          { label: 'Closed', value: stats.closed },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-surface-elevated p-4 card-lift cursor-default">
            <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">{stat.label}</p>
            <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-4 border-b flex-wrap">
          <div className="relative flex-1 min-w-52 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search by case reference or subtype..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border bg-surface-elevated text-sm outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald transition-all"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 px-3 rounded-lg border bg-surface-elevated text-sm outline-none cursor-pointer" style={{ borderColor: 'var(--border)' }}>
            <option value="all">All statuses</option>
            {CASE_STATUSES.map((status) => (
              <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select value={queueFilter} onChange={(e) => setQueueFilter(e.target.value)} className="h-9 px-3 rounded-lg border bg-surface-elevated text-sm outline-none cursor-pointer" style={{ borderColor: 'var(--border)' }}>
            <option value="all">All queues</option>
            <option value="standard">Standard (submitted)</option>
            <option value="manual_review">Manual review (triage · need info)</option>
            <option value="incident">Incident</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <RefreshCw className="h-10 w-10 mx-auto text-text-tertiary mb-3 animate-spin" />
            <p className="text-sm text-text-secondary">Loading cases...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <FolderOpen className="h-10 w-10 mx-auto text-text-tertiary mb-3" />
            <p className="text-sm font-semibold text-text-primary mb-1">Case Management</p>
            <p className="text-xs text-text-tertiary max-w-sm mx-auto leading-relaxed">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="h-10 w-10 mx-auto text-text-tertiary mb-3" />
            <p className="text-sm font-semibold text-text-primary mb-1">No Cases Found</p>
            <p className="text-xs text-text-tertiary max-w-sm mx-auto leading-relaxed">
              {search ? 'No cases match your search criteria.' : 'No recall cases have been submitted yet.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case Reference</TableHead>
                <TableHead>Subtype</TableHead>
                <TableHead>Incident</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Owner</TableHead>
                {can('case.assign') && <TableHead>Claim</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.caseReference}>
                  <TableCell>
                    <Link
                      href={`/cases/${c.caseReference}`}
                      className="text-sm font-semibold font-mono text-text-primary hover:text-brand-teal transition-colors"
                    >
                      {c.caseReference}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-secondary">{c.subtype.replace(/_/g, ' ')}</span>
                  </TableCell>
                  <TableCell>
                    {c.incidentFlag ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                        Incident
                      </span>
                    ) : (
                      <span className="text-xs text-text-tertiary">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={c.status as never} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-tertiary">
                      {c.submittedAt ? new Date(c.submittedAt).toLocaleDateString('en-US') : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {isMine(c) ? (
                      <span className="text-xs font-semibold text-emerald-700">Me</span>
                    ) : c.assignedToStaffUserId ? (
                      <span className="text-xs text-text-tertiary">Assigned</span>
                    ) : (
                      <span className="text-xs text-text-tertiary">Unassigned</span>
                    )}
                  </TableCell>
                  {can('case.assign') && (
                    <TableCell>
                      {TERMINAL.includes(c.status) ? (
                        <span className="text-xs text-text-tertiary">—</span>
                      ) : isMine(c) ? (
                        <span className="text-xs text-text-tertiary">—</span>
                      ) : (
                        <button
                          onClick={() => handleClaim(c.caseReference)}
                          disabled={claiming === c.caseReference}
                          className="inline-flex items-center gap-1 rounded-md border border-brand-emerald/40 px-2 py-1 text-xs font-semibold text-brand-emerald cursor-pointer hover:bg-emerald-50 transition-colors disabled:opacity-50"
                        >
                          <Hand className="h-3 w-3" />
                          {claiming === c.caseReference ? 'Claiming…' : 'Claim to me'}
                        </button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
