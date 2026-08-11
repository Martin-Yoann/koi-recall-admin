// ============================================================
// KOI Admin — Admin Constants
// ============================================================

import type { NavItem } from '@/types';

// === Shared Risk Color Config (single source of truth) ===
export const RISK_COLORS: Record<string, string> = {
  critical: 'bg-red-50 text-red-600 border-red-200',
  high: 'bg-orange-50 text-orange-600 border-orange-200',
  moderate: 'bg-amber-50 text-amber-600 border-amber-200',
  low: 'bg-blue-50 text-blue-600 border-blue-200',
};

// === Top Navigation ===
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Campaigns', href: '/campaigns' },
  { label: 'Claims', href: '/claims' },
];

// === Status Labels ===
export const RISK_LEVEL_LABELS: Record<string, string> = {
  low: 'Low Risk',
  moderate: 'Moderate Risk',
  high: 'High Risk',
  critical: 'Critical Risk',
};

export const RECALL_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  closed: 'Closed',
  pending: 'Pending',
  expanded: 'Expanded',
};

export const CLAIM_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  verified: 'Verified',
  remedy_issued: 'Remedy Issued',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

export const REMEDY_TYPE_LABELS: Record<string, string> = {
  refund: 'Refund',
  replacement: 'Replacement',
  repair: 'Repair',
  disposal_instruction: 'Disposal Instructions',
  voucher: 'Voucher',
};

export const INCIDENT_SEVERITY_LABELS: Record<string, string> = {
  minor: 'Minor',
  moderate: 'Moderate',
  serious: 'Serious',
  fatal: 'Fatal',
};

// === File Upload ===
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'application/pdf',
];
export const ALLOWED_FILE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic', '.heif', '.pdf'];

// === Claim Status Workflow Transitions ===
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  submitted: ['under_review', 'rejected'],
  under_review: ['verified', 'rejected'],
  verified: ['remedy_issued', 'rejected'],
  remedy_issued: ['resolved'],
  resolved: [],
  rejected: [],
};

/** Map claim status to display label for badges (shared with StatusBadge variant keys) */
export const claimStatusLabels: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  verified: 'Verified',
  remedy_issued: 'Remedy Issued',
  resolved: 'Resolved',
  rejected: 'Rejected',
};
