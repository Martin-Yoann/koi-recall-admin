'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Checkbox, Dropdown, Input, Select } from 'antd';
import { Download, MoreHorizontal, Plus, Search, ShieldCheck, Users } from 'lucide-react';
import { useAccessPolicy } from '@/lib/rbac';
import { saveAccessPolicy } from '@/lib/api-client';
import { useConfirm } from '@/components/admin/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { staffHasRole, useStaffDirectory } from './use-staff-directory';

const BUILT_IN = new Set(['ADMIN', 'MANAGER', 'COMPLIANCE']);

export function RoleList() {
  const { policy, error, reload, adopt } = useAccessPolicy();
  const { users, error: directoryError } = useStaffDirectory();
  const confirm = useConfirm();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState('name');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const roles = Object.entries(policy?.roles ?? {});
  const filtered = roles
    .filter(([, role]) =>
      `${role.name} ${role.description ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .sort((left, right) =>
      order === 'users'
        ? (users?.filter((user) => staffHasRole(user, right[0])).length ?? 0) -
          (users?.filter((user) => staffHasRole(user, left[0])).length ?? 0)
        : left[1].name.localeCompare(right[1].name),
    );
  const selectable = filtered.map(([id]) => id).filter((id) => !BUILT_IN.has(id));

  const removeRoles = async (ids: string[]) => {
    if (!policy?.isOwner || busy || !users || !ids.length) return;
    if (ids.some((id) => BUILT_IN.has(id) || users.some((user) => staffHasRole(user, id)))) {
      setMutationError('Reassign users before deleting a role. Built-in roles cannot be deleted.');
      return;
    }
    if (
      !(await confirm({
        title: ids.length === 1 ? 'Delete this role?' : `Delete ${ids.length} roles?`,
        description: 'These unassigned roles will be permanently removed. You can create new roles later.',
        okText: 'Delete roles',
        cancelText: 'Cancel',
        destructive: true,
      }))
    )
      return;
    const next = structuredClone(policy);
    ids.forEach((id) => delete next.roles[id]);
    setBusy(true);
    setMutationError(null);
    try {
      const result = await saveAccessPolicy({
        roles: next.roles,
        permissionNames: next.permissionNames,
        revision: next.revision,
      });
      if (result.ok) {
        adopt(result.data);
        setSelected([]);
        toast.success('Roles deleted.');
      } else {
        setMutationError(result.error.detail || 'Could not delete roles.');
        if (result.status === 409) await reload();
      }
    } finally {
      setBusy(false);
    }
  };

  const exportRoles = () => {
    if (!policy) return;
    const blob = new Blob(
      [JSON.stringify({ roles: policy.roles, permissionNames: policy.permissionNames }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'koi-roles.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-text-tertiary">Users / Roles</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">Roles</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Create roles, choose permissions, and assign access to your team.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button icon={<Download className="h-4 w-4" />} disabled={!policy} onClick={exportRoles}>
            Export
          </Button>
          {policy?.isOwner && (
            <Link href="/access/roles/new">
              <Button type="primary" icon={<Plus className="h-4 w-4" />} disabled={roles.length >= 100}>
                Add role
              </Button>
            </Link>
          )}
        </div>
      </div>
      {(error || mutationError || directoryError) && (
        <Alert
          type="error"
          showIcon
          title={mutationError || error || directoryError}
          action={
            error ? (
              <Button size="small" onClick={() => void reload()}>
                Retry
              </Button>
            ) : undefined
          }
        />
      )}
      <div className="overflow-hidden rounded-xl border bg-surface-elevated shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-surface-secondary px-3 py-1 text-xs font-medium text-text-primary">
              All roles <span className="ml-1 text-text-tertiary">{roles.length}</span>
            </span>
            {selected.length > 0 && policy?.isOwner && (
              <Button danger size="small" loading={busy} onClick={() => void removeRoles(selected)}>
                Delete {selected.length} selected
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              aria-label="Search roles"
              prefix={<Search className="h-4 w-4 text-text-tertiary" />}
              placeholder="Search roles"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              allowClear
              className="!w-52"
            />
            <Select
              aria-label="Sort roles"
              value={order}
              onChange={setOrder}
              options={[
                { value: 'name', label: 'Name A–Z' },
                { value: 'users', label: 'Most users' },
              ]}
              className="!w-36"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Team roles, permission counts and assigned users</caption>
            <thead className="border-b bg-surface-secondary text-xs font-medium text-text-secondary">
              <tr>
                {policy?.isOwner && (
                  <th className="w-10 p-4">
                    <Checkbox
                      aria-label="Select all custom roles"
                      checked={selectable.length > 0 && selectable.every((id) => selected.includes(id))}
                      indeterminate={
                        selectable.some((id) => selected.includes(id)) &&
                        !selectable.every((id) => selected.includes(id))
                      }
                      disabled={!selectable.length || busy}
                      onChange={(event) => setSelected(event.target.checked ? selectable : [])}
                    />
                  </th>
                )}
                <th className="min-w-64 p-4">Name</th>
                <th className="p-4">Type</th>
                <th className="p-4 text-right">Permissions</th>
                <th className="p-4 text-right">Users</th>
                <th className="w-12 p-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(([id, role]) => {
                const assigned = users ? users.filter((user) => staffHasRole(user, id)).length : null;
                return (
                  <tr key={id} className="border-b last:border-0 hover:bg-surface-secondary/50">
                    {policy?.isOwner && (
                      <td className="p-4">
                        <Checkbox
                          aria-label={`Select ${role.name}`}
                          checked={selected.includes(id)}
                          disabled={BUILT_IN.has(id) || busy}
                          onChange={(event) =>
                            setSelected((previous) =>
                              event.target.checked ? [...previous, id] : previous.filter((key) => key !== id),
                            )
                          }
                        />
                      </td>
                    )}
                    <td className="p-4">
                      <Link
                        href={`/access/roles/${id}`}
                        className="font-medium text-text-primary hover:text-brand-500 hover:underline"
                      >
                        {role.name}
                      </Link>
                      {role.description && (
                        <p className="mt-1 max-w-md text-xs text-text-tertiary line-clamp-2">
                          {role.description}
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="whitespace-nowrap rounded-md bg-surface-secondary px-2 py-1 text-xs text-text-secondary">
                        {BUILT_IN.has(id) ? 'Built-in' : 'Custom'}
                      </span>
                    </td>
                    <td className="p-4 text-right tabular-nums text-text-secondary">
                      {role.permissions.length}
                    </td>
                    <td className="p-4 text-right tabular-nums">
                      {assigned !== null ? (
                        <Link
                          href={`/access/staff?role=${encodeURIComponent(id)}`}
                          className="text-brand-500 hover:underline"
                        >
                          {assigned}
                        </Link>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      {policy?.isOwner && (
                        <Dropdown
                          trigger={['click']}
                          menu={{
                            items: [
                              { key: 'edit', label: <Link href={`/access/roles/${id}`}>Edit role</Link> },
                              {
                                key: 'duplicate',
                                label: <Link href={`/access/roles/new?from=${id}`}>Duplicate role</Link>,
                              },
                              {
                                key: 'delete',
                                label: 'Delete role',
                                danger: true,
                                disabled: BUILT_IN.has(id) || assigned === null || assigned > 0 || busy,
                                onClick: () => void removeRoles([id]),
                              },
                            ],
                          }}
                        >
                          <button
                            type="button"
                            aria-label={`Actions for ${role.name}`}
                            className="rounded-md p-1.5 hover:bg-surface-secondary"
                          >
                            <MoreHorizontal className="h-4 w-4 text-text-secondary" />
                          </button>
                        </Dropdown>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!policy && (
          <div className="p-10 text-center text-sm text-text-secondary" role="status">
            Loading roles…
          </div>
        )}
        {policy && !filtered.length && (
          <div className="p-10 text-center text-sm text-text-secondary">
            No matching roles. Try another search.
          </div>
        )}
      </div>
      <div className="flex items-start gap-3 rounded-xl border bg-surface-elevated p-4 text-sm">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-text-tertiary" />
        <div>
          <p className="font-medium text-text-primary">One Owner. Flexible access for everyone else.</p>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            admin@koi-platform.com is the sole Owner and always has full access. Assign one or more roles to
            each user; their permissions are combined.
          </p>
        </div>
        <Users className="ml-auto hidden h-5 w-5 shrink-0 text-text-tertiary sm:block" />
      </div>
    </div>
  );
}
