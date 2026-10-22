'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/components/admin/confirm-dialog';
import { useToast } from '@/components/ui/toast';

interface UnsavedForm {
  dirty: boolean;
  saving: boolean;
  discard: () => void;
}

interface NavigationGuard {
  register: (form: UnsavedForm) => () => void;
  requestLeave: () => Promise<boolean>;
}

const GuardContext = createContext<NavigationGuard | null>(null);

interface HistoryNavigationEvent extends Event {
  navigationType: string;
  destination: { key: string; url: string; sameDocument: boolean };
}

interface BrowserNavigation extends EventTarget {
  traverseTo: (key: string) => { finished: Promise<unknown> };
}

/** Protect draft edits across links, sign-out, reloads, and supported history navigation. */
export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const form = useRef<UnsavedForm | null>(null);
  const pending = useRef<Promise<boolean> | null>(null);

  const register = useCallback((value: UnsavedForm) => {
    form.current = value;
    return () => {
      if (form.current === value) form.current = null;
    };
  }, []);

  const requestLeave = useCallback((): Promise<boolean> => {
    if (!form.current?.dirty && !form.current?.saving) return Promise.resolve(true);
    if (form.current.saving) {
      toast.info('Permissions are being saved. Please wait.');
      return Promise.resolve(false);
    }
    if (pending.current) return pending.current;
    const currentForm = form.current;
    pending.current = confirm({
      title: 'Leave with unsaved changes?',
      description:
        'Your permission changes have not been saved. Leave this page and discard them, or keep editing.',
      okText: 'Discard and leave',
      cancelText: 'Keep editing',
      destructive: true,
    })
      .then((leave) => {
        if (leave) {
          currentForm.discard();
          // Clear synchronously before navigation can trigger beforeunload.
          form.current = null;
        }
        return leave;
      })
      .finally(() => {
        pending.current = null;
      });
    return pending.current;
  }, [confirm, toast]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!form.current?.dirty && !form.current?.saving) return;
      event.preventDefault();
      event.returnValue = '';
    };

    const onClick = (event: MouseEvent) => {
      if (
        (!form.current?.dirty && !form.current?.saving) ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.hasAttribute('download') ||
        (anchor.target && anchor.target !== '_self')
      )
        return;
      const destination = new URL(anchor.href, window.location.href);
      if (
        !['http:', 'https:'].includes(destination.protocol) ||
        (destination.origin === location.origin &&
          destination.pathname === location.pathname &&
          destination.search === location.search)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      void requestLeave().then((leave) => {
        if (!leave) return;
        if (destination.origin === location.origin)
          router.push(destination.pathname + destination.search + destination.hash);
        else window.location.assign(destination.href);
      });
    };

    const navigation = (window as Window & { navigation?: BrowserNavigation }).navigation;
    const onNavigate = (event: Event) => {
      const navigationEvent = event as HistoryNavigationEvent;
      if (
        (!form.current?.dirty && !form.current?.saving) ||
        navigationEvent.navigationType !== 'traverse' ||
        !navigationEvent.destination.sameDocument ||
        !event.cancelable
      )
        return;
      const target = new URL(navigationEvent.destination.url);
      if (target.pathname === location.pathname && target.search === location.search) return;
      event.preventDefault();
      void requestLeave().then((leave) => {
        if (leave) void navigation?.traverseTo(navigationEvent.destination.key).finished.catch(() => {});
      });
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener('beforeunload', beforeUnload);
    navigation?.addEventListener('navigate', onNavigate);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('beforeunload', beforeUnload);
      navigation?.removeEventListener('navigate', onNavigate);
    };
  }, [requestLeave, router]);

  const value = useMemo(() => ({ register, requestLeave }), [register, requestLeave]);
  return <GuardContext.Provider value={value}>{children}</GuardContext.Provider>;
}

export function useNavigationGuard() {
  const context = useContext(GuardContext);
  if (!context) throw new Error('Navigation guard provider is missing.');
  return context;
}
