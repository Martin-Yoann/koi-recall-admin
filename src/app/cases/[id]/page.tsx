'use client';

// ============================================================
// KOI Recall Admin — Case Detail v3.0 (live Neon data)
// GET /admin/cases/{ref} · assign · status transition · audit
// Legal transitions mirror backend ADR-0004 B8 state machine.
// ============================================================

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Input, Select, Skeleton } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import {
  ArrowLeft, User, AlertTriangle, RefreshCw, Users, Clock,
  CheckCircle2, ArrowRight, Shield, MapPin, Mail, Phone, Globe, Package,
  FileText, Eye, Lock, Siren, ExternalLink, Download, ZoomIn, X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { cn } from '@/lib/utils';
import {
  getCaseDetail, transitionCaseStatus, assignCase, listStaff, queryAuditEvents,
  closeReportabilityReview, getDocumentAccessUrl,
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
import { formatAdminDate, formatAdminDateTime, formatAdminDateTimeWithYear } from '@/lib/formatters';

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

/** One evidence file row — metadata plus a viewable thumbnail when the
 * short-lived access URL has been minted (image preview / PDF open). */
function DocumentRow({
  doc,
  access,
  onOpen,
}: {
  doc: CaseDocument;
  access?: { url: string; downloadUrl: string };
  onOpen: (doc: CaseDocument) => void;
}) {
  const isImage = doc.declaredMimeType.toLowerCase().startsWith('image/');
  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2 text-xs">
      {isImage && access ? (
        <button
          type="button"
          onClick={() => onOpen(doc)}
          title="Click to view full size"
          aria-label={`View ${doc.originalFileName} full size`}
          className="shrink-0 overflow-hidden rounded-md border cursor-zoom-in transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/40"
        >
          {/* Short-lived signed blob URL — not eligible for next/image optimization. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={access.url} alt={doc.originalFileName} width={56} height={56} className="h-14 w-14 object-cover" />
        </button>
      ) : (
        <FileText className="h-8 w-8 shrink-0 text-text-tertiary" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-text-primary truncate">{doc.originalFileName}</p>
        <p className="text-[10px] text-text-tertiary mt-0.5">
          {doc.declaredMimeType} · {(doc.sizeBytes / 1024).toFixed(0)} KiB
          {doc.uploadedAt ? ` · ${formatAdminDateTime(doc.uploadedAt)}` : ''}
        </p>
      </div>
      {access && !isImage && (
        <button
          type="button"
          onClick={() => window.open(access.url, '_blank', 'noopener')}
          className="shrink-0 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold text-text-secondary cursor-pointer hover:bg-surface-secondary"
        >
          <ExternalLink className="h-3 w-3" />Open
        </button>
      )}
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
  approved: 'bg-brand-emerald hover:bg-brand-emerald-dark text-white',
  closed: 'bg-brand-emerald hover:bg-brand-emerald-dark text-white',
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
  'resolution:approve': 'bg-brand-emerald hover:bg-brand-emerald-dark text-white',
  'resolution:complete': 'bg-blue-600 hover:bg-blue-700 text-white',
  'resolution:cancel': 'bg-red-600 hover:bg-red-700 text-white',
};

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawCaseRef } = use(params);
  const caseRef = (rawCaseRef ?? '').trim();
  const { openLogin, isAuthenticated, isLoading: authLoading } = useAdminAuth();

  if (!caseRef) {
    return (
      <div className="p-12 text-center">
        <p className="text-text-primary font-bold mb-2">Case Not Found</p>
        <p className="text-sm text-text-tertiary mb-3">No case reference was provided.</p>
        <Link href="/cases" className="text-brand-emerald hover:underline text-sm">Back to Cases</Link>
      </div>
    );
  }

  return (
    <CaseDetailContent
      key={caseRef}
      caseRef={caseRef}
      openLogin={openLogin}
      isAuthenticated={isAuthenticated}
      authLoading={authLoading}
    />
  );
}

function CaseDetailContent({
  caseRef,
  openLogin,
  isAuthenticated,
  authLoading,
}: {
  caseRef: string;
  openLogin: () => void;
  isAuthenticated: boolean;
  authLoading: boolean;
}) {
  const { can, role } = usePermissions();
  const [record, setRecord] = useState<CaseDetail | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [authError, setAuthError] = useState<'signin' | 'forbidden' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionConflict, setActionConflict] = useState(false);
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
  /** Short-lived access URLs per document id (minted lazily for previews). */
  const [docAccess, setDocAccess] = useState<Record<string, { url: string; downloadUrl: string }>>({});
  const [lightbox, setLightbox] = useState<CaseDocument | null>(null);
  const needInfoDialogRef = useRef<HTMLDivElement>(null);
  const lightboxDialogRef = useRef<HTMLDivElement>(null);
  const needInfoCloseRef = useRef<HTMLButtonElement>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const needInfoNoteRef = useRef<TextAreaRef>(null);
  const mountedRef = useRef(true);
  const initialLoadStartedRef = useRef(false);
  /** Kept in a ref so refresh() always reloads at the tier currently on screen. */
  const piiLevelRef = useRef<'masked' | 'raw'>('masked');

  useEffect(() => {
    // Reset on every setup so React StrictMode's dev double-invoke (setup →
    // cleanup → setup) cannot permanently poison the flag and stall the page
    // on "Unable to load case".
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const overlayOpen = needInfoOpen || Boolean(lightbox);
    if (!overlayOpen) return;

    const dialog = needInfoOpen ? needInfoDialogRef.current : lightboxDialogRef.current;
    const closeButton = needInfoOpen ? needInfoCloseRef.current : lightboxCloseRef.current;
    const previousActiveElement = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFrame = window.requestAnimationFrame(() => closeButton?.focus());
    const handleOverlayKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (lightbox) setLightbox(null);
        else setNeedInfoOpen(false);
        return;
      }

      if (event.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleOverlayKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleOverlayKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousActiveElement && document.contains(previousActiveElement)) previousActiveElement.focus();
    };
  }, [lightbox, needInfoOpen]);

  const refresh = useCallback(async () => {
    const result = await getCaseDetail(caseRef, piiLevelRef.current);
    if (!mountedRef.current) return;
    if (result.ok) {
      setRecord(result.data.case);
      setViewingRawPii(result.data.case.consumer.piiTier === 'raw');
      setDocAccess({});
      setNotFound(false);
      setAuthError(null);
      setActionError(null);
      setActionConflict(false);
      const auditResult = await queryAuditEvents({ limit: 100, resourceId: caseRef });
      if (!mountedRef.current) return;
      if (auditResult.ok) {
        setAudit(
          auditResult.data.events
            .filter(e => e.resourceId === caseRef)
            // API returns newest-first; keep the latest 20 and render them
            // chronologically.
            .slice(0, 20)
            .reverse(),
        );
      }
    } else if (result.status === 401 || result.status === 403) {
      setAuthError(result.status === 401 ? 'signin' : 'forbidden');
      setActionError(result.error?.detail || 'You do not have permission to view this case.');
    } else if (result.status === 404) {
      setNotFound(true);
      setActionError(null);
    } else {
      setActionError(result.error?.detail || 'Failed to load case.');
    }
  }, [caseRef]);

  /**
   * Switch to the raw PII tier. The raw read decrypts PII (and the incident
   * narrative) server-side and writes a pii.view_raw audit row — make sure the
   * reviewer confirms before we trigger it.
   */
  const retryLoad = async () => {
    setLoading(true);
    setNotFound(false);
    setAuthError(null);
    setActionError(null);
    await refresh();
    if (mountedRef.current) setLoading(false);
  };

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
    } catch (err) {
      // Surface the real failure instead of leaving the silent
      // "Unable to load case" fallback that hides the cause.
      if (mountedRef.current) {
        setActionError(err instanceof Error ? err.message : 'Failed to load the case.');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [refresh]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    if (initialLoadStartedRef.current || loading || record || notFound) {
      return;
    }
    initialLoadStartedRef.current = true;
    const timer = window.setTimeout(() => {
      void loadInitialData();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [authError, authLoading, isAuthenticated, loadInitialData, loading, notFound, record]);

  // Mint short-lived access URLs for evidence files so images can render and
  // PDFs can be opened. Re-minted after every refresh (fresh expiry window).
  useEffect(() => {
    const docs = record?.documents ?? [];
    if (docs.length === 0) return;
    let cancelled = false;
    docs.forEach((doc) => {
      getDocumentAccessUrl(caseRef, doc.id)
        .then((result) => {
          if (cancelled || !result.ok) return;
          setDocAccess((prev) =>
            prev[doc.id]
              ? prev
              : { ...prev, [doc.id]: { url: result.data.url, downloadUrl: result.data.downloadUrl } },
          );
        })
        .catch(() => {
          // Access URL minting is best-effort; rows fall back to metadata-only.
        });
    });
    return () => {
      cancelled = true;
    };
  }, [caseRef, record]);

  /**
   * Formats a mutation failure into a banner message. A 409 (or any response
   * whose type ends with `conflict`) means another staff member changed the
   * case while this screen was open — the stale snapshot must not be replayed,
   * so we surface a dedicated conflict message and disable further actions
   * until the operator refreshes.
   */
  const isConflictResult = (result: { status: number; error?: { type?: string } }) =>
    result.status === 409 || result.error?.type === 'conflict' || result.error?.type?.endsWith('conflict') === true;

  const applyActionError = (result: { ok: false; status: number; error?: { detail?: string; type?: string } }, fallback: string) => {
    setActionConflict(isConflictResult(result));
    setActionError(
      isConflictResult(result)
        ? // Surface the server's specific conflict (e.g. the resolution
          // version conflict) when present; fall back to a generic "refresh"
          // prompt so a conflict without a detail never looks like a silent no-op.
          (result.error?.detail ??
            'This case was updated by another staff member. Refresh the case before trying again.')
        : result.error?.detail || fallback,
    );
  };

  const handleTransition = async (next: string) => {
    if (!record) return;

    // need_info requires telling the consumer what to provide — open the
    // dedicated request dialog instead of transitioning silently.
    if (next === 'need_info') {
      setNeedInfoNote('');
      setActionError(null);
      setNeedInfoOpen(true);
      return;
    }

    if (!confirm(`Are you sure you want to transition this case to ${next.replace(/_/g, ' ')}?`)) {
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
      applyActionError(result, `Transition to ${next} failed (${result.status})`);
    }
    setSubmitting(false);
  };

  /** Submit the need_info request built in the dialog. */
  const submitNeedInfo = async () => {
    const note = needInfoNote.trim();
    if (note.length < 10) {
      setActionError('Please describe what the consumer should provide (at least 10 characters).');
      window.requestAnimationFrame(() => needInfoNoteRef.current?.focus());
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
      applyActionError(result, `Request for information failed (${result.status})`);
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
      applyActionError(result, `Assignment failed (${result.status})`);
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
      applyActionError(result, `${formatWorkflowLabel(action)} failed (${result.status})`);
    }
    setSubmitting(false);
  };

  if (loading || authLoading) {
    return <div className="p-8" aria-busy="true"><Skeleton active title paragraph={{ rows: 12 }} /></div>;
  }

  const visibleAuthError = authError ?? (!isAuthenticated ? 'signin' : null);

  if (visibleAuthError) {
    return (
      <div className="p-12 text-center">
        <Shield className="h-10 w-10 mx-auto text-text-tertiary mb-3" />
        <p className="text-text-primary font-bold mb-2">
          {visibleAuthError === 'signin' ? 'Sign in required' : 'Case access denied'}
        </p>
        <p className="text-sm text-text-tertiary mb-4">
          {visibleAuthError === 'signin'
            ? 'Log in with a staff account to view and operate this case.'
            : actionError || 'Your staff role does not have permission to view this case.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          {visibleAuthError === 'signin' && (
            <button
              onClick={openLogin}
              className="inline-flex items-center h-8 px-3 rounded-lg bg-brand-emerald text-white text-xs font-semibold hover:bg-brand-emerald-dark cursor-pointer"
            >
              Sign in
            </button>
          )}
          <Link href="/cases" className="text-brand-emerald hover:underline text-sm">Back to Cases</Link>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="p-12 text-center">
        <p className="text-text-primary font-bold mb-2">Case Not Found</p>
        <p className="text-sm text-text-tertiary mb-3 font-mono">{caseRef}</p>
        <Link href="/cases" className="text-brand-emerald hover:underline text-sm">Back to Cases</Link>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-12 text-center">
        <p className="text-text-primary font-bold mb-2">Unable to load case</p>
        <p className="text-sm text-text-tertiary mb-4">{actionError || 'The case details are not available yet.'}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={retryLoad}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-brand-emerald text-white text-xs font-semibold hover:bg-brand-emerald-dark cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />Retry
          </button>
          <Link href="/cases" className="text-brand-emerald hover:underline text-sm">Back to Cases</Link>
        </div>
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

  /**
   * True when the consumer's requested information has come back: the latest
   * transition moved the case OUT of need_info (previousStatus = need_info),
   * and the case is no longer awaiting information. Lets the reviewer see the
   * loop has turned and a re-review decision is expected again.
   */
  const infoReturned = (() => {
    if (cse.status === 'need_info') return null;
    const events = cse.events ?? [];
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i]!;
      const data = event.data as Record<string, unknown> | null;
      if (
        event.eventType === 'case.status.transitioned' &&
        data?.previousStatus === 'need_info' &&
        data?.nextStatus &&
        data.nextStatus !== 'need_info'
      ) {
        return { nextStatus: data.nextStatus as string, at: event.occurredAt };
      }
    }
    return null;
  })();
  const selectedInfoOptions = INFO_REQUEST_OPTIONS.filter((option) => needInfoNote.includes(option)).length;
  const needInfoNoteLength = needInfoNote.trim().length;
  const needInfoNoteValid = needInfoNoteLength >= 10;

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto">

      {/* Case hero */}
      <section aria-labelledby="case-title" className="relative overflow-hidden rounded-2xl border border-slate-200 bg-surface-elevated shadow-sm">
        <div className="absolute inset-y-0 left-0 w-1 bg-brand-emerald" aria-hidden="true" />
        <div className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0 flex-1">
              <Link href="/cases" className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-tertiary hover:text-text-primary transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />Back to cases
              </Link>
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <h1 id="case-title" translate="no" className="break-all text-2xl font-bold tracking-tight text-text-primary font-mono sm:text-3xl">{cse.caseReference}</h1>
                <StatusBadge variant={cse.status as never} />
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
                  {cse.subtype.replace(/_/g, ' ')}
                </span>
                {cse.incidentFlag && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />Safety incident
                  </span>
                )}
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-tertiary">
                <span>Case review workspace</span>
                <span aria-hidden="true">·</span>
                <span>Submitted {formatAdminDateTimeWithYear(cse.submittedAt)}</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 xl:flex-col xl:items-end">
              <p className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary xl:block">Live record</p>
              <button
                type="button"
                onClick={refresh}
                className="admin-btn inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/30"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Refresh record
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-3">
            <div className="rounded-xl bg-surface-secondary/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Current stage</p>
              <p className="mt-1.5 capitalize text-sm font-semibold text-text-primary">{formatWorkflowLabel(cse.workflow?.currentStage ?? cse.status)}</p>
            </div>
            <div className="rounded-xl bg-surface-secondary/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Next action</p>
              <p className="mt-1.5 line-clamp-2 text-sm font-semibold text-text-primary">{cse.workflow?.nextAction || 'Review case details'}</p>
            </div>
            <div className="rounded-xl bg-surface-secondary/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Owner</p>
              <p className="mt-1.5 truncate text-sm font-semibold text-text-primary">{assignedStaff?.displayName || 'Unassigned'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* At-a-glance metrics */}
      <section aria-labelledby="case-metrics-title" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <h2 id="case-metrics-title" className="sr-only">Case summary metrics</h2>
        <div className="rounded-xl border border-slate-200 bg-surface-elevated p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-text-tertiary">Evidence files</p>
            <FileText className="h-4 w-4 text-brand-emerald" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">{cse.documents?.length ?? 0}</p>
          <p className="mt-1 text-[11px] text-text-tertiary">Uploaded to this case</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-surface-elevated p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-text-tertiary">Claimed products</p>
            <Package className="h-4 w-4 text-brand-emerald" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">{cse.products?.length ?? 0}</p>
          <p className="mt-1 text-[11px] text-text-tertiary">Items in the submission</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-surface-elevated p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-text-tertiary">Audit events</p>
            <Shield className="h-4 w-4 text-brand-emerald" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">{audit.length}</p>
          <p className="mt-1 text-[11px] text-text-tertiary">Visible events in the timeline</p>
        </div>
        <div className={cn(
          'rounded-xl border p-4 shadow-sm',
          cse.incidentFlag && cse.incident?.reportability?.status === 'pending'
            ? 'border-amber-200 bg-amber-50/70'
            : 'border-slate-200 bg-surface-elevated',
        )}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-text-tertiary">Safety gate</p>
            <AlertTriangle className={cn('h-4 w-4', cse.incidentFlag ? 'text-red-500' : 'text-text-tertiary')} aria-hidden="true" />
          </div>
          <p className="mt-2 text-sm font-bold capitalize text-text-primary">
            {!cse.incidentFlag ? 'Not required' : cse.incident?.reportability?.status === 'pending' ? 'Review pending' : 'Review closed'}
          </p>
          <p className="mt-1 text-[11px] text-text-tertiary">{cse.incidentFlag ? 'Reportability status' : 'No incident flag'}</p>
        </div>
      </section>

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
                Requested {formatAdminDateTime(infoRequest.at)} · the consumer sees this case as “Action required” with this message.
              </p>
            </>
          ) : (
            <p className="text-xs text-amber-700 mt-1">
              This case is waiting for consumer information, but no request note was recorded (legacy transition). Move it back to under review once the consumer responds.
            </p>
          )}
        </div>
      )}

      {/* Consumer information has come back — the case is ready for re-review. */}
      {infoReturned && !infoRequest && cse.status !== 'need_info' && (
        <div className="rounded-xl border border-brand-emerald/40 bg-brand-emerald-light p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800">Consumer Information Received</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              The requested details were provided and this case moved back to{' '}
              <span className="font-semibold capitalize">{infoReturned.nextStatus.replace(/_/g, ' ')}</span>{' '}
              on {formatAdminDateTime(infoReturned.at)} — review the new information and continue the decision.
            </p>
          </div>
        </div>
      )}

      {actionError && (
        <div role="alert" aria-live="polite" className={cn(
          'flex items-start gap-2.5 rounded-xl border p-3.5 text-sm',
          actionConflict ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800',
        )}>
          <AlertTriangle className={cn('mt-0.5 h-4 w-4 shrink-0', actionConflict ? 'text-red-600' : 'text-amber-600')} aria-hidden="true" />
          <span className="flex-1 min-w-0">{actionError}</span>
          {actionConflict && (
            <button
              type="button"
              onClick={retryLoad}
              className="admin-btn shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />Refresh case
            </button>
          )}
        </div>
      )}

      {/* ── Campaign & claimed products (review context) ── */}
      {(cse.campaign || (cse.products && cse.products.length > 0)) && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Package className="h-4 w-4 text-brand-emerald" aria-hidden="true" />Campaign &amp; Claimed Products
            </CardTitle>
            <p data-slot="card-description" className="text-xs text-text-tertiary">Verify campaign context, product matching and purchase signals before making a decision.</p>
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
                      <th className="px-3 py-2 font-semibold">Order #</th>
                      <th className="px-3 py-2 font-semibold">Corroboration</th>
                      <th className="px-3 py-2 font-semibold">Reason Codes</th>
                      <th className="px-3 py-2 font-semibold">Flags</th>
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
                        <td className="px-3 py-2 font-mono text-text-secondary">
                          {product.orderNumber ?? '—'}
                        </td>
                        <td className="px-3 py-2">
                          {product.purchaseCorroboration ? (
                            <span className={cn(
                              'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
                              product.purchaseCorroboration === 'verified' && 'bg-emerald-50 text-emerald-700',
                              product.purchaseCorroboration === 'partial' && 'bg-amber-50 text-amber-700',
                              product.purchaseCorroboration === 'conflict' && 'bg-red-50 text-red-700',
                              !['verified', 'partial', 'conflict'].includes(product.purchaseCorroboration) && 'bg-slate-50 text-slate-600',
                            )}>
                              {product.purchaseCorroboration.replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span className="text-xs text-text-tertiary">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {product.reasonCodes && product.reasonCodes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {product.reasonCodes.map((code) => (
                                <span key={code} className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{code.replace(/_/g, ' ')}</span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-text-tertiary">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {product.riskFlags && product.riskFlags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {product.riskFlags.map((flag) => (
                                <span key={flag} className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-50 text-red-700">{flag.replace(/_/g, ' ')}</span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-text-tertiary">—</span>
                          )}
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
      <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <FileText className="h-4 w-4 text-brand-emerald" aria-hidden="true" />Evidence ({cse.documents?.length ?? 0})
            </CardTitle>
            <p data-slot="card-description" className="text-xs text-text-tertiary">Files submitted with the case, grouped by review purpose.</p>
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
                      <DocumentRow
                        key={doc.id}
                        doc={doc}
                        access={docAccess[doc.id]}
                        onOpen={(d) => setLightbox(d)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {cse.documents && cse.documents.some(d => !EVIDENCE_CATEGORIES.some(c => c.id === d.category)) && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary mb-2">Other</p>
                <div className="space-y-2">
                  {cse.documents.filter(d => !EVIDENCE_CATEGORIES.some(c => c.id === d.category)).map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      access={docAccess[doc.id]}
                      onOpen={(d) => setLightbox(d)}
                    />
                  ))}
                </div>
              </div>
            )}
            {(!cse.documents || cse.documents.length === 0) && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-surface-secondary/50 px-4 py-8 text-center">
                <FileText className="mx-auto h-7 w-7 text-text-tertiary" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-text-primary">No evidence files yet</p>
                <p className="mt-1 text-xs text-text-tertiary">Uploaded proof and incident evidence will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>

      {/* ── Incident detail (review context for the compliance gate) ── */}
      {cse.incident && (
        <Card className="border-red-200 shadow-sm">
          <CardHeader className="border-b border-red-100 pb-3">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Siren className="h-4 w-4 text-red-500" aria-hidden="true" />Incident Report
            </CardTitle>
            <p data-slot="card-description" className="text-xs text-text-tertiary">Safety context and reportability evidence for this case.</p>
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
                    ? formatAdminDate(cse.incident.occurredAt)
                    : cse.incident.occurredDateUnknown ? 'Date unknown' : '—'}
                </p>
              </div>
              <div className="rounded-lg bg-surface-secondary/60 p-3">
                <p className="text-text-tertiary">Used as intended</p>
                <p className="mt-1 font-semibold text-text-primary capitalize">{cse.incident.usedAsIntended?.replace(/_/g, ' ') ?? '—'}</p>
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
                  className="inline-flex items-center gap-1 rounded-md bg-brand-emerald px-2.5 py-1.5 text-xs font-semibold text-white cursor-pointer hover:bg-brand-emerald-dark"
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
        <Card className="border-violet-200 shadow-sm">
          <CardHeader className="border-b border-violet-100 pb-3">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="h-4 w-4 text-violet-600" aria-hidden="true" />Closure Checklist
            </CardTitle>
            <p data-slot="card-description" className="text-xs text-text-tertiary">Complete both gates before moving this case to a closed state.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Gate 1 — resolution externally completed */}
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <span className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white',
                resolution?.status === 'externally_completed' ? 'bg-brand-emerald' : 'bg-slate-300',
              )}>
                {resolution?.status === 'externally_completed' ? '✓' : '✗'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text-primary">Resolution externally completed</p>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {resolution?.status === 'externally_completed'
                    ? `Recorded${resolution?.completedAt ? ` on ${formatAdminDate(resolution.completedAt)}` : ''}.`
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
                  cse.incident?.reportability && cse.incident.reportability.status !== 'pending' ? 'bg-brand-emerald' : 'bg-slate-300',
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
                  <label htmlFor="case-reportability-outcome" className="sr-only">Reportability outcome</label>
                  <Select
                    id="case-reportability-outcome"
                    value={repOutcome}
                    onChange={(val) => setRepOutcome(val as 'filed' | 'documented_non_reportable')}
                    className="flex-1 min-w-40"
                    options={[
                      { value: 'filed', label: 'Filed with CPSC' },
                      { value: 'documented_non_reportable', label: 'Documented non-reportable' },
                    ]}
                  />
                  {repOutcome === 'filed' && (
                    <>
                    <label htmlFor="case-cpsc-reference" className="sr-only">CPSC reference</label>
                    <Input
                      id="case-cpsc-reference"
                      value={repCpsc}
                      onChange={e => setRepCpsc(e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="CPSC reference (e.g. CPSC-2026-001)…"
                      className="flex-1 min-w-40"
                    />
                    </>
                  )}
                </div>
                <label htmlFor="case-reportability-rationale" className="sr-only">Reportability rationale</label>
                <Input.TextArea
                  id="case-reportability-rationale"
                  value={repRationale}
                  onChange={e => setRepRationale(e.target.value)}
                  placeholder="Rationale for the decision (minimum 10 characters)…"
                  className="w-full"
                  maxLength={2000}
                  autoSize={{ minRows: 3, maxRows: 6 }}
                />
                {repError && <p role="alert" aria-live="polite" className="text-xs text-red-600">{repError}</p>}
                <Button
                  type="primary"
                  onClick={submitReportabilityClose}
                  disabled={repSubmitting}
                  loading={repSubmitting}
                  icon={repSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                >
                  {repSubmitting ? 'Closing…' : 'Close review'}
                </Button>
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

      <div className="grid items-start gap-5 lg:grid-cols-3">

        {/* ── Consumer ── */}
        <Card className="border-slate-200 shadow-sm lg:row-span-2 lg:sticky lg:top-5">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5"><User className="h-4 w-4 text-brand-emerald" aria-hidden="true" />Consumer</span>
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
              {(() => {
                const address = cse.consumer.address as Record<string, unknown> | undefined;
                const lines = address
                  ? [
                      typeof address.line1 === 'string' && address.line1 ? address.line1 : null,
                      typeof address.line2 === 'string' && address.line2 ? address.line2 : null,
                      [address.city, address.state, address.postalCode].filter(Boolean).join(', ') || null,
                      typeof address.countryCode === 'string' && address.countryCode ? address.countryCode : null,
                    ].filter(Boolean)
                  : [];
                return lines.length > 0 ? (
                  <p className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-text-tertiary shrink-0 mt-0.5" />
                    <span className="whitespace-pre-line">{lines.join('\n')}</span>
                  </p>
                ) : null;
              })()}
            </div>
            <div className="pt-3 border-t text-xs text-text-tertiary space-y-1">
              <p className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Submitted {formatAdminDateTimeWithYear(cse.submittedAt)}
              </p>
            </div>
            {can('case.detail.read_pii_raw') && (
              <button
                onClick={toggleRawPii}
                disabled={loading || submitting}
                className={cn(
                  'w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50',
                  viewingRawPii
                    ? 'border border-brand-emerald/40 bg-brand-emerald-light text-brand-emerald-dark hover:bg-brand-emerald/10'
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
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="flex items-center gap-1.5 text-sm"><Users className="h-4 w-4 text-brand-emerald" aria-hidden="true" />Assignment</CardTitle>
            <p data-slot="card-description" className="text-xs text-text-tertiary">Choose the staff owner responsible for the next review step.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignedStaff ? (
              <div className="rounded-lg bg-emerald-50/60 border border-emerald-200 p-3">
                <p className="text-sm font-semibold text-text-primary">{assignedStaff.displayName}</p>
                <p className="text-xs text-text-tertiary">{assignedStaff.email} · {assignedStaff.role}</p>
                {cse.assignedAt && (
                  <p className="text-[10px] text-text-tertiary mt-1">
                    Assigned {formatAdminDate(cse.assignedAt)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-tertiary">Unassigned</p>
            )}
            <div className="flex gap-2">
              <label htmlFor="case-assignee" className="sr-only">Assign case to staff member</label>
              <Select
                id="case-assignee"
                value={assignTarget}
                onChange={(val) => setAssignTarget(val)}
                disabled={!can('case.assign')}
                title={can('case.assign') ? undefined : 'Requires the case.assign permission (reviewer+)'}
                className="flex-1"
                placeholder="Select staff member…"
                options={staff.filter(s => s.status === 'active').map(s => ({
                  value: s.id,
                  label: `${s.displayName} (${s.role})`,
                }))}
              />
              <Button
                type="primary"
                onClick={handleAssign}
                disabled={submitting || !assignTarget || !can('case.assign')}
                title={can('case.assign') ? undefined : 'Requires the case.assign permission (reviewer+)'}
              >
                Assign
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Resolution ── */}
        <Card id="resolution-card" className="border-slate-200 shadow-sm scroll-mt-5">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="flex items-center gap-1.5 text-sm"><CheckCircle2 className="h-4 w-4 text-brand-emerald" aria-hidden="true" />Resolution</CardTitle>
            <p data-slot="card-description" className="text-xs text-text-tertiary">Track the requested remedy and complete the approved outcome.</p>
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
                    Completed externally {formatAdminDateTimeWithYear(resolution.completedAt)}
                  </div>
                )}

                {resolutionActions.length > 0 ? (
                  <>
                    <label htmlFor="resolution-note" className="sr-only">Resolution note</label>
                    <Input.TextArea
                      id="resolution-note"
                      value={resolutionNote}
                      onChange={e => setResolutionNote(e.target.value)}
                      placeholder="Resolution note (minimum 10 characters)…"
                      className="w-full"
                      autoSize={{ minRows: 3, maxRows: 6 }}
                    />
                    {canApproveResolution ? (
                      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                          Approval details{resolution?.requestedType ? ' (pre-filled from the consumer’s request)' : ''}
                        </p>
                        <div className="flex gap-2">
                          <label htmlFor="resolution-type" className="sr-only">Resolution type</label>
                          <Select
                            id="resolution-type"
                            value={resolutionType}
                            onChange={(val) => setResolutionTypeOverride(val as 'replacement' | 'refund')}
                            className="flex-1"
                            options={[
                              { value: 'replacement', label: 'Replacement' },
                              { value: 'refund', label: 'Refund' },
                            ]}
                          />
                          {resolutionType === 'refund' ? (
                            <>
                              <label htmlFor="refund-currency" className="sr-only">Refund currency</label>
                              <Input
                                id="refund-currency"
                                value={refundCurrency}
                                onChange={e => setRefundCurrency(e.target.value.toUpperCase())}
                                maxLength={3}
                                autoComplete="off"
                                spellCheck={false}
                                placeholder="USD…"
                                className="w-16"
                              />
                              <label htmlFor="refund-amount" className="sr-only">Refund amount in dollars</label>
                              <Input
                                id="refund-amount"
                                type="number"
                                min="0"
                                step="0.01"
                                value={refundAmount}
                                onChange={e => setRefundAmount(e.target.value)}
                                placeholder="Amount in USD…"
                                inputMode="decimal"
                                autoComplete="off"
                                className="flex-1 min-w-20"
                              />
                            </>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {canCompleteResolution ? (
                      <>
                      <label htmlFor="external-reference" className="sr-only">External reference for completion</label>
                      <Input
                        id="external-reference"
                        value={externalReference}
                        onChange={e => setExternalReference(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="External reference for completion (optional)…"
                        className="w-full"
                      />
                      </>
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
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="flex items-center gap-1.5 text-sm"><CheckCircle2 className="h-4 w-4 text-brand-emerald" aria-hidden="true" />Status Transition</CardTitle>
            <p data-slot="card-description" className="text-xs text-text-tertiary">Move the case forward only after the required review evidence is complete.</p>
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
                <label htmlFor="transition-reason" className="sr-only">Reason for status transition</label>
                <Input.TextArea
                  id="transition-reason"
                  value={transitionReason}
                  onChange={e => setTransitionReason(e.target.value)}
                  placeholder="Reason for the transition (required for rejected / duplicate / withdrawn)…"
                  className="w-full"
                  autoSize={{ minRows: 3, maxRows: 6 }}
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
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="flex items-center gap-1.5 text-sm"><Shield className="h-4 w-4 text-brand-emerald" aria-hidden="true" />Audit Trail</CardTitle>
          <p data-slot="card-description" className="text-xs text-text-tertiary">A chronological record of case, document and compliance activity.</p>
        </CardHeader>
        <CardContent>
          <div className="relative max-h-[320px] space-y-2 overflow-y-auto pl-1">
            {audit.map(e => (
              <div key={e.id} className="relative flex items-start gap-3 border-b py-2 pl-3 last:border-0 before:absolute before:bottom-0 before:left-[0.45rem] before:top-5 before:w-px before:bg-slate-200 last:before:hidden" style={{ borderColor: 'rgba(0,53,39,0.06)' }}>
                <div className={cn('relative z-10 mt-2 h-2 w-2 shrink-0 rounded-full ring-4 ring-card', AUDIT_DOT[e.resourceType] ?? 'bg-slate-400')} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary font-mono">{e.action}</p>
                  <p className="text-[11px] text-text-tertiary mt-0.5 flex items-center gap-1 flex-wrap">
                    <Users className="h-3 w-3" />{e.actorRole}
                    <span>·</span>
                    {formatAdminDateTime(e.occurredAt)}
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

      {/* ── Request more information (need_info) drawer ── */}
      {needInfoOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submitting) setNeedInfoOpen(false);
          }}
        >
          <div
            ref={needInfoDialogRef}
            className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-surface-elevated shadow-2xl sm:max-h-[calc(100vh-2rem)] sm:max-w-xl sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="need-info-title"
            aria-describedby="need-info-description"
            aria-busy={submitting}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="shrink-0 border-b border-slate-100 px-5 pb-4 pt-4 sm:px-6">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700"><Clock className="h-5 w-5" aria-hidden="true" /></div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h2 id="need-info-title" className="text-base font-bold text-text-primary">Request More Information</h2><span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">Action required</span></div>
                    <p id="need-info-description" className="mt-1 text-xs leading-relaxed text-text-tertiary">Case <span className="font-mono font-semibold text-text-secondary">{cse.caseReference}</span> · the consumer will see this message in their case workspace.</p>
                  </div>
                </div>
                <button ref={needInfoCloseRef} type="button" onClick={() => setNeedInfoOpen(false)} disabled={submitting} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/40 disabled:opacity-50" aria-label="Close request information drawer"><X className="h-4 w-4" aria-hidden="true" /></button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50/70 p-3.5"><div className="flex items-start gap-2.5"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" aria-hidden="true" /><div><p className="text-xs font-semibold text-orange-900">Ask only for information needed to complete the review.</p><p className="mt-1 text-[11px] leading-relaxed text-orange-800/80">This request is recorded in the case timeline and changes the consumer-facing status to Action required.</p></div></div></div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-text-primary">Suggested requests</p><p className="mt-0.5 text-[11px] text-text-tertiary">Select prompts to start your message.</p></div><button type="button" onClick={() => setNeedInfoNote((prev) => selectedInfoOptions === INFO_REQUEST_OPTIONS.length ? prev.split('\n').filter((line) => !INFO_REQUEST_OPTIONS.some((option) => line.trim() === `• ${option}`)).join('\n').trim() : [...prev.split('\n').filter(Boolean), ...INFO_REQUEST_OPTIONS.filter((option) => !prev.includes(option)).map((option) => `• ${option}`)].join('\n').trim())} className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-brand-emerald transition-colors hover:bg-brand-emerald-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/40">{selectedInfoOptions === INFO_REQUEST_OPTIONS.length ? 'Clear all' : 'Select all'}</button></div>
                <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Suggested information requests">
                  {INFO_REQUEST_OPTIONS.map((option) => (
                    <label key={option} className="flex min-h-12 cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-surface-elevated p-3 text-xs leading-relaxed text-text-secondary transition-colors hover:border-orange-300 hover:bg-orange-50/50 has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50 focus-within:ring-2 focus-within:ring-orange-300/40">
                      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-orange-600" checked={needInfoNote.includes(option)} onChange={(event) => setNeedInfoNote((prev) => event.target.checked ? (prev.trim() ? `${prev.trim()}\n• ${option}` : `• ${option}`) : prev.replace(`\n• ${option}`, '').replace(`• ${option}\n`, '').replace(`• ${option}`, ''))} />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="need-info-note" className="text-xs font-bold text-text-primary">Message to consumer</label>
                  <span className={cn('text-[10px] font-semibold tabular-nums', needInfoNoteLength === 0 || needInfoNoteValid ? 'text-text-tertiary' : 'text-orange-700')}>
                    {needInfoNoteLength}/2000 characters
                  </span>
                </div>
                <Input.TextArea
                  ref={needInfoNoteRef}
                  id="need-info-note"
                  value={needInfoNote}
                  onChange={event => setNeedInfoNote(event.target.value)}
                  placeholder="Describe what the consumer should provide (minimum 10 characters)…"
                  aria-invalid={needInfoNoteLength > 0 && !needInfoNoteValid}
                  aria-describedby="need-info-note-help"
                  className="min-h-32 w-full"
                  style={{ borderColor: needInfoNoteLength > 0 && !needInfoNoteValid ? '#fdba74' : 'var(--border)' }}
                  maxLength={2000}
                  autoSize={{ minRows: 4, maxRows: 10 }}
                />
                <div id="need-info-note-help" className="flex items-start justify-between gap-3 text-[10px] leading-relaxed text-text-tertiary">
                  <span>{needInfoNoteValid ? 'Ready to send. Free-form edits are welcome.' : 'Add at least 10 characters before sending.'}</span>
                  <span className="shrink-0">Saved to timeline</span>
                </div>
              </div>
              {actionError && <div role="alert" aria-live="polite" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" aria-hidden="true" /><span>{actionError}</span></div>}
            </div>
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-[10px] text-text-tertiary">{selectedInfoOptions} of {INFO_REQUEST_OPTIONS.length} suggestions selected</p>
              <div className="flex gap-2 sm:justify-end">
                <button type="button" onClick={() => setNeedInfoOpen(false)} disabled={submitting} className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/40 disabled:opacity-50 sm:flex-none">Cancel</button>
                <button type="button" onClick={submitNeedInfo} disabled={submitting || !needInfoNoteValid} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 disabled:opacity-50 sm:flex-none">
                  {submitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
                  {submitting ? 'Submitting…' : 'Request information'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Evidence image preview drawer ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-[3px] sm:items-center sm:p-4 md:p-8"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setLightbox(null);
          }}
        >
          <div
            ref={lightboxDialogRef}
            className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-slate-950 shadow-2xl sm:max-h-[calc(100vh-2rem)] sm:max-w-5xl sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="evidence-preview-title"
            aria-describedby="evidence-preview-description"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="shrink-0 border-b border-white/10 px-4 pb-3 pt-3 sm:px-5 sm:pt-4">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 sm:hidden" aria-hidden="true" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white"><ZoomIn className="h-4 w-4" aria-hidden="true" /></div>
                  <div className="min-w-0">
                    <h2 id="evidence-preview-title" className="truncate text-sm font-bold text-white">{lightbox.originalFileName}</h2>
                    <p id="evidence-preview-description" className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-300"><span>{lightbox.declaredMimeType}</span><span aria-hidden="true">·</span><span>{(lightbox.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span><span aria-hidden="true">·</span><span>Evidence preview</span></p>
                  </div>
                </div>
                <button ref={lightboxCloseRef} type="button" onClick={() => setLightbox(null)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60" aria-label="Close evidence preview"><X className="h-4 w-4" aria-hidden="true" /></button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex min-h-[min(62vh,720px)] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30 p-2 sm:p-4">
                {docAccess[lightbox.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- dynamic signed blob URL
                  <img
                    src={docAccess[lightbox.id]!.url}
                    alt={lightbox.originalFileName}
                    width={1600}
                    height={1200}
                    className="max-h-[min(68vh,760px)] w-full rounded-lg object-contain"
                  />
                ) : (
                  <div className="max-w-md rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-300">
                    <ZoomIn className="mx-auto mb-3 h-8 w-8 text-slate-400" aria-hidden="true" />
                    <p className="font-semibold text-white">Preview is not available</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-400">The signed access link may have expired, or this file is not an image. Close this preview and try opening the original file from its evidence row.</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-3 border-t border-white/10 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-[10px] text-slate-400">Click outside or press <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-slate-300">Esc</kbd> to close</p>
              <div className="flex gap-2">
                {docAccess[lightbox.id] && (
                  <>
                    <a href={docAccess[lightbox.id]!.downloadUrl} download className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:flex-none"><Download className="h-3.5 w-3.5" aria-hidden="true" />Download</a>
                    <a href={docAccess[lightbox.id]!.url} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-emerald px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-emerald-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/60 sm:flex-none"><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />Open original</a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
