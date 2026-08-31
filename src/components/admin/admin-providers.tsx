'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ToastProvider } from '@/components/ui/toast';
import { AdminAuthProvider, useAdminAuth } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/admin-shell';
import { ProfileDialog } from '@/components/admin/profile-dialog';

const LOGIN_PATH = '/login';

/** Auth route guard: unauthenticated → /login, authenticated on /login → /. */
function AuthInterceptor({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === LOGIN_PATH;

  useEffect(() => {
    if (isLoading) return;
    if (isLogin) {
      if (isAuthenticated) router.replace('/');
      return;
    }
    if (!isAuthenticated) router.replace(LOGIN_PATH);
  }, [isLoading, isAuthenticated, isLogin, router]);

  // Session restore splash (brief) — fills the viewport, centered, with a spinner.
  if (isLoading) {
    return (
      <div className="flex-1 w-full h-screen flex flex-col items-center justify-center gap-4 bg-surface-secondary">
        <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary" style={{ animation: 'spin 0.9s linear infinite' }} aria-hidden="true" />
        <p className="text-sm text-text-tertiary">Loading…</p>
      </div>
    );
  }
  // Redirecting — render nothing to avoid a flash of the wrong page.
  if (isLogin && isAuthenticated) return null;
  if (!isLogin && !isAuthenticated) return null;
  return <>{children}</>;
}

function AuthModals() {
  const { profileOpen, profileTab, closeProfile } = useAdminAuth();
  return <ProfileDialog open={profileOpen} onClose={closeProfile} initialTab={profileTab} />;
}

export function AdminProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname.startsWith(LOGIN_PATH);

  return (
    <TooltipProvider delay={300}>
      <ToastProvider>
        <AdminAuthProvider>
          <AuthInterceptor>
            {/* The login page renders standalone (no admin chrome); every other
                route is wrapped in the admin shell. */}
            {isLogin ? <>{children}</> : <AdminShell>{children}</AdminShell>}
          </AuthInterceptor>
          <AuthModals />
        </AdminAuthProvider>
      </ToastProvider>
    </TooltipProvider>
  );
}
