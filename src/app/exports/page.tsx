'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Input, Modal, Skeleton } from 'antd';
import { Download, FileSpreadsheet, RefreshCw, Shield } from 'lucide-react';
import { createRefundExport, listRefundExports, type RefundExportBatch } from '@/lib/api-client';
import { useAdminAuth } from '@/lib/admin-auth';
import { usePermissions } from '@/lib/rbac';
import { useToast } from '@/components/ui/toast';
import { formatAdminDate } from '@/lib/formatters';

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ExportsPage() {
  const { isAuthenticated, isLoading: authLoading, openLogin } = useAdminAuth();
  const { can } = usePermissions();
  const toast = useToast();
  const [batches, setBatches] = useState<RefundExportBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [purpose, setPurpose] = useState('Finance reconciliation');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listRefundExports();
    if (result.ok) {
      setBatches(result.data.batches);
    } else if (result.status === 401) {
      setError('Please sign in with a staff account to view refund exports.');
    } else if (result.status === 403) {
      setError('Your staff role does not have permission to view refund exports.');
    } else {
      setError(result.error?.detail || 'Failed to load refund exports.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const timer = window.setTimeout(() => {
      void fetchBatches();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, fetchBatches, isAuthenticated]);

  const handleCreate = async () => {
    const trimmedPurpose = purpose.trim();
    if (!trimmedPurpose || trimmedPurpose.length > 500) {
      setFormError('Enter a purpose between 1 and 500 characters.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    const result = await createRefundExport({ purpose: trimmedPurpose, includeExported: false });
    if (result.ok) {
      toast.success(`Refund export ready (${result.data.csv ? 'CSV downloaded' : 'empty'}).`);
      downloadCsv(result.data.filename ?? `refund-export-${result.data.batchId ?? 'latest'}.csv`, result.data.csv);
      setCreateOpen(false);
      setPurpose('Finance reconciliation');
      await fetchBatches();
    } else {
      console.error('API Error details:', result.error);
      toast.error(result.error?.detail || 'Failed to create refund export.');
      setFormError(result.error?.detail || 'Failed to create refund export.');
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Refund Exports</h1>
          <p className="text-sm text-text-secondary mt-0.5">{batches.length} batch{batches.length !== 1 ? 'es' : ''} generated</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            icon={<RefreshCw className="h-4 w-4" />}
            loading={loading}
            onClick={fetchBatches}
            className="admin-btn"
          >
            Refresh
          </Button>
          {can('case.export') && (
            <Button
              type="primary"
              icon={<Download className="h-4 w-4" />}
              onClick={() => { setError(null); setFormError(null); setCreateOpen(true); }}
              disabled={submitting}
            >
              New Export
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-text-primary">Export History</h2>
          {error ? <span role="alert" aria-live="polite" className="text-xs text-red-600">{error}</span> : null}
        </div>
        {!isAuthenticated && !authLoading ? (
          <div className="text-center py-14">
            <Shield className="h-8 w-8 mx-auto text-text-tertiary mb-3" aria-hidden="true" />
            <p className="text-sm font-semibold text-text-primary mb-1">Sign In Required</p>
            <p className="text-xs text-text-tertiary mb-4">Sign in with a staff account to view and generate refund exports.</p>
            <Button type="primary" onClick={openLogin}>Sign In</Button>
          </div>
        ) : loading ? (
          <div className="p-6" aria-busy="true"><Skeleton active title={false} paragraph={{ rows: 5 }} /></div>
        ) : error && batches.length === 0 ? (
          <div className="py-14 text-center">
            <FileSpreadsheet className="h-8 w-8 mx-auto text-text-tertiary mb-3" aria-hidden="true" />
            <p className="text-sm font-semibold text-text-primary mb-1">Could Not Load Exports</p>
            <p className="text-xs text-text-tertiary max-w-sm mx-auto">Check the API connection, then select Refresh to try again.</p>
          </div>
        ) : batches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm"><caption className="sr-only">Refund export history</caption><thead><tr className="border-b text-left"><th scope="col" className="h-10 px-4 font-semibold text-text-secondary">Batch</th><th scope="col" className="h-10 px-4 font-semibold text-text-secondary">Purpose</th><th scope="col" className="h-10 px-4 font-semibold text-text-secondary">Rows</th><th scope="col" className="h-10 px-4 font-semibold text-text-secondary">Requested By</th><th scope="col" className="h-10 px-4 font-semibold text-text-secondary">SHA-256</th><th scope="col" className="h-10 px-4 font-semibold text-text-secondary">Created</th></tr></thead>
            <tbody>{batches.map((batch) => (
              <tr key={batch.batchId} className="border-b hover:bg-surface-secondary transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-text-primary">{batch.batchId}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{batch.purpose}</td>
                <td className="px-4 py-3 text-sm text-text-primary">{batch.rowCount}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{batch.createdBy}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-text-tertiary">{batch.fileSha256}</td>
                <td className="px-4 py-3 text-xs text-text-tertiary">{formatAdminDate(batch.createdAt)}</td>
              </tr>
            ))}</tbody></table>
          </div>
        ) : <div className="text-center py-14"><FileSpreadsheet className="h-8 w-8 mx-auto text-text-tertiary mb-3" aria-hidden="true" /><p className="text-sm font-semibold text-text-primary mb-1">No Exports Yet</p><p className="text-xs text-text-tertiary">Refund export batches will appear here after the first export is generated.</p></div>}
      </div>

      <Modal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        title="New Refund Export"
        okText={submitting ? 'Generating…' : 'Generate Export'}
        cancelText="Cancel"
        confirmLoading={submitting}
        okButtonProps={{ disabled: submitting || !purpose.trim() }}
        onOk={() => void handleCreate()}
      >
        <p className="text-xs text-text-tertiary mb-3">Generate a CSV for finance reconciliation. Exported rows are excluded by default.</p>
        <Input
          id="refund-export-purpose"
          name="purpose"
          value={purpose}
          onChange={(event) => setPurpose(event.target.value)}
          maxLength={500}
          placeholder="Example: Finance reconciliation…"
          autoComplete="off"
          spellCheck={false}
          aria-describedby="refund-export-purpose-help"
        />
        <p id="refund-export-purpose-help" className="text-xs text-text-tertiary mt-1">Required · 1–500 characters</p>
        {formError && <p role="alert" aria-live="polite" className="text-xs text-red-600 mt-2">{formError}</p>}
      </Modal>
    </div>
  );
}
