import type { AccessPolicySnapshot, StaffRole } from '@/lib/api-client';

export const ACCESS_ROLES: StaffRole[] = ['ADMIN', 'MANAGER', 'COMPLIANCE'];

export interface PolicyChange {
  id: string;
  description: string;
}

/** Compare editable values, treating each permission list as a set. */
export function getPolicyChanges(base: AccessPolicySnapshot, next: AccessPolicySnapshot): PolicyChange[] {
  const changes: PolicyChange[] = [];
  for (const role of ACCESS_ROLES) {
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
