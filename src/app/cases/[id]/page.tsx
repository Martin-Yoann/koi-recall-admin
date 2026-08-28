'use client';

// ============================================================
// KOI Recall Admin — Case Detail v3.0 (live Neon data)
// GET /admin/cases/{ref} · assign · status transition · audit
// Legal transitions mirror backend ADR-0004 B8 state machine.
// ============================================================

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, User, AlertTriangle, RefreshCw, Users, Clock,
  CheckCircle2, ArrowRight, Shield, MapPin, Mail, Phone, Globe, Package,
  FileText, Eye, Lock, Siren,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { cn } from '@/lib/utils';
import {
  getCaseDetail, transitionCaseStatus, assignCase, listStaff, queryAuditEvents,
  closeReportabilityReview,
  type CaseDetail, type StaffUser, type AuditEvent, type CaseDocument,
} from '@/lib/api-client';
import { useAdminAuth } from '@/lib/admin-auth';
import { usePermissions } from '@/lib/rbac';
import {
  formatBlockingReason,
  formatWorkflowLabel,
  getCaseOperationsView,
  runResolutionAction,
} from '@/lib/case-operations';

const TERMINAL = ['closed', 'rejected', 'duplicate', 'withdrawn'];

/** Transitions that close the case negatively — always require a reason. */
const REASON_REQUIRED = ['rejected', 'duplicate', 'withdrawn'];

/** Prefill options for the "request more information" dialog (need_info). */
const INFO_REQUEST_OPTIONS = [
  'A photo or copy of the proof of purchase',
  'Clearer product photos (shape and flavor visible)',
  'A close-up photo of the lot and date codes',
  'More details about the incident (timeline, injuries, treatment)',
];

/** One evidence file row — metadata only (no storage pathname, no blob URL). */
function DocumentRow({ doc }: { doc: CaseDocument }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2 text-xs">
      <FileText className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-text-primary truncate">{doc.originalFileName}</p>
        <p className="text-[10px] text-text-tertiary mt-0.5">
          {doc.declaredMimeType} · {(doc.sizeBytes / 1024).toFixed(0)} KiB
          {doc.uploadedAt ? ` · ${new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
        </p>
      </div>
      <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0', UPLOAD_STATUS_STYLES[doc.uploadStatus] ?? 'bg-slate-100 text-slate-600')}>
        {doc.uploadStatus.replace(/_/g, ' ')}
      </span>
      <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0', SCAN_STATUS_STYLES[doc.scanStatus] ?? 'bg-slate-100 text-slate-600')}>
        scan: {doc.scanStatus.replace(/_/g, ' ')}
      </span>
    </div>
  );
}

const EVIDENCE_CATEGORIES: Array<{ id: string; label: string }> = [
  { id: 'proof_of_purchase', label: 'Proof of Purchase' },
  { id: 'product_photo', label: 'Product Photos' },
  { id: 'incident_evidence', label: 'Incident Evidence' },
];

const UPLOAD_STATUS_STYLES: Record<string, string> = {
  linked: 'bg-emerald-50 text-emerald-700',
  verified: 'bg-emerald-50 text-emerald-700',
  uploaded: 'bg-blue-50 text-blue-700',
  authorized: 'bg-slate-100 text-slate-600',
  rejected: 'bg-red-50 text-red-700',
  deletion_pending: 'bg-amber-50 text-amber-700',
  deleted: 'bg-slate-100 text-slate-400',
};

const SCAN_STATUS_STYLES: Record<string, string> = {
  clean: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  infected: 'bg-red-100 text-red-800 font-bold',
  failed: 'bg-red-50 text-red-700',
  not_run: 'bg-slate-100 text-slate-500',
};

const TRANSITION_STYLES: Record<string, string> = {
  approved: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  closed: 'bg-emerald-700 hover:bg-emerald-800 text-white',
  rejected: 'bg-red-600 hover:bg-red-700 text-white',
  duplicate: 'bg-blue-600 hover:bg-blue-700 text-white',
  withdrawn: 'bg-slate-600 hover:bg-slate-700 text-white',
  triage: 'bg-amber-600 hover:bg-amber-700 text-white',
  under_review: 'bg-blue-600 hover:bg-blue-700 text-white',
  need_info: 'bg-orange-600 hover:bg-orange-700 text-white',
  closure_review: 'bg-violet-600 hover:bg-violet-700 text-white',
};

const AUDIT_DOT: Record<string, string> = {
  case: 'bg-blue-500',
  incident: 'bg-red-500',
  staff: 'bg-emerald-500',
  document: 'bg-amber-500',
  reportability: 'bg-violet-500',
};

const RESOLUTION_ACTION_STYLES: Record<string, string> = {
  'resolution:approve': 'bg-emerald-600 hover:bg-emerald-700 text-white',
  'resolution:complete': 'bg-blue-600 hover:bg-blue-700 text-white',
  'resolution:cancel': 'bg-red-600 hover:bg-red-700 text-white',
};

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: caseRef } = use(params);
  useAdminAuth();

  return <CaseDetailContent key={caseRef} caseRef={caseRef} />;
}

function CaseDetailContent({ caseRef }: { caseRef: string }) {
  const { can, role } = usePermissions();
  const [record, setRecord] = useState<CaseDetail | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [transitionReason, setTransitionReason] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [assignTarget, setAssignTarget] = useState('');
  /** Null = follow the consumer's requested remedy type (pre-filled). */
  const [resolutionTypeOverride, setResolutionTypeOverride] = useState<'replacement' | 'refund' | null>(null);
  /** Refund amount typed in DOLLARS — converted to minor units on submit. */
  const [refundAmount, setRefundAmount] = useState('');
  const [refundCurrency, setRefundCurrency] = useState('USD');
  const [externalReference, setExternalReference] = useState('');
  const [viewingRawPii, setViewingRawPii] = useState(false);
  const [needInfoOpen, setNeedInfoOpen] = useState(false);
  const [needInfoNote, setNeedInfoNote] = useState('');
  const [repOutcome, setRepOutcome] = useState<'filed' | 'documented_non_reportable'>('filed');
  const [repCpsc, setRepCpsc] = useState('');
  const [repRationale, setRepRationale] = useState('');
  const [repSubmitting, setRepSubmitting] = useState(false);
  const [repError, setRepError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const initialLoadStartedRef = useRef(false);
  /** Kept in a ref so refresh() always reloads at the tier currently on screen. */
  const piiLevelRef = useRef<'masked' | 'raw'>('masked');

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const refresh = useCallback(async () => {
    const result = await getCaseDetail(caseRef, piiLevelRef.current);
    if (!mountedRef.current) return;
    if (result.ok) {
      setRecord(result.data.case);
      setViewingRawPii(result.data.case.consumer.piiTier === 'raw');
      setNotFound(false);
      setAuthError(false);
      setActionError(null);
      const auditResult = await queryAuditEvents({ limit: 100, resource: caseRef });
      if (!mountedRef.current) return;
      if (auditResult.ok) {
        setAudit(
          auditResult.data.events
            .filter(e => e.resourceId === caseRef)
            .slice(-20)
            .reverse(),
        );
      }
    } else if (result.status === 401) {
      setAuthError(true);
    } else if (result.status === 404) {
      setNotFound(true);
    } else {
      setActionError(result.error?.detail || 'Failed to load case.');
    }
  }, [caseRef]);

  /**
   * Switch to the raw PII tier. The raw read decrypts PII (and the incident
   * narrative) server-side and writes a pii.view_raw audit row — make sure the
   * reviewer confirms before we trigger it.
   */
  const toggleRawPii = async () => {
    if (piiLevelRef.current === 'masked') {
      const confirmed = window.confirm(
        'You are about to decrypt this consumer\'s raw PII. This read is recorded in the audit log (pii.view_raw). Continue?',
      );
      if (!confirmed) return;
      piiLevelRef.current = 'raw';
    } else {
      piiLevelRef.current = 'masked';
    }
    await refresh();
  };

  const loadInitialData = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      await Promise.all([
        refresh(),
        listStaff()
          .then((result) => {
            if (mountedRef.current && result.ok) {
              setStaff(result.data);
            }
          })
          .catch(() => {}),
      ]);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [refresh]);

  useEffect(() => {
    if (initialLoadStartedRef.current || loading || record || notFound || authError || actionError) {
      return;
    }
    initialLoadStartedRef.current = true;
    const timer = window.setTimeout(() => {
      void loadInitialData();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [actionError, authError, loadInitialData, loading, notFound, record]);

  const handleTransition = async (next: string) => {
    if (!record) return;

    // need_info requires telling the consumer what to provide — open the
    // dedicated request dialog instead of transitioning silently.
    if (next === 'need_info') {
      setNeedInfoNote('');
      setNeedInfoOpen(true);
      return;
    }

    // Negative closures are auditable decisions: require a written reason.
    if (REASON_REQUIRED.includes(next) && transitionReason.trim().length === 0) {
      setActionError(`A written reason is required before moving this case to ${next.replace(/_/g, ' ')}.`);
      return;
    }

    setSubmitting(true);
    setActionError(null);
    const result = await transitionCaseStatus(caseRef, {
      status: next,
      ...(transitionReason.trim() ? { note: transitionReason.trim() } : {}),
    });
    if (result.ok) {
      setTransitionReason('');
      await refresh();
    } else {
      setActionError(result.error?.detail || `Transition to ${next} failed (${result.status})`);
    }
    setSubmitting(false);
  };

  /** Submit the need_info request built in the dialog. */
  const submitNeedInfo = async () => {
    const note = needInfoNote.trim();
    if (note.length < 10) {
      setActionError('Please describe what the consumer should provide (at least 10 characters).');
      return;
    }
    setSubmitting(true);
    setActionError(null);
    const result = await transitionCaseStatus(caseRef, { status: 'need_info', note });
    if (result.ok) {
      setNeedInfoOpen(false);
      setNeedInfoNote('');
      await refresh();
    } else {
      setActionError(result.error?.detail || `Request for information failed (${result.status})`);
    }
    setSubmitting(false);
  };

  /** Close the pending reportability review from the closure checklist. */
  const submitReportabilityClose = async () => {
    const review = cse?.incident?.reportability;
    if (!review) return;
    if (repRationale.trim().length < 10) {
      setRepError('A rationale of at least 10 characters is required.');
      return;
    }
    if (repOutcome === 'filed' && !repCpsc.trim()) {
      setRepError('CPSC reference is required when closing as filed.');
      return;
    }
    setRepSubmitting(true);
    setRepError(null);
    const result = await closeReportabilityReview(review.id, {
      outcome: repOutcome,
      rationale: repRationale.trim(),
      ...(repCpsc.trim() ? { cpscReference: repCpsc.trim() } : {}),
    });
    if (result.ok) {
      setRepRationale('');
      setRepCpsc('');
      await refresh();
    } else {
      setRepError(result.error?.detail || 'Failed to close the reportability review.');
    }
    setRepSubmitting(false);
  };

  const handleAssign = async () => {
    if (!record || !assignTarget) return;
    setSubmitting(true);
    setActionError(null);
    const result = await assignCase(caseRef, { staffUserId: assignTarget });
    if (result.ok) {
      await refresh();
    } else {
      setActionError(result.error?.detail || `Assignment failed (${result.status})`);
    }
    setSubmitting(false);
  };

  const handleResolutionAction = async (
    action: 'resolution:approve' | 'resolution:complete' | 'resolution:cancel',
  ) => {
    if (!record?.resolution) return;

    const note = resolutionNote.trim();
    if (note.length < 10) {
      setActionError('Resolution note must be at least 10 characters.');
      return;
    }

    const refundDollars =
      resolutionType === 'refund' && refundAmount.trim() ? Number.parseFloat(refundAmount.trim()) : NaN;
    const refundAmountMinor = Number.isFinite(refundDollars) ? Math.round(refundDollars * 100) : undefined;

    if (action === 'resolution:approve' && resolutionType === 'refund') {
      if (refundAmountMinor === undefined || refundAmountMinor <= 0) {
        setActionError('Refund approvals require a positive refund amount in dollars.');
        return;
      }
      if (!refundCurrency.trim()) {
        setActionError('Refund approvals require a currency code.');
        return;
      }
    }

    setSubmitting(true);
    setActionError(null);
    const result = await runResolutionAction(caseRef, action, {
      note,
      expectedVersion: record.resolution.version,
      type: resolutionType,
      refundAmountMinor,
      currency: refundCurrency.trim().toUpperCase() || undefined,
      externalReference: externalReference.trim() || undefined,
    });
    if (result.ok) {
      setResolutionNote('');
      setExternalReference('');
      if (action === 'resolution:approve') {
        setResolutionTypeOverride(null);
        setRefundAmount('');
        setRefundCurrency('USD');
      }
      await refresh();
    } else {
      setActionError(result.error?.detail || `${formatWorkflowLabel(action)} failed (${result.status})`);
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="animate-pulse p-8 text-text-tertiary">Loading case from Neon...</div>;
  }

  if (authError) {
    return (
      <div className="p-12 text-center">
        <Shield className="h-10 w-10 mx-auto text-text-tertiary mb-3" />
        <p className="text-text-primary font-bold mb-2">Sign in required</p>
        <p className="text-sm text-text-tertiary">Log in with a staff account to view this case.</p>
      </div>
    );
  }

  if (notFound || !record) {
    return (
      <div className="p-12 text-center">
        <p className="text-text-primary font-bold mb-2">Case Not Found</p>
        <p className="text-sm text-text-tertiary mb-3 font-mono">{caseRef}</p>
        <Link href="/cases" className="text-brand-emerald hover:underline text-sm">Back to Cases</Link>
      </div>
    );
  }

  const cse = record;
  const isTerminal = TERMINAL.includes(cse.status);
  const operations = getCaseOperationsView(cse);
  const transitions = operations.transitions;
  const resolutionActions = operations.resolutionActions;
  const canApproveResolution = resolutionActions.includes('resolution:approve');
  const canCompleteResolution = resolutionActions.includes('resolution:complete');
  const resolution = cse.resolution;
  /** Approval type pre-fills from what the consumer requested (overridable). */
  const resolutionType = resolutionTypeOverride ?? resolution?.requestedType ?? 'replacement';
  const assignedStaff = staff.find(s => s.id === cse.assignedToStaffUserId);
  const consumerName = `${cse.consumer.firstName} ${cse.consumer.lastName}`.trim();
  /** Latest need_info transition note — what the review team asked the consumer to provide. */
  const infoRequest = (() => {
    const events = cse.events ?? [];
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i]!;
      const data = event.data as Record<string, unknown> | null;
      if (
        event.eventType === 'case.status.transitioned' &&
        data?.nextStatus === 'need_info' &&
        typeof data.note === 'string'
      ) {
        return { note: data.note, at: event.occurredAt };
      }
    }
    return null;
  })();

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/cases" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />Cases
          </Link>
          <div className="h-5 w-px bg-border" />
          <h1 className="text-xl font-bold text-text-primary font-mono">{cse.caseReference}</h1>
          <StatusBadge variant={cse.status as never} />
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700 border-slate-200">
            {cse.subtype.replace(/_/g, ' ')}
          </span>
          {cse.incidentFlag && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />Incident
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer hover:bg-surface-secondary text-text-secondary"
        >
          <RefreshCw className="h-3.5 w-3.5" />Refresh
        </button>
      </div>

      {/* Incident gate warning */}
      {cse.incidentFlag && !isTerminal && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800">Incident Reported</p>
            <p className="text-xs text-red-700 mt-0.5">
              This case is flagged with a safety incident (subtype: {cse.subtype.replace(/_/g, ' ')}).
              Review reportability obligations before closing.
            </p>
          </div>
        </div>
      )}

      {/* Requested information (need_info loop with the consumer) */}
      {(cse.status === 'need_info' || infoRequest) && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
            <Clock className="h-4 w-4" />Information Requested
          </p>
          {infoRequest ? (
            <>
              <p className="text-xs text-amber-900 mt-1.5 whitespace-pre-wrap leading-relaxed">{infoRequest.note}</p>
              <p className="text-[10px] text-amber-700 mt-2">
                Requested {new Date(infoRequest.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · the consumer sees this case as “Action required” with this message.
              </p>
            </>
          ) : (
            <p className="text-xs text-amber-700 mt-1">
              This case is waiting for consumer information, but no request note was recorded (legacy transition). Move it back to under review once the consumer responds.
            </p>
          )}
        </div>
      )}

      {actionError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800">
          {actionError}
        </div>
      )}

      {/* ── Campaign & claimed products (review context) ── */}
      {(cse.campaign || (cse.products && cse.products.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Package className="h-4 w-4 text-text-tertiary" />Campaign &amp; Claimed Products
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cse.campaign && (
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-semibold text-text-primary">{cse.campaign.title || cse.campaign.slug}</span>
                <span className="font-mono text-text-tertiary px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200">{cse.campaign.code}</span>
                <Link
                  href={`/campaigns/${cse.campaign.slug}`}
                  className="text-brand-emerald hover:underline"
                >
                  View campaign →
                </Link>
              </div>
            )}
            {cse.products && cse.products.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-surface-secondary/60 text-left text-text-tertiary">
                      <th className="px-3 py-2 font-semibold">Match</th>
                      <th className="px-3 py-2 font-semibold">Shape</th>
                      <th className="px-3 py-2 font-semibold">Flavor</th>
                      <th className="px-3 py-2 font-semibold">Lot</th>
                      <th className="px-3 py-2 font-semibold">Date code</th>
                      <th className="px-3 py-2 font-semibold">Qty</th>
                      <th className="px-3 py-2 font-semibold">Channel</th>
                      <th className="px-3 py-2 font-semibold">Purchased</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cse.products.map((product) => (
                      <tr key={product.id} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <span className={cn(
                            'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
                            product.checkResult === 'potential_match' && 'bg-emerald-50 text-emerald-700',
                            product.checkResult === 'manual_review' && 'bg-amber-50 text-amber-700',
                            product.checkResult === 'not_matched' && 'bg-red-50 text-red-700',
                          )}>
                            {product.checkResult.replace(/_/g, ' ')}
                          </span>
                          {product.identificationMode && product.identificationMode !== 'product_identifiers' && (
                            <span className="block text-[10px] text-text-tertiary mt-1">via {product.identificationMode.replace(/_/g, ' ')}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-text-secondary">{product.shape}</td>
                        <td className="px-3 py-2 text-text-secondary">{product.flavor}</td>
                        <td className="px-3 py-2 font-mono text-text-primary">{product.lotCode}</td>
                        <td className="px-3 py-2 font-mono text-text-primary">{product.dateCode}</td>
                        <td className="px-3 py-2 text-text-secondary">{product.quantity}</td>
                        <td className="px-3 py-2 text-text-secondary">{product.purchaseChannel.replace(/_/g, ' ')}</td>
                        <td className="px-3 py-2 text-text-tertiary">
                          {product.purchaseDate ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-text-tertiary">No claimed products were recorded on this case.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Evidence (document metadata grouped by category) ── */}
      {cse.documents && cse.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-text-tertiary" />Evidence ({cse.documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {EVIDENCE_CATEGORIES.map((category) => {
              const docs = cse.documents?.filter(d => d.category === category.id) ?? [];
              if (docs.length === 0) return null;
              return (
                <div key={category.id}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary mb-2">{category.label}</p>
                  <div className="space-y-2">
                    {docs.map((doc) => (
                      <DocumentRow key={doc.id} doc={doc} />
                    ))}
                  </div>
                </div>
              );
            })}
            {cse.documents.some(d => !EVIDENCE_CATEGORIES.some(c => c.id === d.category)) && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary mb-2">Other</p>
                <div className="space-y-2">
                  {cse.documents.filter(d => !EVIDENCE_CATEGORIES.some(c => c.id === d.category)).map((doc) => (
                    <DocumentRow key={doc.id} doc={doc} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Incident detail (review context for the compliance gate) ── */}
      {cse.incident && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Siren className="h-4 w-4 text-red-500" />Incident Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg bg-surface-secondary/60 p-3">
                <p className="text-text-tertiary">Consumer answer</p>
                <p className="mt-1 font-semibold text-text-primary capitalize">{cse.incident.answer}</p>
              </div>
              <div className="rounded-lg bg-surface-secondary/60 p-3">
                <p className="text-text-tertiary">Injury severity</p>
                <p className="mt-1 font-semibold text-text-primary capitalize">{cse.incident.injurySeverity?.replace(/_/g, ' ') ?? '—'}</p>
              </div>
              <div className="rounded-lg bg-surface-secondary/60 p-3">
                <p className="text-text-tertiary">Medical treatment</p>
                <p className="mt-1 font-semibold text-text-primary capitalize">{cse.incident.medicalTreatment?.replace(/_/g, ' ') ?? '—'}</p>
              </div>
              <div className="rounded-lg bg-surface-secondary/60 p-3">
                <p className="text-text-tertiary">Occurred</p>
                <p className="mt-1 font-semibold text-text-primary">
                  {cse.incident.occurredAt
                    ? new Date(cse.incident.occurredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : cse.incident.occurredDateUnknown ? 'Date unknown' : '—'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {cse.incident.eventTypes.map((type) => (
                <span key={type} className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-50 text-red-600">{type.replace(/_/g, ' ')}</span>
              ))}
            </div>
            <div className="rounded-lg border p-3 text-xs flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-text-tertiary">Reportability review</p>
                {cse.incident.reportability ? (
                  <p className="mt-1 font-semibold text-text-primary">
                    {cse.incident.reportability.status === 'filed'
                      ? <>Filed with CPSC{cse.incident.reportability.cpscReference ? ` · ${cse.incident.reportability.cpscReference}` : ''}</>
                      : cse.incident.reportability.status.replace(/_/g, ' ')}
                  </p>
                ) : (
                  <p className="mt-1 font-semibold text-text-primary">No review record</p>
                )}
              </div>
              {cse.incident.reportability?.status === 'pending' && (
                <Link
                  href="/incidents"
                  className="inline-flex items-center gap-1 rounded-md bg-brand-emerald px-2.5 py-1.5 text-xs font-semibold text-white cursor-pointer hover:bg-emerald-800"
                >
                  Open incidents queue <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
            {cse.incident.narrative !== undefined ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 mb-1 flex items-center gap-1">
                  <Eye className="h-3 w-3" />Narrative · decrypted · audited
                </p>
                <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">{cse.incident.narrative}</p>
              </div>
            ) : (
              <p className="text-xs text-text-tertiary rounded-lg bg-surface-secondary/60 p-3 flex items-center gap-1.5">
                <Lock className="h-3 w-3" />Narrative is encrypted. Use “View raw PII” (compliance role) to decrypt — the read is audited.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Closure checklist (the two gates before closed) ── */}
      {['approved', 'closure_review'].includes(cse.status) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-text-tertiary" />Closure Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Gate 1 — resolution externally completed */}
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <span className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white',
                resolution?.status === 'externally_completed' ? 'bg-emerald-600' : 'bg-slate-300',
              )}>
                {resolution?.status === 'externally_completed' ? '✓' : '✗'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text-primary">Resolution externally completed</p>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {resolution?.status === 'externally_completed'
                    ? `Recorded${resolution?.completedAt ? ` on ${new Date(resolution.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}.`
                    : 'Approve the resolution, then record its external completion (refund batch or fulfilment reference).'}
                </p>
              </div>
              {resolution?.status !== 'externally_completed' && (
                <button
                  onClick={() => document.getElementById('resolution-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className="shrink-0 rounded-md border px-2 py-1 text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-secondary"
                >
                  Open resolution
                </button>
              )}
            </div>

            {/* Gate 2 — reportability closed (incident cases only) */}
            {cse.incidentFlag && (
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <span className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white',
                  cse.incident?.reportability && cse.incident.reportability.status !== 'pending' ? 'bg-emerald-600' : 'bg-slate-300',
                )}>
                  {cse.incident?.reportability && cse.incident.reportability.status !== 'pending' ? '✓' : '✗'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary">Reportability review closed</p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {!cse.incident?.reportability
                      ? 'No reportability review record — open the incidents queue.'
                      : cse.incident.reportability.status === 'pending'
                        ? 'The safety incident still needs a CPSC filing decision.'
                        : cse.incident.reportability.status === 'filed'
                          ? `Filed with CPSC${cse.incident.reportability.cpscReference ? ` · ${cse.incident.reportability.cpscReference}` : ''}.`
                          : 'Documented as non-reportable.'}
                  </p>
                </div>
                {(!cse.incident?.reportability || cse.incident.reportability.status !== 'pending') ? null : (
                  <Link
                    href="/incidents"
                    className="shrink-0 rounded-md border px-2 py-1 text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-secondary"
                  >
                    Open incidents
                  </Link>
                )}
              </div>
            )}

            {/* Inline close form for the pending review */}
            {cse.incident?.reportability?.status === 'pending' && can('review.close') && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">Close reportability review</p>
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={repOutcome}
                    onChange={e => setRepOutcome(e.target.value as 'filed' | 'documented_non_reportable')}
                    className="h-9 flex-1 min-w-40 rounded-lg border bg-surface-elevated px-2 text-xs text-text-secondary outline-none cursor-pointer"
                  >
                    <option value="filed">Filed with CPSC</option>
                    <option value="documented_non_reportable">Documented non-reportable</option>
                  </select>
                  {repOutcome === 'filed' && (
                    <input
                      value={repCpsc}
                      onChange={e => setRepCpsc(e.target.value)}
                      placeholder="CPSC reference (e.g. CPSC-2026-001)"
                      className="h-9 flex-1 min-w-40 rounded-lg border bg-surface-elevated px-2 text-xs text-text-secondary outline-none"
                    />
                  )}
                </div>
                <textarea
                  value={repRationale}
                  onChange={e => setRepRationale(e.target.value)}
                  placeholder="Rationale for the decision (minimum 10 characters)…"
                  className="w-full h-16 text-xs p-2 rounded-lg border bg-surface-elevated outline-none resize-none"
                  style={{ borderColor: 'var(--border)' }}
                  maxLength={2000}
                />
                {repError && <p className="text-xs text-red-600">{repError}</p>}
                <button
                  onClick={submitReportabilityClose}
                  disabled={repSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-emerald px-3 py-1.5 text-xs font-semibold text-white cursor-pointer hover:bg-emerald-800 disabled:opacity-50"
                >
                  {repSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {repSubmitting ? 'Closing…' : 'Close review'}
                </button>
              </div>
            )}

            {operations.blockingReasons.length > 0 && (
              <div className="space-y-1 rounded-lg bg-surface-secondary/60 p-3 text-xs text-text-secondary">
                {operations.blockingReasons.map((reason) => (
                  <p key={reason}>• {formatBlockingReason(reason)}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-5">

        {/* ── Consumer ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-1.5"><User className="h-4 w-4 text-text-tertiary" />Consumer</span>
              <span className={cn(
                'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
                cse.consumer.piiTier === 'raw' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600',
              )}>
                {cse.consumer.piiTier === 'raw' ? 'Raw PII' : 'Masked PII'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <p className="text-base font-semibold text-text-primary">{consumerName || '—'}</p>
            <div className="space-y-1.5 text-sm text-text-secondary">
              <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-text-tertiary shrink-0" />{cse.consumer.email || '—'}</p>
              <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-text-tertiary shrink-0" />{cse.consumer.phone || '—'}</p>
              <p className="flex items-center gap-2"><Globe className="h-3.5 w-3.5 text-text-tertiary shrink-0" />{cse.consumer.countryCode || '—'}</p>
              {cse.consumer.address?.raw && (
                <p className="flex items-start gap-2"><MapPin className="h-3.5 w-3.5 text-text-tertiary shrink-0 mt-0.5" />{cse.consumer.address.raw}</p>
              )}
            </div>
            <div className="pt-3 border-t text-xs text-text-tertiary space-y-1">
              <p className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Submitted {new Date(cse.submittedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {can('case.detail.read_pii_raw') && (
              <button
                onClick={toggleRawPii}
                disabled={loading || submitting}
                className={cn(
                  'w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50',
                  viewingRawPii
                    ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : 'border border-slate-300 text-text-secondary hover:bg-surface-secondary',
                )}
              >
                <Eye className="h-3.5 w-3.5" />
                {viewingRawPii ? 'Hide raw PII (back to masked)' : 'View raw PII (audited)'}
              </button>
            )}
          </CardContent>
        </Card>

        {/* ── Assignment ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5"><Users className="h-4 w-4 text-text-tertiary" />Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignedStaff ? (
              <div className="rounded-lg bg-emerald-50/60 border border-emerald-200 p-3">
                <p className="text-sm font-semibold text-text-primary">{assignedStaff.displayName}</p>
                <p className="text-xs text-text-tertiary">{assignedStaff.email} · {assignedStaff.role}</p>
                {cse.assignedAt && (
                  <p className="text-[10px] text-text-tertiary mt-1">
                    Assigned {new Date(cse.assignedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-tertiary">Unassigned</p>
            )}
            <div className="flex gap-2">
              <select
                value={assignTarget}
                onChange={e => setAssignTarget(e.target.value)}
                disabled={!can('case.assign')}
                title={can('case.assign') ? undefined : 'Requires the case.assign permission (reviewer+)'}
                className="flex-1 h-9 rounded-lg border bg-surface-elevated px-2 text-xs text-text-secondary outline-none cursor-pointer focus:border-brand-emerald disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select staff member...</option>
                {staff.filter(s => s.status === 'active').map(s => (
                  <option key={s.id} value={s.id}>
                    {s.displayName} ({s.role})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAssign}
                disabled={submitting || !assignTarget || !can('case.assign')}
                title={can('case.assign') ? undefined : 'Requires the case.assign permission (reviewer+)'}
                className="h-9 px-3 rounded-lg bg-brand-emerald text-white text-xs font-semibold hover:bg-emerald-900 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ── Resolution ── */}
        <Card id="resolution-card">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-text-tertiary" />Resolution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {resolution ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-surface-secondary/60 p-3">
                    <p className="text-text-tertiary">Status</p>
                    <p className="mt-1 font-semibold text-text-primary">{formatWorkflowLabel(resolution.status)}</p>
                  </div>
                  <div className="rounded-lg bg-surface-secondary/60 p-3">
                    <p className="text-text-tertiary">Requested</p>
                    <p className="mt-1 font-semibold text-text-primary">{resolution.requestedType ? formatWorkflowLabel(resolution.requestedType) : '—'}</p>
                  </div>
                  <div className="rounded-lg bg-surface-secondary/60 p-3">
                    <p className="text-text-tertiary">Approved</p>
                    <p className="mt-1 font-semibold text-text-primary">{resolution.approvedType ? formatWorkflowLabel(resolution.approvedType) : '—'}</p>
                  </div>
                  <div className="rounded-lg bg-surface-secondary/60 p-3">
                    <p className="text-text-tertiary">Version</p>
                    <p className="mt-1 font-semibold text-text-primary">{resolution.version}</p>
                  </div>
                </div>

                {resolution.refundAmountMinor !== null && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-text-secondary">
                    Refund amount: <span className="font-bold text-text-primary">${(resolution.refundAmountMinor / 100).toFixed(2)}</span> {resolution.currency ?? ''}
                  </div>
                )}

                {resolution.externalReference && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-text-secondary">
                    External reference: {resolution.externalReference}
                  </div>
                )}

                {resolution.completedAt && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                    Completed externally {new Date(resolution.completedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}

                {resolutionActions.length > 0 ? (
                  <>
                    <textarea
                      value={resolutionNote}
                      onChange={e => setResolutionNote(e.target.value)}
                      placeholder="Resolution note (minimum 10 characters)..."
                      className="w-full h-16 text-xs p-2 rounded-lg border bg-surface-secondary outline-none resize-none"
                      style={{ borderColor: 'var(--border)' }}
                    />
                    {canApproveResolution ? (
                      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                          Approval details{resolution?.requestedType ? ' (pre-filled from the consumer’s request)' : ''}
                        </p>
                        <div className="flex gap-2">
                          <select
                            value={resolutionType}
                            onChange={e => setResolutionTypeOverride(e.target.value as 'replacement' | 'refund')}
                            className="flex-1 h-9 rounded-lg border bg-surface-elevated px-2 text-xs text-text-secondary outline-none cursor-pointer focus:border-brand-emerald"
                          >
                            <option value="replacement">Replacement</option>
                            <option value="refund">Refund</option>
                          </select>
                          {resolutionType === 'refund' ? (
                            <>
                              <input
                                value={refundCurrency}
                                onChange={e => setRefundCurrency(e.target.value.toUpperCase())}
                                maxLength={3}
                                placeholder="USD"
                                className="w-16 h-9 rounded-lg border bg-surface-elevated px-2 text-xs text-text-secondary outline-none"
                              />
                              <input
                                value={refundAmount}
                                onChange={e => setRefundAmount(e.target.value.replace(/[^\d.]/g, ''))}
                                placeholder="$ dollars"
                                inputMode="decimal"
                                className="flex-1 min-w-20 h-9 rounded-lg border bg-surface-elevated px-2 text-xs text-text-secondary outline-none"
                              />
                            </>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {canCompleteResolution ? (
                      <input
                        value={externalReference}
                        onChange={e => setExternalReference(e.target.value)}
                        placeholder="External reference for completion (optional)..."
                        className="w-full h-9 rounded-lg border bg-surface-elevated px-2 text-xs text-text-secondary outline-none"
                      />
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {resolutionActions.map(action => (
                        <button
                          key={action}
                          onClick={() => handleResolutionAction(action)}
                          disabled={submitting || !can('case.status.transition')}
                          title={can('case.status.transition') ? undefined : 'Requires the case.status.transition permission (reviewer+)'}
                          className={cn(
                            'text-xs font-semibold px-3 py-1.5 rounded-md cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                            RESOLUTION_ACTION_STYLES[action] ?? 'bg-slate-600 hover:bg-slate-700 text-white',
                          )}
                        >
                          {formatWorkflowLabel(action.replace('resolution:', ''))}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-text-tertiary rounded-lg bg-surface-secondary/60 p-3">
                    No resolution actions are currently allowed for this case.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-text-tertiary">No resolution record is available for this case.</p>
            )}
          </CardContent>
        </Card>

        {/* ── Status Transition ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-text-tertiary" />Status Transition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-tertiary">Current:</span>
              <StatusBadge variant={cse.status as never} />
            </div>

            {isTerminal ? (
              <p className="text-xs text-text-tertiary rounded-lg bg-surface-secondary/60 p-3">
                This case is in a terminal state ({cse.status.replace(/_/g, ' ')}). No further transitions are allowed.
              </p>
            ) : (
              <>
                {operations.blockingReasons.length > 0 ? (
                  <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                    {operations.blockingReasons.map((reason) => (
                      <p key={reason} className="flex items-center justify-between gap-2">
                        <span>{formatBlockingReason(reason)}</span>
                        <button
                          onClick={() => document.getElementById('resolution-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                          className="shrink-0 underline cursor-pointer hover:no-underline"
                        >
                          resolve
                        </button>
                      </p>
                    ))}
                  </div>
                ) : null}
                <textarea
                  value={transitionReason}
                  onChange={e => setTransitionReason(e.target.value)}
                  placeholder="Reason for the transition (required for rejected / duplicate / withdrawn)..."
                  className="w-full h-16 text-xs p-2 rounded-lg border bg-surface-secondary outline-none resize-none"
                  style={{ borderColor: 'var(--border)' }}
                />
                <div className="flex flex-wrap gap-2">
                  {transitions.map(next => (
                    <button
                      key={next}
                      onClick={() => handleTransition(next)}
                      disabled={submitting || !can('case.status.transition')}
                      title={can('case.status.transition') ? undefined : 'Requires the case.status.transition permission (reviewer+)'}
                      className={cn(
                        'text-xs font-semibold px-3 py-1.5 rounded-md cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                        TRANSITION_STYLES[next] ?? 'bg-slate-600 hover:bg-slate-700 text-white',
                      )}
                    >
                      <ArrowRight className="inline h-3.5 w-3.5 mr-1" />
                      {next.replace(/_/g, ' ')}
                    </button>
                  ))}
                  {!can('case.status.transition') && (
                    <p className="text-xs text-text-tertiary w-full">
                      Your role ({role ?? 'signed out'}) is read-only — transitions require a reviewer, compliance, or administrator account.
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Audit Trail (live, filtered to this case) ── */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Audit Trail</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {audit.map(e => (
              <div key={e.id} className="flex items-start gap-3 py-2 border-b last:border-0" style={{ borderColor: 'rgba(0,53,39,0.06)' }}>
                <div className={cn('h-2 w-2 rounded-full mt-2 shrink-0', AUDIT_DOT[e.resourceType] ?? 'bg-slate-400')} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary font-mono">{e.action}</p>
                  <p className="text-[11px] text-text-tertiary mt-0.5 flex items-center gap-1 flex-wrap">
                    <Users className="h-3 w-3" />{e.actorRole}
                    <span>·</span>
                    {new Date(e.occurredAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    <span>·</span>
                    <span className={cn('font-semibold', e.outcome === 'success' ? 'text-emerald-600' : 'text-red-600')}>
                      {e.outcome}
                    </span>
                  </p>
                  {e.reasonCode && <p className="text-xs text-text-tertiary mt-1 italic">{e.reasonCode}</p>}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary shrink-0">{e.resourceType}</span>
              </div>
            ))}
            {audit.length === 0 && <p className="text-sm text-text-tertiary text-center py-4">No audit events recorded for this case.</p>}
          </div>
        </CardContent>
      </Card>

      {/* ── Request more information (need_info) dialog ── */}
      {needInfoOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="need-info-title">
          <div className="w-full max-w-lg rounded-xl bg-surface-elevated p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 id="need-info-title" className="text-base font-bold text-text-primary">Request More Information</h2>
                <p className="text-xs text-text-tertiary mt-1">
                  Case {cse.caseReference} · the consumer will see this case as “Action required” with your message.
                </p>
              </div>
              <button type="button" onClick={() => setNeedInfoOpen(false)} className="text-text-tertiary hover:text-text-primary cursor-pointer" aria-label="Close dialog">
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                {INFO_REQUEST_OPTIONS.map((option) => (
                  <label key={option} className="flex items-start gap-2 text-xs text-text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 cursor-pointer"
                      checked={needInfoNote.includes(option)}
                      onChange={(e) => {
                        setNeedInfoNote((prev) => {
                          if (e.target.checked) {
                            return prev.trim() ? `${prev.trim()}\n• ${option}` : `• ${option}`;
                          }
                          return prev
                            .replace(`\n• ${option}`, '')
                            .replace(`• ${option}\n`, '')
                            .replace(`• ${option}`, '');
                        });
                      }}
                    />
                    {option}
                  </label>
                ))}
              </div>
              <textarea
                value={needInfoNote}
                onChange={e => setNeedInfoNote(e.target.value)}
                placeholder="Describe what the consumer should provide (minimum 10 characters)…"
                className="w-full h-28 text-xs p-3 rounded-lg border bg-surface-secondary outline-none resize-none"
                style={{ borderColor: 'var(--border)' }}
                maxLength={2000}
              />
              <p className="text-[10px] text-text-tertiary">
                Saved to the case timeline and shown to the consumer. Free-form edits are welcome — checkboxes are just a starting point.
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setNeedInfoOpen(false)} className="rounded-lg border px-3 py-2 text-xs font-semibold text-text-secondary cursor-pointer">Cancel</button>
              <button
                type="button"
                onClick={submitNeedInfo}
                disabled={submitting || needInfoNote.trim().length < 10}
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white cursor-pointer hover:bg-orange-700 disabled:opacity-50"
              >
                {submitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                {submitting ? 'Submitting…' : 'Request information'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
