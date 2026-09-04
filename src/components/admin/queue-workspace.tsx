'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Input, Pagination, Skeleton, Empty } from 'antd';
import { SearchOutlined, ReloadOutlined, ArrowRightOutlined } from '@ant-design/icons';

import { StatusBadge } from '@/components/shared/status-badge';
import { listCases, type CaseSummary } from '@/lib/api-client';
import { useAdminAuth } from '@/lib/admin-auth';
import { usePermissions } from '@/lib/rbac';
import { formatAdminDate } from '@/lib/formatters';

const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];
const SEARCH_DEBOUNCE_MS = 400;

interface QueueWorkspaceProps {
  /** Backend queue id sent as ?queue= (single source of truth server-side). */
  queue: 'decision' | 'closure' | 'manual_review' | 'need_info' | 'standard' | 'incident';
  title: string;
  description: string;
  emptyHint: string;
}

export function QueueWorkspace({ queue, title, description, emptyHint }: QueueWorkspaceProps) {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const { can } = usePermissions();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const mountedRef = useRef(true);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const currentCursor = cursorStack.length > 0 ? cursorStack[cursorStack.length - 1] : null;

  const fetchPage = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    setError(null);
    const result = await listCases({
      queue,
      search: searchTerm.trim() || undefined,
      limit: pageSize,
      cursor: currentCursor ?? undefined,
    });
    if (!mountedRef.current) return;
    if (result.ok) {
      setCases(result.data.cases);
      setServerTotal(result.data.total ?? result.data.cases.length);
      setNextCursor(result.data.nextCursor ?? null);
    } else {
      setError(result.error?.detail || 'Failed to load the queue.');
    }
    setLoading(false);
  }, [currentCursor, pageSize, queue, searchTerm]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || startedRef.current) return;
    startedRef.current = true;
    const timer = window.setTimeout(() => void fetchPage(), 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, fetchPage, isAuthenticated]);

  const handlePageChange = (nextPage: number, nextPageSize: number) => {
    if (nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
      setPage(1);
      setCursorStack([]);
      return;
    }
    if (nextPage > page) {
      if (!nextCursor) return;
      setCursorStack((stack) => [...stack, nextCursor!]);
      setPage(nextPage);
    } else if (nextPage < page) {
      setCursorStack((stack) => stack.slice(0, Math.max(0, nextPage - 1)));
      setPage(nextPage);
    }
  };

  const handleSearch = (val: string) => {
    setSearchTerm(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPage(1);
      setCursorStack([]);
    }, SEARCH_DEBOUNCE_MS);
  };

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="max-w-screen-2xl mx-auto py-16 text-center">
        <p className="text-sm font-semibold text-text-primary mb-1">Sign in required</p>
        <p className="text-xs text-text-tertiary mb-4">Log in with a staff account to view this queue.</p>
        <Link href="/login"><Button type="primary">Sign In</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-500">Routing queues</p>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">{title}</h1>
          <p className="text-sm text-text-secondary mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="small"
            icon={<ReloadOutlined spin={loading} />}
            loading={loading}
            onClick={() => void fetchPage()}
            className="admin-btn !h-8"
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" aria-live="polite" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>
      )}

      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-4 border-b flex-wrap">
          <Input
            allowClear
            prefix={<SearchOutlined className="text-text-tertiary" />}
            placeholder="Search by case reference or subtype"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="max-w-sm"
          />
          <span className="ml-auto text-xs text-text-tertiary">Total: {serverTotal}</span>
        </div>

        {loading ? (
          <div className="p-6" aria-busy="true"><Skeleton active title={false} paragraph={{ rows: 6 }} /></div>
        ) : cases.length === 0 ? (
          <div className="py-14 text-center">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={searchTerm ? 'No cases match your search.' : emptyHint}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left bg-surface-secondary/40">
                    <th className="h-10 px-4 font-semibold text-text-secondary">Case #</th>
                    <th className="h-10 px-4 font-semibold text-text-secondary">Subtype</th>
                    <th className="h-10 px-4 font-semibold text-text-secondary">Incident</th>
                    <th className="h-10 px-4 font-semibold text-text-secondary">Status</th>
                    <th className="h-10 px-4 font-semibold text-text-secondary">Submitted</th>
                    {can('case.assign') && <th className="h-10 px-4 font-semibold text-text-secondary" />}
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr key={c.caseReference} className="border-b last:border-0 hover:bg-surface-secondary transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/cases/${encodeURIComponent(c.caseReference)}`} className="font-mono text-sm font-semibold text-brand-500 hover:underline">
                          {c.caseReference}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">{c.subtype.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3">
                        {c.incidentFlag ? (
                          <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">Incident</span>
                        ) : (
                          <span className="text-xs text-text-tertiary">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge variant={c.status as never} /></td>
                      <td className="px-4 py-3 text-xs text-text-tertiary">{formatAdminDate(c.submittedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/cases/${encodeURIComponent(c.caseReference)}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-text-tertiary hover:text-brand-500 transition-colors"
                        >
                          Open <ArrowRightOutlined className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end border-t px-5 py-3">
              <Pagination
                size="small"
                current={page}
                pageSize={pageSize}
                total={serverTotal}
                showSizeChanger
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                showQuickJumper={false}
                onChange={handlePageChange}
                showTotal={(total) => `Total: ${total}`}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
