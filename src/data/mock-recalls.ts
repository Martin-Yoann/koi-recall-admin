// ============================================================
// KOI Admin — Mock Recall Campaigns
// Based on: Candy Master Music Lollipop Recall Demo
// ============================================================

import {
  type Campaign,
  EvidenceType,
  RecallStatus,
  RemedyType,
  RiskLevel,
} from '@/types';

const musicLollipopCampaign: Campaign = {
  id: 'cmp_001',
  slug: 'music-lollipop-safety-recall',
  title: 'Music Lollipop Safety Recall',
  summary:
    'Selected fictional lots across the Candy Master Music Lollipop series are included in this demonstration.',
  description:
    'Candy Master has initiated a voluntary safety recall for specific lots of the Music Lollipop product line. The recall addresses a fictional component-separation hazard identified during routine quality testing.',
  riskLevel: RiskLevel.MODERATE,
  status: RecallStatus.ACTIVE,
  cpscNumber: '26-042',
  recallDate: '2025-12-10',
  lastUpdated: '2026-02-20',
  manufacturerName: 'Candy Master Confectionery Co.',
  manufacturerContact: '(555) 010-2042 (Mon–Fri, 9:00 a.m.–5:00 p.m. ET)',
  estimatedUnits: 45000,
  hazardDescription:
    'Fictional component-separation hazard. The candy housing may separate from the musical stick component.',
  instructions:
    'Stop using a potentially affected product until its lot code has been checked. Locate the lot code near the package seal.',
  images: ['/images/music-lollipop.png'],
  affectedLots: ['ML-2406-A', 'ML-2407-B', 'ML-2408-C'],
  dateCodes: ['06/2024', '07/2024', '08/2024'],
  affectedProducts: [
    {
      id: 'prod_001',
      name: 'Candy Master Music Lollipop',
      modelNumber: 'ML-18G-SERIES',
      upc: '850045672031',
      manufactureDateStart: '2024-06-01',
      manufactureDateEnd: '2024-08-31',
      description: 'Musical lollipop, 18g. Shapes: Bear, Dinosaur, Strawberry, Heart. Flavors: Peach, Strawberry.',
      imageUrl: '/images/music-lollipop.png',
      brandName: 'Candy Master',
      retailerNames: ['Amazon', 'Walmart', 'Target', 'Kroger', 'CVS', 'Walgreens', 'CandyMaster.com'],
      priceRange: { min: 3.99, max: 5.99 },
      weight: '18g',
      flavors: ['Peach', 'Strawberry'],
      shapes: ['Bear', 'Dinosaur', 'Strawberry', 'Heart'],
    },
  ],
  remedies: [
    {
      id: 'rem_001',
      type: RemedyType.REPLACEMENT,
      title: 'Free Replacement Product',
      description: 'Receive a replacement Music Lollipop from an unaffected production batch.',
      deadline: '2027-12-10',
      requiresEvidence: true,
      evidenceTypes: [EvidenceType.PRODUCT_PHOTO, EvidenceType.SERIAL_NUMBER],
    },
    {
      id: 'rem_002',
      type: RemedyType.REFUND,
      title: 'Full Refund',
      description: 'Receive a full refund of the purchase price.',
      deadline: '2027-12-10',
      requiresEvidence: true,
      evidenceTypes: [EvidenceType.PROOF_OF_PURCHASE, EvidenceType.PRODUCT_PHOTO],
      compensationAmount: 5.99,
    },
  ],
};

export const mockCampaigns: Campaign[] = [musicLollipopCampaign];

export function getCampaignBySlug(slug: string): Campaign | undefined {
  return mockCampaigns.find((c) => c.slug === slug);
}

export function getCampaignById(id: string): Campaign | undefined {
  return mockCampaigns.find((c) => c.id === id);
}
