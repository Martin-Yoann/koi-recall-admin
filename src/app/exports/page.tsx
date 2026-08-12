'use client';

import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { seedOperations, getAllJobs, type JobRecord } from '@/lib/operations-repository';
import { cn } from '@/lib/utils';

export default function ExportsPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);

  useEffect(() => { seedOperations(); setJobs(getAllJobs()); }, []);

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between"><div><h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Exports & Jobs</h1><p className="text-sm text-text-secondary mt-0.5">{jobs.length} job{jobs.length !== 1 ? 's' : ''} · {jobs.filter(j => j.status === 'partial_failure' || j.status === 'failed').length} with failures</p></div>
        <button className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-brand-emerald text-white text-sm font-medium hover:bg-emerald-900 btn-lift btn-press transition-colors cursor-pointer"><Download className="h-4 w-4" />New Export</button>
      </div>

      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        <div className="px-5 py-4 border-b"><h2 className="text-sm font-bold text-text-primary">Job History</h2></div>
        {jobs.length > 0 ? (
          <table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="h-10 px-4 font-semibold text-text-secondary">Job</th><th className="h-10 px-4 font-semibold text-text-secondary">Progress</th><th className="h-10 px-4 font-semibold text-text-secondary">Failed</th><th className="h-10 px-4 font-semibold text-text-secondary">Retries</th><th className="h-10 px-4 font-semibold text-text-secondary">Status</th><th className="h-10 px-4 font-semibold text-text-secondary">Created</th></tr></thead>
            <tbody>{jobs.map(j => (
              <tr key={j.id} className="border-b hover:bg-surface-secondary transition-colors">
                <td className="px-4 py-3"><p className="text-sm font-semibold text-text-primary">{j.type}</p></td>
                <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-24 h-1.5 rounded-full bg-surface-secondary overflow-hidden"><div className={cn('h-full rounded-full', j.status === 'completed' ? 'bg-emerald-500' : j.status === 'partial_failure' ? 'bg-amber-500' : j.status === 'failed' ? 'bg-red-500' : 'bg-blue-500')} style={{ width: `${Math.round((j.recordsProcessed / j.recordsTotal) * 100)}%` }} /></div><span className="text-xs text-text-tertiary">{j.recordsProcessed}/{j.recordsTotal}</span></div></td>
                <td className="px-4 py-3">{j.recordsFailed > 0 ? <span className="text-xs font-semibold text-red-600">{j.recordsFailed} rows · <button className="text-red-600 hover:underline cursor-pointer text-xs" onClick={() => alert('Download failed rows — demo: 26 rows would download as CSV')}>Download</button></span> : <span className="text-xs text-text-tertiary">0</span>}</td>
                <td className="px-4 py-3"><span className="text-xs text-text-secondary">{j.retryCount}</span></td>
                <td className="px-4 py-3"><span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', j.status === 'completed' && 'bg-emerald-50 text-emerald-700', j.status === 'partial_failure' && 'bg-amber-50 text-amber-700', j.status === 'failed' && 'bg-red-50 text-red-700', j.status === 'running' && 'bg-blue-50 text-blue-700', j.status === 'pending' && 'bg-surface-secondary text-text-tertiary')}>{j.status === 'partial_failure' ? 'PARTIAL' : j.status.toUpperCase()}</span></td>
                <td className="px-4 py-3 text-xs text-text-tertiary">{new Date(j.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
              </tr>
            ))}</tbody></table>
        ) : <div className="text-center py-14"><FileSpreadsheet className="h-8 w-8 mx-auto text-text-tertiary mb-3" /><p className="text-sm font-semibold text-text-primary mb-1">No jobs yet</p><p className="text-xs text-text-tertiary">Exports and batch jobs will appear here.</p></div>}
      </div>
    </div>
  );
}
