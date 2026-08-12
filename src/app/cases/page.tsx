'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FolderOpen, Search, RefreshCw } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { listCases, type CaseSummary } from '@/lib/api-client';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default function CasesPage() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchCases = async () => {
    setLoading(true);
    setError(null);
    const result = await listCases({ limit: 50 });
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
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const filtered = search
    ? cases.filter((c) =>
        c.caseRef.toLowerCase().includes(search.toLowerCase()) ||
        (c.consumerNameMasked && c.consumerNameMasked.toLowerCase().includes(search.toLowerCase())),
      )
    : cases;

  return (
    <div className="space-y-6 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Cases</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {cases.length} case{cases.length !== 1 ? 's' : ''} · Manage and review recall cases
          </p>
        </div>
        <button
          onClick={fetchCases}
          disabled={loading}
          className="flex items-center gap-2 h-9 px-3 rounded-lg border text-sm text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
        >
          <RefreshCw className={loading ? 'animate-spin h-4 w-4' : 'h-4 w-4'} />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-4 border-b">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search cases by reference or consumer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border bg-surface-elevated text-sm outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald transition-all"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
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
                <TableHead>Campaign</TableHead>
                <TableHead>Consumer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.caseRef}>
                  <TableCell>
                    <Link
                      href={`/cases/${c.caseRef}`}
                      className="text-sm font-semibold font-mono text-text-primary hover:text-brand-teal transition-colors"
                    >
                      {c.caseRef}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-mono text-text-secondary">{c.campaignCode}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-secondary">{c.consumerNameMasked}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={c.status as never} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-tertiary">
                      {c.submittedAt ? new Date(c.submittedAt).toLocaleDateString('en-US') : '—'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
