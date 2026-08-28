'use client';

// ============================================================
// KOI Admin — Campaign Detail Page (API-first)
// Campaign content: public GET /v1/recall-campaigns/{slug}
// Case count: admin GET /admin/campaigns
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  Calendar,
  Package,
  Hash,
  Users,
  RefreshCw,
  LifeBuoy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCampaign, listCampaigns } from '@/lib/api-client';
import type { CampaignView } from '@/lib/api-client';

export default function CampaignDetailPage() {
  const params = useParams();
  const slug = params.id as string;
  const [campaign, setCampaign] = useState<CampaignView | null>(null);
  const [caseCount, setCaseCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const requestIdRef = useRef(0);

  const load = useCallback(async (tab: string = activeTab) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    // The public campaign endpoint owns overview/products/remedies. The admin
    // campaign list owns the cases count, so reload only the data needed by the
    // selected tab while keeping the current content visible during the fetch.
    if (tab === 'cases') {
      const campaignsResult = await listCampaigns();
      if (requestId !== requestIdRef.current) return;
      if (campaignsResult.ok) {
        setCaseCount(
          campaignsResult.data.campaigns.find((c) => c.slug === slug)?.caseCount ?? 0,
        );
        setError(null);
      } else {
        setError(campaignsResult.error?.detail || 'Failed to load campaign cases.');
      }
      setLoading(false);
      return;
    }

    const campaignResult = await getCampaign(slug);
    if (requestId !== requestIdRef.current) return;
    if (campaignResult.ok) {
      setCampaign(campaignResult.data.campaign);
      setNotFound(false);
    } else if (campaignResult.status === 404) {
      setNotFound(true);
    } else {
      setError(campaignResult.error?.detail || 'Failed to load campaign.');
    }
    setLoading(false);
  }, [activeTab, slug]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load('overview');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, slug]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    void load(value);
  };

  if (loading) {
    return (
      <div className="container-content py-8">
        <div className="animate-pulse text-text-tertiary text-sm">Loading campaign…</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container-content py-16 text-center">
        <AlertTriangle className="h-8 w-8 mx-auto text-text-tertiary mb-3" />
        <p className="text-sm font-semibold text-text-primary mb-1">Campaign Not Found</p>
        <p className="text-xs text-text-tertiary mb-4 font-mono">{slug}</p>
        <Link href="/campaigns" className="text-brand-emerald hover:underline text-sm">Back to Campaigns</Link>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container-content py-16 text-center">
        <p className="text-sm font-semibold text-text-primary mb-1">Could not load campaign</p>
        <p className="text-xs text-text-tertiary mb-4">{error}</p>
        <button onClick={load} className="rounded-lg bg-brand-emerald px-4 py-2 text-xs font-semibold text-white cursor-pointer inline-flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

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
        <span className="text-xs text-text-tertiary rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
          Read-only until the next recall
        </span>
      </div>

      {/* Campaign Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-50 text-slate-600">published version {campaign.version}</span>
            <span className="text-xs font-mono text-text-tertiary px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200">{campaign.code}</span>
          </div>

          <h1 className="text-[1.75rem] font-bold tracking-[-0.02em] text-text-primary leading-tight mb-3">
            {campaign.title}
          </h1>
          <p className="text-text-secondary leading-relaxed max-w-3xl mb-6">
            {campaign.summary}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <LifeBuoy className="h-4 w-4" />
              {campaign.support.email} · {campaign.support.phone}
            </span>
            <span className="flex items-center gap-1.5 text-text-secondary">
              <Calendar className="h-4 w-4" />
              {campaign.support.hours}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Metric row */}
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: 'Cases', value: caseCount ?? '—', icon: Users },
          { label: 'Products', value: campaign.products.length, icon: Package },
          { label: 'Remedies', value: campaign.remedies.length, icon: Hash },
          { label: 'Version', value: campaign.version, icon: Calendar },
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
          <TabsTrigger value="products">Products ({campaign.products.length})</TabsTrigger>
          <TabsTrigger value="remedies">Remedies ({campaign.remedies.length})</TabsTrigger>
          <TabsTrigger value="cases">Cases</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Hazard Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-text-secondary leading-relaxed">{campaign.hazard}</p>
              <div className="rounded-lg bg-blade-safety-light p-4 border-l-4 blade-accent-safety">
                <p className="text-sm font-semibold text-blade-safety-text">Immediate Action</p>
                <p className="text-sm text-text-secondary mt-1">{campaign.immediateAction}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Remedy Summary</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">{campaign.remedySummary}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {campaign.products.map((product) => (
                  <div key={product.productId} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p className="text-sm font-bold text-text-primary">{product.name}</p>
                      <Badge variant="outline">{product.brand}</Badge>
                      <span className="text-xs font-mono text-text-tertiary">{product.sku}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-secondary">
                      {(product.shapes.length > 0 || product.flavors.length > 0) && (
                        <span>Shapes: {product.shapes.join(', ') || '—'} · Flavors: {product.flavors.join(', ') || '—'}</span>
                      )}
                      <span>Affected lots: {product.affectedLots.length}</span>
                    </div>
                    {product.affectedLots.length > 0 && (
                      <div className="mt-3 overflow-x-auto rounded-lg border">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-surface-secondary/60 text-left text-text-tertiary">
                              <th className="px-3 py-2 font-semibold">Lot code</th>
                              <th className="px-3 py-2 font-semibold">Date code</th>
                            </tr>
                          </thead>
                          <tbody>
                            {product.affectedLots.map((lot) => (
                              <tr key={`${lot.lotCode}-${lot.dateCode}`} className="border-b last:border-0">
                                <td className="px-3 py-1.5 font-mono text-text-primary">{lot.lotCode}</td>
                                <td className="px-3 py-1.5 font-mono text-text-primary">{lot.dateCode}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Remedies Tab */}
        <TabsContent value="remedies">
          <div className="grid gap-4">
            {campaign.remedies.map((remedy) => (
              <Card key={remedy.code}>
                <CardContent className="pt-6 flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{remedy.code}</Badge>
                      <h4 className="text-base font-bold text-text-primary">{remedy.displayName}</h4>
                    </div>
                    <p className="text-sm text-text-secondary">{campaign.remedySummary}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Cases Tab */}
        <TabsContent value="cases">
          <Card>
            <CardContent className="pt-6 text-center py-8">
              <p className="text-sm text-text-secondary mb-4">
                {caseCount !== null
                  ? `${caseCount} case${caseCount === 1 ? '' : 's'} submitted under this campaign.`
                  : 'Case counts require the admin API.'}
              </p>
              <Link
                href="/cases"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-emerald px-4 py-2 text-xs font-semibold text-white cursor-pointer hover:bg-emerald-800"
              >
                Browse all cases
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
