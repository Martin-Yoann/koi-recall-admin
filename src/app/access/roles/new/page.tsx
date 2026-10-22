'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RoleEditor } from '@/components/admin/access/permission-management';
function NewRole() {
  const params = useSearchParams();
  return <RoleEditor roleId="new" copyFrom={params.get('from')} />;
}
export default function NewRolePage() {
  return (
    <Suspense fallback={<p>Loading role…</p>}>
      <NewRole />
    </Suspense>
  );
}
