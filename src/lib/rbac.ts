'use client';

// Authorization comes from the backend's current access policy.

import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getAccessPolicy, type AccessPolicySnapshot } from '@/lib/api-client';
import { useAdminAuth } from '@/lib/admin-auth';
import type { StaffRole } from '@/lib/api-client';

/** `resource:action` permission ids — keep in sync with koi-recall-backend. */
export type Permission =
  | 'campaign.publish'
  | 'case.queue.read'
  | 'case.detail.read'
  | 'case.detail.read_pii_raw'
  | 'case.export'
  | 'case.assign'
  | 'case.status.transition'
  | 'review.close'
  | 'disposal.review'
  | 'disposal.hold.manage'
  | 'disposal.instructions.publish'
  | 'audit.read'
  | 'staff.read'
  | 'staff.manage';

export const ROLE_LABELS: Record<StaffRole, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  COMPLIANCE: 'Compliance',
};

interface AccessContextValue {
  policy: AccessPolicySnapshot | null;
  error: string | null;
  reload: () => Promise<void>;
  adopt: (policy: AccessPolicySnapshot) => void;
}
const AccessContext = createContext<AccessContextValue>({ policy: null, error: null, reload: async () => {}, adopt: () => {} });

/** One server-backed snapshot shared by navigation, actions, and access management. */
export function AccessPolicyProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAdminAuth();
  const [snapshot, setSnapshot] = useState<{ userId: string; policy: AccessPolicySnapshot } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.staffUserId ?? '';
  const adopt = useCallback((policy: AccessPolicySnapshot) => setSnapshot((previous) =>
    previous?.userId === userId && previous.policy.revision > policy.revision ? previous : { userId, policy }), [userId]);
  const reload = useCallback(async () => {
    if (!isAuthenticated || isLoading) return;
    const result = await getAccessPolicy();
    if (result.ok) { adopt(result.data); setError(null); }
    else { setError(result.error.detail || 'Failed to load access policy.'); setSnapshot(null); }
  }, [adopt, isAuthenticated, isLoading]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!isAuthenticated || isLoading) return;
      const result = await getAccessPolicy();
      if (!active) return;
      if (result.ok) { adopt(result.data); setError(null); }
      else { setError(result.error.detail || 'Failed to load access policy.'); setSnapshot(null); }
    };
    void load();
    const timer = window.setInterval(() => { void load(); }, 30000);
    const onFocus = () => { void load(); };
    window.addEventListener('focus', onFocus);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [adopt, isAuthenticated, isLoading]);
  const policy = isAuthenticated && snapshot?.userId === userId ? snapshot.policy : null;
  return createElement(AccessContext.Provider, { value: { policy, error, reload, adopt } }, children);
}

export function useAccessPolicy() { return useContext(AccessContext); }

export function usePermissions() {
  const { user, isAuthenticated } = useAdminAuth();
  const { policy } = useAccessPolicy();
  return {
    role: user?.role,
    isAuthenticated,
    isOwner: policy?.isOwner ?? false,
    can: (permission: Permission) => policy?.permissions.includes(permission) ?? false,
    permissions: policy?.permissions ?? [],
    roleLabels: (policy ? Object.fromEntries(Object.entries(policy.roles).map(([key, value]) => [key, value.name])) : ROLE_LABELS) as Record<string, string>,
  };
}
