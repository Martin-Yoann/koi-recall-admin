export interface TranslationContent {
  title: string; summary: string; hazard: string; immediateAction: string; remedySummary: string; supportHours: string;
  products: Array<{ productId: string; name: string; description: string }>;
  remedies: Array<{ code: string; displayName: string; description: string }>;
  evidence: Array<{ category: string; instructions: string }>;
  faq: Array<{ topic: string; question: string; answer: string }>;
}
export type TranslationStatus = 'draft' | 'submitted' | 'approved' | 'changes_requested' | 'published' | 'superseded';
export interface TranslationRevision {
  id: string; revision: number; editVersion: number; status: TranslationStatus; sourceHash: string;
  content: TranslationContent; source: TranslationContent;
  createdBy: string; updatedBy: string; reviewedBy: string | null; reviewReference: string | null;
  reviewedAt: string | null; publishedBy: string | null; publishedAt: string | null; createdAt: string; updatedAt: string;
  history: Array<{ action: string; actor: string; at: string; note?: string }>;
}
export interface TranslationWorkspace {
  sourceVersionId: string; sourceVersion: number; sourceLocale: string; sourceHash: string; locale: 'es-US';
  source: TranslationContent; empty: TranslationContent; latest: TranslationRevision | null; published: TranslationRevision | null;
  history: Array<Omit<TranslationRevision, 'content' | 'source'>>; needsUpdate: boolean; publishedNeedsUpdate: boolean; missing: string[];
}

/** Keep existing text for matching IDs when a source version adds/removes products. */
export function draftForWorkspace(workspace: TranslationWorkspace): TranslationContent {
  const old = workspace.latest?.content;
  if (!old) return structuredClone(workspace.empty);
  return { ...structuredClone(old),
    products: workspace.source.products.map((p) => old.products.find((t) => t.productId === p.productId) ?? { productId: p.productId, name: '', description: '' }),
    remedies: workspace.source.remedies.map((r) => old.remedies.find((t) => t.code === r.code) ?? { code: r.code, displayName: '', description: '' }),
    evidence: workspace.source.evidence.map((e) => old.evidence.find((t) => t.category === e.category) ?? { category: e.category, instructions: '' }),
    faq: workspace.source.faq.map((_, i) => old.faq[i] ?? { topic: '', question: '', answer: '' }),
  };
}
