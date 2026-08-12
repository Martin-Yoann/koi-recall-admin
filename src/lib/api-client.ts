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

export interface CaseSummary {
  caseRef: string;
  campaignCode: string;
  status: string;
  riskLevel?: string;
  consumerNameMasked: string;
  submittedAt: string;
  assignedTo?: string;
  queue?: string;
}

export interface CaseListResponse {
  cases: CaseSummary[];
  total: number;
  cursor?: string;
}

export interface CaseDetail {
  caseRef: string;
  campaignCode: string;
  status: string;
  consumer: {
    name: string;
    email: string;
    phone: string;
    address?: string;
  };
  claimedProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    remedyRequested: string;
  }>;
  documents: Array<{
    documentId: string;
    fileName: string;
    category: string;
    mimeType: string;
    status: string;
  }>;
  incidents: Array<{
    incidentId: string;
    eventType: string;
    eventDate: string;
    severity: string;
    description: string;
  }>;
  events: Array<{
    eventId: string;
    eventType: string;
    timestamp: string;
    actor?: string;
    data?: Record<string, unknown>;
  }>;
  consents: Array<{
    type: string;
    accepted: boolean;
    timestamp: string;
  }>;
  submittedAt: string;
  updatedAt: string;
  assignedTo?: string;
}

export interface CaseAssignRequest {
  staffUserId: string;
}

export interface CaseStatusTransitionRequest {
  status: string;
  reason?: string;
}

export interface StaffUser {
  staffUserId: string;
  email: string;
  displayName: string;
  role: string;
  status: 'active' | 'disabled' | 'locked';
  createdAt: string;
  updatedAt: string;
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

export interface AuditEvent {
  auditEventId: string;
  actorStaffUserId: string;
  action: string;
  resource: string;
  resourceId?: string;
  outcome: 'success' | 'failure' | 'forbidden';
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface AuditQueryResponse {
  events: AuditEvent[];
  total: number;
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ProblemDetails; status: number };

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
  const url = `${API_BASE}${path}`;

  try {
    const res = await fetch(url, {
      ...options,
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
  const url = `${API_BASE}/admin/cases/export`;
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
    return {
      ok: false,
      error: { type: 'about:blank', title: 'Network Error', status: 0, detail: 'Could not reach the API server.' },
      status: 0,
    };
  }
}

/** GET /admin/cases/{caseRef} — Get case detail */
export async function getCaseDetail(
  caseRef: string,
  piiLevel: 'masked' | 'raw' = 'masked',
): Promise<ApiResult<CaseDetail>> {
  return fetchApi<CaseDetail>(
    `/admin/cases/${encodeURIComponent(caseRef)}?pii=${piiLevel}`,
    { headers: authHeaders() },
  );
}

/** POST /admin/cases/{caseRef}/assign — Assign case to staff */
export async function assignCase(
  caseRef: string,
  body: CaseAssignRequest,
): Promise<ApiResult<CaseDetail>> {
  return fetchApi<CaseDetail>(
    `/admin/cases/${encodeURIComponent(caseRef)}/assign`,
    { method: 'POST', body: JSON.stringify(body), headers: authHeaders() },
  );
}

/** POST /admin/cases/{caseRef}/status — Transition case status */
export async function transitionCaseStatus(
  caseRef: string,
  body: CaseStatusTransitionRequest,
): Promise<ApiResult<CaseDetail>> {
  return fetchApi<CaseDetail>(
    `/admin/cases/${encodeURIComponent(caseRef)}/status`,
    { method: 'POST', body: JSON.stringify(body), headers: authHeaders() },
  );
}

// -- Staff Management --

/** GET /admin/staff — List staff users */
export async function listStaff(): Promise<ApiResult<StaffUser[]>> {
  return fetchApi<StaffUser[]>('/admin/staff', { headers: authHeaders() });
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

/** POST /admin/reportability-reviews/{id}/close — Close reportability review */
export async function closeReportabilityReview(
  reviewId: string,
  body: { decision: 'filed' | 'documented_non_reportable'; notes?: string },
): Promise<ApiResult<ReportabilityReview>> {
  return fetchApi<ReportabilityReview>(
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
