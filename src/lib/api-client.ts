// ============================================================
// KOI Admin — API Client
// Uses generated types from openapi-typescript (src/types/api.ts)
// Phase 1: 501 → callers should fall back to mock data
// ============================================================

import type { paths, components } from '@/types/api';

// ── Convenience type aliases from generated paths ──

export type GetCampaignOk = paths['/v1/recall-campaigns/{slug}']['get']['responses'][200]['content']['application/json'];
export type ProductCheckBody = paths['/v1/recall-campaigns/{slug}/product-checks']['post']['requestBody']['content']['application/json'];
export type ProductCheckOk = paths['/v1/recall-campaigns/{slug}/product-checks']['post']['responses'][200]['content']['application/json'];

export type CampaignView = GetCampaignOk['campaign'];
export type ProblemDetails = components['schemas']['ProblemDetails'];

// ── Admin B-end types (inline until openapi-typescript regenerates with admin paths) ──

export interface StaffPrincipal {
  staffUserId: string;
  email: string;
  displayName: string;
  role: 'viewer' | 'reviewer' | 'compliance' | 'administrator';
}

export interface StaffLoginRequest {
  email: string;
  password: string;
}

export interface StaffLoginResponse {
  token: string;
  sessionId: string;
  expiresAt: string;
  displayName?: string;
  avatarDataUrl?: string | null;
}

export interface StaffSession {
  sessionId: string;
  staffUserId: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface CaseResolutionSummary {
  requestedType: 'replacement' | 'refund' | null;
  approvedType: 'replacement' | 'refund' | null;
  status: 'requested' | 'approved' | 'externally_completed' | 'cancelled';
}

export interface CaseWorkflow {
  currentStage: string;
  responsibleDepartment: 'customer_service' | 'compliance' | 'logistics' | 'finance' | 'none';
  nextAction: string;
  allowedActions: string[];
  blockingReasons: string[];
  publicStatus: string;
}

export interface CaseSummary {
  caseReference: string;
  status: string;
  subtype: string;
  incidentFlag: boolean;
  submittedAt: string;
  assignedToStaffUserId?: string | null;
  assignedAt?: string | null;
  resolution?: CaseResolutionSummary | null;
  workflow?: CaseWorkflow | null;
}

export interface CaseListResponse {
  cases: CaseSummary[];
  total?: number;
  cursor?: string;
}

export interface CaseConsumer {
  piiTier: 'masked' | 'raw';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode: string;
  address?: { raw: string };
}

export interface CaseResolution {
  id: string;
  caseId: string;
  requestedType: 'replacement' | 'refund' | null;
  requestedRemedyOptionId: string | null;
  approvedType: 'replacement' | 'refund' | null;
  status: 'requested' | 'approved' | 'externally_completed' | 'cancelled';
  refundAmountMinor: number | null;
  currency: string | null;
  approvedByStaffUserId: string | null;
  approvedAt: string | null;
  externalReference: string | null;
  completedByStaffUserId: string | null;
  completedAt: string | null;
  version: number;
}

interface CaseResolutionResponse {
  resolution: CaseResolution;
}

export interface CaseEvent {
  id: string;
  eventType: string;
  actorType: string;
  actorId: string | null;
  data: Record<string, unknown>;
  occurredAt: string;
}

export interface CaseDetail {
  caseReference: string;
  status: string;
  subtype: string;
  incidentFlag: boolean;
  submittedAt: string;
  assignedToStaffUserId: string | null;
  assignedAt: string | null;
  consumer: CaseConsumer;
  resolution?: CaseResolution | null;
  workflow?: CaseWorkflow | null;
  events?: CaseEvent[];
}

/** GET /admin/cases/{caseRef} wraps the detail in a `case` key */
export interface CaseDetailResponse {
  case: CaseDetail;
}

export interface CaseAssignRequest {
  staffUserId: string;
}

export interface CaseStatusTransitionRequest {
  status: string;
  reason?: string;
}

export interface StaffUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: 'active' | 'disabled';
  lastLoginAt: string | null;
  avatarDataUrl: string | null;
}

export interface CreateStaffRequest {
  email: string;
  password: string;
  displayName: string;
  role: string;
}

export interface UpdateStaffRequest {
  displayName?: string;
  role?: string;
  status?: string;
}

export interface IncidentSummary {
  incidentId: string;
  caseReference: string;
  eventTypes: string[];
  companyObtainedAt: string | null;
  injurySeverity: string | null;
  reportabilityReviewId: string | null;
  reportabilityStatus: 'pending' | 'filed' | 'documented_non_reportable' | null;
  reviewerId: string | null;
  nextAction: string;
}

export interface IncidentListResponse {
  incidents: IncidentSummary[];
}

export interface RefundExportBatch {
  batchId: string;
  createdAt: string;
  createdBy: string;
  purpose: string;
  rowCount: number;
  fileSha256: string;
}

export interface RefundExportHistoryResponse {
  batches: RefundExportBatch[];
}

export interface RefundExportResponse {
  csv: string;
  batchId: string | null;
  sha256: string | null;
  filename: string | null;
}

export interface AuditEvent {
  id: string;
  actorUserId: string | null;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  outcome: 'success' | 'failure' | 'forbidden' | 'denied';
  reasonCode?: string | null;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}

export interface AuditQueryResponse {
  events: AuditEvent[];
  total?: number;
  cursor?: string;
}

export interface ReportabilityReview {
  reviewId: string;
  incidentId: string;
  caseRef: string;
  status: string;
  reviewerStaffUserId?: string;
  decision?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Runtime ──

const ONLINE_API_BASE = 'https://koi-recall-backend.vercel.app';

const configuredApi = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');

// Default to the deployed API. Local development remains opt-in through
// NEXT_PUBLIC_API_URL so production builds never try a visitor's localhost.
const PRIMARY_API_BASE = configuredApi || ONLINE_API_BASE;

// When the primary points at a local backend that isn't running, transparently
// fall back to the deployed API so the admin panel keeps working. Only localhost
// URLs get an online fallback — an explicitly configured remote URL is used as-is.
const isLocalPrimary = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(PRIMARY_API_BASE);
const API_BASES: string[] =
  isLocalPrimary && PRIMARY_API_BASE !== ONLINE_API_BASE
    ? [PRIMARY_API_BASE, ONLINE_API_BASE]
    : [PRIMARY_API_BASE];

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ProblemDetails; status: number };

function toProblemDetails(body: unknown, status: number, statusText: string): ProblemDetails {
  if (
    body &&
    typeof body === 'object' &&
    'type' in body &&
    typeof (body as { type?: unknown }).type === 'string'
  ) {
    return body as ProblemDetails;
  }

  return {
    type: 'about:blank',
    title: statusText || 'Request failed',
    status,
    detail:
      body && typeof body === 'object' && 'detail' in body && typeof (body as { detail?: unknown }).detail === 'string'
        ? (body as { detail: string }).detail
        : 'Request failed.',
  };
}


function requestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function fetchApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  const rid = requestId();

  for (const base of API_BASES) {
    const url = `${base}${path}`;

    try {
      const res = await fetch(url, {
        ...options,
        // Prevent an unreachable API from leaving page-level loading states
        // pending indefinitely.
        signal: options.signal ?? AbortSignal.timeout(10_000),
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': rid,
          ...options.headers,
        },
      });

      if (res.ok) {
        // 204 No Content
        if (res.status === 204) {
          return { ok: true, data: undefined as unknown as T };
        }
        const data = (await res.json()) as T;
        return { ok: true, data };
      }

      const body = await res.json().catch(() => null);
      const problem: ProblemDetails = body?.type
        ? (body as ProblemDetails)
        : {
            type: 'about:blank',
            title: res.statusText,
            status: res.status,
            detail: body?.detail ?? 'Unexpected error',
            requestId: rid,
          };
      return { ok: false, error: problem, status: res.status };
    } catch {
      // Network error (e.g. local backend not running) — try the next base.
    }
  }

  return {
    ok: false,
    error: {
      type: 'about:blank',
      title: 'Network Error',
      status: 0,
      detail: 'Could not reach the API server.',
      requestId: rid,
    },
    status: 0,
  };
}

// ── Auth header helper ──

let adminSessionToken: string | null = null;

export function setAdminSessionToken(token: string | null) {
  adminSessionToken = token;
}

export function getAdminSessionToken(): string | null {
  return adminSessionToken;
}

function authHeaders(): Record<string, string> {
  if (adminSessionToken) {
    return { Authorization: `Bearer ${adminSessionToken}` };
  }
  return {};
}

// ── Public API methods (shared with koi-recall-web) ──

/** GET /v1/recall-campaigns/{slug} */
export async function getCampaign(
  slug: string,
  locale = 'en-US',
): Promise<ApiResult<GetCampaignOk>> {
  return fetchApi<GetCampaignOk>(
    `/v1/recall-campaigns/${slug}?locale=${encodeURIComponent(locale)}`,
  );
}

/** POST /v1/recall-campaigns/{slug}/product-checks */
export async function checkProduct(
  slug: string,
  body: ProductCheckBody,
): Promise<ApiResult<ProductCheckOk>> {
  return fetchApi<ProductCheckOk>(
    `/v1/recall-campaigns/${slug}/product-checks`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

// ── Admin B-end API methods ──

// -- Staff Auth --

/** POST /admin/sessions — Staff login */
export async function staffLogin(
  body: StaffLoginRequest,
): Promise<ApiResult<StaffLoginResponse>> {
  const result = await fetchApi<StaffLoginResponse>('/admin/sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (result.ok) {
    setAdminSessionToken(result.data.token);
  }
  return result;
}

/** DELETE /admin/sessions — Staff logout */
export async function staffLogout(): Promise<ApiResult<void>> {
  const result = await fetchApi<void>('/admin/sessions', {
    method: 'DELETE',
    headers: authHeaders(),
  });
  setAdminSessionToken(null);
  return result;
}

/** POST /admin/sessions/refresh — Refresh session token */
export async function refreshSession(): Promise<ApiResult<StaffLoginResponse>> {
  const result = await fetchApi<StaffLoginResponse>('/admin/sessions/refresh', {
    method: 'POST',
    headers: authHeaders(),
  });
  if (result.ok) {
    setAdminSessionToken(result.data.token);
  }
  return result;
}

/** PATCH /admin/profile — Update own display name and/or avatar */
export async function updateOwnProfile(body: {
  displayName?: string;
  avatarDataUrl?: string | null;
}): Promise<ApiResult<{ displayName: string; avatarDataUrl: string | null }>> {
  return fetchApi<{ displayName: string; avatarDataUrl: string | null }>(
    '/admin/profile',
    { method: 'PATCH', body: JSON.stringify(body), headers: authHeaders() },
  );
}

// -- Case Management --

/** GET /admin/cases — List/sort cases */
export async function listCases(params?: {
  status?: string;
  queue?: string;
  limit?: number;
  cursor?: string;
}): Promise<ApiResult<CaseListResponse>> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.queue) searchParams.set('queue', params.queue);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.cursor) searchParams.set('cursor', params.cursor);
  const qs = searchParams.toString();
  return fetchApi<CaseListResponse>(
    `/admin/cases${qs ? `?${qs}` : ''}`,
    { headers: authHeaders() },
  );
}

/** GET /admin/cases/export — CSV export all cases */
export async function exportCases(): Promise<ApiResult<Blob>> {
  for (const base of API_BASES) {
    const url = `${base}/admin/cases/export`;
    try {
      const res = await fetch(url, {
        headers: {
          'X-Request-Id': requestId(),
          ...authHeaders(),
        },
      });
      if (res.ok) {
        return { ok: true, data: await res.blob() };
      }
      return {
        ok: false,
        error: { type: 'about:blank', title: 'Export failed', status: res.status, detail: res.statusText },
        status: res.status,
      };
    } catch {
      // Network error (e.g. local backend not running) — try the next base.
    }
  }
  return {
    ok: false,
    error: { type: 'about:blank', title: 'Network Error', status: 0, detail: 'Could not reach the API server.' },
    status: 0,
  };
}

/** GET /admin/cases/{caseRef} — Get case detail */
export async function getCaseDetail(
  caseRef: string,
  piiLevel: 'masked' | 'raw' = 'masked',
): Promise<ApiResult<CaseDetailResponse>> {
  return fetchApi<CaseDetailResponse>(
    `/admin/cases/${encodeURIComponent(caseRef)}?pii=${piiLevel}`,
    { headers: authHeaders() },
  );
}

/** POST /admin/cases/{caseRef}/assign — Assign case to staff */
export async function assignCase(
  caseRef: string,
  body: CaseAssignRequest,
): Promise<ApiResult<unknown>> {
  return fetchApi<unknown>(
    `/admin/cases/${encodeURIComponent(caseRef)}/assign`,
    { method: 'POST', body: JSON.stringify(body), headers: authHeaders() },
  );
}

/** POST /admin/cases/{caseRef}/status — Transition case status (empty body on success; 422 lists the violation) */
export async function transitionCaseStatus(
  caseRef: string,
  body: CaseStatusTransitionRequest,
): Promise<ApiResult<unknown>> {
  return fetchApi<unknown>(
    `/admin/cases/${encodeURIComponent(caseRef)}/status`,
    { method: 'POST', body: JSON.stringify(body), headers: authHeaders() },
  );
}

// -- Staff Management --

/** GET /admin/staff — List staff users (backend wraps in `{ staff: [...] }`) */
export async function listStaff(): Promise<ApiResult<StaffUser[]>> {
  const result = await fetchApi<{ staff: StaffUser[] }>('/admin/staff', {
    headers: authHeaders(),
  });
  if (result.ok) return { ok: true, data: result.data.staff };
  return result;
}

/** POST /admin/staff — Create staff user */
export async function createStaff(
  body: CreateStaffRequest,
): Promise<ApiResult<StaffUser>> {
  return fetchApi<StaffUser>('/admin/staff', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: authHeaders(),
  });
}

export async function approveResolution(
  caseRef: string,
  body: {
    type: 'replacement' | 'refund';
    note: string;
    expectedVersion: number;
    refundAmountMinor?: number;
    currency?: string;
  },
): Promise<ApiResult<CaseResolution>> {
  const result = await fetchApi<CaseResolutionResponse>(
    `/admin/cases/${encodeURIComponent(caseRef)}/resolution/approve`,
    { method: 'POST', body: JSON.stringify(body), headers: authHeaders() },
  );
  if (result.ok) return { ok: true, data: result.data.resolution };
  return result;
}

export async function completeResolution(
  caseRef: string,
  body: { note: string; expectedVersion: number; externalReference?: string },
): Promise<ApiResult<CaseResolution>> {
  const result = await fetchApi<CaseResolutionResponse>(
    `/admin/cases/${encodeURIComponent(caseRef)}/resolution/complete`,
    { method: 'POST', body: JSON.stringify(body), headers: authHeaders() },
  );
  if (result.ok) return { ok: true, data: result.data.resolution };
  return result;
}

export async function cancelResolution(
  caseRef: string,
  body: { note: string; expectedVersion: number },
): Promise<ApiResult<CaseResolution>> {
  const result = await fetchApi<CaseResolutionResponse>(
    `/admin/cases/${encodeURIComponent(caseRef)}/resolution/cancel`,
    { method: 'POST', body: JSON.stringify(body), headers: authHeaders() },
  );
  if (result.ok) return { ok: true, data: result.data.resolution };
  return result;
}


/** PATCH /admin/staff/{id} — Update staff user */
export async function updateStaff(
  staffUserId: string,
  body: UpdateStaffRequest,
): Promise<ApiResult<StaffUser>> {
  return fetchApi<StaffUser>(`/admin/staff/${encodeURIComponent(staffUserId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: authHeaders(),
  });
}

/** DELETE /admin/sessions/by-user/{id} — Revoke all sessions for a user */
export async function revokeUserSessions(
  staffUserId: string,
): Promise<ApiResult<void>> {
  return fetchApi<void>(`/admin/sessions/by-user/${encodeURIComponent(staffUserId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

// -- Reportability Reviews --

/** GET /admin/incidents — Incident operations summary */
export async function listIncidents(): Promise<ApiResult<IncidentListResponse>> {
  return fetchApi<IncidentListResponse>('/admin/incidents', {
    headers: authHeaders(),
  });
}

/** GET /admin/refund-exports — Refund export history */
export async function listRefundExports(): Promise<ApiResult<RefundExportHistoryResponse>> {
  return fetchApi<RefundExportHistoryResponse>('/admin/refund-exports', {
    headers: authHeaders(),
  });
}

/** POST /admin/refund-exports — Generate a new refund export and return its CSV payload */
export async function createRefundExport(body: {
  purpose: string;
  includeExported?: boolean;
}): Promise<ApiResult<RefundExportResponse>> {
  const headers = new Headers(authHeaders());
  headers.set('Content-Type', 'application/json');

  try {
    const response = await fetch(`${API_BASES[0]}/admin/refund-exports`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const error = toProblemDetails(body, response.status, response.statusText);
      return { ok: false, status: response.status, error };
    }

    const csv = await response.text();
    const disposition = response.headers.get('Content-Disposition');
    const filenameMatch = disposition?.match(/filename="?([^";]+)"?/i);
    return {
      ok: true,
      data: {
        csv,
        batchId: response.headers.get('X-Refund-Export-Batch-Id'),
        sha256: response.headers.get('X-Refund-Export-Sha256'),
        filename: filenameMatch?.[1] ?? null,
      },
    };
  } catch {
    return {
      ok: false,
      status: 0,
      error: { type: 'about:blank', title: 'Network error', status: 0, detail: 'Failed to reach the API.' },
    };
  }
}

/** POST /admin/reportability-reviews/{id}/close — Close reportability review */
export async function closeReportabilityReview(
  reviewId: string,
  body: { outcome: 'filed' | 'documented_non_reportable'; rationale: string; cpscReference?: string },
): Promise<ApiResult<void>> {
  return fetchApi<void>(
    `/admin/reportability-reviews/${encodeURIComponent(reviewId)}/close`,
    { method: 'POST', body: JSON.stringify(body), headers: authHeaders() },
  );
}

// -- Audit --

/** GET /admin/audit-events — Query audit log */
export async function queryAuditEvents(params?: {
  actor?: string;
  action?: string;
  resource?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}): Promise<ApiResult<AuditQueryResponse>> {
  const searchParams = new URLSearchParams();
  if (params?.actor) searchParams.set('actor', params.actor);
  if (params?.action) searchParams.set('action', params.action);
  if (params?.resource) searchParams.set('resource', params.resource);
  if (params?.from) searchParams.set('from', params.from);
  if (params?.to) searchParams.set('to', params.to);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.cursor) searchParams.set('cursor', params.cursor);
  const qs = searchParams.toString();
  return fetchApi<AuditQueryResponse>(
    `/admin/audit-events${qs ? `?${qs}` : ''}`,
    { headers: authHeaders() },
  );
}

// ── Utility ──

/** Returns true when the Phase 1 skeleton returned 501. */
export function isPhase1NotImplemented(result: ApiResult<unknown>): boolean {
  return !result.ok && result.status === 501;
}

/** Returns true when the server returned 503 (not ready). */
export function isServiceUnavailable(result: ApiResult<unknown>): boolean {
  return !result.ok && result.status === 503;
}

/** Returns true when the request was unauthorized (401) or forbidden (403). */
export function isAuthError(result: ApiResult<unknown>): boolean {
  return !result.ok && (result.status === 401 || result.status === 403);
}
