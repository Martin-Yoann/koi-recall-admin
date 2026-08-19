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
  CheckCircle2, ArrowRight, Shield, MapPin, Mail, Phone, Globe,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { cn } from '@/lib/utils';
import {
  getCaseDetail, transitionCaseStatus, assignCase, listStaff, queryAuditEvents,
  type CaseDetail, type StaffUser, type AuditEvent,
} from '@/lib/api-client';
import { useAdminAuth } from '@/lib/admin-auth';
import {
  formatBlockingReason,
  formatWorkflowLabel,
  getCaseOperationsView,
  runResolutionAction,
} from '@/lib/case-operations';

const TERMINAL = ['closed', 'rejected', 'duplicate', 'withdrawn'];

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
  const [resolutionType, setResolutionType] = useState<'replacement' | 'refund'>('replacement');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundCurrency, setRefundCurrency] = useState('USD');
  const [externalReference, setExternalReference] = useState('');
  const mountedRef = useRef(true);
  const initialLoadStartedRef = useRef(false);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const refresh = useCallback(async () => {
    const result = await getCaseDetail(caseRef);
    if (!mountedRef.current) return;
    if (result.ok) {
      setRecord(result.data.case);
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
    setSubmitting(true);
    setActionError(null);
    const result = await transitionCaseStatus(caseRef, {
      status: next,
      ...(transitionReason.trim() ? { reason: transitionReason.trim() } : {}),
    });
    if (result.ok) {
      setTransitionReason('');
      await refresh();
    } else {
      setActionError(result.error?.detail || `Transition to ${next} failed (${result.status})`);
    }
    setSubmitting(false);
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

    const refundAmountMinor =
      resolutionType === 'refund' && refundAmount.trim() ? Number(refundAmount.trim()) : undefined;

    if (action === 'resolution:approve' && resolutionType === 'refund') {
      if (!Number.isInteger(refundAmountMinor) || (refundAmountMinor ?? 0) <= 0) {
        setActionError('Refund approvals require a positive integer refund amount in minor units.');
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
  const assignedStaff = staff.find(s => s.id === cse.assignedToStaffUserId);
  const consumerName = `${cse.consumer.firstName} ${cse.consumer.lastName}`.trim();

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

      {actionError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800">
          {actionError}
        </div>
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
                className="flex-1 h-9 rounded-lg border bg-surface-elevated px-2 text-xs text-text-secondary outline-none cursor-pointer focus:border-brand-emerald"
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
                disabled={submitting || !assignTarget}
                className="h-9 px-3 rounded-lg bg-brand-emerald text-white text-xs font-semibold hover:bg-emerald-900 cursor-pointer transition-colors disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ── Resolution ── */}
        <Card>
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
                    Refund amount: {resolution.refundAmountMinor} {resolution.currency ?? ''}
                  </div>
                )}

                {resolution.externalReference && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-text-secondary">
                    External reference: {resolution.externalReference}
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
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Approval details</p>
                        <div className="flex gap-2">
                          <select
                            value={resolutionType}
                            onChange={e => setResolutionType(e.target.value as 'replacement' | 'refund')}
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
                                className="w-20 h-9 rounded-lg border bg-surface-elevated px-2 text-xs text-text-secondary outline-none"
                              />
                              <input
                                value={refundAmount}
                                onChange={e => setRefundAmount(e.target.value.replace(/[^\d]/g, ''))}
                                placeholder="Amount"
                                className="w-28 h-9 rounded-lg border bg-surface-elevated px-2 text-xs text-text-secondary outline-none"
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
                          disabled={submitting}
                          className={cn(
                            'text-xs font-semibold px-3 py-1.5 rounded-md cursor-pointer transition-colors disabled:opacity-50',
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
                      <p key={reason}>{formatBlockingReason(reason)}</p>
                    ))}
                  </div>
                ) : null}
                <textarea
                  value={transitionReason}
                  onChange={e => setTransitionReason(e.target.value)}
                  placeholder="Reason for the transition (optional)..."
                  className="w-full h-16 text-xs p-2 rounded-lg border bg-surface-secondary outline-none resize-none"
                  style={{ borderColor: 'var(--border)' }}
                />
                <div className="flex flex-wrap gap-2">
                  {transitions.map(next => (
                    <button
                      key={next}
                      onClick={() => handleTransition(next)}
                      disabled={submitting}
                      className={cn(
                        'text-xs font-semibold px-3 py-1.5 rounded-md cursor-pointer transition-colors disabled:opacity-50',
                        TRANSITION_STYLES[next] ?? 'bg-slate-600 hover:bg-slate-700 text-white',
                      )}
                    >
                      <ArrowRight className="inline h-3.5 w-3.5 mr-1" />
                      {next.replace(/_/g, ' ')}
                    </button>
                  ))}
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

    </div>
  );
}
