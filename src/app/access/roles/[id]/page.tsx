'use client';
import { useParams } from 'next/navigation';
import { RoleEditor } from '@/components/admin/access/permission-management';
export default function RolePage() {
  const { id } = useParams<{ id: string }>();
  return <RoleEditor key={id} roleId={id} />;
}
