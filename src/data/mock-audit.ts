// ============================================================
// KOI Admin — Mock Audit Entries
// ============================================================

import type { AuditEntry } from '@/types';

export const mockAuditEntries: AuditEntry[] = [
  {
    id: 'aud_001',
    campaignId: 'cmp_001',
    claimId: 'cl_001',
    action: 'Claim status changed from Under Review to Verified',
    actor: 'Admin (Jane Smith)',
    timestamp: '2025-07-20T14:15:00Z',
    details: 'Evidence validated: product photo and serial number confirmed matching recall criteria.',
    bladeStage: 'verification',
  },
  {
    id: 'aud_002',
    campaignId: 'cmp_001',
    claimId: 'cl_003',
    action: 'Remedy issued: Free Replacement Buckle Kit',
    actor: 'Admin (Jane Smith)',
    timestamp: '2025-07-22T10:30:00Z',
    details: 'Replacement kit shipped via USPS. Tracking: 9400111899223456789012',
    bladeStage: 'resolution',
  },
  {
    id: 'aud_003',
    campaignId: 'cmp_001',
    claimId: 'cl_002',
    action: 'Claim submitted',
    actor: 'Consumer (Marcus Johnson)',
    timestamp: '2025-07-28T11:22:00Z',
    bladeStage: 'verification',
  },
  {
    id: 'aud_004',
    campaignId: 'cmp_002',
    claimId: 'cl_004',
    action: 'Claim status changed from Submitted to Under Review',
    actor: 'Admin (Tom Harris)',
    timestamp: '2025-07-26T09:05:00Z',
    bladeStage: 'verification',
  },
  {
    id: 'aud_005',
    campaignId: 'cmp_002',
    claimId: 'cl_005',
    action: 'Claim resolved',
    actor: 'System',
    timestamp: '2025-07-12T11:00:00Z',
    details: 'Full unit replacement delivered and confirmed by consumer.',
    bladeStage: 'resolution',
  },
  {
    id: 'aud_006',
    campaignId: 'cmp_003',
    claimId: 'cl_007',
    action: 'Claim status changed from Submitted to Under Review',
    actor: 'Admin (Jane Smith)',
    timestamp: '2025-07-30T10:20:00Z',
    bladeStage: 'verification',
  },
  {
    id: 'aud_007',
    campaignId: 'cmp_004',
    claimId: 'cl_008',
    action: 'Claim verified',
    actor: 'Admin (Tom Harris)',
    timestamp: '2025-07-24T16:45:00Z',
    details: 'Product photo confirms model HW-CT1500-W within affected date range.',
    bladeStage: 'verification',
  },
  {
    id: 'aud_008',
    campaignId: 'cmp_004',
    claimId: 'cl_009',
    action: 'Claim rejected',
    actor: 'Admin (Jane Smith)',
    timestamp: '2025-07-14T09:20:00Z',
    details: 'Product photo shows model HW-CT800 which is not part of this recall.',
    bladeStage: 'verification',
  },
  {
    id: 'aud_009',
    campaignId: 'cmp_003',
    action: 'Campaign risk level updated to CRITICAL',
    actor: 'Admin (Jane Smith)',
    timestamp: '2025-07-28T13:00:00Z',
    details: 'Elevated after 3rd injury report received from consumers.',
    bladeStage: 'safety',
  },
  {
    id: 'aud_010',
    campaignId: 'cmp_004',
    claimId: 'cl_010',
    action: 'Claim submitted',
    actor: 'Consumer (Thomas Brown)',
    timestamp: '2025-07-31T07:51:00Z',
    bladeStage: 'verification',
  },
];

export function getAuditByCampaign(campaignId: string): AuditEntry[] {
  return mockAuditEntries.filter((e) => e.campaignId === campaignId);
}

export function getAuditByClaim(claimId: string): AuditEntry[] {
  return mockAuditEntries.filter((e) => e.claimId === claimId);
}
