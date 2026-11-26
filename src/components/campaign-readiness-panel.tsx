'use client';

import { Download } from 'lucide-react';
import { Button } from 'antd';
import type { CampaignView } from '@/lib/api-client';
import { campaignReadiness, readinessReport } from '@/lib/campaign-readiness';

const STATUS_LABELS = {
  present: 'Configured', needs_attention: 'Needs attention', manual_review: 'Verify separately',
};
const STATUS_STYLES = {
  present: 'bg-emerald-50 text-emerald-800',
  needs_attention: 'bg-amber-50 text-amber-800',
  manual_review: 'bg-slate-100 text-slate-700',
};

export function CampaignReadinessPanel({ campaign }: { campaign: CampaignView }) {
  const checks = campaignReadiness(campaign);
  const attention = checks.filter((c) => c.status === 'needs_attention').length;
  const manual = checks.filter((c) => c.status === 'manual_review').length;

  function downloadReport() {
    const url = URL.createObjectURL(new Blob([readinessReport(campaign)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `recall-readiness-${campaign.slug.replace(/[^a-zA-Z0-9_-]/g, '_')}-v${campaign.version}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section className="space-y-5" aria-labelledby="readiness-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="readiness-title" className="text-lg font-semibold text-text-primary">Publication review</h2>
          <p className="mt-1 text-sm text-text-secondary">{attention} configuration {attention === 1 ? 'item needs' : 'items need'} attention · {manual} items require separate verification</p>
        </div>
        <Button icon={<Download className="h-4 w-4" />} onClick={downloadReport}>Export review</Button>
      </div>
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        This checks the published version&apos;s available configuration. A configured field does not establish approval, successful notification or completion of a corrective action. No approval or task status is changed here.
      </p>
      <div className="divide-y rounded-xl border bg-surface-elevated">
        {checks.map((check) => (
          <div key={check.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-text-primary">{check.label}</h3>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[check.status]}`}>{STATUS_LABELS[check.status]}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{check.detail}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-surface-elevated p-4">
        <h3 className="text-sm font-semibold text-text-primary">Configured evidence rules</h3>
        <div className="mt-3 space-y-4">
          {campaign.evidenceRequirements.length ? campaign.evidenceRequirements.map((rule) => (
            <div key={rule.category} className="text-sm text-text-secondary">
              <p className="font-medium text-text-primary">{rule.category.replaceAll('_', ' ')} · {rule.required || rule.minimumFiles > 0 ? 'Required' : 'Optional'} · {Math.max(rule.minimumFiles, rule.required ? 1 : 0)}–{rule.maximumFiles} files</p>
              <p className="mt-1 whitespace-pre-wrap">{rule.instructions || 'No instructions configured.'}</p>
              <p className="mt-1 text-xs">{rule.allowedMimeTypes.join(', ')} · Up to {(rule.maximumFileSizeBytes / 1024 / 1024).toFixed(1)} MB per file</p>
            </div>
          )) : <p className="text-sm text-text-secondary">No evidence requirements configured.</p>}
        </div>
      </div>
    </section>
  );
}
