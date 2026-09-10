'use client';

import { useSyncExternalStore } from 'react';

/**
 * Tiny localStorage-backed preference primitives, modelled on the existing
 * theme provider: localStorage is the source of truth, a custom event keeps the
 * current tab in sync, and `storage` covers other tabs. Values are validated on
 * read so a corrupt or stale entry always falls back to the default.
 */

export const PREFERENCE_EVENT = 'koi_pref_changed';

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(PREFERENCE_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(PREFERENCE_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

function notify(key: string): void {
  window.dispatchEvent(new CustomEvent(PREFERENCE_EVENT, { detail: { key } }));
}

export interface Preference<T> {
  readonly key: string;
  readonly fallback: T;
  get: () => T;
  set: (value: T) => void;
  /** Clears the stored value so the default applies again. */
  reset: () => void;
  use: () => T;
}

function base<T extends string | number | boolean>(
  key: string,
  fallback: T,
  readStored: (raw: string) => T,
): Preference<T> {
  const get = (): T => {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : readStored(raw);
  };
  return {
    key,
    fallback,
    get,
    set(value: T) {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(key, String(value));
      notify(key);
    },
    reset() {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(key);
      notify(key);
    },
    use: () => useSyncExternalStore(subscribe, get, () => fallback),
  };
}

/** A preference constrained to a fixed set of values. */
export function enumPreference<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[],
): Preference<T> {
  return base<T>(key, fallback, (raw) => (allowed.includes(raw as T) ? (raw as T) : fallback));
}

export function booleanPreference(key: string, fallback: boolean): Preference<boolean> {
  return base<boolean>(key, fallback, (raw) =>
    raw === 'true' ? true : raw === 'false' ? false : fallback,
  );
}

export function numberPreference(
  key: string,
  fallback: number,
  allowed: readonly number[],
): Preference<number> {
  return base<number>(key, fallback, (raw) => {
    const parsed = Number(raw);
    return Number.isFinite(parsed) && allowed.includes(parsed) ? parsed : fallback;
  });
}

// ── Language & region ────────────────────────────────────────────────────────
export const SUPPORTED_LOCALES = ['en-US', 'zh-CN'] as const;
export type AdminLocale = (typeof SUPPORTED_LOCALES)[number];

export const TIMEZONE_AUTO = 'auto';

export const DATE_FORMATS = ['MMM d, yyyy', 'd MMM yyyy', 'yyyy-MM-dd'] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export const TIME_FORMATS = ['12h', '24h'] as const;
export type TimeFormat = (typeof TIME_FORMATS)[number];

export const WEEK_STARTS = ['sunday', 'monday'] as const;
export type WeekStart = (typeof WEEK_STARTS)[number];

// ── Notifications ────────────────────────────────────────────────────────────
export const POLL_INTERVALS = [30_000, 60_000, 120_000, 300_000] as const;

export const preferences = {
  locale: enumPreference<AdminLocale>('koi_admin_locale', 'en-US', SUPPORTED_LOCALES),
  timezone: base<string>('koi_admin_timezone', TIMEZONE_AUTO, (raw) => raw),
  dateFormat: enumPreference<DateFormat>('koi_admin_date_format', 'MMM d, yyyy', DATE_FORMATS),
  timeFormat: enumPreference<TimeFormat>('koi_admin_time_format', '12h', TIME_FORMATS),
  weekStart: enumPreference<WeekStart>('koi_admin_week_start', 'sunday', WEEK_STARTS),
  reduceMotion: booleanPreference('koi_admin_reduce_motion', false),
  sidebarPinned: booleanPreference('koi_admin_sidebar_pinned', true),
  notificationsEnabled: booleanPreference('koi_admin_notifications_enabled', true),
  notificationPollMs: numberPreference('koi_admin_notification_poll_ms', 60_000, POLL_INTERVALS),
  notificationDesktop: booleanPreference('koi_admin_notification_desktop', false),
  notificationSound: booleanPreference('koi_admin_notification_sound', false),
} as const;

/**
 * Restores every preference in this store to its default. The theme colour and
 * light/dark mode are owned by `ThemeProvider` and are reset separately.
 */
export function resetAllPreferences(): void {
  Object.values(preferences).forEach((preference) => preference.reset());
}
