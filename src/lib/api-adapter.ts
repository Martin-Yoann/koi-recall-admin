// ============================================================
// KOI — API Adapter
// Bridges generated API types → frontend domain types
// Phase 1: 501 / network error → mock fallback
// ============================================================

import { RiskLevel, RecallStatus, RemedyType, EvidenceType } from '@/types';
import type { Campaign } from '@/types';
import type { CampaignView } from '@/lib/api-client';
import { getCampaign as apiGetCampaign } from '@/lib/api-client';
import { getCampaignBySlug as getMockCampaign } from '@/data/mock-recalls';

// ================================================================
// API → Domain adapter
// ================================================================

function campaignViewToCampaign(view: CampaignView): Campaign {
  const firstProduct = view.products[0];
  const lots = firstProduct?.affectedLots ?? [];
  const dateCodes = [...new Set(lots.map((l) => l.dateCode))];

  return {
    id: view.code,
    slug: view.slug,
    title: view.title,
    summary: view.summary,
    description: view.summary,
    riskLevel: RiskLevel.MODERATE,
    status: RecallStatus.ACTIVE,
    cpscNumber: view.code,
    recallDate: '2025-12-10',
    lastUpdated: new Date().toISOString().split('T')[0],
    manufacturerName: firstProduct?.brand ?? '',
    manufacturerContact: `${view.support.phone} (${view.support.hours})`,
    estimatedUnits: 0,
    hazardDescription: view.hazard,
    instructions: view.immediateAction,
    images: [],
    affectedLots: lots.map((l) => l.lotCode),
    dateCodes,
    affectedProducts: view.products.map((p) => ({
      id: p.productId,
      name: p.name,
      modelNumber: p.sku,
      upc: p.sku,
      manufactureDateStart: lots[0]?.dateCode?.replace('/', '/01/') ?? '2024-06-01',
      manufactureDateEnd: lots[lots.length - 1]?.dateCode?.replace('/', '/31/') ?? '2024-08-31',
      description: `${p.name} — ${p.flavors.join(', ')} flavors, ${p.shapes.join(', ')} shapes`,
      imageUrl: '/images/music-lollipop.png',
      brandName: p.brand,
      retailerNames: ['Amazon', 'Walmart', 'Target', 'Kroger', 'CVS', 'Walgreens'],
      priceRange: { min: 3.99, max: 5.99 },
      weight: '18g',
      flavors: p.flavors,
      shapes: p.shapes,
    })),
    remedies: view.remedies.map((r) => ({
      id: r.code,
      type: r.code === 'refund' ? RemedyType.REFUND : RemedyType.REPLACEMENT,
      title: r.displayName,
      description: r.displayName,
      deadline: '2027-12-10',
      requiresEvidence: true,
      evidenceTypes: [EvidenceType.PRODUCT_PHOTO, EvidenceType.PROOF_OF_PURCHASE],
      compensationAmount: r.code === 'refund' ? 5.99 : undefined,
    })),
  };
}

// ================================================================
// Unified fetch: API first, mock fallback
// ================================================================

export async function fetchCampaign(
  slug: string,
): Promise<Campaign | undefined> {
  const result = await apiGetCampaign(slug);

  if (result.ok) {
    return campaignViewToCampaign(result.data.campaign);
  }

  console.info(
    `[API] GET /v1/recall-campaigns/${slug} → ${result.status}, using mock data`,
  );
  return getMockCampaign(slug);
}
