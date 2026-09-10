'use client';

import { useMemo, useState } from 'react';
import { Button, Input, Segmented, Select, Switch, Tooltip } from 'antd';
import {
  Bell,
  Check,
  Globe,
  Laptop,
  Moon,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useTheme, type ResolvedThemeMode, type ThemeMode } from '@/components/admin/theme-provider';
import { AdminDialog } from '@/components/admin/admin-dialog';
import { DEFAULT_ADMIN_THEME } from '@/lib/admin-constants';
import { HEX_COLOR_PATTERN, THEME_PRESETS } from '@/lib/theme-presets';
import { formatAdminDateTime } from '@/lib/formatters';
import {
  DATE_FORMATS,
  POLL_INTERVALS,
  SUPPORTED_LOCALES,
  TIME_FORMATS,
  TIMEZONE_AUTO,
  WEEK_STARTS,
  preferences,
  resetAllPreferences,
  type AdminLocale,
  type DateFormat,
  type TimeFormat,
  type WeekStart,
} from '@/lib/preferences';

type SectionKey = 'appearance' | 'regional' | 'notifications';

const SECTIONS: Array<{ key: SectionKey; label: string; icon: typeof Palette }> = [
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'regional', label: 'Language & region', icon: Globe },
  { key: 'notifications', label: 'Notifications', icon: Bell },
];

const LOCALE_LABELS: Record<AdminLocale, string> = {
  'en-US': 'English',
  'zh-CN': '中文',
};

const DATE_FORMAT_LABELS: Record<DateFormat, string> = {
  'MMM d, yyyy': 'Sep 10, 2026',
  'd MMM yyyy': '10 Sep 2026',
  'yyyy-MM-dd': '2026-09-10',
};

const POLL_LABELS: Record<number, string> = {
  30_000: '30s',
  60_000: '1m',
  120_000: '2m',
  300_000: '5m',
};

/** Section wrapper: title, one-line hint, then the controls. */
function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-2">
      <div>
        <label
          htmlFor={htmlFor}
          className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary"
        >
          {label}
        </label>
        {hint && <p className="mt-0.5 text-[11px] leading-snug text-text-tertiary">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] leading-snug text-text-tertiary">{hint}</p>}
      </div>
      <Switch size="small" checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function SettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { mode, resolvedMode, primary, setMode, setPrimary } = useTheme();
  const [section, setSection] = useState<SectionKey>('appearance');

  return (
    <AdminDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Settings"
      description="Preferences apply instantly and are stored in this browser."
      labelId="admin-settings-title"
      icon={SlidersHorizontal}
      size="lg"
      className="h-[560px]"
      footer={
        <>
          <Button
            size="small"
            icon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={() => {
              resetAllPreferences();
              // The theme lives in its own provider (past the preferences
              // store), so it is reset explicitly here.
              setPrimary(DEFAULT_ADMIN_THEME);
              setMode('light');
            }}
          >
            Reset to defaults
          </Button>
          <Button type="primary" size="small" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <div className="flex h-full flex-col sm:flex-row">
        {/* Section nav */}
        <nav
          aria-label="Settings sections"
          className="flex shrink-0 gap-1 border-b p-3 sm:w-52 sm:flex-col sm:border-b-0 sm:border-r"
          style={{ borderColor: 'var(--border)' }}
        >
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = section === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors cursor-pointer sm:flex-none',
                  active
                    ? 'text-white shadow-sm'
                    : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary',
                )}
                style={active ? { background: primary } : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Section body */}
        <div className="min-w-0 flex-1 space-y-5 p-5">
          {section === 'appearance' && (
            <AppearanceSection
              mode={mode}
              resolvedMode={resolvedMode}
              primary={primary}
              setMode={setMode}
              setPrimary={setPrimary}
            />
          )}
          {section === 'regional' && <RegionalSection />}
          {section === 'notifications' && <NotificationsSection />}
        </div>
      </div>
    </AdminDialog>
  );
}

function AppearanceSection({
  mode,
  resolvedMode,
  primary,
  setMode,
  setPrimary,
}: {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  primary: string;
  setMode: (mode: ThemeMode) => void;
  setPrimary: (color: string) => void;
}) {
  const [customHex, setCustomHex] = useState(primary);
  const customValid = HEX_COLOR_PATTERN.test(customHex);
  const sidebarPinned = preferences.sidebarPinned.use();
  const reduceMotion = preferences.reduceMotion.use();

  const applyCustom = (value: string) => {
    setCustomHex(value.startsWith('#') ? value : `#${value}`);
    if (HEX_COLOR_PATTERN.test(value)) setPrimary(value);
  };

  return (
    <>
      <Field
        label="Theme colour"
        hint="Drives buttons, active menu items, links and highlights across the admin."
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {THEME_PRESETS.map((preset) => {
            const active = primary.toLowerCase() === preset.value.toLowerCase();
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => {
                  setPrimary(preset.value);
                  setCustomHex(preset.value);
                }}
                aria-label={`Use ${preset.label} theme`}
                aria-pressed={active}
                title={preset.label}
                className={cn(
                  'flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-[transform,box-shadow]',
                  'hover:scale-110 hover:shadow-md active:scale-95 focus-visible:outline-none',
                  active && 'ring-2 ring-offset-2 ring-brand-500',
                )}
                style={{ background: preset.value }}
              >
                {active && <Check className="h-4 w-4 text-white drop-shadow-sm" />}
              </button>
            );
          })}
        </div>

        {/* Custom colour */}
        <div className="mt-3 flex items-center gap-2">
          <label htmlFor="settings-custom-colour" className="sr-only">
            Custom theme colour
          </label>
          <input
            id="settings-custom-colour"
            type="color"
            value={HEX_COLOR_PATTERN.test(customHex) ? customHex : DEFAULT_ADMIN_THEME}
            onChange={(e) => applyCustom(e.target.value)}
            aria-label="Pick a custom theme colour"
            className="h-9 w-12 cursor-pointer rounded-lg border bg-transparent p-0.5"
            style={{ borderColor: 'var(--border)' }}
          />
          <Input
            value={customHex}
            onChange={(e) => applyCustom(e.target.value)}
            maxLength={7}
            spellCheck={false}
            autoComplete="off"
            aria-label="Custom theme colour hex value"
            status={customValid ? undefined : 'error'}
            className="w-32 font-mono"
          />
          {!customValid && (
            <span className="text-[11px] text-red-600">Use a 6-digit hex, e.g. #3A86FF</span>
          )}
        </div>
      </Field>

      <Field label="Appearance" hint="“System” follows your operating system setting.">
        <Segmented
          value={mode}
          onChange={(value) => setMode(value as ThemeMode)}
          options={[
            { value: 'light', label: <span className="inline-flex items-center gap-1.5"><Sun className="h-3.5 w-3.5" />Light</span> },
            { value: 'dark', label: <span className="inline-flex items-center gap-1.5"><Moon className="h-3.5 w-3.5" />Dark</span> },
            { value: 'system', label: <span className="inline-flex items-center gap-1.5"><Laptop className="h-3.5 w-3.5" />System</span> },
          ]}
        />
        <p className="text-[11px] text-text-tertiary">
          Currently rendering {resolvedMode === 'dark' ? 'dark' : 'light'}.
        </p>
      </Field>

      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        <ToggleRow
          label="Keep the sidebar expanded"
          hint="When off, the sidebar collapses to icons until you hover it."
          checked={sidebarPinned}
          onChange={(next) => preferences.sidebarPinned.set(next)}
        />
        <ToggleRow
          label="Reduce motion"
          hint="Shortens animations and transitions across the interface."
          checked={reduceMotion}
          onChange={(next) => preferences.reduceMotion.set(next)}
        />
      </div>
    </>
  );
}

function RegionalSection() {
  const locale = preferences.locale.use();
  const timezone = preferences.timezone.use();
  const dateFormat = preferences.dateFormat.use();
  const timeFormat = preferences.timeFormat.use();
  const weekStart = preferences.weekStart.use();

  const timeZones = useMemo(() => {
    try {
      return Intl.supportedValuesOf('timeZone');
    } catch {
      return [];
    }
  }, []);
  const detectedZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  const timeZoneOptions = useMemo(
    () => [
      { value: TIMEZONE_AUTO, label: `Automatic (${detectedZone})` },
      ...timeZones.map((zone) => ({ value: zone, label: zone.replace(/_/g, ' ') })),
    ],
    [timeZones, detectedZone],
  );

  // Live example so the format choice is self-explanatory.
  const example = formatAdminDateTime(new Date().toISOString());

  return (
    <>
      <Field
        label="Language"
        hint="Changes built-in labels and date formats. Page copy stays English for now."
      >
        <Segmented
          value={locale}
          onChange={(value) => preferences.locale.set(value as AdminLocale)}
          options={SUPPORTED_LOCALES.map((value) => ({
            value,
            label: LOCALE_LABELS[value],
          }))}
        />
      </Field>

      <Field
        label="Time zone"
        hint="Applies to every timestamp."
        htmlFor="settings-timezone"
      >
        <Select
          id="settings-timezone"
          value={timezone}
          onChange={(value) => preferences.timezone.set(value)}
          className="w-full sm:w-72"
          showSearch
          optionFilterProp="label"
          options={timeZoneOptions}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Time format">
          <Segmented
            value={timeFormat}
            onChange={(value) => preferences.timeFormat.set(value as TimeFormat)}
            options={TIME_FORMATS.map((value) => ({
              value,
              label: value === '12h' ? '12-hour' : '24-hour',
            }))}
          />
        </Field>
        <Field label="Week starts on">
          <Segmented
            value={weekStart}
            onChange={(value) => preferences.weekStart.set(value as WeekStart)}
            options={WEEK_STARTS.map((value) => ({
              value,
              label: value === 'monday' ? 'Monday' : 'Sunday',
            }))}
          />
        </Field>
      </div>

      <Field label="Date format" hint={`Date and time now render as: ${example}`}>
        <Segmented
          value={dateFormat}
          onChange={(value) => preferences.dateFormat.set(value as DateFormat)}
          options={DATE_FORMATS.map((value) => ({
            value,
            label: DATE_FORMAT_LABELS[value],
          }))}
        />
      </Field>
    </>
  );
}

function NotificationsSection() {
  const enabled = preferences.notificationsEnabled.use();
  const pollMs = preferences.notificationPollMs.use();
  const desktop = preferences.notificationDesktop.use();
  const sound = preferences.notificationSound.use();

  const desktopSupported = typeof window !== 'undefined' && 'Notification' in window;
  const permission = desktopSupported ? Notification.permission : 'denied';

  const toggleDesktop = async (next: boolean) => {
    if (!next) {
      preferences.notificationDesktop.set(false);
      return;
    }
    if (!desktopSupported) return;
    const result = permission === 'granted' ? 'granted' : await Notification.requestPermission();
    preferences.notificationDesktop.set(result === 'granted');
  };

  return (
    <>
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        <ToggleRow
          label="New-submission alerts"
          hint="Polls for newly submitted cases and shows them in the header bell."
          checked={enabled}
          onChange={(next) => preferences.notificationsEnabled.set(next)}
        />
      </div>

      <Field
        label="Refresh interval"
        hint={enabled ? 'How often the bell checks for new submissions.' : 'Enable alerts to change this.'}
      >
        <Segmented
          value={pollMs}
          disabled={!enabled}
          onChange={(value) => preferences.notificationPollMs.set(Number(value))}
          options={POLL_INTERVALS.map((value) => ({ value, label: POLL_LABELS[value] ?? `${value / 1000}s` }))}
        />
      </Field>

      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        <ToggleRow
          label="Desktop notifications"
          hint={
            !desktopSupported
              ? 'Not supported by this browser.'
              : permission === 'denied'
                ? 'Blocked in the browser — allow notifications for this site to enable.'
                : 'Show a system notification when a new case arrives.'
          }
          checked={desktop}
          disabled={!enabled || !desktopSupported || permission === 'denied'}
          onChange={(next) => {
            void toggleDesktop(next);
          }}
        />
        <ToggleRow
          label="Alert sound"
          hint="Play a short tone when a new submission arrives."
          checked={sound}
          disabled={!enabled}
          onChange={(next) => preferences.notificationSound.set(next)}
        />
      </div>

      <div className="flex items-start gap-2 rounded-lg p-3 text-[11px] leading-snug text-text-tertiary" style={{ background: 'var(--surface-secondary)' }}>
        <Tooltip title="Preferences are stored in this browser only.">
          <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        </Tooltip>
        <p>
          Notification settings apply to this browser. Desktop notifications require permission and
          a secure (HTTPS or localhost) connection.
        </p>
      </div>
    </>
  );
}
