// ============================================================
// KOI Admin — Claim Detail Page
// ============================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Mail,
  Package,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/shared/status-badge';
import { getClaimByNumber } from '@/data/mock-claims';
import { getCampaignById } from '@/data/mock-recalls';
import { getAuditByClaim } from '@/data/mock-audit';
import {
  CLAIM_STATUS_LABELS,
  INCIDENT_SEVERITY_LABELS,
  STATUS_TRANSITIONS,
} from '@/lib/admin-constants';
import { cn } from '@/lib/utils';

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  proof_of_purchase: 'Proof of Purchase',
  product_photo: 'Product Photo',
  serial_number: 'Serial Number',
  damage_photo: 'Damage Photo',
  other: 'Other',
};

interface ClaimDetailProps {
  params: Promise<{ id: string }>;
}

export default async function ClaimDetailPage({ params }: ClaimDetailProps) {
  const { id } = await params;
  const claim = getClaimByNumber(id);
  if (!claim) notFound();

  const campaign = getCampaignById(claim.campaignId);
  const product = campaign?.affectedProducts.find((p) => p.id === claim.productId);
  const audit = getAuditByClaim(claim.id);
  const transitions = (STATUS_TRANSITIONS as Record<string, string[]>)[claim.status] || [];

  return (
    <div className="container-content py-8 space-y-6">
      {/* Back */}
      <Link
        href="/claims"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Claims
      </Link>

      {/* Claim Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold tracking-[-0.02em] text-text-primary">
              Claim {claim.claimNumber}
            </h1>
            <StatusBadge variant={claim.status as 'submitted' | 'under_review' | 'verified' | 'remedy_issued' | 'resolved' | 'rejected'} />
          </div>
          <p className="text-sm text-text-secondary">
            Submitted {new Date(claim.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            {claim.resolutionDate && ` · Resolved ${new Date(claim.resolutionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`}
          </p>
        </div>

        {/* Status Actions */}
        <div className="flex items-center gap-2">
          {transitions.map((targetStatus) => (
            <Button
              key={targetStatus}
              size="sm"
              variant={targetStatus === 'rejected' ? 'outline' : 'default'}
              className={
                targetStatus === 'rejected'
                  ? 'border-status-rejected text-status-rejected hover:bg-red-50'
                  : targetStatus === 'resolved'
                  ? 'bg-blade-resolution hover:bg-blade-resolution-dark text-white'
                  : 'bg-blade-verification hover:bg-blade-verification-dark text-white'
              }
            >
              {targetStatus === 'under_review' && <Clock className="mr-1.5 h-4 w-4" />}
              {targetStatus === 'verified' && <CheckCircle2 className="mr-1.5 h-4 w-4" />}
              {targetStatus === 'remedy_issued' && <Package className="mr-1.5 h-4 w-4" />}
              {targetStatus === 'resolved' && <CheckCircle2 className="mr-1.5 h-4 w-4" />}
              {targetStatus === 'rejected' && <XCircle className="mr-1.5 h-4 w-4" />}
              {CLAIM_STATUS_LABELS[targetStatus]}
            </Button>
          ))}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Consumer + Product info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Consumer Card */}
          <Card>
            <CardHeader><CardTitle className="text-base">Consumer Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-secondary">
                  <User className="h-5 w-5 text-text-tertiary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{claim.consumerName}</p>
                  <p className="text-sm text-text-secondary">{claim.consumerEmail}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Card */}
          <Card>
            <CardHeader><CardTitle className="text-base">Affected Product</CardTitle></CardHeader>
            <CardContent>
              {product ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
                      <Package className="h-5 w-5 text-text-tertiary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{product.name}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">{product.brandName}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                        <span className="font-mono">Model: {product.modelNumber}</span>
                        <span className="font-mono">UPC: {product.upc}</span>
                      </div>
                    </div>
                  </div>
                  {campaign && (
                    <Link
                      href={`/campaigns/${campaign.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blade-verification hover:underline mt-2"
                    >
                      View Campaign
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-sm text-text-tertiary">Product not found.</p>
              )}
            </CardContent>
          </Card>

          {/* Evidence Card */}
          <Card>
            <CardHeader><CardTitle className="text-base">Evidence ({claim.evidence.length} files)</CardTitle></CardHeader>
            <CardContent>
              {claim.evidence.length > 0 ? (
                <div className="space-y-2">
                  {claim.evidence.map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-elevated">
                          <FileText className="h-4 w-4 text-text-tertiary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{ev.fileName}</p>
                          <p className="text-xs text-text-tertiary">
                            {EVIDENCE_TYPE_LABELS[ev.type]} · {new Date(ev.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs">View</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-tertiary">No evidence submitted.</p>
              )}
            </CardContent>
          </Card>

          {/* Incident Card (if present) */}
          {claim.incident && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-blade-safety" />
                  Incident Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn(
                    claim.incident.severity === 'fatal' && 'text-red-700 bg-red-50 border-red-200',
                    claim.incident.severity === 'serious' && 'text-orange-700 bg-orange-50 border-orange-200',
                    claim.incident.severity === 'moderate' && 'text-amber-700 bg-amber-50 border-amber-200',
                    claim.incident.severity === 'minor' && 'text-blue-700 bg-blue-50 border-blue-200',
                  )}>
                    {INCIDENT_SEVERITY_LABELS[claim.incident.severity]} Severity
                  </Badge>
                  <span className="text-xs text-text-tertiary">
                    Occurred {new Date(claim.incident.occurredAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">{claim.incident.description}</p>
                {claim.incident.injuryDescription && (
                  <div className="rounded-lg bg-blade-safety-light p-3 border-l-4 blade-accent-safety">
                    <p className="text-sm font-semibold text-blade-safety-text">Injury Details</p>
                    <p className="text-sm text-text-secondary mt-1">{claim.incident.injuryDescription}</p>
                  </div>
                )}
                {claim.incident.medicalAttentionRequired && (
                  <p className="text-sm font-semibold text-status-rejected">Medical attention was required</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Timeline / Audit */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Status Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-0">
                {audit.map((entry, i) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn('w-0.5 h-2.5', i === 0 ? 'bg-transparent' : 'bg-border')} />
                      <div className={cn(
                        'relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2',
                        entry.bladeStage === 'safety' && 'border-blade-safety bg-blade-safety-light',
                        entry.bladeStage === 'verification' && 'border-blade-verification bg-blade-verification-light',
                        entry.bladeStage === 'resolution' && 'border-blade-resolution bg-blade-resolution-light',
                      )} />
                      <div className={cn('w-0.5 flex-1 min-h-6', i === audit.length - 1 ? 'bg-transparent' : 'bg-border')} />
                    </div>
                    <div className="pb-4 pt-0.5">
                      <p className="text-sm font-medium text-text-primary leading-snug">{entry.action}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {entry.actor} · {new Date(entry.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {entry.details && (
                        <p className="text-xs text-text-tertiary mt-1 italic">{entry.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {audit.length === 0 && (
                <p className="text-sm text-text-tertiary text-center py-4">No activity recorded.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
