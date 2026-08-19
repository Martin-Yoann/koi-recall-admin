'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { createRefundExport, listRefundExports, type RefundExportBatch } from '@/lib/api-client';

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
  const [batches, setBatches] = useState<RefundExportBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = async () => {
    setLoading(true);
    setError(null);
    const result = await listRefundExports();
    if (result.ok) {
      setBatches(result.data.batches);
    } else if (result.status === 401 || result.status === 403) {
      setError('Please log in to view refund exports.');
    } else {
      setError(result.error?.detail || 'Failed to load refund exports.');
    }
    setLoading(false);
  };

  if (!loading && batches.length === 0 && !error) {
    void fetchBatches();
  }

  const handleCreate = async () => {
    const purpose = window.prompt('Purpose for this refund export (1-500 chars):', 'Finance reconciliation');
    if (!purpose) return;

    setSubmitting(true);
    setError(null);
    const result = await createRefundExport({ purpose, includeExported: false });
    if (result.ok) {
      downloadCsv(result.data.filename ?? `refund-export-${result.data.batchId ?? 'latest'}.csv`, result.data.csv);
      await fetchBatches();
    } else {
      setError(result.error?.detail || 'Failed to create refund export.');
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
          <button onClick={fetchBatches} disabled={loading} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border text-sm text-text-secondary hover:text-text-primary cursor-pointer transition-colors">
            <RefreshCw className={loading ? 'animate-spin h-4 w-4' : 'h-4 w-4'} />
            Refresh
          </button>
          <button onClick={handleCreate} disabled={submitting} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-brand-emerald text-white text-sm font-medium hover:bg-emerald-900 btn-lift btn-press transition-colors cursor-pointer disabled:opacity-50">
            <Download className="h-4 w-4" />
            New Export
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-text-primary">Export History</h2>
          {error ? <span className="text-xs text-red-600">{error}</span> : null}
        </div>
        {batches.length > 0 ? (
          <table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="h-10 px-4 font-semibold text-text-secondary">Batch</th><th className="h-10 px-4 font-semibold text-text-secondary">Purpose</th><th className="h-10 px-4 font-semibold text-text-secondary">Rows</th><th className="h-10 px-4 font-semibold text-text-secondary">Requested By</th><th className="h-10 px-4 font-semibold text-text-secondary">SHA-256</th><th className="h-10 px-4 font-semibold text-text-secondary">Created</th></tr></thead>
            <tbody>{batches.map((batch) => (
              <tr key={batch.batchId} className="border-b hover:bg-surface-secondary transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-text-primary">{batch.batchId}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{batch.purpose}</td>
                <td className="px-4 py-3 text-sm text-text-primary">{batch.rowCount}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{batch.createdBy}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-text-tertiary">{batch.fileSha256}</td>
                <td className="px-4 py-3 text-xs text-text-tertiary">{new Date(batch.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
              </tr>
            ))}</tbody></table>
        ) : <div className="text-center py-14"><FileSpreadsheet className="h-8 w-8 mx-auto text-text-tertiary mb-3" /><p className="text-sm font-semibold text-text-primary mb-1">No exports yet</p><p className="text-xs text-text-tertiary">{loading ? 'Loading export history…' : 'Refund export batches will appear here.'}</p></div>}
      </div>
    </div>
  );
}
