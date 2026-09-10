'use client';

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';
import { ADMIN_MODE_STORAGE_KEY, ADMIN_THEME_STORAGE_KEY, DEFAULT_ADMIN_THEME } from '@/lib/admin-constants';

/** `system` follows the OS `prefers-color-scheme` setting. */
export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedThemeMode = 'light' | 'dark';

interface ThemeContextType {
  /** The stored preference, which may be `system`. */
  mode: ThemeMode;
  /** What `mode` currently resolves to — use this for anything visual. */
  resolvedMode: ResolvedThemeMode;
  primary: string;
  setMode: (mode: ThemeMode) => void;
  setPrimary: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const MODE_EVENT = 'koi_mode_changed';
const THEME_EVENT = 'koi_theme_changed';
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const DARK_QUERY = '(prefers-color-scheme: dark)';

function readMode(): ThemeMode {
  const raw = localStorage.getItem(ADMIN_MODE_STORAGE_KEY);
  return raw === 'dark' || raw === 'system' ? raw : 'light';
}

function readPrimary(): string {
  const saved = localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
  return saved && HEX_COLOR.test(saved) ? saved : DEFAULT_ADMIN_THEME;
}

/**
 * localStorage is the single source of truth for the theme. The hooks read it
 * through `useSyncExternalStore` (SSR-safe, no setState-in-effect) and the
 * setters write storage then notify subscribers — the same custom events the
 * toggles already broadcast, so other listeners keep working.
 */
function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(MODE_EVENT, onStoreChange);
  window.addEventListener(THEME_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(MODE_EVENT, onStoreChange);
    window.removeEventListener(THEME_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

function subscribeSystemDark(onStoreChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onStoreChange);
  return () => query.removeEventListener('change', onStoreChange);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useSyncExternalStore<ThemeMode>(subscribe, readMode, () => 'light');
  const primary = useSyncExternalStore<string>(subscribe, readPrimary, () => DEFAULT_ADMIN_THEME);
  const systemDark = useSyncExternalStore<boolean>(
    subscribeSystemDark,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );
  const resolvedMode: ResolvedThemeMode =
    mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedMode === 'dark');
  }, [resolvedMode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    localStorage.setItem(ADMIN_MODE_STORAGE_KEY, newMode);
    window.dispatchEvent(new CustomEvent(MODE_EVENT, { detail: newMode }));
  }, []);

  const setPrimary = useCallback((color: string) => {
    localStorage.setItem(ADMIN_THEME_STORAGE_KEY, color);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: color }));
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, resolvedMode, primary, setMode, setPrimary }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
