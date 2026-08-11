'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { AdminAuthProvider, useAdminAuth } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/admin-shell';
import { LoginDrawer } from '@/components/admin/login-drawer';
import { ProfileDialog } from '@/components/admin/profile-dialog';

function AuthModals() {
  const { profileOpen, profileTab, closeProfile } = useAdminAuth();
  return (
    <>
      <LoginDrawer />
      <ProfileDialog open={profileOpen} onClose={closeProfile} initialTab={profileTab} />
    </>
  );
}

export function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delay={300}>
      <AdminAuthProvider>
        <AdminShell>{children}</AdminShell>
        <AuthModals />
      </AdminAuthProvider>
    </TooltipProvider>
  );
}
