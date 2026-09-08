'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/admin/theme-provider';

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <button
      onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
      className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-secondary transition-colors"
      aria-label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {mode === 'light' ? <Moon className="h-[18px] w-[18px] text-text-secondary" /> : <Sun className="h-[18px] w-[18px] text-text-secondary" />}
    </button>
  );
}
