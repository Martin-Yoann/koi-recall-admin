// ============================================================
// KOI — Shared Claims Store
// Bridges KOI-web ↔ KOI-admin ↔ KOI-backend
//
// Two-tier architecture:
//   Tier 1 (Demo): localStorage bridge — consumer submits via web,
//                  admin reads/updates from same localStorage key.
//   Tier 2 (API):  Backend-mediated — consumer submits via public API,
//                  admin manages via B-end admin API.
//
// In demo mode, localStorage is the source of truth.
// When API is connected, localStorage acts as a client-side cache
// that syncs from the backend.
// ============================================================

import {
  listCases as apiListCases,
  getCaseDetail as apiGetCaseDetail,
  transitionCaseStatus as apiTransitionStatus,
  isPhase1NotImplemented,
} from '@/lib/api-client';

export type ClaimStatus =
  | 'submitted' | 'under_review' | 'verified'
  | 'remedy_issued' | 'resolved' | 'rejected';

export interface SharedClaim {
  id: string;
  claimNumber: string;
  campaignId: string;
  campaignTitle: string;
  campaignSlug: string;
  consumerName: string;
  consumerEmail: string;
  consumerPhone: string;
  productName: string;
  shape?: string;
  flavor?: string;
  lotCode?: string;
  dateCode?: string;
  remedyId: string;
  remedyTitle: string;
  remedyType: string;
  refundAmount?: number;
  status: ClaimStatus;
  evidenceCount: number;
  submittedAt: string;
  updatedAt: string;
  resolutionDate?: string;
  adminNotes?: string;
  /** Source of this claim: 'local' (localStorage only) or 'api' (backend-synced) */
  _source?: 'local' | 'api';
}

const STORAGE_KEY = 'koi_shared_claims';
const API_SYNCED_KEY = 'koi_api_synced';

// ── Helpers ────────────────────────────────────────────

function readAll(): SharedClaim[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeAll(claims: SharedClaim[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
}

function generateRef(): string {
  const seq = readAll().length + 1;
  return `KOI-${String(seq).padStart(4, '0')}`;
}

/** Check if we're in API-connected mode (backend returns non-501) */
async function isApiAvailable(): Promise<boolean> {
  try {
    const result = await apiListCases({ limit: 1 });
    if (result.ok || !isPhase1NotImplemented(result)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ── Public API ──────────────────────────────────────────

/** Get all claims (from localStorage cache) */
export function getAllClaims(): SharedClaim[] {
  return readAll();
}

/** Get claims by status */
export function getClaimsByStatus(status: ClaimStatus): SharedClaim[] {
  return readAll().filter((c) => c.status === status);
}

/** Get claims by campaign */
export function getClaimsByCampaign(campaignId: string): SharedClaim[] {
  return readAll().filter((c) => c.campaignId === campaignId);
}

/** Get a single claim */
export function getClaimByNumber(claimNumber: string): SharedClaim | undefined {
  return readAll().find((c) => c.claimNumber === claimNumber);
}

/** Consumer: submit new claim (localStorage path) */
export function submitClaim(data: {
  campaignId: string;
  campaignTitle: string;
  campaignSlug: string;
  consumerName: string;
  consumerEmail: string;
  consumerPhone: string;
  productName: string;
  shape?: string;
  flavor?: string;
  lotCode?: string;
  dateCode?: string;
  remedyId: string;
  remedyTitle: string;
  remedyType: string;
  refundAmount?: number;
  evidenceCount?: number;
}): SharedClaim {
  const claims = readAll();
  const now = new Date().toISOString();
  const claim: SharedClaim = {
    ...data,
    id: `cl_${Date.now()}`,
    claimNumber: generateRef(),
    status: 'submitted',
    evidenceCount: data.evidenceCount ?? 0,
    submittedAt: now,
    updatedAt: now,
    _source: 'local',
  };
  claims.push(claim);
  writeAll(claims);
  return claim;
}

/** Admin: update claim status (localStorage path) */
export function updateClaimStatus(
  claimNumber: string,
  newStatus: ClaimStatus,
  adminNotes?: string,
): SharedClaim | null {
  const claims = readAll();
  const idx = claims.findIndex((c) => c.claimNumber === claimNumber);
  if (idx === -1) return null;
  claims[idx] = {
    ...claims[idx],
    status: newStatus,
    updatedAt: new Date().toISOString(),
    ...(newStatus === 'resolved' || newStatus === 'rejected'
      ? { resolutionDate: new Date().toISOString() }
      : {}),
    ...(adminNotes ? { adminNotes } : {}),
  };
  writeAll(claims);
  return claims[idx];
}

// ── API-backed operations ───────────────────────────────

/** Admin: update claim status via backend API */
export async function updateClaimStatusViaApi(
  caseRef: string,
  newStatus: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const result = await apiTransitionStatus(caseRef, {
    status: newStatus,
    reason,
  });

  if (result.ok) {
    // Also update local cache
    const claims = readAll();
    const idx = claims.findIndex((c) => c.claimNumber === caseRef);
    if (idx !== -1) {
      claims[idx] = {
        ...claims[idx],
        status: newStatus as ClaimStatus,
        updatedAt: new Date().toISOString(),
        ...(newStatus === 'resolved' || newStatus === 'rejected'
          ? { resolutionDate: new Date().toISOString() }
          : {}),
        ...(reason ? { adminNotes: reason } : {}),
        _source: 'api',
      };
      writeAll(claims);
    }
    return { success: true };
  }

  return {
    success: false,
    error: result.error?.detail ?? 'Failed to update claim status',
  };
}

/** Sync claims from backend API into localStorage cache */
export async function syncClaimsFromApi(): Promise<{
  synced: number;
  error?: string;
}> {
  try {
    const available = await isApiAvailable();
    if (!available) {
      return { synced: 0, error: 'Backend API not available (Phase 1 / 501)' };
    }

    const result = await apiListCases({ limit: 100 });
    if (!result.ok) {
      return { synced: 0, error: result.error?.detail ?? 'Failed to fetch cases' };
    }

    const apiCases = result.data.cases;
    const existing = readAll();
    const existingMap = new Map(existing.map((c) => [c.claimNumber, c]));

    let synced = 0;
    for (const c of apiCases) {
      const existingClaim = existingMap.get(c.caseRef);
      if (existingClaim) {
        // Update existing
        Object.assign(existingClaim, {
          status: c.status,
          updatedAt: c.submittedAt, // API provides timestamps
          _source: 'api' as const,
        });
      } else {
        // Add new from API
        existing.push({
          id: `api_${c.caseRef}`,
          claimNumber: c.caseRef,
          campaignId: c.campaignCode,
          campaignTitle: '',
          campaignSlug: c.campaignCode,
          consumerName: c.consumerNameMasked,
          consumerEmail: '',
          consumerPhone: '',
          productName: '',
          remedyId: '',
          remedyTitle: '',
          remedyType: '',
          status: mapApiStatus(c.status),
          evidenceCount: 0,
          submittedAt: c.submittedAt,
          updatedAt: c.submittedAt,
          _source: 'api',
        });
        synced++;
      }
    }

    writeAll(existing);
    localStorage.setItem(API_SYNCED_KEY, new Date().toISOString());
    return { synced };
  } catch (err) {
    return { synced: 0, error: err instanceof Error ? err.message : 'Unknown sync error' };
  }
}

/** Get last API sync timestamp */
export function getLastSyncTime(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(API_SYNCED_KEY);
}

// ── Stats ───────────────────────────────────────────────

/** Admin: get dashboard stats */
export function getSharedStats() {
  const all = readAll();
  const pending = all.filter(
    (c) => c.status === 'submitted' || c.status === 'under_review',
  ).length;
  const resolved = all.filter((c) => c.status === 'resolved').length;
  const rejected = all.filter((c) => c.status === 'rejected').length;
  return {
    total: all.length,
    pending,
    resolved,
    rejected,
    rate: all.length > 0 ? Math.round((resolved / all.length) * 100) : 0,
    lastSync: getLastSyncTime(),
  };
}

// ── Seed ────────────────────────────────────────────────

/** Seed demo data if store is empty */
export function seedIfEmpty(
  campaigns: Array<{ id: string; title: string; slug: string }>,
) {
  if (typeof window === 'undefined') return;
  const existing = readAll();
  if (existing.length > 0) return;

  const demo: SharedClaim[] = [
    {
      id: 'sd_001',
      claimNumber: 'KOI-0001',
      campaignId: campaigns[0]?.id ?? 'cmp_001',
      campaignTitle: campaigns[0]?.title ?? '',
      campaignSlug: campaigns[0]?.slug ?? '',
      consumerName: 'Sarah Chen',
      consumerEmail: 'sarah.chen@email.com',
      consumerPhone: '13812341234',
      productName: 'Music Lollipop',
      shape: 'Bear',
      flavor: 'Peach',
      lotCode: 'ML-2406-A',
      dateCode: '06/2024',
      remedyId: 'replacement',
      remedyTitle: 'Replacement',
      remedyType: 'replacement',
      status: 'verified',
      evidenceCount: 2,
      submittedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      _source: 'local',
    },
    {
      id: 'sd_002',
      claimNumber: 'KOI-0002',
      campaignId: campaigns[0]?.id ?? 'cmp_001',
      campaignTitle: campaigns[0]?.title ?? '',
      campaignSlug: campaigns[0]?.slug ?? '',
      consumerName: 'James Wilson',
      consumerEmail: 'jwilson@email.com',
      consumerPhone: '18611223344',
      productName: 'Music Lollipop',
      shape: 'Heart',
      flavor: 'Peach',
      lotCode: 'ML-2408-C',
      dateCode: '08/2024',
      remedyId: 'replacement',
      remedyTitle: 'Replacement',
      remedyType: 'replacement',
      status: 'under_review',
      evidenceCount: 2,
      submittedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      _source: 'local',
    },
    {
      id: 'sd_003',
      claimNumber: 'KOI-0003',
      campaignId: campaigns[0]?.id ?? 'cmp_001',
      campaignTitle: campaigns[0]?.title ?? '',
      campaignSlug: campaigns[0]?.slug ?? '',
      consumerName: 'Emily Davis',
      consumerEmail: 'emily.d@email.com',
      consumerPhone: '13956785678',
      productName: 'Music Lollipop',
      shape: 'Strawberry',
      flavor: 'Strawberry',
      lotCode: 'ML-2406-A',
      dateCode: '06/2024',
      remedyId: 'refund',
      remedyTitle: 'Refund',
      remedyType: 'refund',
      refundAmount: 5.99,
      status: 'submitted',
      evidenceCount: 1,
      submittedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      _source: 'local',
    },
    {
      id: 'sd_004',
      claimNumber: 'KOI-0004',
      campaignId: campaigns[0]?.id ?? 'cmp_001',
      campaignTitle: campaigns[0]?.title ?? '',
      campaignSlug: campaigns[0]?.slug ?? '',
      consumerName: 'Amanda Torres',
      consumerEmail: 'atorres@email.com',
      consumerPhone: '15287654321',
      productName: 'Music Lollipop',
      shape: 'Bear',
      flavor: 'Strawberry',
      lotCode: 'ML-2407-B',
      dateCode: '07/2024',
      remedyId: 'refund',
      remedyTitle: 'Refund',
      remedyType: 'refund',
      refundAmount: 5.99,
      status: 'resolved',
      evidenceCount: 1,
      submittedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      resolutionDate: new Date(Date.now() - 15 * 86400000).toISOString(),
      _source: 'local',
    },
  ];
  writeAll(demo);
}

// ── Helpers ────────────────────────────────────────────

function mapApiStatus(apiStatus: string): ClaimStatus {
  const mapping: Record<string, ClaimStatus> = {
    submitted: 'submitted',
    under_review: 'under_review',
    verified: 'verified',
    remedy_issued: 'remedy_issued',
    resolved: 'resolved',
    rejected: 'rejected',
  };
  return mapping[apiStatus] ?? 'submitted';
}
