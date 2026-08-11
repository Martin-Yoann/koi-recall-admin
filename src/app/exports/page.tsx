import { Download, FileSpreadsheet } from 'lucide-react';

export default function ExportsPage() {
  return (
    <div className="space-y-6 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Exports & Jobs</h1>
        <p className="text-sm text-text-secondary mt-0.5">Data exports, batch jobs, and report generation</p>
      </div>

      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-bold text-text-primary">Recent Jobs</h2>
          <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-brand-emerald text-white text-xs font-medium hover:bg-emerald-900 btn-lift btn-press transition-colors cursor-pointer">
            <Download className="h-3.5 w-3.5" />
            New Export
          </button>
        </div>
        <div className="text-center py-16">
          <FileSpreadsheet className="h-10 w-10 mx-auto text-text-tertiary mb-3" />
          <p className="text-sm font-semibold text-text-primary mb-1">Exports & Batch Jobs</p>
          <p className="text-xs text-text-tertiary max-w-sm mx-auto leading-relaxed">
            Scheduled exports, data extracts, and batch processing will be available when the backend outbox and job services are connected.
          </p>
        </div>
      </div>
    </div>
  );
}
