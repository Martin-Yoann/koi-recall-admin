'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle, Clock, CheckCircle2, FileText, ArrowRight, Shield,
  Megaphone, Users, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { StatCard } from '@/components/admin/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { mockCampaigns } from '@/data/mock-recalls';
import { RISK_LEVEL_LABELS } from '@/lib/admin-constants';
import { cn } from '@/lib/utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  getAllClaims, getSharedStats, updateClaimStatus, seedIfEmpty,
  type SharedClaim, type ClaimStatus,
} from '@/lib/shared-claims-store';

const RISK_COLORS: Record<string, string> = {
  critical: 'bg-red-50 text-red-600',
  high: 'bg-orange-50 text-orange-600',
  moderate: 'bg-amber-50 text-amber-600',
  low: 'bg-blue-50 text-blue-600',
};

const NEXT_STATUS: Record<string, ClaimStatus[]> = {
  submitted: ['under_review'],
  under_review: ['verified', 'rejected'],
  verified: ['remedy_issued'],
  remedy_issued: ['resolved'],
  resolved: [],
  rejected: [],
};

export default function DashboardPage() {
  const [claims, setClaims] = useState<SharedClaim[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0, rejected: 0, rate: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const refresh = () => {
    setRefreshing(true);
    seedIfEmpty(mockCampaigns.map(c => ({ id: c.id, title: c.title, slug: c.slug })));
    setClaims(getAllClaims());
    setStats(getSharedStats());
    setTimeout(() => setRefreshing(false), 300);
  };

  useEffect(() => { refresh(); }, []);

  const handleAdvance = (claimNumber: string, next: ClaimStatus) => {
    updateClaimStatus(claimNumber, next);
    refresh();
  };

  const pending = claims.filter(c => c.status === 'submitted' || c.status === 'under_review').slice(0, 8);

  return (
    <div className="space-y-4 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Operations Overview</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {claims.length} claims across {mockCampaigns.length} campaign
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer hover:bg-surface-secondary text-text-secondary">
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Refresh
          </button>
          <Link href="/campaigns"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-brand-emerald text-white text-sm font-medium hover:bg-emerald-900 btn-lift btn-press transition-colors cursor-pointer">
            <Megaphone className="h-4 w-4" />
            Campaigns
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Active Campaigns" value={mockCampaigns.filter(c => c.status === 'active').length}
          subtitle="Accepting claims" icon={AlertTriangle} trend={{ value: 0, direction: 'neutral', label: 'vs last month' }} />
        <StatCard label="Pending Claims" value={stats.pending}
          subtitle={`${claims.filter(c => c.status === 'submitted').length} new`} icon={Clock}
          trend={{ value: stats.pending > 0 ? 12 : 0, direction: 'up', label: 'vs last month' }} />
        <StatCard label="Total Processed" value={stats.total}
          subtitle="All-time" icon={FileText} />
        <StatCard label="Resolution Rate" value={`${stats.rate}%`}
          subtitle={`${stats.resolved} resolved`} icon={CheckCircle2}
          trend={{ value: stats.rate > 50 ? 3 : 0, direction: 'up', label: 'vs last month' }} />
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border bg-surface-elevated overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="text-sm font-bold text-text-primary">Active Campaigns</h2>
            <Link href="/campaigns" className="text-xs font-medium text-brand-emerald hover:underline">View all</Link>
          </div>
          <div className="divide-y">
            {mockCampaigns.map(c => (
              <Link key={c.id} href={`/campaigns/${c.slug}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-secondary transition-colors group cursor-pointer">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    c.riskLevel === 'critical' && 'bg-red-50', c.riskLevel === 'high' && 'bg-orange-50',
                    c.riskLevel === 'moderate' && 'bg-amber-50', c.riskLevel === 'low' && 'bg-blue-50')}>
                    <Shield className={cn('h-4.5 w-4.5',
                      c.riskLevel === 'critical' && 'text-red-600', c.riskLevel === 'high' && 'text-orange-600',
                      c.riskLevel === 'moderate' && 'text-amber-600', c.riskLevel === 'low' && 'text-blue-600')} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate group-hover:text-brand-emerald transition-colors">{c.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge variant={c.status as any} />
                      <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded', RISK_COLORS[c.riskLevel])}>
                        {RISK_LEVEL_LABELS[c.riskLevel]}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-xs text-text-tertiary">Claims</p>
                  <p className="text-sm font-bold text-text-primary">{claims.filter(cl => cl.campaignId === c.id).length}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent submissions */}
        <div className="rounded-xl border bg-surface-elevated overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="text-sm font-bold text-text-primary">Recent Submissions</h2>
          </div>
          <div className="p-5 space-y-3">
            {claims.slice(-5).reverse().map(c => (
              <div key={c.id} className="flex items-start gap-3">
                <div className={cn('h-2 w-2 rounded-full mt-2 shrink-0',
                  c.status === 'submitted' && 'bg-blue-500',
                  c.status === 'under_review' && 'bg-amber-500',
                  c.status === 'verified' && 'bg-emerald-500',
                  c.status === 'remedy_issued' && 'bg-emerald-600',
                  c.status === 'resolved' && 'bg-slate-400',
                  c.status === 'rejected' && 'bg-red-500',
                )} />
                <div className="min-w-0">
                  <p className="text-sm text-text-primary leading-snug">
                    <span className="font-mono font-semibold">{c.claimNumber}</span> — {c.consumerName}
                  </p>
                  <p className="text-[11px] text-text-tertiary mt-0.5 flex items-center gap-1">
                    <Users className="h-3 w-3" />{c.productName}
                    <span>·</span>
                    <StatusBadge variant={c.status as any} />
                  </p>
                </div>
              </div>
            ))}
            {claims.length === 0 && (
              <p className="text-sm text-text-tertiary text-center py-4">No claims yet. Claims submitted from the web app will appear here.</p>
            )}
          </div>
        </div>
      </div>

      {/* Pending claims with actions */}
      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-bold text-text-primary">Pending Claims</h2>
          <Link href="/claims" className="text-xs font-medium text-brand-emerald hover:underline">View all</Link>
        </div>
        {pending.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim #</TableHead>
                <TableHead>Consumer</TableHead>
                <TableHead>Product / Lot</TableHead>
                <TableHead>Remedy</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map(claim => (
                <TableRow key={claim.id} className="hover:bg-surface-secondary transition-colors">
                  <TableCell className="font-mono text-sm font-semibold text-brand-emerald">
                    {claim.claimNumber}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium text-text-primary">{claim.consumerName}</p>
                    <p className="text-xs text-text-tertiary">{claim.consumerEmail}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-text-secondary truncate max-w-[180px]">{claim.productName}</p>
                    {claim.lotCode && (
                      <code className="text-xs font-mono text-text-tertiary">{claim.lotCode} / {claim.dateCode}</code>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary">{claim.remedyTitle}</TableCell>
                  <TableCell className="text-center">
                    <StatusBadge variant={claim.status as any} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {(NEXT_STATUS[claim.status] || []).map(next => (
                        <button key={next} onClick={() => handleAdvance(claim.claimNumber, next)}
                          className={cn(
                            'text-[10px] font-semibold px-2 py-1 rounded-md cursor-pointer transition-colors',
                            next === 'rejected'
                              ? 'text-red-600 hover:bg-red-50 border border-red-200'
                              : 'text-white hover:opacity-90',
                          )}
                          style={next !== 'rejected' ? { background: '#003527' } : undefined}
                        >
                          {next === 'under_review' ? 'Start Review' :
                           next === 'verified' ? 'Verify' :
                           next === 'remedy_issued' ? 'Issue Remedy' :
                           next === 'resolved' ? 'Resolve' :
                           next === 'rejected' ? 'Reject' : next}
                        </button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <CheckCircle2 className="h-8 w-8 mx-auto text-text-tertiary mb-3" />
            <p className="text-sm font-semibold text-text-primary mb-1">No Pending Claims</p>
            <p className="text-xs text-text-tertiary">All claims have been processed. New claims from the web app will appear here automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
}
