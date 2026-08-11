// ============================================================
// KOI Admin — Core Domain Model
// (shared with KOI-web)
// ============================================================

// === Enums ===

export enum RiskLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum RecallStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  PENDING = 'pending',
  EXPANDED = 'expanded',
}

export enum ClaimStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  VERIFIED = 'verified',
  REMEDY_ISSUED = 'remedy_issued',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

export enum RemedyType {
  REFUND = 'refund',
  REPLACEMENT = 'replacement',
  REPAIR = 'repair',
  DISPOSAL_INSTRUCTION = 'disposal_instruction',
  VOUCHER = 'voucher',
}

export enum EvidenceType {
  PROOF_OF_PURCHASE = 'proof_of_purchase',
  PRODUCT_PHOTO = 'product_photo',
  SERIAL_NUMBER = 'serial_number',
  DAMAGE_PHOTO = 'damage_photo',
  OTHER = 'other',
}

export enum IncidentSeverity {
  MINOR = 'minor',
  MODERATE = 'moderate',
  SERIOUS = 'serious',
  FATAL = 'fatal',
}

// === Core Domain Interfaces ===

export interface Campaign {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  riskLevel: RiskLevel;
  status: RecallStatus;
  cpscNumber: string;
  recallDate: string;
  lastUpdated: string;
  affectedProducts: Product[];
  remedies: Remedy[];
  manufacturerName: string;
  manufacturerContact: string;
  estimatedUnits: number;
  hazardDescription: string;
  instructions: string;
  images: string[];
  affectedLots?: string[];
  dateCodes?: string[];
}

export interface Product {
  id: string;
  name: string;
  modelNumber: string;
  upc: string;
  manufactureDateStart: string;
  manufactureDateEnd: string;
  description: string;
  imageUrl: string;
  brandName: string;
  retailerNames: string[];
  priceRange: { min: number; max: number };
  weight?: string;
  flavors?: string[];
  shapes?: string[];
}

export interface Remedy {
  id: string;
  type: RemedyType;
  title: string;
  description: string;
  deadline: string;
  requiresEvidence: boolean;
  evidenceTypes: EvidenceType[];
  compensationAmount?: number;
}

export interface Claim {
  id: string;
  campaignId: string;
  status: ClaimStatus;
  consumerName: string;
  consumerEmail: string;
  productId: string;
  remedyId: string;
  evidence: Evidence[];
  incident?: Incident;
  submittedAt: string;
  updatedAt: string;
  resolutionDate?: string;
  claimNumber: string;
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
  notes?: string;
}

export interface Incident {
  id: string;
  severity: IncidentSeverity;
  occurredAt: string;
  description: string;
  injuryDescription?: string;
  medicalAttentionRequired: boolean;
  photos: string[];
}

export interface AuditEntry {
  id: string;
  campaignId: string;
  claimId?: string;
  action: string;
  actor: string;
  timestamp: string;
  details?: string;
  bladeStage: 'safety' | 'verification' | 'resolution';
}

export interface Communication {
  id: string;
  claimId: string;
  direction: 'inbound' | 'outbound';
  channel: 'email' | 'sms' | 'portal';
  subject: string;
  body: string;
  sentAt: string;
  readAt?: string;
}
