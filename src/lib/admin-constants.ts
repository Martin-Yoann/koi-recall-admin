// ============================================================
// KOI Admin — Admin Constants
// Case status transitions are owned by the backend workflow
// policy (koi-recall-backend src/modules/workflow/policy.ts) and
// surfaced to the UI via workflow.allowedActions — no local copy.
// ============================================================

import type { NavItem } from '@/types';

export const DEFAULT_ADMIN_THEME = '#3A86FF';
export const ADMIN_THEME_STORAGE_KEY = 'koi_admin_theme';
export const ADMIN_MODE_STORAGE_KEY = 'koi_admin_mode';

// === Cross-page refresh events ===
/**
 * Window event fired after any mutation that can change the case list or the
 * new-submissions count (status transitions, assignments, resolution actions,
 * reportability closes). The shell bell and notification drawer listen for it
 * to refresh without waiting for their polling interval.
 */
export const CASES_UPDATED_EVENT = 'koi_cases_updated';

// === Top Navigation ===
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Campaigns', href: '/campaigns' },
  { label: 'Cases', href: '/cases' },
];

// === File Upload ===
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
