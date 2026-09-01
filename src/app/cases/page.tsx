'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input, Select, Button, Table, Pagination, Skeleton, Empty, Modal, type TableColumnsType } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  UserAddOutlined,
  FolderOpenOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

import { StatusBadge } from '@/components/shared/status-badge';
import { assignCase, exportCases, listCases, type CaseSummary } from '@/lib/api-client';
import { useAdminAuth } from '@/lib/admin-auth';
import { formatAdminDate } from '@/lib/formatters';
import { usePermissions } from '@/lib/rbac';

/** The full case status set (mirrors the backend recall_case_status enum). */
const CASE_STATUSES = [
  'submitted', 'triage', 'under_review', 'need_info', 'approved',
  'closure_review', 'closed', 'rejected', 'duplicate', 'withdrawn',
] as const;

const TERMINAL = ['closed', 'rejected', 'duplicate', 'withdrawn'];

/** Page-size options offered by the pagination control. */
const PAGE_SIZE_OPTIONS = ['5', '10', '15', '20', '50', '100'];

/** How many cases to pull in one shot; client-side pages slice this set. */
const FETCH_LIMIT = 1000;

interface Stats {
  open: number;
  pendingReview: number;
  incidents: number;
  closed: number;
}

export default function CasesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const { can } = usePermissions();
  const searchParams = useSearchParams();

  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Server-side status filter
  const [status, setStatus] = useState(searchParams.get('status') || 'all');

  // Client-side filtering state (UI only)
  const [searchTerm, setSearchTerm] = useState('');
  const [queueFilter, setQueueFilter] = useState('all'); // 'all' | 'standard' | 'manual_review' | 'incident'

  // Data-table pagination (client side)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const mountedRef = useRef(true);

  // Initial `status` is read from the query param in the useState initializer, so
  // the only mount effect needed is resetting the mounted flag (StrictMode safe).
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Fetch the case list
  const fetchCases = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    setError(null);

    const result = await listCases({
      limit: FETCH_LIMIT,
      status: status !== 'all' ? status : undefined,
    });

    if (result.ok) {
      setCases(result.data.cases);
      setTotal(result.data.total || result.data.cases.length);
    } else {
      setError(result.error?.detail || 'Failed to load cases.');
    }
    setLoading(false);
  }, [status]);

  // Initial load & reload on status change
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const timer = window.setTimeout(() => {
      void fetchCases();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, fetchCases, isAuthenticated]);

  // Export CSV
  const handleExport = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  // Claim a case (confirm via the global antd modal)
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const handleClaim = useCallback((caseRef: string) => {
    if (!user?.staffUserId) return;

    Modal.confirm({
      title: 'Claim this case',
      icon: <ExclamationCircleOutlined />,
      content: (
        <span>
          You are about to claim <span className="font-mono font-semibold">{caseRef}</span>. The case
          will be assigned to you{user.name ? ` (${user.name})` : ''}.
        </span>
      ),
      okText: 'Claim to me',
      cancelText: 'Cancel',
      okButtonProps: { type: 'primary' },
      centered: true,
      onOk: async () => {
        if (!user?.staffUserId) return;
        setClaimingId(caseRef);
        setError(null);
        const result = await assignCase(caseRef, { staffUserId: user.staffUserId });
        if (result.ok) {
          await fetchCases();
        } else if (mountedRef.current) {
          setError(result.error?.detail || `Failed to claim ${caseRef}.`);
        }
        if (mountedRef.current) setClaimingId(null);
      },
    });
  }, [user, fetchCases]);

  // Is the current user the assignee of this case?
  const staffUserId = user?.staffUserId;
  const isMine = useCallback((c: CaseSummary) =>
    !!staffUserId && c.assignedToStaffUserId === staffUserId,
    [staffUserId]
  );

  // Stats (over the fetched cases)
  const stats: Stats = useMemo(() => ({
    open: cases.filter(c => !TERMINAL.includes(c.status)).length,
    pendingReview: cases.filter(c => ['submitted', 'triage', 'under_review', 'need_info'].includes(c.status)).length,
    incidents: cases.filter(c => c.incidentFlag && !TERMINAL.includes(c.status)).length,
    closed: cases.filter(c => c.status === 'closed').length,
  }), [cases]);

  // Client-side filter (search + queue; status is applied server-side)
  const filteredCases = useMemo(() => {
    let result = cases;

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(c =>
        c.caseReference.toLowerCase().includes(term) ||
        c.subtype.toLowerCase().includes(term)
      );
    }

    if (queueFilter !== 'all') {
      switch (queueFilter) {
        case 'standard':
          result = result.filter(c => c.status === 'submitted');
          break;
        case 'manual_review':
          result = result.filter(c => ['triage', 'need_info'].includes(c.status));
          break;
        case 'incident':
          result = result.filter(c => c.incidentFlag);
          break;
        default:
          break;
      }
    }

    return result;
  }, [cases, searchTerm, queueFilter]);

  // Slice the filtered set for the current page
  const paginatedCases = useMemo(
    () => filteredCases.slice((page - 1) * pageSize, page * pageSize),
    [filteredCases, page, pageSize],
  );

  const handlePageChange = (nextPage: number, nextPageSize: number) => {
    // Switching the page size returns to the first page; flipping pages keeps the page.
    if (nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
      setPage(1);
    } else {
      setPage(nextPage);
    }
  };

  const handleStatusChange = (val: string) => {
    setStatus(val);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setPage(1);
  };

  const handleQueueChange = (val: string) => {
    setQueueFilter(val);
    setPage(1);
  };

  const columns: TableColumnsType<CaseSummary> = [
    {
      title: 'Case Reference',
      dataIndex: 'caseReference',
      key: 'caseReference',
      render: (value: string) => (
        <Link
          href={`/cases/${encodeURIComponent(value)}`}
          className="text-sm font-semibold font-mono text-text-primary hover:text-brand-500 transition-colors"
        >
          {value}
        </Link>
      ),
    },
    {
      title: 'Subtype',
      dataIndex: 'subtype',
      key: 'subtype',
      render: (value: string) => <span className="text-sm text-text-secondary">{value.split('_').join(' ')}</span>,
    },
    {
      title: 'Incident',
      dataIndex: 'incidentFlag',
      key: 'incidentFlag',
      render: (flag: boolean) =>
        flag ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
            Incident
          </span>
        ) : (
          <span className="text-xs text-text-tertiary">—</span>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <StatusBadge variant={value as never} />,
    },
    {
      title: 'Submitted',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (value: string) => <span className="text-sm text-text-tertiary">{formatAdminDate(value)}</span>,
    },
    {
      title: 'Owner',
      key: 'owner',
      render: (_, c) =>
        isMine(c) ? (
          <span className="text-xs font-semibold text-brand-700">Me</span>
        ) : c.assignedToStaffUserId ? (
          <span className="text-xs text-text-tertiary">Assigned</span>
        ) : (
          <span className="text-xs text-text-tertiary">Unassigned</span>
        ),
    },
    ...(can('case.assign')
      ? [{
          title: 'Claim',
          key: 'claim',
          render: (_: unknown, c: CaseSummary) =>
            TERMINAL.includes(c.status) || isMine(c) ? (
              <span className="text-xs text-text-tertiary">—</span>
            ) : (
              <Button
                size="small"
                type="default"
                icon={<UserAddOutlined />}
                loading={claimingId === c.caseReference}
                disabled={claimingId === c.caseReference}
                onClick={() => handleClaim(c.caseReference)}
                className="border-brand-500/40 !text-brand-500 hover:!bg-brand-50 hover:!border-brand-500"
              >
                {claimingId === c.caseReference ? 'Claiming…' : 'Claim to me'}
              </Button>
            ),
        }]
      : []),
  ];

  return (
    <div className="space-y-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Cases</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {total} case{total !== 1 ? 's' : ''} · Manage and review recall cases
          </p>
        </div>
        <div className="flex items-center gap-2">
          {can('case.export') && (
            <Button
              icon={<DownloadOutlined />}
              loading={loading}
              onClick={handleExport}
              className="border text-text-secondary hover:text-text-primary"
            >
              Export CSV
            </Button>
          )}
          <Button
            icon={<ReloadOutlined spin={loading} />}
            loading={loading}
            onClick={() => void fetchCases()}
            className="border text-text-secondary hover:text-text-primary"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
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

      {/* Toolbar */}
      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-4 border-b flex-wrap">
          {/* Search */}
          <Input
            id="case-search"
            allowClear
            prefix={<SearchOutlined className="text-text-tertiary" />}
            placeholder="Search by case reference or subtype"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="flex-1 min-w-52 max-w-sm"
          />

          {/* Status Filter */}
          <Select
            value={status}
            onChange={(val) => handleStatusChange(val)}
            className="w-40"
            options={[
              { value: 'all', label: 'All statuses' },
              ...CASE_STATUSES.map(s => ({ value: s, label: s.split('_').join(' ') }))
            ]}
          />

          {/* Queue Filter */}
          <Select
            value={queueFilter}
            onChange={(val) => handleQueueChange(val)}
            className="w-40"
            options={[
              { value: 'all', label: 'All queues' },
              { value: 'standard', label: 'Standard (submitted)' },
              { value: 'manual_review', label: 'Manual review (triage · need info)' },
              { value: 'incident', label: 'Incident' },
            ]}
          />

          {/* Pagination info & controls */}
          <div className="flex items-center gap-3 ml-auto text-xs text-text-tertiary">
            <span>Total: {filteredCases.length}</span>
            <Pagination
              size="small"
              current={page}
              pageSize={pageSize}
              total={filteredCases.length}
              showSizeChanger
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              showQuickJumper
              onChange={handlePageChange}
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-6" aria-busy="true">
            <Skeleton active title={false} paragraph={{ rows: 8 }} />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <FolderOpenOutlined className="text-4xl text-text-tertiary mb-3" />
            <p className="text-sm font-semibold text-text-primary mb-1">Error</p>
            <p className="text-xs text-text-tertiary max-w-sm mx-auto leading-relaxed">{error}</p>
          </div>
        ) : (
          <Table<CaseSummary>
            rowKey="caseReference"
            columns={columns}
            dataSource={paginatedCases}
            pagination={false}
            scroll={{ x: 'max-content' }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    searchTerm || queueFilter !== 'all'
                      ? 'No cases match your current filters.'
                      : 'No recall cases have been submitted yet.'
                  }
                />
              ),
            }}
            rowClassName={() => 'table-row-hover'}
          />
        )}
      </div>
    </div>
  );
}
