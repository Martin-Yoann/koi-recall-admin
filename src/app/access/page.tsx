'use client';

// ============================================================
// KOI Recall Admin — Access & Audit v3.0 (live Neon data)
// Staff directory (staff.read) / management (staff.manage) · GET /admin/audit-events
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { Users, Search, RefreshCw, ShieldAlert, UserPlus, KeyRound, Trash2, X, Mail, User, Lock, Check, Sparkles } from 'lucide-react';
import {
  queryAuditEvents, listStaff, createStaff, updateStaff, deleteStaff, revokeUserSessions,
  type AuditEvent, type StaffUser,
} from '@/lib/api-client';
import { useAdminAuth } from '@/lib/admin-auth';
import { PERMISSION_LABELS, ROLE_LABELS, usePermissions } from '@/lib/rbac';
import type { StaffRole } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const STAFF_ROLES: StaffRole[] = ['ADMIN', 'MANAGER'];

const ROLE_COLORS: Record<StaffRole, string> = {
  MANAGER: 'bg-blue-50 text-blue-700',
  ADMIN: 'bg-emerald-50 text-emerald-700',
};

// Backend resource types in admin_audit_events.resourceType
const FILTER_CATS = ['case', 'incident', 'reportability', 'document', 'staff', 'audit', 'export'] as const;

const DOT_COLOR: Record<string, string> = {
  case: 'bg-blue-500',
  incident: 'bg-red-500',
  reportability: 'bg-violet-500',
  document: 'bg-amber-500',
  staff: 'bg-emerald-500',
  audit: 'bg-slate-400',
  export: 'bg-cyan-500',
};

export default function AccessPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const { can } = usePermissions();
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await queryAuditEvents({ limit: 200 });
    if (result.ok) {
      setAudit(result.data.events);
    } else if (result.status === 401) {
      setError('Please sign in with a staff account to view the audit log.');
    } else if (result.status === 403) {
      setError('Your staff role does not have permission to view the audit log.');
    } else if (result.status === 0) {
      setError('Cannot reach the backend API — local :3002 and the online backend are both unreachable.');
    } else {
      setError(result.error?.detail || 'Failed to load audit log.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const timer = window.setTimeout(() => {
      void fetchAudit();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, fetchAudit, isAuthenticated]);

  const toggleFilter = (cat: string) => {
    setActiveFilters(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  let filtered = audit;
  if (activeFilters.length > 0) filtered = filtered.filter(a => activeFilters.includes(a.resourceType));
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(a =>
      a.action.toLowerCase().includes(q) ||
      (a.resourceId ?? '').toLowerCase().includes(q) ||
      a.actorRole.toLowerCase().includes(q),
    );
  }
  // Newest first
  filtered = [...filtered].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">Access & Audit</h1>
          <p className="text-sm text-text-secondary mt-0.5">Staff roles · access control · live audit trail from Neon</p>
        </div>
        <button
          onClick={fetchAudit}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer hover:bg-surface-secondary text-text-secondary"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Role matrix */}
      <div className="grid md:grid-cols-2 gap-4">
        {STAFF_ROLES.map(role => (
          <div key={role} className="rounded-xl border bg-surface-elevated p-4 card-lift">
            <div className="flex items-center gap-2 mb-3">
              <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', ROLE_COLORS[role])}>{ROLE_LABELS[role]}</span>
            </div>
            <ul className="space-y-1">
              {(Object.entries(PERMISSION_LABELS) as Array<[string, string]>)
                .filter(([permission]) => can === null || role === 'ADMIN' || ROLE_HAS(role, permission))
                .map(([permission, label]) => (
                  <li key={permission} className="text-[11px] text-text-secondary flex items-start gap-1.5">
                    <span className="text-emerald-600 mt-0.5">✓</span>{label}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Staff directory is visible to both roles; account mutations are ADMIN-only. */}
      {can('staff.read') && <StaffManagement canManage={can('staff.manage')} />}

      {/* Audit */}
      <div className="rounded-xl border bg-surface-elevated overflow-hidden">
        <div className="px-5 py-4 border-b space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-text-primary">Audit Log</h2>
            <span className="text-xs text-text-tertiary">{filtered.length} of {audit.length} events</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {FILTER_CATS.map(cat => (
              <button
                key={cat}
                onClick={() => toggleFilter(cat)}
                className={cn(
                  'text-[10px] font-bold uppercase px-2 py-1 rounded-full border cursor-pointer transition-colors',
                  activeFilters.includes(cat)
                    ? 'bg-brand-emerald text-white border-brand-emerald'
                    : 'bg-surface-secondary text-text-tertiary border-border hover:border-brand-emerald/30',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search action, resource id, or role..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg border bg-surface-elevated text-xs outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
        </div>

        {error ? (
          <div className="py-10 text-center">
            <ShieldAlert className="h-8 w-8 mx-auto text-text-tertiary mb-2" />
            <p className="text-sm text-text-tertiary">{error}</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {filtered.map(a => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                <div className={cn('h-2 w-2 rounded-full mt-2 shrink-0', DOT_COLOR[a.resourceType] ?? 'bg-slate-400')} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary font-mono">{a.action}</p>
                  <p className="text-[11px] text-text-tertiary mt-0.5 flex items-center gap-1 flex-wrap">
                    <Users className="h-3 w-3" />{a.actorRole}
                    <span>·</span>
                    {new Date(a.occurredAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    <span>·</span>
                    <span className={cn('font-semibold', a.outcome === 'success' ? 'text-emerald-600' : 'text-red-600')}>{a.outcome}</span>
                    {a.resourceId && <><span>·</span><span className="font-mono">{a.resourceId}</span></>}
                  </p>
                  {a.reasonCode && <p className="text-xs text-text-tertiary mt-1 italic">{a.reasonCode}</p>}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary shrink-0">{a.resourceType}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-tertiary text-center py-10">
            {loading ? 'Loading…' : 'No matching audit events.'}
          </p>
        )}
      </div>

      {!authLoading && !isAuthenticated && !error && (
        <div className="rounded-xl border bg-surface-secondary/40 p-4 text-xs text-text-tertiary flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5" />
          Log in with a staff account (top right) to load the live audit trail.
        </div>
      )}
    </div>
  );
}

/** Role → permission lookup mirrored from src/lib/rbac.ts (display only). */
function ROLE_HAS(role: StaffRole, permission: string): boolean {
  const matrix: Record<StaffRole, string[]> = {
    MANAGER: Object.keys(PERMISSION_LABELS).filter(permission => permission !== 'staff.manage'),
    ADMIN: Object.keys(PERMISSION_LABELS),
  };
  return matrix[role].includes(permission);
}

// ── Staff directory (staff.read); mutations are ADMIN-only via staff.manage ──

function StaffManagement({ canManage }: { canManage: boolean }) {
  const { user } = useAdminAuth();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ email: '', displayName: '', password: '', role: 'MANAGER' as StaffRole });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const removeStaff = async (target: StaffUser) => {
    if (target.id === user?.staffUserId) return;
    if (!window.confirm(`Delete ${target.displayName}'s account? This cannot be undone.`)) return;
    setError(null);
    const result = await deleteStaff(target.id);
    if (!result.ok) setError(result.error?.detail || 'Failed to delete the staff user.');
    else await fetchStaff();
  };

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listStaff();
    if (result.ok) {
      setStaff(result.data);
    } else {
      setError(result.error?.detail || 'Failed to load staff.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchStaff();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchStaff]);

  const submitCreate = async () => {
    if (!form.email.trim() || !form.displayName.trim() || form.password.length < 12) {
      setFormError('Email, display name, and a password of at least 12 characters are required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const result = await createStaff({
      email: form.email.trim(),
      displayName: form.displayName.trim(),
      password: form.password,
      role: form.role,
    });
    if (result.ok) {
      setCreateOpen(false);
      setForm({ email: '', displayName: '', password: '', role: 'MANAGER' });
      await fetchStaff();
    } else {
      setFormError(result.error?.detail || 'Failed to create the staff user.');
    }
    setSubmitting(false);
  };

  const changeRole = async (target: StaffUser, role: string) => {
    setError(null);
    const result = await updateStaff(target.id, { role });
    if (!result.ok) setError(result.error?.detail || 'Failed to change the role.');
    else await fetchStaff();
  };

  const toggleStatus = async (target: StaffUser) => {
    setError(null);
    const nextStatus = target.status === 'active' ? 'disabled' : 'active';
    const result = await updateStaff(target.id, { status: nextStatus });
    if (!result.ok) setError(result.error?.detail || 'Failed to update the status.');
    else await fetchStaff();
  };

  const forceSignOut = async (target: StaffUser) => {
    setError(null);
    const result = await revokeUserSessions(target.id);
    if (!result.ok) setError(result.error?.detail || 'Failed to revoke sessions.');
  };

  return (
    <div className="rounded-xl border bg-surface-elevated overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-text-primary">Staff Management</h2>
          <p className="text-xs text-text-tertiary mt-0.5">{staff.length} staff users</p>
        </div>
        {canManage && (
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-brand-emerald text-white text-xs font-semibold cursor-pointer hover:bg-emerald-800"
        >
          <UserPlus className="h-3.5 w-3.5" />New staff user
        </button>
        )}
      </div>

      {error && <div className="px-5 py-2 text-xs text-red-600 border-b">{error}</div>}

      {loading ? (
        <div className="text-center py-10 text-sm text-text-tertiary">Loading staff…</div>
      ) : staff.length === 0 ? (
        <p className="text-sm text-text-tertiary text-center py-10">No staff users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-text-secondary">
                <th className="h-10 px-4 font-semibold">Name</th>
                <th className="h-10 px-4 font-semibold">Email</th>
                <th className="h-10 px-4 font-semibold">Role</th>
                <th className="h-10 px-4 font-semibold">Status</th>
                <th className="h-10 px-4 font-semibold">Last login</th>
                {canManage && <th className="h-10 px-4 font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-surface-secondary/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{s.displayName}{s.id === user?.staffUserId && <span className="text-[10px] text-text-tertiary ml-1.5">(you)</span>}</td>
                  <td className="px-4 py-3 text-xs text-text-secondary">{s.email}</td>
                  <td className="px-4 py-3">
                    {canManage ? (
                    <select
                      value={s.role}
                      onChange={e => changeRole(s, e.target.value)}
                      className={cn('h-8 rounded-lg border px-2 text-xs outline-none cursor-pointer', ROLE_COLORS[s.role as StaffRole] ?? 'bg-slate-100 text-slate-700')}
                      style={{ borderColor: 'var(--border)' }}
                    >
                      {STAFF_ROLES.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                    </select>
                    ) : (
                      <span className={cn('text-xs font-semibold px-2 py-1 rounded-md', ROLE_COLORS[s.role as StaffRole] ?? 'bg-slate-100 text-slate-700')}>{ROLE_LABELS[s.role as StaffRole] ?? s.role}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', s.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-tertiary">
                    {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </td>
                  {canManage && <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleStatus(s)}
                        disabled={s.id === user?.staffUserId}
                        title={s.id === user?.staffUserId ? 'You cannot disable your own account' : undefined}
                        className="rounded-md border px-2 py-1 text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {s.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => forceSignOut(s)}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-secondary"
                        title="Revoke all sessions for this user"
                      >
                        <KeyRound className="h-3 w-3" />Sign out
                      </button>
                      <button
                        onClick={() => removeStaff(s)}
                        disabled={s.id === user?.staffUserId}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 cursor-pointer hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        title={s.id === user?.staffUserId ? 'You cannot delete your own account' : 'Delete this staff account'}
                      >
                        <Trash2 className="h-3 w-3" />Delete
                      </button>
                    </div>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage && createOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="create-staff-title">
          <div className="w-full max-w-lg rounded-2xl shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto" style={{ scrollbarGutter: 'stable', background: '#FFFFFF' }}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-strawberry/10">
                  <UserPlus className="h-5 w-5 text-strawberry" />
                </div>
                <div>
                  <h2 id="create-staff-title" className="text-base font-bold text-text-primary">New staff user</h2>
                  <p className="text-xs text-text-tertiary mt-0.5">Invite a teammate to the KOI recall back-office</p>
                </div>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-secondary cursor-pointer transition-colors" aria-label="Close dialog">
                <X className="h-4 w-4 text-text-tertiary" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" placeholder="name@company.com" className="h-10 w-full rounded-lg border bg-surface-secondary pl-9 pr-3 text-sm outline-none transition-all focus:border-strawberry focus:ring-2 focus:ring-strawberry/15" style={{ borderColor: 'var(--border)' }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Display name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                  <input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder="Jane Doe" className="h-10 w-full rounded-lg border bg-surface-secondary pl-9 pr-3 text-sm outline-none transition-all focus:border-strawberry focus:ring-2 focus:ring-strawberry/15" style={{ borderColor: 'var(--border)' }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                  <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} type="password" placeholder="At least 12 characters" className="h-10 w-full rounded-lg border bg-surface-secondary pl-9 pr-3 text-sm outline-none transition-all focus:border-strawberry focus:ring-2 focus:ring-strawberry/15" style={{ borderColor: 'var(--border)' }} />
                </div>
              </div>

              {/* Role — segmented select */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {STAFF_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setForm({ ...form, role })}
                      className={cn(
                        'flex flex-col items-start text-left rounded-lg border p-3 transition-all cursor-pointer',
                        form.role === role ? 'border-strawberry bg-strawberry/5 ring-1 ring-strawberry' : 'border-border hover:border-strawberry/40 hover:bg-surface-secondary',
                      )}
                    >
                      <span className="flex items-center gap-2 w-full">
                        <span className="text-sm font-semibold text-text-primary">{ROLE_LABELS[role]}</span>
                        {form.role === role && <Check className="ml-auto h-4 w-4 text-strawberry" />}
                      </span>
                      <span className="text-[11px] text-text-tertiary mt-0.5">
                        {role === 'ADMIN' ? 'Full access incl. staff, audit & settings' : 'Business operations & cases only'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin scope note */}
              <div className="flex items-start gap-2.5 rounded-lg bg-sky/5 border border-sky/20 p-3">
                <Sparkles className="h-4 w-4 text-sky shrink-0 mt-0.5" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  <span className="font-semibold text-text-primary">ADMIN</span> also manages staff accounts and the audit log;
                  <span className="font-semibold text-text-primary"> MANAGER</span> handles cases, incidents and exports.
                </p>
              </div>

              {formError && (
                <div className="p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">{formError}</div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg border px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-secondary cursor-pointer transition-colors">Cancel</button>
              <button type="button" onClick={submitCreate} disabled={submitting} className="inline-flex items-center gap-1.5 rounded-lg bg-strawberry px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <UserPlus className="h-4 w-4" />{submitting ? 'Creating…' : 'Create user'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
