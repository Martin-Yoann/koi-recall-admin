import { FolderOpen, Search } from 'lucide-react';

export default function CasesPage() {
  return (
    <div className="space-y-6 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Cases</h1>
        <p className="text-sm text-text-secondary mt-0.5">Manage and review recall cases</p>
      </div>

      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-4 border-b">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input type="text" placeholder="Search cases by reference or consumer..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border bg-surface-elevated text-sm outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald transition-all"
              style={{ borderColor: 'var(--border)' }} />
          </div>
        </div>
        <div className="text-center py-16">
          <FolderOpen className="h-10 w-10 mx-auto text-text-tertiary mb-3" />
          <p className="text-sm font-semibold text-text-primary mb-1">Case Management</p>
          <p className="text-xs text-text-tertiary max-w-sm mx-auto leading-relaxed">
            Full case lifecycle management — from submission to closure — will be available when the backend case service is connected.
          </p>
        </div>
      </div>
    </div>
  );
}
