import {
  preferences,
  TIMEZONE_AUTO,
  type AdminLocale,
  type DateFormat,
  type TimeFormat,
} from '@/lib/preferences';

type FormatKind = 'date' | 'dateTime' | 'dateTimeWithYear';

/**
 * Locale tags per language preference. The date-format choice picks the part
 * order (US vs day-first); the language preference picks the month/label
 * language. ISO output is numeric-only, so a fixed tag is safe there.
 */
const LANGUAGE_TAGS: Record<AdminLocale, { us: string; dayFirst: string }> = {
  'en-US': { us: 'en-US', dayFirst: 'en-GB' },
  // Chinese has one canonical ordering; both slots use the same tag.
  'zh-CN': { us: 'zh-CN', dayFirst: 'zh-CN' },
};
const ISO_TAG = 'en-CA';

function localeTag(locale: AdminLocale, dateFormat: DateFormat): string {
  if (dateFormat === 'yyyy-MM-dd') return ISO_TAG;
  return dateFormat === 'd MMM yyyy' ? LANGUAGE_TAGS[locale].dayFirst : LANGUAGE_TAGS[locale].us;
}

function optionsFor(
  kind: FormatKind,
  dateFormat: DateFormat,
  timeFormat: TimeFormat,
): Intl.DateTimeFormatOptions {
  const time: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  };
  const dayMonth: Intl.DateTimeFormatOptions =
    dateFormat === 'yyyy-MM-dd'
      ? { month: '2-digit', day: '2-digit' }
      : { month: 'short', day: 'numeric' };

  if (kind === 'date') return { year: 'numeric', ...dayMonth };
  if (kind === 'dateTime') return { ...dayMonth, ...time };
  return { year: 'numeric', ...dayMonth, ...time };
}

function safeTimeZone(): string | undefined {
  const tz = preferences.timezone.get();
  return tz === TIMEZONE_AUTO ? undefined : tz;
}

const cache = new Map<string, Intl.DateTimeFormat>();

/**
 * Builds (and memoises) a formatter from the current preferences. Preferences
 * are read per call so a settings change takes effect immediately; the memo key
 * keeps repeated renders cheap.
 */
function formatter(kind: FormatKind): Intl.DateTimeFormat {
  const locale = preferences.locale.get();
  const dateFormat = preferences.dateFormat.get();
  const timeFormat = preferences.timeFormat.get();
  const timeZone = safeTimeZone();
  const key = `${kind}|${locale}|${dateFormat}|${timeFormat}|${timeZone ?? 'auto'}`;
  const cached = cache.get(key);
  if (cached) return cached;

  let built: Intl.DateTimeFormat;
  try {
    built = new Intl.DateTimeFormat(localeTag(locale, dateFormat), {
      ...optionsFor(kind, dateFormat, timeFormat),
      ...(timeZone ? { timeZone } : {}),
    });
  } catch {
    // Invalid/unsupported time zone: fall back to the browser default.
    built = new Intl.DateTimeFormat(localeTag(locale, dateFormat), optionsFor(kind, dateFormat, timeFormat));
  }
  cache.set(key, built);
  return built;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatAdminDate(value?: string | null): string {
  const date = parseDate(value);
  return date ? formatter('date').format(date) : '—';
}

export function formatAdminDateTime(value?: string | null): string {
  const date = parseDate(value);
  return date ? formatter('dateTime').format(date) : '—';
}

export function formatAdminDateTimeWithYear(value?: string | null): string {
  const date = parseDate(value);
  return date ? formatter('dateTimeWithYear').format(date) : '—';
}
