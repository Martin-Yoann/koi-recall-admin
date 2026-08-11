'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ClipboardCheck, Search, X } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { mockClaims } from '@/data/mock-claims';
import { mockCampaigns } from '@/data/mock-recalls';
import type { Claim } from '@/types';
import { CLAIM_STATUS_LABELS } from '@/lib/admin-constants';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default function ClaimsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');

  const filtered = useMemo(() => {
    let data = mockClaims;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((c) => c.claimNumber.toLowerCase().includes(q) || c.consumerName.toLowerCase().includes(q) || c.consumerEmail.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') data = data.filter((c) => c.status === statusFilter);
    if (campaignFilter !== 'all') data = data.filter((c) => c.campaignId === campaignFilter);
    return data;
  }, [search, statusFilter, campaignFilter]);

  const hasFilters = search || statusFilter !== 'all' || campaignFilter !== 'all';

  const statusOptions = [
    { label: 'All Status', value: 'all' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Under Review', value: 'under_review' },
    { label: 'Verified', value: 'verified' },
    { label: 'Remedy Issued', value: 'remedy_issued' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Rejected', value: 'rejected' },
  ];

  const campaignOptions = [
    { label: 'All Campaigns', value: 'all' },
    ...mockCampaigns.map((c) => ({ label: c.cpscNumber, value: c.id })),
  ];

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Claims</h1>
        <p className="text-sm text-text-secondary mt-0.5">{mockClaims.length} total · {filtered.length} shown</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type="text" placeholder="Search claim # or consumer..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-8 rounded-lg border bg-surface-elevated text-sm outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald transition-all"
            style={{ borderColor: 'var(--border)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <select
          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border bg-surface-elevated text-sm outline-none cursor-pointer hover:border-brand-emerald/30 transition-colors"
          style={{ borderColor: 'var(--border)' }}
        >
          {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border bg-surface-elevated text-sm outline-none cursor-pointer hover:border-brand-emerald/30 transition-colors"
          style={{ borderColor: 'var(--border)' }}
        >
          {campaignOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {hasFilters && (
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setCampaignFilter('all'); }}
            className="text-xs font-medium text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
            <X className="inline h-3.5 w-3.5 mr-1" />Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        {filtered.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim #</TableHead>
                <TableHead>Consumer</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Evidence</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((claim) => {
                const campaign = mockCampaigns.find((c) => c.id === claim.campaignId);
                return (
                  <TableRow key={claim.id} className="cursor-pointer hover:bg-surface-secondary transition-colors"
                    onClick={() => window.location.href = `/claims/${claim.claimNumber}`}>
                    <TableCell className="font-mono text-sm font-semibold text-brand-emerald">
                      {claim.claimNumber}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-text-primary">{claim.consumerName}</p>
                      <p className="text-xs text-text-tertiary">{claim.consumerEmail}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-text-secondary max-w-[220px] truncate">{campaign?.title || '—'}</p>
                    </TableCell>
                    <TableCell className="text-center"><StatusBadge variant={claim.status as any} /></TableCell>
                    <TableCell className="text-sm text-text-secondary">{claim.evidence.length} file{claim.evidence.length !== 1 ? 's' : ''}</TableCell>
                    <TableCell className="text-sm text-text-tertiary">
                      {new Date(claim.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-14">
            <ClipboardCheck className="h-8 w-8 mx-auto text-text-tertiary mb-3" />
            <p className="text-sm font-semibold text-text-primary mb-1">No claims found</p>
            <p className="text-xs text-text-tertiary">Try adjusting the filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
