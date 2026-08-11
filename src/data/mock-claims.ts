// ============================================================
// KOI Admin — Mock Claims (Music Lollipop Demo)
// ============================================================

import { type Claim, ClaimStatus, EvidenceType, IncidentSeverity } from '@/types';

export const mockClaims: Claim[] = [
  {
    id: 'cl_001',
    campaignId: 'cmp_001',
    status: ClaimStatus.VERIFIED,
    consumerName: 'Sarah Chen',
    consumerEmail: 'sarah.chen@email.com',
    productId: 'prod_001',
    remedyId: 'rem_001',
    evidence: [
      { id: 'ev_001', type: EvidenceType.PRODUCT_PHOTO, fileUrl: '/evidence/lollipop-1.jpg', fileName: 'lollipop-label.jpg', uploadedAt: '2025-12-15T09:30:00Z' },
      { id: 'ev_002', type: EvidenceType.SERIAL_NUMBER, fileUrl: '/evidence/lot-1.jpg', fileName: 'lot-code.jpg', uploadedAt: '2025-12-15T09:31:00Z' },
    ],
    submittedAt: '2025-12-15T09:32:00Z',
    updatedAt: '2026-01-08T14:15:00Z',
    claimNumber: 'KOI-2512-1842',
  },
  {
    id: 'cl_002',
    campaignId: 'cmp_001',
    status: ClaimStatus.SUBMITTED,
    consumerName: 'Marcus Johnson',
    consumerEmail: 'mjohnson@email.com',
    productId: 'prod_001',
    remedyId: 'rem_002',
    evidence: [
      { id: 'ev_003', type: EvidenceType.PROOF_OF_PURCHASE, fileUrl: '/evidence/receipt-1.pdf', fileName: 'amazon-receipt.pdf', uploadedAt: '2026-01-20T11:20:00Z' },
    ],
    submittedAt: '2026-01-20T11:22:00Z',
    updatedAt: '2026-01-20T11:22:00Z',
    claimNumber: 'KOI-2601-1951',
  },
  {
    id: 'cl_003',
    campaignId: 'cmp_001',
    status: ClaimStatus.REMEDY_ISSUED,
    consumerName: 'Emily Davis',
    consumerEmail: 'emily.d@email.com',
    productId: 'prod_001',
    remedyId: 'rem_001',
    evidence: [
      { id: 'ev_004', type: EvidenceType.PRODUCT_PHOTO, fileUrl: '/evidence/lollipop-2.jpg', fileName: 'package.png', uploadedAt: '2025-12-20T08:45:00Z' },
    ],
    submittedAt: '2025-12-20T08:47:00Z',
    updatedAt: '2026-02-10T10:30:00Z',
    claimNumber: 'KOI-2512-0412',
  },
  {
    id: 'cl_004',
    campaignId: 'cmp_001',
    status: ClaimStatus.UNDER_REVIEW,
    consumerName: 'James Wilson',
    consumerEmail: 'jwilson@email.com',
    productId: 'prod_001',
    remedyId: 'rem_001',
    evidence: [
      { id: 'ev_005', type: EvidenceType.SERIAL_NUMBER, fileUrl: '/evidence/lot-2.jpg', fileName: 'lot.jpg', uploadedAt: '2026-01-28T16:10:00Z' },
      { id: 'ev_006', type: EvidenceType.PRODUCT_PHOTO, fileUrl: '/evidence/lollipop-3.jpg', fileName: 'lollipop.jpg', uploadedAt: '2026-01-28T16:11:00Z' },
    ],
    submittedAt: '2026-01-28T16:12:00Z',
    updatedAt: '2026-01-30T09:05:00Z',
    claimNumber: 'KOI-2601-2104',
  },
  {
    id: 'cl_005',
    campaignId: 'cmp_001',
    status: ClaimStatus.RESOLVED,
    consumerName: 'Amanda Torres',
    consumerEmail: 'atorres@email.com',
    productId: 'prod_001',
    remedyId: 'rem_002',
    evidence: [
      { id: 'ev_007', type: EvidenceType.PROOF_OF_PURCHASE, fileUrl: '/evidence/receipt-2.pdf', fileName: 'walmart-receipt.pdf', uploadedAt: '2025-12-12T13:00:00Z' },
    ],
    submittedAt: '2025-12-12T13:02:00Z',
    updatedAt: '2026-01-15T11:00:00Z',
    resolutionDate: '2026-01-15T11:00:00Z',
    claimNumber: 'KOI-2512-1288',
  },
  {
    id: 'cl_006',
    campaignId: 'cmp_001',
    status: ClaimStatus.REJECTED,
    consumerName: 'Jennifer Wu',
    consumerEmail: 'jwu@email.com',
    productId: 'prod_001',
    remedyId: 'rem_002',
    evidence: [
      { id: 'ev_008', type: EvidenceType.PRODUCT_PHOTO, fileUrl: '/evidence/wrong-lollipop.jpg', fileName: 'lollipop.jpg', uploadedAt: '2026-01-10T15:45:00Z' },
    ],
    submittedAt: '2026-01-10T15:46:00Z',
    updatedAt: '2026-01-14T09:20:00Z',
    claimNumber: 'KOI-2601-1201',
  },
];

export function getClaimsByStatus(status: ClaimStatus): Claim[] {
  return mockClaims.filter((c) => c.status === status);
}

export function getClaimsByCampaign(campaignId: string): Claim[] {
  return mockClaims.filter((c) => c.campaignId === campaignId);
}

export function getClaimByNumber(claimNumber: string): Claim | undefined {
  return mockClaims.find((c) => c.claimNumber === claimNumber);
}

export function getAdminStats() {
  const total = mockClaims.length;
  const pending = getClaimsByStatus(ClaimStatus.SUBMITTED).length + getClaimsByStatus(ClaimStatus.UNDER_REVIEW).length;
  const resolved = getClaimsByStatus(ClaimStatus.RESOLVED).length;
  const rejected = getClaimsByStatus(ClaimStatus.REJECTED).length;
  return {
    totalClaims: total,
    pendingClaims: pending,
    resolvedClaims: resolved,
    rejectedClaims: rejected,
    resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
  };
}
