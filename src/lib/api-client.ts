// ============================================================
// KOI — API Client
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

// ── Public API methods ──

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

/** Returns true when the Phase 1 skeleton returned 501. */
export function isPhase1NotImplemented(result: ApiResult<unknown>): boolean {
  return !result.ok && result.status === 501;
}
