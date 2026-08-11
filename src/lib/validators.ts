// ============================================================
// KOI Admin — Zod Validation Schemas
// (shared with KOI-web)
// ============================================================

import { z } from 'zod';

// === Eligibility Check ===
export const eligibilitySchema = z.object({
  productId: z.string().min(1, 'Please select a product variant'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  serialNumber: z.string().optional(),
  upc: z.string().optional(),
});

export type EligibilityFormData = z.infer<typeof eligibilitySchema>;

// === Evidence Upload ===
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'application/pdf',
];

export const evidenceFileSchema = z.object({
  name: z.string(),
  size: z.number().max(MAX_FILE_SIZE, 'File must be under 10MB'),
  type: z.string().refine(
    (t) => ALLOWED_TYPES.includes(t),
    'File must be JPG, PNG, HEIC, or PDF'
  ),
});

export type EvidenceFileData = z.infer<typeof evidenceFileSchema>;

// === Incident Report ===
export const incidentSchema = z.object({
  occurredAt: z.string().min(1, 'Date of incident is required'),
  severity: z.enum(['minor', 'moderate', 'serious', 'fatal'], {
    message: 'Please select the incident severity',
  }),
  description: z
    .string()
    .min(20, 'Please describe the incident (at least 20 characters)')
    .max(2000, 'Description must be under 2000 characters'),
  injuryDescription: z.string().max(2000).optional(),
  medicalAttentionRequired: z.boolean(),
});

export type IncidentFormData = z.infer<typeof incidentSchema>;

// === Claim Submission ===
export const claimSubmissionSchema = z.object({
  eligibility: eligibilitySchema,
  incident: incidentSchema.optional(),
});

export type ClaimSubmissionData = z.infer<typeof claimSubmissionSchema>;
