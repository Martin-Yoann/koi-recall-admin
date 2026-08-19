'use client';

// ============================================================
// KOI Admin — Campaign Detail Page
// Campaign data: mock-recalls (no campaign list API yet)
// Claims data: shared-claims-store
// ============================================================

import { useMemo } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  Calendar,
  Factory,
  Package,
  Hash,
  Pencil,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/status-badge';
import { getCampaignBySlug } from '@/data/mock-recalls';
import { getClaimsByCampaign } from '@/lib/shared-claims-store';
import type { Campaign } from '@/types';
import { RISK_LEVEL_LABELS, REMEDY_TYPE_LABELS } from '@/lib/admin-constants';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const RISK_COLORS: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  moderate: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-blue-50 text-blue-700 border-blue-200',
};

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const campaign: Campaign | undefined = getCampaignBySlug(id);

  const claims = useMemo(
    () => (campaign ? getClaimsByCampaign(campaign.id) : []),
    [campaign],
  );

  if (!campaign) notFound();

  return (
    <div className="container-content py-8 space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Campaigns
        </Link>
        <Button variant="outline" size="sm">
          <Pencil className="mr-1.5 h-4 w-4" />
          Edit Campaign
        </Button>
      </div>

      {/* Campaign Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <StatusBadge variant={campaign.status as 'active' | 'closed' | 'pending' | 'expanded'} />
            <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase', RISK_COLORS[campaign.riskLevel])}>
              <AlertTriangle className="h-3 w-3" />
              {RISK_LEVEL_LABELS[campaign.riskLevel]}
            </span>
          </div>

          <h1 className="text-[1.75rem] font-bold tracking-[-0.02em] text-text-primary leading-tight mb-3">
            {campaign.title}
          </h1>
          <p className="text-text-secondary leading-relaxed max-w-3xl mb-6">
            {campaign.summary}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <Hash className="h-4 w-4" />
              CPSC #{campaign.cpscNumber}
            </span>
            <span className="flex items-center gap-1.5 text-text-secondary">
              <Calendar className="h-4 w-4" />
              Recalled {campaign.recallDate}
            </span>
            <span className="flex items-center gap-1.5 text-text-secondary">
              <Factory className="h-4 w-4" />
              {campaign.manufacturerName}
            </span>
            <span className="flex items-center gap-1.5 text-text-secondary">
              <Package className="h-4 w-4" />
              {campaign.estimatedUnits.toLocaleString()} units
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Metric row */}
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Claims', value: claims.length, icon: Users },
          { label: 'Products', value: campaign.affectedProducts.length, icon: Package },
          { label: 'Remedies', value: campaign.remedies.length, icon: Calendar },
          { label: 'Last Updated', value: new Date(campaign.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), icon: Calendar },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border bg-surface-elevated p-4">
            <div className="flex items-center gap-2 mb-1">
              <m.icon className="h-4 w-4 text-text-tertiary" />
              <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">{m.label}</p>
            </div>
            <p className="text-xl font-bold text-text-primary">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products ({campaign.affectedProducts.length})</TabsTrigger>
          <TabsTrigger value="remedies">Remedies ({campaign.remedies.length})</TabsTrigger>
          <TabsTrigger value="claims">Claims ({claims.length})</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-text-secondary leading-relaxed">{campaign.description}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Hazard Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-text-secondary leading-relaxed">{campaign.hazardDescription}</p>
              <div className="rounded-lg bg-blade-safety-light p-4 border-l-4 blade-accent-safety">
                <p className="text-sm font-semibold text-blade-safety-text">Consumer Instructions</p>
                <p className="text-sm text-text-secondary mt-1">{campaign.instructions}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Manufacturer Contact</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">{campaign.manufacturerContact}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Model Number</TableHead>
                    <TableHead>UPC</TableHead>
                    <TableHead>Manufacture Dates</TableHead>
                    <TableHead>Retailers</TableHead>
                    <TableHead>Price Range</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaign.affectedProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-semibold text-sm text-text-primary max-w-[200px] truncate">
                        {product.name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{product.modelNumber}</TableCell>
                      <TableCell className="font-mono text-sm text-text-secondary">{product.upc}</TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {product.manufactureDateStart} → {product.manufactureDateEnd}
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {product.retailerNames.join(', ')}
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        ${product.priceRange.min}–${product.priceRange.max}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Remedies Tab */}
        <TabsContent value="remedies">
          <div className="grid gap-4">
            {campaign.remedies.map((remedy) => (
              <Card key={remedy.id}>
                <CardContent className="pt-6 flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{REMEDY_TYPE_LABELS[remedy.type]}</Badge>
                      <h4 className="text-base font-bold text-text-primary">{remedy.title}</h4>
                    </div>
                    <p className="text-sm text-text-secondary">{remedy.description}</p>
                    <div className="flex items-center gap-3 text-xs text-text-tertiary">
                      <span>Deadline: {new Date(remedy.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      {remedy.compensationAmount && (
                        <span>Compensation: ${remedy.compensationAmount.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Claims Tab */}
        <TabsContent value="claims">
          <Card>
            <CardContent className="pt-6">
              {claims.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim #</TableHead>
                      <TableHead>Consumer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell className="font-mono text-sm font-semibold text-blade-verification">
                          <Link href={`/claims/${claim.claimNumber}`} className="hover:underline">
                            {claim.claimNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium text-text-primary">{claim.consumerName}</p>
                          <p className="text-xs text-text-tertiary">{claim.consumerEmail}</p>
                        </TableCell>
                        <TableCell><StatusBadge variant={claim.status as 'submitted' | 'under_review' | 'verified' | 'remedy_issued' | 'resolved' | 'rejected'} /></TableCell>
                        <TableCell className="text-sm text-text-tertiary">
                          {new Date(claim.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-text-tertiary text-center py-8">No claims for this campaign.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {(
                  <p className="text-sm text-text-tertiary text-center py-8">Audit history will be available via the backend API in an upcoming release.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
