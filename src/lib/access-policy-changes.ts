import type { AccessPolicySnapshot } from '@/lib/api-client';

export interface PolicyChange {
  id: string;
  description: string;
}

/** Compare editable values, treating each permission list as a set. */
export function getPolicyChanges(base: AccessPolicySnapshot, next: AccessPolicySnapshot): PolicyChange[] {
  const changes: PolicyChange[] = [];
  for (const role of new Set([...Object.keys(base.roles), ...Object.keys(next.roles)])) {
    const previousRole = base.roles[role];
    const nextRole = next.roles[role];
    if (!previousRole || !nextRole) {
      changes.push({
        id: `role:${role}`,
        description: `${nextRole ? 'Create' : 'Delete'} role “${(nextRole ?? previousRole).name}”`,
      });
      continue;
    }
    if ((previousRole.description ?? '') !== (nextRole.description ?? ''))
      changes.push({ id: `description:${role}`, description: `Update description for “${nextRole.name}”` });
    if (base.roles[role].name !== next.roles[role].name) {
      changes.push({
        id: `role:${role}`,
        description: `Rename role “${base.roles[role].name}” to “${next.roles[role].name}”`,
      });
    }
    const before = new Set(base.roles[role].permissions);
    const after = new Set(next.roles[role].permissions);
    for (const key of new Set([...before, ...after])) {
      if (before.has(key) === after.has(key)) continue;
      changes.push({
        id: `grant:${role}:${key}`,
        description: `${after.has(key) ? 'Grant' : 'Revoke'} “${next.permissionNames[key] ?? key}” ${after.has(key) ? 'for' : 'from'} ${next.roles[role].name}`,
      });
    }
  }
  for (const key of Object.keys(base.permissionNames)) {
    if (base.permissionNames[key] !== next.permissionNames[key]) {
      changes.push({
        id: `permission:${key}`,
        description: `Rename permission “${base.permissionNames[key]}” to “${next.permissionNames[key]}”`,
      });
    }
  }
  return changes;
}
