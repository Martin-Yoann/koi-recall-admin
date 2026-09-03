'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { App as AntdApp, ConfigProvider, theme as antdTheme, type ThemeConfig } from 'antd';

/**
 * antd theme mapped onto the KOI Navy/Blue palette (#0D1B2A + #3A86FF).
 * Keep control heights at 36px and radii at 6px so antd controls match the
 * existing Element-style form controls defined in globals.css.
 *
 * The admin theme is user-switchable: changing it in Account Settings updates
 * both the antd tokens AND the global CSS variables used by Tailwind (sidebar,
 * menu active/hover, buttons, focus rings) so the whole backend changes color.
 */

const themeConfig: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: '#3A86FF',
    colorInfo: '#3A86FF',
    colorLink: '#3A86FF',
    colorSuccess: '#16A34A',
    colorWarning: '#F59E0B',
    colorError: '#DC2626',
    colorTextBase: '#0D1B2A',
    colorText: '#0D1B2A',
    colorTextSecondary: '#3A4A5E',
    colorTextTertiary: '#64748B',
    colorTextQuaternary: '#A8ABB2',
    colorBorder: '#E4E7ED',
    colorBorderSecondary: '#E4E7ED',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorBgLayout: '#F4F6F9',
    fontFamily:
      "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    borderRadius: 6,
    controlHeight: 36,
    controlOutline: 'rgba(58, 134, 255, 0.16)',
    boxShadowSecondary:
      '0 4px 24px rgba(13, 27, 42, 0.10), 0 1px 3px rgba(13, 27, 42, 0.06)',
  },
  components: {
    Button: {
      borderRadius: 6,
      controlHeight: 36,
      controlHeightSM: 28,
      defaultBorderColor: '#C0C4CC',
      defaultColor: '#3A4A5E',
    },
    Input: { borderRadius: 6, controlHeight: 36 },
    InputNumber: { borderRadius: 6 },
    Select: { borderRadius: 6, controlHeight: 36 },
    Table: {
      headerBg: '#F4F6F9',
      headerColor: '#0D1B2A',
      borderColor: '#E4E7ED',
      rowHoverBg: 'rgba(58, 134, 255, 0.05)',
    },
    Modal: { borderRadiusLG: 16, contentBg: '#FFFFFF' },
    Tooltip: { colorBgSpotlight: '#0D1B2A' },
    Popover: { borderRadiusLG: 8 },
    Dropdown: { borderRadiusLG: 8 },
    Tag: { borderRadiusSM: 4 },
    Checkbox: { borderRadiusSM: 4 },
    Radio: { borderRadiusSM: 4 },
  },
};

/** Derive a darker version of a hex color (for hover states). */
function darken(hex: string, amount = 0.18): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.floor((num >> 16) * (1 - amount)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((num & 0xff) * (1 - amount)));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Derive a very light tint of a hex color (for soft backgrounds). */
function tint(hex: string): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.floor((num >> 16) + (255 - (num >> 16)) * 0.9);
  const g = Math.floor(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * 0.9);
  const b = Math.floor((num & 0xff) + (255 - (num & 0xff)) * 0.9);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Write the chosen primary color into the CSS variables that Tailwind/antd read. */
function applyGlobalTheme(primary: string) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const dark = darken(primary);
  const light = tint(primary);
  // shadcn/theme tokens consumed by Tailwind classes (btn, inputs, focus rings).
  root.style.setProperty('--primary', primary);
  root.style.setProperty('--primary-foreground', '#ffffff');
  root.style.setProperty('--ring', primary);
  root.style.setProperty('--brand-emerald', primary);
  root.style.setProperty('--brand-emerald-light', light);
  root.style.setProperty('--brand-emerald-dark', dark);
  root.style.setProperty('--brand-500', primary);
  root.style.setProperty('--brand-600', dark);
  root.style.setProperty('--brand-700', darken(primary, 0.3));
  root.style.setProperty('--color-primary', primary);
  root.style.setProperty('--color-brand-500', primary);
  root.style.setProperty('--color-brand-600', dark);
  root.style.setProperty('--color-brand-700', darken(primary, 0.3));
  root.style.setProperty('--status-info', primary);
  // Sidebar menu: active = theme primary; hover = a deep tint of the theme
  // that stays legible on the dark sidebar.
  root.style.setProperty('--menu-hover', `color-mix(in srgb, ${primary} 24%, #0D1B2A)`);
}

export function AntdThemeProvider({ children }: { children: ReactNode }) {
  // Initialize from the persisted theme so antd controls keep the user's
  // selection across refreshes and re-logins (storage is app-level, not
  // session-level, so sign-out does not clear it).
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    const stored = readStoredTheme();
    if (!stored) return themeConfig;
    return themeConfigForKey(stored);
  });

  useEffect(() => {
    // Apply any persisted theme to the global CSS variables on mount.
    const stored = readStoredTheme();
    if (stored) {
      applyGlobalTheme(stored);
    }

    const handleThemeChange = (e: Event) => {
      const color = (e as CustomEvent).detail;
      setTheme(themeConfigForKey(color));
      applyGlobalTheme(color);
    };

    window.addEventListener('koi_theme_changed', handleThemeChange);
    return () => window.removeEventListener('koi_theme_changed', handleThemeChange);
  }, []);

  return (
    <ConfigProvider theme={theme}>
      <AntdApp className="flex h-full w-full min-w-0 flex-1 flex-row">{children}</AntdApp>
    </ConfigProvider>
  );
}

const THEME_STORAGE_KEY = 'koi_admin_theme';

/** Read and validate the persisted theme; returns null when absent/invalid. */
function readStoredTheme(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (!value) return null;
    if (!/^#[0-9a-fA-F]{6}$/.test(value)) return null;
    return value;
  } catch {
    return null;
  }
}

/** Build a theme config with the given primary color (tokens + control outline). */
function themeConfigForKey(primary: string): ThemeConfig {
  return {
    ...themeConfig,
    token: {
      ...themeConfig.token,
      colorPrimary: primary,
      colorInfo: primary,
      colorLink: primary,
      controlOutline: `${primary}29`, // ~16% alpha
    },
  };
}
