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

export type StaffRole = 'ADMIN' | 'MANAGER';

export interface StaffPrincipal {
  staffUserId: string;
  email: string;
  displayName: string;
  role: StaffRole;
}

export interface StaffLoginRequest {
  email: string;
  password: string;
}

export interface StaffLoginResponse {
  token: string;
  sessionId: string;
  expiresAt: string;
  /** The authenticated staff user's id (uuid) — needed for self-assignment. */
  staffUserId?: string | null;
  displayName?: string;
  avatarDataUrl?: string | null;
  role?: StaffRole;
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
  /** Total rows matching the filters (server-computed, page-independent). */
  total?: number;
  /** Cursor for the next server-side page; null/absent when exhausted. */
  nextCursor?: string | null;
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

/** The recall campaign a case was submitted against (review context). */
export interface CaseCampaign {
  slug: string;
  code: string;
  title?: string;
}

/** A product the consumer claimed, with the identifiers needed to re-check the lot match. */
export interface CaseProduct {
  id: string;
  quantity: number;
  shape: string;
  flavor: string;
  lotCode: string;
  dateCode: string;
  purchaseChannel: string;
  purchaseDate?: string | null;
  /** Order number per the viewer's PII tier (masked keeps the last 4 chars). */
  orderNumber?: string | null;
  checkResult: string;
  identificationMode?: string | null;
  reasonCodes?: string[] | null;
  /** Purchase corroboration outcome, when purchase evidence was submitted. */
  purchaseCorroboration?: string | null;
  riskFlags?: string[] | null;
}

/** Evidence file metadata (no storage pathnames, no blob URLs). */
export interface CaseDocument {
  id: string;
  category: string;
  categorySlot?: number | null;
  originalFileName: string;
  declaredMimeType: string;
  sizeBytes: number;
  uploadStatus: string;
  scanStatus: string;
  uploadedAt?: string | null;
}

/** The safety incident reported with a case, plus its reportability gate. */
export interface CaseIncidentReport {
  id: string;
  answer: string;
  eventTypes: string[];
  injurySeverity?: string | null;
  medicalTreatment?: string | null;
  usedAsIntended?: string | null;
  occurredAt?: string | null;
  occurredDateUnknown: boolean;
  companyObtainedAt: string;
  reportability: {
    id: string;
    status: string;
    cpscReference?: string | null;
    filedAt?: string | null;
  } | null;
  /** Decrypted narrative — present only for the raw PII tier (audited read). */
  narrative?: string;
}

export interface CaseDetail {
  caseReference: string;
  status: string;
  subtype: string;
  incidentFlag: boolean;
  submittedAt: string;
  assignedToStaffUserId: string | null;
  assignedAt: string | null;
  campaign?: CaseCampaign;
  products?: CaseProduct[];
  documents?: CaseDocument[];
  incident?: CaseIncidentReport | null;
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
  /** Persisted on the transition event; required (≥10 chars) for need_info. */
  note?: string;
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

export interface IncidentReportability {
  id: string;
  status: 'pending' | 'filed' | 'documented_non_reportable';
  cpscReference?: string | null;
  filedAt?: string | null;
  decisionAt?: string | null;
}

/** GET /admin/incidents row — an incident joined to its case and review gate. */
export interface IncidentSummary {
  id: string;
  caseReference: string;
  caseStatus: string;
  answer: string;
  eventTypes: string[];
  injurySeverity?: string | null;
  medicalTreatment?: string | null;
  occurredAt?: string | null;
  createdAt: string;
  reportability: IncidentReportability | null;
}

export interface IncidentListResponse {
  incidents: IncidentSummary[];
}

/** GET /admin/campaigns row — read-only campaign overview with case counts. */
export interface AdminCampaignSummary {
  id: string;
  slug: string;
  code: string;
  status: string;
  launchAt?: string | null;
  closeAt?: string | null;
  title?: string;
  caseCount: number;
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
  /** Mirrors the backend audit outcome enum (`success | denied | error`). */
  outcome: 'success' | 'denied' | 'error';
  reasonCode?: string | null;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}

export interface AuditQueryResponse {
  events: AuditEvent[];
  /** Total rows matching the filters (server-computed, page-independent). */
  total?: number;
  /** Cursor for the next server-side page; null/absent when exhausted. */
  nextCursor?: string | null;
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

// ── Auth header helper ──

export const SESSION_STORAGE_KEY = 'koi_admin_session';

let adminSessionToken: string | null = null;

export function setAdminSessionToken(token: string | null) {
  adminSessionToken = token;
}

export function getAdminSessionToken(): string | null {
  return adminSessionToken;
}

/** Shape of the session snapshot persisted by admin-auth (subset we need). */
interface StoredAdminSession {
  token?: string;
  expiresAt?: string;
  role?: StaffRole;
  staffUserId?: string;
  displayName?: string;
}

function readStoredSession(): StoredAdminSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAdminSession;
    if (!parsed?.token) return null;
    // Drop definitively expired snapshots so requests fail as "logged out"
    // instead of replaying a dead token.
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredSession(update: StoredAdminSession) {
  if (typeof window === 'undefined') return;
  try {
    const current = readStoredSession() ?? {};
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ ...current, ...update }),
    );
  } catch {
    // Storage unavailable (private mode) — the in-memory token still works.
  }
}

function clearStoredSession() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
  // Let the auth context drop its in-memory user so the UI shows signed-out.
  window.dispatchEvent(new CustomEvent('koi_admin_session_expired'));
}

// ── Cross-tab session sync ──
// The `storage` event fires only in *other* tabs, which is exactly the channel
// we need: when any tab rotates the session it writes SESSION_STORAGE_KEY, and
// the server invalidates the previous token on rotation. Every other tab holds
// its own module-level `adminSessionToken` that would otherwise go stale and
// 401 on the next request — a 401 then runs clearStoredSession and logs the
// whole account out. Mirror the rotated token into this tab so all tabs stay
// on the live one.
function startSessionTabSync() {
  if (typeof window === 'undefined') return;
  window.addEventListener('storage', (e) => {
    if (e.key !== SESSION_STORAGE_KEY) return;
    if (!e.newValue) {
      // Signed out in another tab — mirror the signed-out state here too so a
      // stale tab cannot keep using a token the session no longer holds.
      if (adminSessionToken || readStoredSession()) {
        adminSessionToken = null;
        window.dispatchEvent(new CustomEvent('koi_admin_session_expired'));
      }
      return;
    }
    try {
      const parsed = JSON.parse(e.newValue) as StoredAdminSession;
      // A different token means another tab rotated it; adopt it (and let the
      // auth context resync its user) instead of sending the stale one.
      if (parsed.token && parsed.token !== adminSessionToken) {
        adminSessionToken = parsed.token;
        window.dispatchEvent(new CustomEvent('koi_admin_session_refreshed'));
      }
    } catch {
      // Malformed write from another tab — keep the current token.
    }
  });
}
startSessionTabSync();

/**
 * Reads the current bearer token. Falls back to the persisted session
 * SYNCHRONOUSLY so a page effect that fires before the auth provider's
 * restore effect (children mount first) still sends an authenticated
 * request — this was the cause of "data empty until F5".
 */
function resolveSessionToken(): string | null {
  if (!adminSessionToken) {
    const stored = readStoredSession();
    if (stored?.token) {
      adminSessionToken = stored.token;
      if (stored.role || stored.staffUserId) writeStoredSession(stored);
    }
  }
  return adminSessionToken;
}

function authHeaders(): Record<string, string> {
  const token = resolveSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Session-refresh-on-401 (single-flight) ──

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Rotates the staff session once. Returns true when a fresh token is in
 * place and the failed request is worth retrying. Safe to call concurrently:
 * parallel 401s share one refresh request.
 */
async function refreshAdminSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      // Another tab may have just rotated the session. If storage already
      // holds a token newer than our in-memory copy, adopt it instead of
      // issuing a second rotation — the server invalidated the old token on
      // the first one, so a second refresh with it can only 401.
      const inMem = adminSessionToken;
      const cached = readStoredSession();
      if (inMem && cached?.token && cached.token !== inMem) {
        adminSessionToken = cached.token;
        window.dispatchEvent(new CustomEvent('koi_admin_session_refreshed'));
        return true;
      }
      const token = inMem ?? cached?.token;
      if (!token) return false;
      try {
        const res = await fetch(`${API_BASES[0]}/admin/sessions/refresh`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'X-Request-Id': requestId() },
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return false;
        const body = (await res.json()) as {
          token: string;
          expiresAt: string;
          displayName?: string;
          role?: StaffRole;
          staffUserId?: string;
        };
        if (!body?.token) return false;
        adminSessionToken = body.token;
        const stored = readStoredSession() ?? {};
        writeStoredSession({
          ...stored,
          token: body.token,
          expiresAt: body.expiresAt,
          ...(body.role ? { role: body.role } : {}),
          ...(body.staffUserId ? { staffUserId: body.staffUserId } : {}),
          ...(body.displayName ? { displayName: body.displayName } : {}),
        });
        // admin-auth listens and refreshes its in-memory user from storage.
        window.dispatchEvent(new CustomEvent('koi_admin_session_refreshed'));
        return true;
      } catch {
        return false;
      } finally {
        // Release the single-flight slot once every waiter has resolved.
        window.setTimeout(() => {
          refreshInFlight = null;
        }, 0);
      }
    })();
  }
  return refreshInFlight;
}

async function fetchApi<T>(
  path: string,
  options: RequestInit = {},
  allowSessionRetry = true,
): Promise<ApiResult<T>> {
  const rid = requestId();

  const attempt = async (base: string): Promise<ApiResult<T> | null> => {
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
      return null;
    }
  };

  for (const base of API_BASES) {
    const result = await attempt(base);
    if (!result) continue;

    // A 401 on an admin route may mean the rotated/expired token — refresh
    // the session once and replay the request before giving up.
    if (!result.ok && result.status === 401 && path.startsWith('/admin/') && allowSessionRetry) {
      const refreshed = await refreshAdminSession();
      if (refreshed) {
        return fetchApi<T>(path, options, false);
      }
      // Session is gone for good — drop the stored snapshot so the UI
      // reflects the signed-out state instead of looping on dead tokens.
      clearStoredSession();
    }
    return result;
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

/**
 * Same transport guarantees as fetchApi, but preserves text responses and
 * response headers (used by CSV exports). Keeping this here prevents binary or
 * text endpoints from bypassing auth refresh, timeout, and API fallback.
 */
async function fetchApiText(
  path: string,
  options: RequestInit = {},
  allowSessionRetry = true,
): Promise<ApiResult<{ text: string; headers: Headers }>> {
  const rid = requestId();

  for (const base of API_BASES) {
    try {
      const response = await fetch(`${base}${path}`, {
        ...options,
        signal: options.signal ?? AbortSignal.timeout(10_000),
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': rid,
          ...options.headers,
        },
      });

      if (response.ok) {
        return { ok: true, data: { text: await response.text(), headers: response.headers } };
      }

      const body = await response.json().catch(() => null);
      const error = toProblemDetails(body, response.status, response.statusText);
      if (response.status === 401 && path.startsWith('/admin/') && allowSessionRetry) {
        const refreshed = await refreshAdminSession();
        if (refreshed) return fetchApiText(path, options, false);
        clearStoredSession();
      }
      return { ok: false, status: response.status, error: { ...error, requestId: error.requestId ?? rid } };
    } catch {
      // Try the next configured base for network failures.
    }
  }

  return {
    ok: false,
    status: 0,
    error: {
      type: 'about:blank',
      title: 'Network Error',
      status: 0,
      detail: 'Could not reach the API server.',
      requestId: rid,
    },
  };
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
    // Persist so sibling tabs adopt the rotated token via the storage event
    // (the server invalidated the previous one on rotation).
    writeStoredSession({
      token: result.data.token,
      expiresAt: result.data.expiresAt,
      ...(result.data.role ? { role: result.data.role } : {}),
      ...(result.data.staffUserId ? { staffUserId: result.data.staffUserId } : {}),
      ...(result.data.displayName ? { displayName: result.data.displayName } : {}),
    });
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

/** POST /admin/profile/password — self-service password change (audited) */
export async function updatePassword(body: {
  currentPassword: string;
  newPassword: string;
}): Promise<ApiResult<void>> {
  return fetchApi<void>('/admin/profile/password', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: authHeaders(),
  });
}

// -- Case Management --

/** GET /admin/cases — List/sort cases (server-side cursor pagination) */
export async function listCases(params?: {
  status?: string;
  queue?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}): Promise<ApiResult<CaseListResponse>> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.queue) searchParams.set('queue', params.queue);
  if (params?.search) searchParams.set('search', params.search);
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
  return fetchBlob('/admin/cases/export', { method: 'GET' });
}

async function fetchBlob(
  path: string,
  options: RequestInit = {},
): Promise<ApiResult<Blob>> {
  const rid = requestId();
  for (const base of API_BASES) {
    try {
      const res = await fetch(`${base}${path}`, {
        ...options,
        headers: { 'X-Request-Id': rid, ...authHeaders(), ...options.headers },
      });
      if (res.ok) return { ok: true, data: await res.blob() };
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: toProblemDetails(body, res.status, res.statusText), status: res.status };
    } catch {
      continue;
    }
  }
  return { ok: false, error: { type: 'about:blank', title: 'Network Error', status: 0, detail: 'Failed to reach API' }, status: 0 };
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

/** Evidence file access URLs (short-lived; image preview / download). */
export interface DocumentAccess {
  documentId: string;
  fileName: string;
  contentType: string;
  url: string;
  downloadUrl: string;
}

/** GET /admin/cases/{caseRef}/documents/{documentId}/url — audited access mint */
export async function getDocumentAccessUrl(
  caseRef: string,
  documentId: string,
): Promise<ApiResult<DocumentAccess>> {
  return fetchApi<DocumentAccess>(
    `/admin/cases/${encodeURIComponent(caseRef)}/documents/${encodeURIComponent(documentId)}/url`,
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

/** DELETE /admin/staff/{id} — Permanently delete a staff user (ADMIN only). */
export async function deleteStaff(staffUserId: string): Promise<ApiResult<void>> {
  return fetchApi<void>(`/admin/staff/${encodeURIComponent(staffUserId)}`, {
    method: 'DELETE',
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

/** GET /admin/campaigns — Read-only campaign overview with case counts */
export async function listCampaigns(): Promise<ApiResult<{ campaigns: AdminCampaignSummary[] }>> {
  return fetchApi<{ campaigns: AdminCampaignSummary[] }>('/admin/campaigns', {
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
  const result = await fetchApiText('/admin/refund-exports', {
    method: 'POST',
    body: JSON.stringify(body),
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!result.ok) return result;

  const disposition = result.data.headers.get('Content-Disposition');
  const filenameMatch = disposition?.match(/filename="?([^";]+)"?/i);
  return {
    ok: true,
    data: {
      csv: result.data.text,
      batchId: result.data.headers.get('X-Refund-Export-Batch-Id'),
      sha256: result.data.headers.get('X-Refund-Export-Sha256'),
      filename: filenameMatch?.[1] ?? null,
    },
  };
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

/** GET /admin/audit-events — Query audit log (server-side cursor pagination) */
export async function queryAuditEvents(params?: {
  actor?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  outcome?: 'success' | 'denied' | 'error';
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}): Promise<ApiResult<AuditQueryResponse>> {
  const searchParams = new URLSearchParams();
  // Keep these names aligned with the backend contract:
  // actorUserId, resourceType, resourceId, outcome, since, and until.
  if (params?.actor) searchParams.set('actorUserId', params.actor);
  if (params?.action) searchParams.set('action', params.action);
  if (params?.resource) searchParams.set('resourceType', params.resource);
  if (params?.resourceId) searchParams.set('resourceId', params.resourceId);
  if (params?.outcome) searchParams.set('outcome', params.outcome);
  if (params?.from) searchParams.set('since', params.from);
  if (params?.to) searchParams.set('until', params.to);
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
