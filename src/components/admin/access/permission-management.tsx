'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Checkbox, Input } from 'antd';
import { CheckCircle2, LoaderCircle, LockKeyhole } from 'lucide-react';
import { saveAccessPolicy, type AccessPolicySnapshot } from '@/lib/api-client';
import { ACCESS_ROLES, getPolicyChanges } from '@/lib/access-policy-changes';
import { useAccessPolicy } from '@/lib/rbac';
import { useConfirm } from '@/components/admin/confirm-dialog';
import { useNavigationGuard } from '@/components/admin/navigation-guard';
import { useToast } from '@/components/ui/toast';

interface PolicyDraft {
  base: AccessPolicySnapshot;
  value: AccessPolicySnapshot;
}

export function PermissionManagement() {
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
    if (!draft || !dirty || !editable || stale || savingRef.current) return;
    const errors: Record<string, string> = {};
    for (const role of ACCESS_ROLES) {
      if (!draft.value.roles[role].name.trim()) errors[`role-name-${role}`] = 'Enter a role name.';
    }
    for (const [key, name] of Object.entries(draft.value.permissionNames)) {
      if (!name.trim()) errors[`permission-name-${key}`] = 'Enter a permission name.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setMessage('Some names are missing. Complete the highlighted fields before saving.');
      document.getElementById(Object.keys(errors)[0])?.focus();
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveAccessPolicy({
        roles: draft.value.roles,
        permissionNames: draft.value.permissionNames,
        revision: draft.base.revision,
      });
      if (result.ok) {
        adopt(result.data);
        reset();
        toast.success('Permissions saved.');
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
  }, [draft, dirty, editable, stale, adopt, reset, toast, reload]);

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

  return (
    <div className="space-y-4">
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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-surface-elevated p-4">
        <div>
          <p className="flex items-center gap-2 font-semibold text-text-primary">
            <LockKeyhole className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
            Owner: admin@koi-platform.com
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {editable
              ? 'Edit role access and permission names, then save all changes together.'
              : 'View the access configured by the Owner. Only the Owner can edit this policy.'}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            The Owner always has all permissions. Role settings apply to other staff accounts.
          </p>
        </div>
        {editable && !dirty && !saving && (
          <span className="flex items-center gap-1.5 text-xs text-text-secondary" role="status">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
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
          description="Discard your draft to review the latest saved permissions. Your current edits will stay here until you choose to discard them."
        />
      )}
      {message && <Alert type="error" showIcon title="Changes have not been saved" description={message} />}
      {dirty && (
        <details className="rounded-xl border border-amber-300/60 bg-surface-elevated p-4 text-sm text-text-primary">
          <summary className="cursor-pointer font-medium">
            Review {changes.length} unsaved {changes.length === 1 ? 'change' : 'changes'}
          </summary>
          <ul className="mt-3 max-h-52 list-disc space-y-1.5 overflow-y-auto pl-5">
            {changes.map((entry) => (
              <li key={entry.id} className="break-words text-xs leading-relaxed">
                {entry.description}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="overflow-x-auto rounded-xl border bg-surface-elevated">
        <table className="w-full text-sm">
          <caption className="sr-only">Permission names and role access</caption>
          <thead className="bg-surface-secondary">
            <tr>
              <th scope="col" className="min-w-72 p-4 text-left">
                Permission name
              </th>
              {ACCESS_ROLES.map((role) => {
                const fieldId = `role-name-${role}`;
                return (
                  <th key={role} scope="col" className="min-w-40 p-4">
                    {editable ? (
                      <>
                        <Input
                          id={fieldId}
                          aria-label={`Name for ${role} role`}
                          aria-invalid={Boolean(fieldErrors[fieldId])}
                          aria-describedby={fieldErrors[fieldId] ? `${fieldId}-error` : undefined}
                          status={fieldErrors[fieldId] ? 'error' : undefined}
                          maxLength={80}
                          value={current.roles[role].name}
                          disabled={saving}
                          onChange={(event) =>
                            change((value) => {
                              value.roles[role].name = event.target.value;
                            }, fieldId)
                          }
                        />
                        {fieldErrors[fieldId] && (
                          <p
                            id={`${fieldId}-error`}
                            className="mt-1 text-left text-xs font-normal text-red-600"
                          >
                            {fieldErrors[fieldId]}
                          </p>
                        )}
                      </>
                    ) : (
                      current.roles[role].name
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Object.entries(current.permissionNames).map(([key, name]) => {
              const fieldId = `permission-name-${key}`;
              return (
                <tr key={key} className="border-t">
                  <th scope="row" className="p-4 text-left font-normal">
                    {editable ? (
                      <>
                        <Input
                          id={fieldId}
                          aria-label={`Name for ${key}`}
                          aria-invalid={Boolean(fieldErrors[fieldId])}
                          aria-describedby={fieldErrors[fieldId] ? `${fieldId}-error` : undefined}
                          status={fieldErrors[fieldId] ? 'error' : undefined}
                          maxLength={100}
                          value={name}
                          disabled={saving}
                          onChange={(event) =>
                            change((value) => {
                              value.permissionNames[key] = event.target.value;
                            }, fieldId)
                          }
                        />
                        {fieldErrors[fieldId] && (
                          <p id={`${fieldId}-error`} className="mt-1 text-xs text-red-600">
                            {fieldErrors[fieldId]}
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="font-medium">{name}</span>
                    )}
                    <div className="mt-1 font-mono text-xs text-text-tertiary">{key}</div>
                  </th>
                  {ACCESS_ROLES.map((role) => (
                    <td key={role} className="p-4 text-center">
                      <Checkbox
                        aria-label={`${current.roles[role].name}: ${name}`}
                        disabled={!editable || saving}
                        checked={current.roles[role].permissions.includes(key)}
                        onChange={(event) =>
                          change((value) => {
                            value.roles[role].permissions = event.target.checked
                              ? [...value.roles[role].permissions, key]
                              : value.roles[role].permissions.filter((permission) => permission !== key);
                          })
                        }
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
