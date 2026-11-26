'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Input, Modal, Skeleton } from 'antd';
import { getTranslationWorkspace, saveTranslationDraft, transitionTranslation } from '@/lib/api-client';
import { draftForWorkspace, type TranslationContent, type TranslationWorkspace } from '@/lib/translations';
import { usePermissions } from '@/lib/rbac';
import { useNavigationGuard } from '@/components/admin/navigation-guard';
import { useConfirm } from '@/components/admin/confirm-dialog';

type Field = { id: string; label: string; source: string; value: string; set: (draft: TranslationContent, value: string) => void };

export function CampaignTranslationEditor({ slug, enabled }: { slug: string; enabled: boolean }) {
  const { can } = usePermissions();
  const readable = can('case.queue.read'), writable = can('campaign.publish');
  const [workspace, setWorkspace] = useState<TranslationWorkspace | null>(null);
  const [draft, setDraft] = useState<TranslationContent | null>(null);
  const [baseline, setBaseline] = useState('');
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null), [note, setNote] = useState('');
  const [preview, setPreview] = useState(false);
  const loaded = useRef(false);
  const { register, requestLeave } = useNavigationGuard();
  const confirm = useConfirm();
  const dirty = Boolean(draft && JSON.stringify(draft) !== baseline);

  const adopt = useCallback((value: TranslationWorkspace) => {
    const next = draftForWorkspace(value);
    setWorkspace(value); setDraft(next); setBaseline(JSON.stringify(next)); setError(null); setNote('');
  }, []);
  const discard = useCallback(() => { if (baseline) setDraft(JSON.parse(baseline) as TranslationContent); }, [baseline]);
  useEffect(() => register({ dirty, saving: busy, discard }), [register, dirty, busy, discard]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const result = await getTranslationWorkspace(slug); if (result.ok) adopt(result.data); else setError(result.error.detail || 'Could not load translations.'); }
    catch { setError('Could not load translations. Try again.'); }
    finally { setLoading(false); }
  }, [adopt, slug]);
  useEffect(() => { if (!enabled || !readable || loaded.current) return; loaded.current = true; void load(); }, [enabled, readable, load]);

  const save = async () => {
    if (!workspace || !draft || !writable) return;
    setBusy(true); setError(null);
    const current = workspace.latest;
    try {
      const result = await saveTranslationDraft(slug, { sourceVersionId: workspace.sourceVersionId, sourceHash: workspace.sourceHash,
        revisionId: current?.status === 'draft' && !workspace.needsUpdate ? current.id : null,
        editVersion: current?.status === 'draft' && !workspace.needsUpdate ? current.editVersion : 0, content: draft });
      if (result.ok) adopt(result.data); else setError(result.error.detail || 'Could not save the translation. Your edits have been kept.');
    } catch { setError('Could not save the translation. Your edits have been kept.'); }
    finally { setBusy(false); }
  };
  const act = async (action: 'submit' | 'approve' | 'request_changes' | 'publish') => {
    const row = workspace?.latest;
    if (!row || dirty || !writable) return;
    if (action === 'publish' && !await confirm({ title: 'Publish Spanish content?', description: `Publish revision ${row.revision} against source version ${workspace.sourceVersion}. Consumers selecting Español will receive this reviewed content.`, okText: 'Publish Spanish content', cancelText: 'Cancel' })) return;
    setBusy(true); setError(null);
    try {
      const result = await transitionTranslation(slug, { revisionId: row.id, editVersion: row.editVersion, action, note });
      if (result.ok) adopt(result.data); else setError(result.error.detail || 'Could not update the translation.');
    } catch { setError('Could not update the translation. Please check its status before retrying.'); }
    finally { setBusy(false); }
  };

  if (!enabled && !workspace) return null;
  if (!readable) return <Alert type="info" title="Your role cannot view translation management." />;
  if (loading && !workspace) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (!workspace || !draft) return <div className="space-y-3"><Alert type="error" title={error || 'Translations are not available.'} /><Button onClick={() => void load()}>Retry</Button></div>;
  const current = workspace.latest;
  const editable = writable && !busy && (!current || workspace.needsUpdate || ['draft', 'published', 'changes_requested', 'superseded'].includes(current.status));
  const fields: Field[] = (['title', 'summary', 'hazard', 'immediateAction', 'remedySummary', 'supportHours'] as const).map((key) => ({ id: key, label: ({ title: 'Notice title', summary: 'Summary', hazard: 'Hazard', immediateAction: 'Immediate action', remedySummary: 'Remedy summary', supportHours: 'Support hours and time zone' })[key], source: workspace.source[key], value: draft[key], set: (d, value) => { d[key] = value; } }));
  workspace.source.products.forEach((p, i) => { for (const key of ['name', 'description'] as const) fields.push({ id: `product-${p.productId}-${key}`, label: `Product ${i + 1} · ${key}`, source: p[key], value: draft.products[i]?.[key] ?? '', set: (d, value) => { d.products[i]![key] = value; } }); });
  workspace.source.remedies.forEach((r, i) => { for (const key of ['displayName', 'description'] as const) fields.push({ id: `remedy-${r.code}-${key}`, label: `Remedy ${r.code} · ${key}`, source: r[key], value: draft.remedies[i]?.[key] ?? '', set: (d, value) => { d.remedies[i]![key] = value; } }); });
  workspace.source.evidence.forEach((e, i) => fields.push({ id: `evidence-${e.category}`, label: `Evidence · ${e.category}`, source: e.instructions, value: draft.evidence[i]?.instructions ?? '', set: (d, value) => { d.evidence[i]!.instructions = value; } }));
  workspace.source.faq.forEach((f, i) => { for (const key of ['topic', 'question', 'answer'] as const) fields.push({ id: `faq-${i}-${key}`, label: `FAQ ${i + 1} · ${key}`, source: f[key], value: draft.faq[i]?.[key] ?? '', set: (d, value) => { d.faq[i]![key] = value; } }); });
  const missing = fields.filter((f) => f.source.trim() && !f.value.trim()).length;

  return <section className="space-y-5" aria-labelledby="translation-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="translation-heading" className="text-lg font-semibold">Languages and translations</h2><p className="mt-1 text-sm text-text-secondary">English → Español · Source version {workspace.sourceVersion} · {current ? `Revision ${current.revision}: ${current.status.replaceAll('_', ' ')}` : 'No Spanish revision yet'}</p></div>
      <div className="flex flex-wrap gap-2"><Button onClick={() => setPreview(true)}>Preview Spanish</Button><Button disabled={busy} onClick={async () => { if (await requestLeave()) await load(); }}>Reload source</Button></div>
    </div>
    <Alert type="info" title="Write and review Spanish content here. This editor does not automatically translate or publish text." description="Product IDs, SKUs, lot codes, remedy codes, evidence limits and eligibility rules stay shared. Review notes record the staff decision; they do not establish regulatory approval by themselves." />
    {workspace.needsUpdate && <Alert type="warning" title="The source has changed. Save a new revision and repeat review before publishing." />}
    {workspace.publishedNeedsUpdate && <Alert type="warning" title="The previously published Spanish content is outdated and is not served to consumers. Publish a reviewed revision against the current source." />}
    {error && <Alert type="error" title={error} description="Unsaved text is retained. Reloading the source requires discarding local changes." />}
    <div className="flex flex-wrap gap-4 text-sm text-text-secondary"><span>{missing} fields missing Spanish text</span><span>{workspace.published ? `Published Spanish revision: ${workspace.published.revision}` : 'No reviewed Spanish content published through this editor'}</span></div>
    <div className="space-y-5">
      {fields.map((field) => <div key={field.id} className="rounded-xl border bg-surface-elevated p-4">
        <h3 className="mb-3 text-sm font-semibold">{field.label}</h3><div className="grid gap-4 md:grid-cols-2">
          <div><label className="mb-1 block text-xs text-text-secondary" htmlFor={`source-${field.id}`}>English source</label><textarea id={`source-${field.id}`} lang="en" value={field.source} readOnly rows={field.source.length > 180 ? 5 : 2} className="w-full rounded-md border bg-slate-50 p-3 text-sm leading-relaxed" /></div>
          <div><label className="mb-1 block text-xs text-text-secondary" htmlFor={`target-${field.id}`}>Español{field.source.trim() ? ' · Required' : ' · Optional'}</label><textarea id={`target-${field.id}`} lang="es" value={field.value} readOnly={!editable} rows={field.source.length > 180 ? 5 : 2} onChange={(event) => { const value = event.target.value; setDraft((old) => { if (!old) return old; const next = structuredClone(old); field.set(next, value); return next; }); }} className="w-full rounded-md border bg-white p-3 text-sm leading-relaxed focus:outline-2 focus:outline-blue-500 read-only:bg-slate-50" /></div>
        </div>
      </div>)}
    </div>
    {writable && <div className="sticky bottom-0 z-10 space-y-3 rounded-xl border bg-white p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm">{dirty ? 'Unsaved Spanish changes' : 'Draft changes saved'} · {missing} incomplete fields</span><div className="flex gap-2"><Button disabled={!dirty || busy} onClick={discard}>Discard</Button><Button type="primary" loading={busy} disabled={!editable || (!dirty && current?.status === 'draft')} onClick={() => void save()}>{current?.status === 'draft' && !workspace.needsUpdate ? 'Save draft' : 'Create new draft'}</Button></div></div>
      <Input.TextArea aria-label="Review reference or requested changes" value={note} onChange={(event) => setNote(event.target.value)} disabled={busy} maxLength={2000} placeholder="Review reference / translator confirmation, or an explanation of changes needed" rows={2} />
      <div className="flex flex-wrap gap-2">
        {current?.status === 'draft' && <Button disabled={busy || dirty || missing > 0 || workspace.needsUpdate} onClick={() => void act('submit')}>Submit for review</Button>}
        {current?.status === 'submitted' && <Button disabled={busy || dirty || note.trim().length < 3 || workspace.needsUpdate} onClick={() => void act('approve')}>Approve translation</Button>}
        {current && ['submitted', 'approved'].includes(current.status) && <Button disabled={busy || dirty || note.trim().length < 3} onClick={() => void act('request_changes')}>Request changes</Button>}
        {current?.status === 'approved' && <Button type="primary" disabled={busy || dirty || workspace.needsUpdate} onClick={() => void act('publish')}>Publish Spanish</Button>}
      </div>
    </div>}
    <div className="rounded-xl border p-4"><h3 className="mb-3 font-semibold">Revision history</h3><ul className="space-y-2 text-sm">{workspace.history.map((row) => <li key={row.id}>Revision {row.revision} · {row.status.replaceAll('_', ' ')} · {new Date(row.updatedAt).toLocaleString()}{row.reviewReference && <p className="text-text-secondary">Review reference: {row.reviewReference}</p>}</li>)}</ul></div>
    <Modal title="Spanish preview · Unpublished edits may be shown" open={preview} onCancel={() => setPreview(false)} footer={null} width={900}><article lang="es" className="space-y-4"><h1 className="text-2xl font-semibold">{draft.title || '—'}</h1>{[draft.summary, draft.hazard, draft.immediateAction, draft.remedySummary, draft.supportHours].map((text, i) => <p key={i} className="whitespace-pre-wrap">{text || '—'}</p>)}{draft.products.map((p) => <section key={p.productId}><h2 className="font-semibold">{p.name || '—'}</h2><p>{p.description}</p></section>)}{draft.remedies.map((r) => <section key={r.code}><h2 className="font-semibold">{r.displayName || '—'}</h2><p>{r.description}</p></section>)}{draft.evidence.map((e) => <p key={e.category}>{e.instructions}</p>)}{draft.faq.map((f, i) => <section key={i}><h2 className="font-semibold">{f.question}</h2><p>{f.answer}</p></section>)}</article></Modal>
  </section>;
}
