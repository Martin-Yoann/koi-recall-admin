import type { CampaignView } from './api-client';

export type ReadinessCheck = {
  id: string;
  label: string;
  status: 'present' | 'needs_attention' | 'manual_review';
  detail: string;
};

const PLACEHOLDER = /\[[^\]]+\]|\b(?:TBD|TODO|26-DRAFT|December DAY)\b/i;
const complete = (value: string) => Boolean(value.trim()) && !PLACEHOLDER.test(value);

/** Checks available published data only. Presence never proves regulatory approval. */
export function campaignReadiness(campaign: CampaignView): ReadinessCheck[] {
  const field = (id: string, label: string, values: string[], detail: string): ReadinessCheck => ({
    id, label, status: values.length > 0 && values.every(complete) ? 'present' : 'needs_attention', detail,
  });

  return [
    field('notice', 'Notice content', [campaign.title, campaign.summary, campaign.hazard, campaign.immediateAction],
      'Title, summary, hazard and immediate action must be populated without draft placeholders.'),
    field('remedy', 'Remedy instructions', [campaign.remedySummary, ...campaign.remedies.map((r) => r.displayName),
      ...(campaign.remedies.length ? [] : [''])],
      'Configured remedies and their summary are checked. Replacement approval and stock availability require separate verification.'),
    {
      id: 'contact', label: 'Recall contact details',
      status: complete(campaign.support.email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campaign.support.email)
        && !/@(?:example\.(?:com|org|net)|test\.com)$|\.invalid$/i.test(campaign.support.email)
        && complete(campaign.support.phone) && campaign.support.phone.replace(/\D/g, '').length >= 10
        && !/555[-\s]*SAFE/i.test(campaign.support.phone)
        && !/55501\d{2}$/.test(campaign.support.phone.replace(/\D/g, ''))
        && !/^(?:1)?555\d{7}$/.test(campaign.support.phone.replace(/\D/g, '')) && complete(campaign.support.hours)
        ? 'present' : 'needs_attention',
      detail: 'Email, phone and service hours must be populated. Test delivery, toll-free service and the stated time zone separately.',
    },
    field('products', 'Product identification', campaign.products.flatMap((p) => [p.name, p.brand, p.sku]),
      'Checks product names, brands and SKUs. Photos, variants and the approved recall scope still need review.'),
    field('privacy', 'Privacy notice', [campaign.privacyNotice.version, campaign.privacyNotice.url],
      'The public campaign must identify a privacy notice version and URL.'),
    {
      id: 'evidence', label: 'Evidence instructions',
      status: !campaign.evidenceRequirements.length ? 'manual_review' : campaign.evidenceRequirements.every((r) =>
        (!(r.required || r.minimumFiles > 0) || complete(r.instructions))
        && r.minimumFiles <= r.maximumFiles && (!r.required || r.maximumFiles >= 1))
        ? 'present' : 'needs_attention',
      detail: campaign.evidenceRequirements.length
        ? 'Required categories need instructions and valid file limits. Alternative evidence and exceptions require policy confirmation.'
        : 'No evidence requirements are configured. Confirm that this is intentional before publication.',
    },
    { id: 'approval', label: 'Approved public wording and remedy', status: 'manual_review',
      detail: 'Verify written approval, final scope, count, photos, disposal instructions and replacement acceptance. The public response does not contain approval evidence.' },
    { id: 'languages', label: 'Required languages', status: 'manual_review',
      detail: `This response uses ${campaign.locale}. Verify actual marketing languages and the required professional translations; this response does not enumerate all published languages.` },
    { id: 'communications', label: 'Notification and publication evidence', status: 'manual_review',
      detail: 'Verify the agreed announcement date, 48-hour advance notice, two direct notices two weeks apart, 30-day confirmation and at least 120 days of website/store notices.' },
    { id: 'reporting', label: 'Reporting and preservation', status: 'manual_review',
      detail: 'Verify the first monthly report period, monthly portal submissions, destruction certificates and ongoing preservation. Do not treat campaign version publication as the agreed recall announcement date.' },
  ];
}

export function readinessReport(campaign: CampaignView): string {
  return JSON.stringify({
    reportType: 'published_campaign_configuration_review',
    generatedAt: new Date().toISOString(),
    campaign: { slug: campaign.slug, code: campaign.code, version: campaign.version, locale: campaign.locale },
    note: 'Configuration presence is not approval or proof of execution. Manual review items are unverified.',
    checks: campaignReadiness(campaign),
    support: campaign.support,
    evidenceRequirements: campaign.evidenceRequirements,
  }, null, 2);
}
