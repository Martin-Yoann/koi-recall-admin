'use client';

import { useState } from 'react';
import { Alert, Button, Checkbox, Input } from 'antd';
import { saveAccessPolicy, type AccessPolicySnapshot, type StaffRole } from '@/lib/api-client';
import { useAccessPolicy } from '@/lib/rbac';

const ROLES: StaffRole[] = ['ADMIN', 'MANAGER', 'COMPLIANCE'];

export function PermissionManagement() {
  const { policy, error, reload, adopt } = useAccessPolicy();
  const [draft, setDraft] = useState<AccessPolicySnapshot | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const current = draft ?? policy;
  const editable = policy?.isOwner === true;
  const stale = draft !== null && policy !== null && draft.revision !== policy.revision;

  const change = (update: (value: AccessPolicySnapshot) => void) => {
    if (!editable || !current) return;
    const next = structuredClone(current);
    update(next);
    setDraft(next);
    setMessage(null);
  };

  const save = async () => {
    if (!draft || !editable || stale || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveAccessPolicy({ roles: draft.roles, permissionNames: draft.permissionNames, revision: draft.revision });
      if (result.ok) {
        adopt(result.data);
        setDraft(null);
        setMessage({ type: 'success', text: 'Permissions saved. The new policy applies to the next protected request.' });
      } else {
        setMessage({ type: 'error', text: result.error.detail || 'Could not save permissions.' });
        if (result.status === 409) await reload();
      }
    } finally { setSaving(false); }
  };

  if (!current) return (
    <div className="rounded-xl border bg-surface-elevated p-5" role="status">
      <p>{error || 'Loading permissions…'}</p>
      {error && <Button className="mt-3" onClick={() => void reload()}>Retry</Button>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-surface-elevated p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-text-primary">Owner: admin@koi-platform.com</p>
          <p className="mt-1 text-sm text-text-secondary">
            {editable ? 'Customize permission names and choose the access granted to each role.' : 'View the access configured by the Owner. Only the Owner can edit this policy.'}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">The Owner always has all permissions. Role settings apply to other staff accounts.</p>
        </div>
        {editable && <div className="flex gap-2">
          <Button disabled={!draft || saving} onClick={() => { setDraft(null); setMessage(null); }}>Discard changes</Button>
          <Button type="primary" loading={saving} disabled={!draft || stale} onClick={() => void save()}>Save permissions</Button>
        </div>}
      </div>
      {error && <Alert type="error" showIcon title={error} />}
      {stale && <Alert type="warning" showIcon title="The policy changed in another session. Discard your draft and edit the latest version before saving." />}
      {message && <Alert type={message.type} showIcon title={message.text} />}
      <div className="overflow-x-auto rounded-xl border bg-surface-elevated">
        <table className="w-full text-sm">
          <caption className="sr-only">Permission names and role access</caption>
          <thead className="bg-surface-secondary">
            <tr>
              <th scope="col" className="p-4 text-left min-w-72">Permission name</th>
              {ROLES.map((role) => <th key={role} scope="col" className="p-4 min-w-40">
                {editable ? <Input aria-label={`Name for ${role} role`} maxLength={80} value={current.roles[role].name} disabled={saving}
                  onChange={(event) => change((value) => { value.roles[role].name = event.target.value; })} /> : current.roles[role].name}
              </th>)}
            </tr>
          </thead>
          <tbody>
            {Object.entries(current.permissionNames).map(([key, name]) => <tr key={key} className="border-t">
              <th scope="row" className="p-4 text-left font-normal">
                {editable ? <Input aria-label={`Name for ${key}`} maxLength={100} value={name} disabled={saving}
                  onChange={(event) => change((value) => { value.permissionNames[key] = event.target.value; })} /> : <span className="font-medium">{name}</span>}
                <div className="mt-1 font-mono text-xs text-text-tertiary">{key}</div>
              </th>
              {ROLES.map((role) => <td key={role} className="p-4 text-center">
                <Checkbox aria-label={`${current.roles[role].name}: ${name}`} disabled={!editable || saving}
                  checked={current.roles[role].permissions.includes(key)}
                  onChange={(event) => change((value) => {
                    value.roles[role].permissions = event.target.checked
                      ? [...value.roles[role].permissions, key]
                      : value.roles[role].permissions.filter((permission) => permission !== key);
                  })} />
              </td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
