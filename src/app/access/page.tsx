import { Shield, Users, FileCheck } from 'lucide-react';

export default function AccessPage() {
  return (
    <div className="space-y-6 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Access & Audit</h1>
        <p className="text-sm text-text-secondary mt-0.5">User access, permissions, and audit logs</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-surface-elevated p-5 card-lift cursor-pointer">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
              <Users className="h-4.5 w-4.5 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">Team Members</p>
              <p className="text-xs text-text-tertiary">Manage admin access</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-surface-elevated p-5 card-lift cursor-pointer">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
              <FileCheck className="h-4.5 w-4.5 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">Audit Log</p>
              <p className="text-xs text-text-tertiary">View action history</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        <div className="text-center py-16">
          <Shield className="h-10 w-10 mx-auto text-text-tertiary mb-3" />
          <p className="text-sm font-semibold text-text-primary mb-1">Access & Audit Management</p>
          <p className="text-xs text-text-tertiary max-w-sm mx-auto leading-relaxed">
            Role-based access control, team management, and full audit trail will be available when the backend auth and audit services are connected.
          </p>
        </div>
      </div>
    </div>
  );
}
