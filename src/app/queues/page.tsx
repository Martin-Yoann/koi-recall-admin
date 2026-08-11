import { ListOrdered } from 'lucide-react';

export default function QueuesPage() {
  return (
    <div className="space-y-6 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Queues</h1>
        <p className="text-sm text-text-secondary mt-0.5">Triage, review, and approval work queues</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {['Triage', 'Under Review', 'Pending Approval'].map((q) => (
          <div key={q} className="rounded-xl border bg-surface-elevated p-5 card-lift cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-text-primary">{q}</span>
              <span className="text-[11px] font-semibold text-text-tertiary">0 items</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-secondary overflow-hidden">
              <div className="h-full w-0 rounded-full bg-brand-emerald" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        <div className="text-center py-16">
          <ListOrdered className="h-10 w-10 mx-auto text-text-tertiary mb-3" />
          <p className="text-sm font-semibold text-text-primary mb-1">Queue Management</p>
          <p className="text-xs text-text-tertiary max-w-sm mx-auto leading-relaxed">
            Automated queue routing and workload distribution will be available when the backend queue service is connected.
          </p>
        </div>
      </div>
    </div>
  );
}
