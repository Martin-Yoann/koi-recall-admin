'use client';

import { useMemo, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Package,
  User,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { getClaimByNumber, updateClaimStatus, type SharedClaim } from '@/lib/shared-claims-store';
import { CLAIM_STATUS_LABELS } from '@/lib/admin-constants';
import { cn } from '@/lib/utils';

const NEXT_STATUS: Record<string, string[]> = {
  submitted: ['under_review'],
  under_review: ['verified', 'rejected'],
  verified: ['remedy_issued'],
  remedy_issued: ['resolved'],
  resolved: [],
  rejected: [],
};

type TimelineItem = {
  id: string;
  title: string;
  at: string;
  note?: string;
  emphasized?: boolean;
};

function buildTimeline(claim: SharedClaim): TimelineItem[] {
  const timeline: TimelineItem[] = [
    { id: 'submitted', title: 'Claim Submitted', at: claim.submittedAt },
  ];

  if (claim.updatedAt !== claim.submittedAt) {
    timeline.push({
      id: 'updated',
      title: 'Claim Updated',
      at: claim.updatedAt,
      note: claim.adminNotes,
    });
  }

  if (claim.resolutionDate) {
    timeline.push({
      id: 'resolution',
      title: claim.status === 'rejected' ? 'Claim Rejected' : 'Resolution Issued',
      at: claim.resolutionDate,
      note: claim.adminNotes,
      emphasized: claim.status !== 'rejected',
    });
  }

  if (claim.adminNotes && !claim.resolutionDate) {
    timeline.push({
      id: 'note',
      title: 'Admin Note',
      at: claim.submittedAt,
      note: claim.adminNotes,
    });
  }

  return [...timeline].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export default function ClaimDetailPage() {
  const params = useParams<{ id: string }>();
  const claimNumber = params.id;
  const [claim, setClaim] = useState<SharedClaim | null>(() => getClaimByNumber(claimNumber) || null);

  const timeline = useMemo(() => (claim ? buildTimeline(claim) : []), [claim]);

  if (!claim) {
    notFound();
  }

  const transitions = NEXT_STATUS[claim.status] || [];

  const handleStatusChange = (newStatus: string) => {
    updateClaimStatus(claimNumber, newStatus as never);
    setClaim(getClaimByNumber(claimNumber) || null);
  };

  return (
    <div className="container-content py-8 space-y-6">
      <Link
        href="/claims"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Claims
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold tracking-[-0.02em] text-text-primary">Claim {claim.claimNumber}</h1>
            <StatusBadge variant={claim.status as never} />
          </div>
          <p className="text-sm text-text-secondary">
            Submitted {new Date(claim.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {transitions.map((targetStatus) => (
            <Button key={targetStatus} variant="outline" onClick={() => handleStatusChange(targetStatus)}>
              {CLAIM_STATUS_LABELS[targetStatus] || targetStatus}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Consumer
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary mb-1">Name</p>
                <p className="font-medium text-text-primary">{claim.consumerName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary mb-1">Email</p>
                <p className="font-medium text-text-primary">{claim.consumerEmail}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Claim Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary mb-1">Campaign</p>
                <p className="font-medium text-text-primary">{claim.campaignTitle || '-'}</p>
                {claim.campaignSlug ? (
                  <Link href={`/campaigns/${claim.campaignSlug}`} className="mt-2 inline-flex items-center gap-1 text-xs text-brand-emerald hover:underline">
                    View Campaign
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : null}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary mb-1">Product</p>
                <p className="font-medium text-text-primary">{claim.productName || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary mb-1">Evidence Files</p>
                <p className="font-medium text-text-primary">{claim.evidenceCount}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary mb-1">Current Status</p>
                <p className="font-medium text-text-primary">{CLAIM_STATUS_LABELS[claim.status] || claim.status}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary mb-1">Remedy</p>
                <p className="font-medium text-text-primary">{claim.remedyTitle || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary mb-1">Updated</p>
                <p className="font-medium text-text-primary">{new Date(claim.updatedAt).toLocaleDateString('en-US')}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Resolution
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary mb-1">Remedy Type</p>
                <p className="font-medium text-text-primary">{claim.remedyType || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary mb-1">Refund Amount</p>
                <p className="font-medium text-text-primary">
                  {typeof claim.refundAmount === 'number' ? `$${claim.refundAmount.toFixed(2)}` : '-'}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-text-tertiary mb-1">Admin Notes</p>
                <p className="font-medium text-text-primary">{claim.adminNotes || '-'}</p>
              </div>
            </CardContent>
          </Card>

          {(claim.shape || claim.flavor || claim.lotCode || claim.dateCode) ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Product Identifiers
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-tertiary mb-1">Shape</p>
                  <p className="font-medium text-text-primary">{claim.shape || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-tertiary mb-1">Flavor</p>
                  <p className="font-medium text-text-primary">{claim.flavor || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-tertiary mb-1">Lot Code</p>
                  <p className="font-medium text-text-primary">{claim.lotCode || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-tertiary mb-1">Date Code</p>
                  <p className="font-medium text-text-primary">{claim.dateCode || '-'}</p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {timeline.length > 0 ? timeline.map((event, index) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn('w-0.5 h-2.5', index === 0 ? 'bg-transparent' : 'bg-border')} />
                      <div
                        className={cn(
                          'relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2',
                          event.emphasized ? 'border-blade-resolution bg-blade-resolution-light' : 'border-border bg-surface-elevated',
                        )}
                      />
                      <div className={cn('w-0.5 flex-1 min-h-6', index === timeline.length - 1 ? 'bg-transparent' : 'bg-border')} />
                    </div>
                    <div className="pb-4 pt-0.5">
                      <p className="text-sm font-medium text-text-primary leading-snug">{event.title}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {new Date(event.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {event.note ? <p className="text-xs text-text-tertiary mt-1 italic">{event.note}</p> : null}
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-text-secondary">No timeline events returned by the API.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Status Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-text-secondary">
              <div className="flex items-center gap-2"><Clock className="h-4 w-4" />Submitted / Under Review</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Verified / Remedy Issued</div>
              <div className="flex items-center gap-2"><XCircle className="h-4 w-4" />Rejected / Closed</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

