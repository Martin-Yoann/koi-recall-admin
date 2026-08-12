'use client';

// ============================================================
// KOI Admin — Claim Detail Page
// Data source: shared-claims-store (localStorage bridge)
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
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
import { StatusBadge } from '@/components/shared/status-badge';
import {
  getClaimByNumber,
  updateClaimStatus,
  type SharedClaim,
} from '@/lib/shared-claims-store';
import {
  CLAIM_STATUS_LABELS,
  STATUS_TRANSITIONS,
} from '@/lib/admin-constants';
import { cn } from '@/lib/utils';

const NEXT_STATUS: Record<string, string[]> = {
  submitted: ['under_review'],
  under_review: ['verified', 'rejected'],
  verified: ['remedy_issued'],
  remedy_issued: ['resolved'],
  resolved: [],
  rejected: [],
};

export default function ClaimDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [claim, setClaim] = useState<SharedClaim | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    const found = getClaimByNumber(id);
    setClaim(found || null);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleStatusChange = (newStatus: string) => {
    updateClaimStatus(id, newStatus as never);
    refresh();
  };

  if (loading) {
    return (
      <div className="container-content py-8 text-center">
        <p className="text-sm text-text-secondary">Loading claim...</p>
      </div>
    );
  }

  if (!claim) {
    notFound();
  }

  const transitions = NEXT_STATUS[claim.status] || [];

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
            <StatusBadge variant={claim.status as never} />
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
              onClick={() => handleStatusChange(targetStatus)}
              className={
                targetStatus === 'rejected'
                  ? 'border-status-rejected text-status-rejected hover:bg-red-50 cursor-pointer'
                  : targetStatus === 'resolved'
                  ? 'bg-blade-resolution hover:bg-blade-resolution-dark text-white cursor-pointer'
                  : 'bg-blade-verification hover:bg-blade-verification-dark text-white cursor-pointer'
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
                  <p className="text-xs text-text-tertiary">{claim.consumerPhone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Card */}
          <Card>
            <CardHeader><CardTitle className="text-base">Affected Product</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
                    <Package className="h-5 w-5 text-text-tertiary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{claim.productName}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                      {claim.lotCode && <span className="font-mono">Lot: {claim.lotCode}</span>}
                      {claim.dateCode && <span className="font-mono">Date: {claim.dateCode}</span>}
                    </div>
                    {claim.shape && <p className="text-xs text-text-tertiary mt-1">Shape: {claim.shape}</p>}
                    {claim.flavor && <p className="text-xs text-text-tertiary mt-1">Flavor: {claim.flavor}</p>}
                  </div>
                </div>
                {claim.campaignSlug && (
                  <Link
                    href={`/campaigns/${claim.campaignSlug}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blade-verification hover:underline mt-2"
                  >
                    View Campaign
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Evidence Card */}
          <Card>
            <CardHeader><CardTitle className="text-base">Evidence ({claim.evidenceCount} files)</CardTitle></CardHeader>
            <CardContent>
              {claim.evidenceCount > 0 ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-elevated">
                    <FileText className="h-4 w-4 text-text-tertiary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{claim.evidenceCount} evidence file{claim.evidenceCount !== 1 ? 's' : ''} submitted</p>
                    <p className="text-xs text-text-tertiary">Submitted on {new Date(claim.submittedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-tertiary">No evidence submitted.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Timeline */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Status Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-0">
                {/* Submitted event */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-2.5 bg-transparent" />
                    <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-blade-verification bg-blade-verification-light" />
                    <div className="w-0.5 flex-1 min-h-6 bg-border" />
                  </div>
                  <div className="pb-4 pt-0.5">
                    <p className="text-sm font-medium text-text-primary leading-snug">Claim Submitted</p>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {new Date(claim.submittedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                {/* Resolution event */}
                {claim.resolutionDate && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-0.5 h-2.5 bg-border" />
                      <div className={cn(
                        'relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2',
                        claim.status === 'resolved' ? 'border-blade-resolution bg-blade-resolution-light' : 'border-border bg-surface-elevated',
                      )} />
                      <div className="w-0.5 flex-1 min-h-6 bg-transparent" />
                    </div>
                    <div className="pb-4 pt-0.5">
                      <p className="text-sm font-medium text-text-primary leading-snug">
                        {claim.status === 'resolved' ? 'Resolved' : claim.status === 'rejected' ? 'Rejected' : 'Status changed'}
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {new Date(claim.resolutionDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )}
                {/* Admin notes */}
                {claim.adminNotes && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-0.5 h-2.5 bg-border" />
                      <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-blade-safety bg-blade-safety-light" />
                      <div className="w-0.5 flex-1 min-h-6 bg-transparent" />
                    </div>
                    <div className="pb-4 pt-0.5">
                      <p className="text-sm font-medium text-text-primary leading-snug">Admin Note</p>
                      <p className="text-xs text-text-tertiary mt-0.5">—</p>
                      <p className="text-xs text-text-tertiary mt-1 italic">{claim.adminNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
