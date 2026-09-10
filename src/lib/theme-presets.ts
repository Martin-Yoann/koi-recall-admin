import { DEFAULT_ADMIN_THEME } from '@/lib/admin-constants';

/** Admin theme presets. Shared by the settings dialog and the profile avatar default. */
export const THEME_PRESETS = [
  { label: 'Navy Blue', value: DEFAULT_ADMIN_THEME },
  { label: 'Midnight', value: '#052745' },
  { label: 'Emerald', value: '#006C49' },
  { label: 'Violet', value: '#7C3AED' },
  { label: 'Rose', value: '#E11D48' },
  { label: 'Amber', value: '#D97706' },
  { label: 'Cyan', value: '#0E7490' },
  { label: 'Slate', value: '#475569' },
] as const;

export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
