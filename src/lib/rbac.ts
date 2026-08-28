'use client';

// ============================================================
// KOI Admin — Client-side RBAC (mirrors backend permissions.ts)
// The backend remains the authority (403 + denied audit row);
// this matrix only drives which controls render enabled.
// ============================================================

import { useAdminAuth } from '@/lib/admin-auth';
import type { StaffRole } from '@/lib/api-client';

/** `resource:action` permission ids — keep in sync with koi-recall-backend. */
export type Permission =
  | 'case.queue.read'
  | 'case.detail.read'
  | 'case.detail.read_pii_raw'
  | 'case.export'
  | 'case.assign'
  | 'case.status.transition'
  | 'review.close'
  | 'audit.read'
  | 'staff.manage';

const ROLE_PERMISSIONS: Record<StaffRole, readonly Permission[]> = {
  viewer: ['case.queue.read', 'case.detail.read'],
  reviewer: [
    'case.queue.read',
    'case.detail.read',
    'case.assign',
    'case.status.transition',
  ],
  compliance: [
    'case.queue.read',
    'case.detail.read',
    'case.detail.read_pii_raw',
    'case.export',
    'case.assign',
    'case.status.transition',
    'review.close',
  ],
  administrator: [
    'case.queue.read',
    'case.detail.read',
    'case.detail.read_pii_raw',
    'case.export',
    'case.assign',
    'case.status.transition',
    'review.close',
    'audit.read',
    'staff.manage',
  ],
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  'case.queue.read': 'View case queues',
  'case.detail.read': 'View case details',
  'case.detail.read_pii_raw': 'View raw PII',
  'case.export': 'Export cases & refunds',
  'case.assign': 'Assign cases',
  'case.status.transition': 'Transition & resolve cases',
  'review.close': 'Close reportability reviews',
  'audit.read': 'Read audit events',
  'staff.manage': 'Manage staff',
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  viewer: 'Viewer',
  reviewer: 'Reviewer',
  compliance: 'Compliance',
  administrator: 'Administrator',
};

export function roleHasPermission(role: StaffRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Role from the persisted session (set at login). Until the first login the
 * role is unknown — `can` returns false, matching the least-privilege default.
 */
export function usePermissions() {
  const { user, isAuthenticated } = useAdminAuth();
  const role = user?.role;
  return {
    role,
    isAuthenticated,
    can: (permission: Permission) => roleHasPermission(role, permission),
    permissions: role ? ROLE_PERMISSIONS[role] : [],
  };
}
