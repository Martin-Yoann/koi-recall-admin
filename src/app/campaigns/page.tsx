'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Megaphone, Plus, Search, X, SlidersHorizontal } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { mockCampaigns } from '@/data/mock-recalls';
import { getAllClaims } from '@/lib/shared-claims-store';
import { RISK_LEVEL_LABELS } from '@/lib/admin-constants';
import type { Campaign } from '@/types';
import { cn } from '@/lib/utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const RISK_COLORS: Record<string, string> = {
  critical: 'bg-red-50 text-red-600 border-red-200',
  high: 'bg-orange-50 text-orange-600 border-orange-200',
  moderate: 'bg-amber-50 text-amber-600 border-amber-200',
  low: 'bg-blue-50 text-blue-600 border-blue-200',
};

export default function CampaignsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  const filtered = useMemo(() => {
    let data = mockCampaigns;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((c) => c.title.toLowerCase().includes(q) || c.cpscNumber.toLowerCase().includes(q) || c.manufacturerName.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') data = data.filter((c) => c.status === statusFilter);
    if (riskFilter !== 'all') data = data.filter((c) => c.riskLevel === riskFilter);
    return data;
  }, [search, statusFilter, riskFilter]);

  const hasFilters = search || statusFilter !== 'all' || riskFilter !== 'all';

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Campaigns</h1>
          <p className="text-sm text-text-secondary mt-0.5">{mockCampaigns.length} recall campaigns · {filtered.length} shown</p>
        </div>
        <button className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-brand-emerald text-white text-sm font-medium hover:bg-emerald-900 btn-lift btn-press transition-colors cursor-pointer">
          <Plus className="h-4 w-4" />
          Create Campaign
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-8 rounded-lg border bg-surface-elevated text-sm outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald transition-all"
            style={{ borderColor: 'var(--border)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {[
          { id: 'status', value: statusFilter, options: [{ label: 'All Status', value: 'all' }, { label: 'Active', value: 'active' }, { label: 'Closed', value: 'closed' }, { label: 'Pending', value: 'pending' }, { label: 'Expanded', value: 'expanded' }], set: setStatusFilter },
          { id: 'risk', value: riskFilter, options: [{ label: 'All Risk', value: 'all' }, { label: 'Critical', value: 'critical' }, { label: 'High', value: 'high' }, { label: 'Moderate', value: 'moderate' }, { label: 'Low', value: 'low' }], set: setRiskFilter },
        ].map((f) => (
          <select
            key={f.id}
            value={f.value}
            onChange={(e) => f.set(e.target.value)}
            className="h-9 px-3 rounded-lg border bg-surface-elevated text-sm outline-none cursor-pointer hover:border-brand-emerald/30 focus:ring-2 focus:ring-brand-emerald/20 transition-colors"
            style={{ borderColor: 'var(--border)' }}
          >
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}

        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setStatusFilter('all'); setRiskFilter('all'); }}
            className="text-xs font-medium text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="inline h-3.5 w-3.5 mr-1" />
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        {filtered.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Affected Units</TableHead>
                <TableHead>Claims</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-surface-secondary transition-colors" onClick={() => window.location.href = `/campaigns/${c.slug}`}>
                  <TableCell>
                    <div className="max-w-[260px]">
                      <p className="text-sm font-semibold text-text-primary truncate">{c.title}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">CPSC #{c.cpscNumber}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase', RISK_COLORS[c.riskLevel])}>
                      {RISK_LEVEL_LABELS[c.riskLevel]}
                    </span>
                  </TableCell>
                  <TableCell><StatusBadge variant={c.status as any} /></TableCell>
                  <TableCell className="font-mono text-sm text-text-secondary">{c.estimatedUnits.toLocaleString()}</TableCell>
                  <TableCell className="text-sm font-semibold text-text-primary">{getAllClaims().filter((cl) => cl.campaignId === c.id).length}</TableCell>
                  <TableCell className="text-sm text-text-tertiary">
                    {new Date(c.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-14">
            <Megaphone className="h-8 w-8 mx-auto text-text-tertiary mb-3" />
            <p className="text-sm font-semibold text-text-primary mb-1">No campaigns found</p>
            <p className="text-xs text-text-tertiary">Try adjusting the filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
