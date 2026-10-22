import { Suspense } from 'react';
import { AccessContent } from '@/components/admin/access/access-content';
export default function StaffPage() { return <Suspense fallback={<p>Loading users…</p>}><AccessContent section="staff" /></Suspense>; }
