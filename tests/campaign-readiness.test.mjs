import assert from 'node:assert/strict';
import { test } from 'node:test';
import { campaignReadiness, readinessReport } from '../src/lib/campaign-readiness.ts';

const fixture = () => ({
  slug: 'recall', code: '18108', version: 2, locale: 'en-US', defaultLocale: 'en-US',
  publishedAt: '2026-11-26T12:00:00Z', title: 'Recall notice', summary: 'Affected products.',
  hazard: 'Battery hazard.', immediateAction: 'Stop use.', remedySummary: 'Replacement instructions.',
  support: { email: 'recall@koiimprtinc.com', phone: '800-234-6789', hours: 'Mon–Fri 9am–5pm ET' },
  products: [{ name: 'Product', sku: 'SKU1', brand: 'Brand' }],
  remedies: [{ code: 'replacement', displayName: 'Replacement' }],
  privacyNotice: { version: 'v1', url: 'https://koiimprtinc.com/privacy' },
  evidenceRequirements: [{ category: 'product_photo', required: true, minimumFiles: 1, maximumFiles: 3, instructions: 'Show the label.' }],
});

test('complete configuration never verifies approval, language scope, notices or reporting', () => {
  const checks = campaignReadiness(fixture());
  assert.equal(checks.filter((c) => c.status === 'needs_attention').length, 0);
  for (const id of ['approval', 'languages', 'communications', 'reporting']) {
    assert.equal(checks.find((c) => c.id === id).status, 'manual_review');
  }
});

test('missing product/remedy and template contacts require attention', () => {
  const data = fixture();
  data.products = [];
  data.remedies = [];
  data.support.phone = '1-800-555-SAFE';
  data.title = '26-DRAFT [TITLE]';
  const checks = campaignReadiness(data);
  for (const id of ['products', 'remedy', 'contact', 'notice']) {
    assert.equal(checks.find((c) => c.id === id).status, 'needs_attention');
  }
});

test('missing evidence is unverified and inconsistent evidence is flagged', () => {
  const data = fixture();
  data.evidenceRequirements = [];
  assert.equal(campaignReadiness(data).find((c) => c.id === 'evidence').status, 'manual_review');
  data.evidenceRequirements = [{ required: true, minimumFiles: 3, maximumFiles: 1, instructions: '' }];
  assert.equal(campaignReadiness(data).find((c) => c.id === 'evidence').status, 'needs_attention');
});

test('export preserves review findings and identifies source version without inventing approval', () => {
  const data = fixture();
  const before = structuredClone(data);
  const report = JSON.parse(readinessReport(data));
  assert.deepEqual(report.checks, campaignReadiness(data));
  assert.equal(report.campaign.version, 2);
  assert.deepEqual(report.evidenceRequirements, data.evidenceRequirements);
  assert.match(report.note, /not approval/);
  assert.deepEqual(data, before);
});
