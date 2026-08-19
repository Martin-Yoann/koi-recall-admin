'use client';

// ============================================================
// KOI Recall Admin — Operations Overview v3.0 (live Neon data)
// Stats & submissions from GET /admin/cases
// Campaign cards from public GET /v1/recall-campaigns/{slug}
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Clock, CheckCircle2, FileText, ArrowRight, Shield,
  Megaphone, RefreshCw, Flame,
} from 'lucide-react';
import Link from 'next/link';
import { StatCard } from '@/components/admin/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { cn } from '@/lib/utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { listCases, getCampaign, type CaseSummary } from '@/lib/api-client';
import { useAdminAuth } from '@/lib/admin-auth';

// Campaigns seeded into Neon (test data)
const KNOWN_CAMPAIGN_SLUGS = [
  'music-lollipop-demo-2026',
  'baby-stroller-safety-recall-2026',
  'electric-kettle-recall-2026',
];

const TERMINAL = ['closed', 'rejected', 'duplicate', 'withdrawn'];
const ACTIVE_CASE_STATUSES = ['submitted', 'triage', 'under_review', 'need_info'];

interface CampaignCard {
  slug: string;
  title: string;
  code: string;
  status: string;
}

export default function DashboardPage() {
  const { isAuthenticated } = useAdminAuth();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignCard[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const initialLoadStartedRef = useRef(false);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const refresh = useCallback(async () => {
    if (!mountedRef.current) return;
    setRefreshing(true);
    setError(null);
    const [casesResult, ...campaignResults] = await Promise.all([
      listCases({ limit: 200 }),
      ...KNOWN_CAMPAIGN_SLUGS.map(slug => getCampaign(slug)),
    ]);
    if (!mountedRef.current) return;
    if (casesResult.ok) {
      setCases(casesResult.data.cases);
    } else if (casesResult.status === 401 || casesResult.status === 403) {
      setError('Please log in with a staff account to view live operations data.');
      setCases([]);
    } else if (casesResult.status === 0) {
      setError('Cannot reach the backend API — local :3002 and the online backend are both unreachable.');
      setCases([]);
    } else {
      setError(casesResult.error?.detail || 'Failed to load cases.');
      setCases([]);
    }
    setCampaigns(
      campaignResults.flatMap((r, i) =>
        r.ok
          ? [{
              slug: KNOWN_CAMPAIGN_SLUGS[i]!,
              title: r.data.campaign.title,
              code: r.data.campaign.code,
              status: 'active',
            }]
          : [],
      ),
    );
    window.setTimeout(() => {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    if (initialLoadStartedRef.current || refreshing || cases.length > 0 || campaigns.length > 0 || error) {
      return;
    }
    initialLoadStartedRef.current = true;
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [campaigns.length, cases.length, error, refresh, refreshing]);

  const openCases = cases.filter(c => !TERMINAL.includes(c.status));
  const pending = cases.filter(c => ACTIVE_CASE_STATUSES.includes(c.status));
  const incidentCount = cases.filter(c => c.incidentFlag && !TERMINAL.includes(c.status)).length;
  const resolved = cases.filter(c => c.status === 'closed').length;
  const rate = cases.length > 0 ? Math.round((resolved / cases.length) * 100) : 0;
  const recent = [...cases].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, 6);

  return (
    <div className="space-y-4 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Operations Overview</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {cases.length} cases · live from Neon
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer hover:bg-surface-secondary text-text-secondary">
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Refresh
          </button>
          <Link href="/cases"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-brand-emerald text-white text-sm font-medium hover:bg-emerald-900 btn-lift btn-press transition-colors cursor-pointer">
            <FileText className="h-4 w-4" />
            All Cases
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>
      )}

      {/* Stat cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Open Cases" value={openCases.length}
          subtitle={`${cases.length} total`} icon={FileText} />
        <StatCard label="Pending Review" value={pending.length}
          subtitle="submitted / triage / review" icon={Clock}
          trend={{ value: pending.length > 0 ? 12 : 0, direction: 'up', label: 'needs attention' }} />
        <StatCard label="Active Incidents" value={incidentCount}
          subtitle="injury / safety flags" icon={Flame} />
        <StatCard label="Resolution Rate" value={`${rate}%`}
          subtitle={`${resolved} closed`} icon={CheckCircle2}
          trend={{ value: rate > 50 ? 3 : 0, direction: 'up', label: 'of all cases' }} />
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border bg-surface-elevated overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="text-sm font-bold text-text-primary">Recall Campaigns (Neon)</h2>
            <span className="text-xs text-text-tertiary">{campaigns.length} published</span>
          </div>
          <div className="divide-y">
            {campaigns.map(c => (
              <div key={c.slug}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-secondary transition-colors group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                    <Shield className="h-4.5 w-4.5 text-emerald-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{c.title}</p>
                    <p className="text-xs text-text-tertiary font-mono mt-0.5">{c.code} · {c.slug}</p>
                  </div>
                </div>
              </div>
            ))}
            {campaigns.length === 0 && (
              <p className="text-sm text-text-tertiary text-center py-8">No published campaigns found.</p>
            )}
          </div>
        </div>

        {/* Recent submissions */}
        <div className="rounded-xl border bg-surface-elevated overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="text-sm font-bold text-text-primary">Recent Submissions</h2>
          </div>
          <div className="p-5 space-y-3">
            {recent.map(c => (
              <Link key={c.caseReference} href={`/cases/${c.caseReference}`} className="flex items-start gap-3 group cursor-pointer">
                <div className={cn('h-2 w-2 rounded-full mt-2 shrink-0',
                  ['submitted', 'triage'].includes(c.status) && 'bg-blue-500',
                  ['under_review', 'need_info'].includes(c.status) && 'bg-amber-500',
                  ['approved', 'closure_review'].includes(c.status) && 'bg-emerald-500',
                  c.status === 'closed' && 'bg-slate-400',
                  ['rejected', 'duplicate', 'withdrawn'].includes(c.status) && 'bg-red-500',
                )} />
                <div className="min-w-0">
                  <p className="text-sm text-text-primary leading-snug">
                    <span className="font-mono font-semibold group-hover:text-brand-emerald transition-colors">{c.caseReference}</span>
                    {c.incidentFlag && <span className="text-red-600 text-xs font-semibold"> · incident</span>}
                  </p>
                  <p className="text-[11px] text-text-tertiary mt-0.5 flex items-center gap-1.5">
                    {c.subtype.replace(/_/g, ' ')}
                    <span>·</span>
                    <StatusBadge variant={c.status as never} />
                  </p>
                </div>
              </Link>
            ))}
            {cases.length === 0 && !error && (
              <p className="text-sm text-text-tertiary text-center py-4">No cases yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Pending cases */}
      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-bold text-text-primary">Pending Cases</h2>
          <Link href="/queues" className="text-xs font-medium text-brand-emerald hover:underline">Open queues</Link>
        </div>
        {pending.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case #</TableHead>
                <TableHead>Subtype</TableHead>
                <TableHead>Incident</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.slice(0, 8).map(c => (
                <TableRow key={c.caseReference} className="hover:bg-surface-secondary transition-colors">
                  <TableCell className="font-mono text-sm font-semibold text-brand-emerald">
                    <Link href={`/cases/${c.caseReference}`}>{c.caseReference}</Link>
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary">{c.subtype.replace(/_/g, ' ')}</TableCell>
                  <TableCell>
                    {c.incidentFlag
                      ? <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">Incident</span>
                      : <span className="text-xs text-text-tertiary">—</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge variant={c.status as never} />
                  </TableCell>
                  <TableCell className="text-sm text-text-tertiary">
                    {new Date(c.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/cases/${c.caseReference}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-text-tertiary hover:text-brand-emerald transition-colors">
                      Review <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <CheckCircle2 className="h-8 w-8 mx-auto text-text-tertiary mb-3" />
            <p className="text-sm font-semibold text-text-primary mb-1">No Pending Cases</p>
            <p className="text-xs text-text-tertiary">All cases have been processed.</p>
          </div>
        )}
      </div>

      {/* Sign-in hint when unauthenticated */}
      {!isAuthenticated && !error && (
        <div className="rounded-xl border bg-surface-secondary/40 p-4 text-xs text-text-tertiary flex items-center gap-2">
          <Megaphone className="h-3.5 w-3.5" />
          Log in with a staff account (top right) to load live operations data from Neon.
        </div>
      )}
    </div>
  );
}
