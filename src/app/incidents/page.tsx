import { AlertTriangle, Shield } from 'lucide-react';

export default function IncidentsPage() {
  return (
    <div className="space-y-6 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Incidents & Safety</h1>
        <p className="text-sm text-text-secondary mt-0.5">Review reported incidents and manage safety workflows</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Open Incidents', value: 0, color: 'bg-red-50 text-red-600' },
          { label: 'Injury Reports', value: 0, color: 'bg-orange-50 text-orange-600' },
          { label: 'Pending Review', value: 0, color: 'bg-amber-50 text-amber-600' },
          { label: 'Filed (CPSC)', value: 0, color: 'bg-emerald-50 text-emerald-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-surface-elevated p-4 card-lift cursor-pointer">
            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">{s.label}</p>
            <p className="text-2xl font-bold text-text-primary">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        <div className="text-center py-16">
          <AlertTriangle className="h-10 w-10 mx-auto text-text-tertiary mb-3" />
          <p className="text-sm font-semibold text-text-primary mb-1">Incident & Safety Dashboard</p>
          <p className="text-xs text-text-tertiary max-w-sm mx-auto leading-relaxed">
            Incident reporting, CPSC filing, and reportability review will be available when the backend incident service is connected.
          </p>
        </div>
      </div>
    </div>
  );
}
