'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { Sun, Moon } from 'lucide-react';
import { ADMIN_MODE_STORAGE_KEY } from '@/lib/admin-constants';

const getSnapshot = () => (typeof window !== 'undefined' ? localStorage.getItem(ADMIN_MODE_STORAGE_KEY) || 'light' : 'light');

const subscribe = (onStoreChange: () => void) => {
  window.addEventListener('koi_mode_changed', onStoreChange);
  return () => window.removeEventListener('koi_mode_changed', onStoreChange);
};

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, () => 'light');

  const toggle = useCallback(() => {
    const next = mode === 'light' ? 'dark' : 'light';
    localStorage.setItem(ADMIN_MODE_STORAGE_KEY, next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    window.dispatchEvent(new CustomEvent('koi_mode_changed', { detail: next }));
  }, [mode]);

  return (
    <button
      onClick={toggle}
      className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-secondary transition-colors"
      aria-label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {mode === 'light' ? <Moon className="h-[18px] w-[18px] text-text-secondary" /> : <Sun className="h-[18px] w-[18px] text-text-secondary" />}
    </button>
  );
}
