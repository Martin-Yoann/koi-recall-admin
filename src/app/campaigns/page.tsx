'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Select, Skeleton } from 'antd';
import Link from 'next/link';
import { Megaphone, Search, X, RefreshCw, Shield } from 'lucide-react';
import { listCampaigns, type AdminCampaignSummary } from '@/lib/api-client';
import { useAdminAuth } from '@/lib/admin-auth';
import { formatAdminDate } from '@/lib/formatters';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'active', 'paused', 'closed'] as const;

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-amber-50 text-amber-700',
  scheduled: 'bg-blue-50 text-blue-700',
  draft: 'bg-slate-50 text-slate-600',
  closed: 'bg-slate-100 text-slate-500',
};

export default function CampaignsPage() {
  const { isAuthenticated, isLoading: authLoading, openLogin } = useAdminAuth();
  const [campaigns, setCampaigns] = useState<AdminCampaignSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listCampaigns();
    if (result.ok) {
      setCampaigns(result.data.campaigns);
    } else if (result.status === 401) {
      setError('Please sign in with a staff account to view campaigns.');
    } else if (result.status === 403) {
      setError('Your staff role does not have permission to view campaigns.');
    } else {
      setError(result.error?.detail || 'Failed to load campaigns.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const timer = window.setTimeout(() => {
      void fetchCampaigns();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, fetchCampaigns, isAuthenticated]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (q && !c.title?.toLowerCase().includes(q) && !c.code.toLowerCase().includes(q) && !c.slug.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [campaigns, search, statusFilter]);

  const hasFilters = search || statusFilter !== 'all';
  const totalCases = campaigns.reduce((sum, c) => sum + c.caseCount, 0);

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Campaigns</h1>
          <p className="text-sm text-text-secondary mt-0.5">{campaigns.length} recall campaigns · {totalCases} cases total</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
            Read-only until the next recall
          </span>
          <Button
            icon={<RefreshCw className="h-4 w-4" />}
            loading={loading}
            onClick={fetchCampaigns}
            className="admin-btn"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Input
            id="campaign-search"
            name="campaignSearch"
            allowClear
            prefix={<Search className="h-4 w-4 text-text-tertiary" />}
            placeholder="Search by title, code, or slug…"
            value={search}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select
          id="campaign-status-filter"
          value={statusFilter}
          onChange={(val) => setStatusFilter(val)}
          aria-label="Filter campaigns by status"
          className="min-w-40"
          options={[
            { value: 'all', label: 'All Status' },
            ...CAMPAIGN_STATUSES.map(status => ({ value: status, label: status })),
          ]}
        />

        {hasFilters && (
          <Button
            type="text"
            size="small"
            icon={<X className="h-3.5 w-3.5" />}
            onClick={() => { setSearch(''); setStatusFilter('all'); }}
            className="text-text-tertiary hover:text-text-primary"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        {!isAuthenticated && !authLoading ? (
          <div className="text-center py-14">
            <Shield className="h-8 w-8 mx-auto text-text-tertiary mb-3" />
            <p className="text-sm font-semibold text-text-primary mb-1">Sign in required</p>
            <p className="text-xs text-text-tertiary mb-4">Sign in to view recall campaigns.</p>
            <Button type="primary" onClick={openLogin}>Sign In</Button>
          </div>
        ) : loading ? (
          <div className="p-6" aria-busy="true"><Skeleton active title={false} paragraph={{ rows: 6 }} /></div>
        ) : error ? (
          <div className="text-center py-14">
            <Megaphone className="h-8 w-8 mx-auto text-text-tertiary mb-3" />
            <p className="text-sm font-semibold text-text-primary mb-1">Could not load campaigns</p>
            <p className="text-xs text-text-tertiary max-w-sm mx-auto leading-relaxed">{error}</p>
          </div>
        ) : filtered.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Campaign</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col">Cases</TableHead>
                <TableHead scope="col">Launch</TableHead>
                <TableHead scope="col">Closes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="hover:bg-surface-secondary transition-colors">
                  <TableCell>
                    <div className="max-w-[320px]">
                      <Link href={`/campaigns/${encodeURIComponent(c.slug)}`} className="text-sm font-semibold text-text-primary truncate hover:text-brand-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/30 rounded-sm">
                        {c.title || c.slug}
                      </Link>
                      <p className="text-xs text-text-tertiary mt-0.5 font-mono">{c.code}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status] ?? 'bg-slate-50 text-slate-600'}`}>
                      {c.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-semibold text-text-primary">{c.caseCount}</TableCell>
                  <TableCell className="text-sm text-text-tertiary">
                    {formatAdminDate(c.launchAt)}
                  </TableCell>
                  <TableCell className="text-sm text-text-tertiary">
                    {formatAdminDate(c.closeAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-14">
            <Megaphone className="h-8 w-8 mx-auto text-text-tertiary mb-3" />
            <p className="text-sm font-semibold text-text-primary mb-1">No campaigns found</p>
            <p className="text-xs text-text-tertiary">{hasFilters ? 'Try adjusting the filters.' : 'No recall campaigns exist yet.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
