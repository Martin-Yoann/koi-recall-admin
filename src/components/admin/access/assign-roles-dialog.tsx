'use client';

import { useState } from 'react';
import { Alert, Button, Checkbox, Modal } from 'antd';
import { updateStaff, type StaffUser } from '@/lib/api-client';
import { useAccessPolicy } from '@/lib/rbac';
import { useToast } from '@/components/ui/toast';

export function AssignRolesDialog({
  user,
  onClose,
  onSaved,
}: {
  user: StaffUser;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { policy } = useAccessPolicy();
  const toast = useToast();
  const initial = user.accessRoleIds ?? [user.role];
  const [selected, setSelected] = useState<string[]>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = [...selected].sort().join('|') !== [...initial].sort().join('|');
  const permissions = new Set(selected.flatMap((id) => policy?.roles[id]?.permissions ?? []));

  const save = async () => {
    if (!dirty || saving || user.isOwner) return;
    setSaving(true);
    setError(null);
    try {
      const result = await updateStaff(user.id, { accessRoleIds: selected });
      if (!result.ok) {
        setError(result.error.detail || 'Could not assign roles.');
        return;
      }
      toast.success(`Roles updated for ${user.displayName}.`);
      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Assign roles"
      open
      centered
      width={600}
      closable={!saving}
      mask={{ closable: !saving }}
      onCancel={() => {
        if (!saving) onClose();
      }}
      footer={
        <>
          <Button disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="primary"
            loading={saving}
            disabled={!dirty || user.isOwner}
            onClick={() => void save()}
          >
            Save roles
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-text-secondary">
        Choose access for <span className="font-medium text-text-primary">{user.displayName}</span> (
        {user.email}). Permissions from all selected roles are combined.
      </p>
      {error && <Alert type="error" showIcon title={error} className="!mb-4" />}
      <div className="max-h-80 divide-y overflow-y-auto rounded-xl border">
        {Object.entries(policy?.roles ?? {}).map(([id, role]) => {
          const allowed =
            policy?.isOwner || role.permissions.every((key) => policy?.permissions.includes(key));
          return (
            <div key={id} className="flex cursor-pointer items-start gap-3 p-4 hover:bg-surface-secondary/50">
              <Checkbox
                aria-label={`Assign ${role.name}`}
                checked={selected.includes(id)}
                disabled={saving || !allowed || (!selected.includes(id) && selected.length >= 20)}
                onChange={(event) =>
                  setSelected((previous) =>
                    event.target.checked ? [...previous, id] : previous.filter((key) => key !== id),
                  )
                }
                className="!mt-0.5"
              />
              <span className="min-w-0">
                <span className="text-sm font-medium text-text-primary">{role.name}</span>
                {role.description && (
                  <span className="mt-1 block text-xs text-text-secondary">{role.description}</span>
                )}
                <span className="mt-1 block text-xs text-text-tertiary">
                  {role.permissions.length} permissions{!allowed ? ' · Requires higher access' : ''}
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-text-secondary">
        {selected.length} roles selected · {permissions.size} effective permissions
      </p>
      <p className="mt-2 text-xs text-text-tertiary">
        Saving roles signs this user out so their next login uses the updated access. Selecting no roles
        removes their access to workspace operations.
      </p>
    </Modal>
  );
}
