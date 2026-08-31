const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const DATE_TIME_WITH_YEAR_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatAdminDate(value?: string | null): string {
  const date = parseDate(value);
  return date ? DATE_FORMATTER.format(date) : '—';
}

export function formatAdminDateTime(value?: string | null): string {
  const date = parseDate(value);
  return date ? DATE_TIME_FORMATTER.format(date) : '—';
}

export function formatAdminDateTimeWithYear(value?: string | null): string {
  const date = parseDate(value);
  return date ? DATE_TIME_WITH_YEAR_FORMATTER.format(date) : '—';
}
