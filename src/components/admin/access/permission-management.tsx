'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Input } from 'antd';
import { ArrowLeft, CheckCircle2, LoaderCircle } from 'lucide-react';
import { saveAccessPolicy, type AccessPolicySnapshot } from '@/lib/api-client';
import { getPolicyChanges } from '@/lib/access-policy-changes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PermissionTree } from './permission-tree';
import { RoleList } from './role-list';
import { staffHasRole, useStaffDirectory } from './use-staff-directory';
import { useAccessPolicy } from '@/lib/rbac';
import { useConfirm } from '@/components/admin/confirm-dialog';
import { useNavigationGuard } from '@/components/admin/navigation-guard';
import { useToast } from '@/components/ui/toast';

interface PolicyDraft {
  base: AccessPolicySnapshot;
  value: AccessPolicySnapshot;
}

export function PermissionManagement() {
  return <RoleList />;
}

export function RoleEditor({ roleId, copyFrom }: { roleId: string; copyFrom?: string | null }) {
  const router = useRouter();
  const isNew = roleId === 'new';
  const [roleKey] = useState(() => (isNew ? `role_${crypto.randomUUID()}` : roleId));
  const { users, error: directoryError } = useStaffDirectory();
  const { policy, error, reload, adopt } = useAccessPolicy();
  const confirm = useConfirm();
  const toast = useToast();
  const { register } = useNavigationGuard();
  const [draft, setDraft] = useState<PolicyDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const current = draft?.value ?? policy;
  const template = copyFrom ? policy?.roles[copyFrom] : undefined;
  const role = useMemo(
    () =>
      current?.roles[roleKey] ??
      (isNew
        ? {
            name: template ? `${template.name.slice(0, 75)} copy` : '',
            description: template?.description ?? '',
            permissions: [...(template?.permissions ?? [])],
          }
        : null),
    [current, roleKey, isNew, template],
  );
  const assigned = users ? users.filter((user) => staffHasRole(user, roleKey)).length : null;
  const editable = policy?.isOwner ?? draft?.base.isOwner ?? false;
  const changes = draft ? getPolicyChanges(draft.base, draft.value) : [];
  const dirty = changes.length > 0;
  const stale = dirty && policy !== null && draft?.base.revision !== policy.revision;

  const reset = useCallback(() => {
    setDraft(null);
    setMessage(null);
    setFieldErrors({});
  }, []);

  useEffect(() => register({ dirty, saving, discard: reset }), [dirty, saving, register, reset]);

  const change = (update: (value: AccessPolicySnapshot) => void, fieldId?: string) => {
    if (!editable || !current || savingRef.current) return;
    const base = draft?.base ?? structuredClone(current);
    const next = structuredClone(current);
    if (!next.roles[roleKey] && isNew && role) next.roles[roleKey] = structuredClone(role);
    update(next);
    setDraft(getPolicyChanges(base, next).length ? { base, value: next } : null);
    setMessage(null);
    if (fieldId)
      setFieldErrors((previous) => {
        const nextErrors = { ...previous };
        delete nextErrors[fieldId];
        return nextErrors;
      });
  };

  const discard = async () => {
    if (!dirty || savingRef.current) return;
    if (
      !(await confirm({
        title: 'Discard unsaved changes?',
        description: `Discard ${changes.length} unsaved ${changes.length === 1 ? 'change' : 'changes'} and return to the latest saved permissions?`,
        okText: 'Discard changes',
        cancelText: 'Keep editing',
        destructive: true,
      }))
    )
      return;
    reset();
  };

  const save = useCallback(async () => {
    const source =
      draft ??
      (isNew && policy && role
        ? { base: policy, value: { ...policy, roles: { ...policy.roles, [roleKey]: role } } }
        : null);
    if (!source || (!dirty && !isNew) || !editable || stale || savingRef.current) return;
    const errors: Record<string, string> = {};
    for (const role of Object.keys(source.value.roles)) {
      if (!source.value.roles[role].name.trim()) errors[`role-name-${role}`] = 'Enter a role name.';
    }
    const editedName = source.value.roles[roleKey].name.trim().toLowerCase();
    if (editedName === 'owner') errors[`role-name-${roleKey}`] = 'Owner is reserved for the system owner.';
    if (Object.entries(source.value.roles).some(([id, entry]) => id !== roleKey && entry.name.trim().toLowerCase() === editedName)) errors[`role-name-${roleKey}`] = 'Use a unique role name.';
    for (const [key, name] of Object.entries(source.value.permissionNames)) {
      if (!name.trim()) errors[`permission-name-${key}`] = 'Enter a permission name.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setMessage('Some names are missing. Complete the highlighted fields before saving.');
      window.requestAnimationFrame(() => document.getElementById(Object.keys(errors)[0])?.focus());
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveAccessPolicy({
        roles: source.value.roles,
        permissionNames: source.value.permissionNames,
        revision: source.base.revision,
      });
      if (result.ok) {
        adopt(result.data);
        reset();
        toast.success(isNew ? 'Role created.' : 'Role saved.');
        if (isNew) router.replace(`/access/roles/${roleKey}`);
      } else {
        setMessage(
          result.status === 409
            ? 'Permissions changed in another session. Your draft is preserved. Discard it to review the latest saved version.'
            : `${result.error.detail || 'Could not save permissions.'} Your changes are preserved. Try saving again.`,
        );
        if (result.status === 409) await reload();
      }
    } catch {
      setMessage('Could not save permissions. Your changes are preserved. Try saving again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [draft, dirty, editable, stale, adopt, reset, toast, reload, isNew, router, roleKey, policy, role]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!editable || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;
      event.preventDefault();
      if (dirty && !document.querySelector('[role="dialog"][aria-modal="true"]')) void save();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editable, dirty, save]);

  if (!current)
    return (
      <div className="rounded-xl border bg-surface-elevated p-5" role="status">
        <p>{error || 'Loading permissions…'}</p>
        {error && (
          <Button className="mt-3" onClick={() => void reload()}>
            Retry
          </Button>
        )}
      </div>
    );

  if (!role || (isNew && !editable))
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Alert
          type="warning"
          title={isNew ? 'Only the Owner can create roles.' : 'This role could not be found.'}
        />
        <Link href="/access/roles" className="text-brand-500">
          Back to roles
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      {editable && (dirty || saving) && (
        <div
          role="region"
          aria-label="Unsaved permission changes"
          className="fixed inset-x-0 top-0 z-[70] border-b border-white/10 bg-[#1a1a1a] text-white shadow-lg"
        >
          <div className="mx-auto flex min-h-16 max-w-screen-2xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5" role="status" aria-live="polite">
              {saving ? (
                <LoaderCircle
                  className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold">{saving ? 'Saving changes…' : 'Unsaved changes'}</p>
                <p className="hidden text-xs text-white/60 sm:block">
                  {changes.length} {changes.length === 1 ? 'change' : 'changes'} · Save to apply permissions
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void discard()}
                className="min-h-9 rounded-lg border border-white/25 px-3 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={saving || stale}
                onClick={() => void save()}
                className="min-h-9 min-w-16 rounded-lg bg-white px-4 text-sm font-semibold text-[#1a1a1a] hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 text-xs text-text-tertiary">
        <Link
          href="/access/roles"
          aria-label="Back to roles"
          className="rounded-full border bg-surface-elevated p-2 hover:bg-surface-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Link href="/access/staff" className="hover:underline">
          Users
        </Link>
        <span>/</span>
        <Link href="/access/roles" className="hover:underline">
          Roles
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight text-text-primary">
          {isNew ? 'Add role' : role.name}
        </h1>
        {isNew && !dirty && editable && (
          <Button type="primary" disabled={!role.name.trim() || saving} onClick={() => void save()}>
            Create role
          </Button>
        )}
        {!dirty && !isNew && (
          <span className="flex items-center gap-1.5 text-xs text-text-secondary">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            All changes saved
          </span>
        )}
      </div>
      {error && <Alert type="error" showIcon title={error} />}
      {stale && (
        <Alert
          type="warning"
          showIcon
          title="A newer version is available"
          description="Your draft is preserved. Discard it before editing the latest saved version."
        />
      )}
      {message && <Alert type="error" showIcon title="Changes have not been saved" description={message} />}
      <section
        aria-label="Role details"
        className="overflow-hidden rounded-xl border bg-surface-elevated shadow-sm"
      >
        <div className="space-y-5 p-5">
          <div>
            <label
              htmlFor={`role-name-${roleKey}`}
              className="mb-2 block text-sm font-medium text-text-primary"
            >
              Name
            </label>
            <Input
              id={`role-name-${roleKey}`}
              aria-label="Role name"
              value={role.name}
              maxLength={80}
              showCount
              disabled={!editable || saving}
              status={fieldErrors[`role-name-${roleKey}`] ? 'error' : undefined}
              aria-invalid={Boolean(fieldErrors[`role-name-${roleKey}`])}
              onChange={(event) =>
                change((value) => {
                  value.roles[roleKey].name = event.target.value;
                }, `role-name-${roleKey}`)
              }
              placeholder="For example, Customer support"
            />
            {fieldErrors[`role-name-${roleKey}`] && (
              <p className="mt-2 text-xs text-red-600">{fieldErrors[`role-name-${roleKey}`]}</p>
            )}
          </div>
          <div>
            <label
              htmlFor={`role-description-${roleKey}`}
              className="mb-2 block text-sm font-medium text-text-primary"
            >
              Description
            </label>
            <Input.TextArea
              id={`role-description-${roleKey}`}
              aria-label="Role description"
              value={role.description ?? ''}
              maxLength={255}
              showCount
              autoSize={{ minRows: 2, maxRows: 4 }}
              disabled={!editable || saving}
              onChange={(event) =>
                change((value) => {
                  value.roles[roleKey].description = event.target.value;
                })
              }
              placeholder="Describe what people with this role are responsible for."
            />
          </div>
        </div>
        <div className="border-t bg-surface-secondary px-5 py-3 text-xs leading-relaxed text-text-secondary">
          {isNew ? (
            'After saving, assign this role to users from User Management.'
          ) : (
            <>
              {assigned !== null
                ? `${assigned} ${assigned === 1 ? 'user has' : 'users have'} this role.`
                : directoryError
                  ? 'Assigned users are temporarily unavailable.'
                  : 'Loading assigned users…'}{' '}
              Changes to this role affect every assigned user.{' '}
              {users && (
                <Link
                  href={`/access/staff?role=${encodeURIComponent(roleKey)}`}
                  className="ml-1 font-medium text-brand-500 underline underline-offset-2"
                >
                  View users
                </Link>
              )}
            </>
          )}
        </div>
      </section>
      {dirty && (
        <details className="rounded-xl border bg-surface-elevated px-4 py-3 text-sm text-text-secondary">
          <summary className="cursor-pointer">
            Review {changes.length} unsaved {changes.length === 1 ? 'change' : 'changes'}
          </summary>
          <ul className="mt-3 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-xs">
            {changes.map((entry) => (
              <li key={entry.id}>{entry.description}</li>
            ))}
          </ul>
        </details>
      )}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Permissions</h2>
          <span className="text-xs text-text-tertiary">KOI workspace</span>
        </div>
        <PermissionTree
          selected={role.permissions}
          names={current.permissionNames}
          disabled={!editable || saving}
          canRename={editable}
          errors={fieldErrors}
          onSelection={(permissions) =>
            change((value) => {
              value.roles[roleKey].permissions = permissions;
            })
          }
          onRename={(key, name) =>
            change((value) => {
              value.permissionNames[key] = name;
            }, `permission-name-${key}`)
          }
        />
      </div>
      {!editable && <p className="text-xs text-text-tertiary">Only the Owner can edit role definitions.</p>}
    </div>
  );
}
