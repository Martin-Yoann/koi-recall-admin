'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ADMIN_MODE_STORAGE_KEY, ADMIN_THEME_STORAGE_KEY, DEFAULT_ADMIN_THEME } from '@/lib/admin-constants';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  primary: string;
  setMode: (mode: ThemeMode) => void;
  setPrimary: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [primary, setPrimaryState] = useState(DEFAULT_ADMIN_THEME);

  useEffect(() => {
    const savedMode = (localStorage.getItem(ADMIN_MODE_STORAGE_KEY) as ThemeMode) || 'light';
    const savedPrimary = localStorage.getItem(ADMIN_THEME_STORAGE_KEY) || DEFAULT_ADMIN_THEME;
    setModeState(savedMode);
    setPrimaryState(savedPrimary);
    document.documentElement.classList.toggle('dark', savedMode === 'dark');

    // Keep state in sync with theme/mode changes from any source: the toggles
    // dispatch these events after writing storage, so components that only
    // broadcast (e.g. the profile dialog color picker) still update live.
    const onModeChanged = (e: Event) => {
      const next = (e as CustomEvent).detail;
      if (next === 'light' || next === 'dark') setModeState(next);
    };
    const onThemeChanged = (e: Event) => {
      const color = (e as CustomEvent).detail;
      if (typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color)) setPrimaryState(color);
    };
    window.addEventListener('koi_mode_changed', onModeChanged);
    window.addEventListener('koi_theme_changed', onThemeChanged);
    return () => {
      window.removeEventListener('koi_mode_changed', onModeChanged);
      window.removeEventListener('koi_theme_changed', onThemeChanged);
    };
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(ADMIN_MODE_STORAGE_KEY, newMode);
    document.documentElement.classList.toggle('dark', newMode === 'dark');
    window.dispatchEvent(new CustomEvent('koi_mode_changed', { detail: newMode }));
  }, []);

  const setPrimary = useCallback((color: string) => {
    setPrimaryState(color);
    localStorage.setItem(ADMIN_THEME_STORAGE_KEY, color);
    window.dispatchEvent(new CustomEvent('koi_theme_changed', { detail: color }));
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, primary, setMode, setPrimary }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
