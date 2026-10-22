'use client';

import { useEffect, useState } from 'react';
import { listStaff, type StaffUser } from '@/lib/api-client';
import { useAccessPolicy } from '@/lib/rbac';

export function useStaffDirectory() {
  const { policy } = useAccessPolicy();
  const allowed = policy?.permissions.includes('staff.read') ?? false;
  const [users, setUsers] = useState<StaffUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    void listStaff().then((result) => {
      if (!active) return;
      if (result.ok) {
        setUsers(result.data);
        setError(null);
      } else setError(result.error.detail || 'Could not load assigned users.');
    });
    return () => {
      active = false;
    };
  }, [allowed, policy?.revision]);
  return { users: allowed ? users : null, error, allowed };
}

export function staffHasRole(user: StaffUser, roleId: string) {
  return !user.isOwner && (user.accessRoleIds ?? [user.role]).includes(roleId);
}
