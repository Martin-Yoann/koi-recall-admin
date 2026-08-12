'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, User, Package, FileText, AlertTriangle, Clock, Shield, Search,
  CheckCircle2, XCircle, RefreshCw, Users, Hash, Calendar, Store, DollarSign, ExternalLink, Copy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { cn } from '@/lib/utils';
import {
  seedOperations, getCase, updateCase, getAllAudit, getIncidentForCase, updateIncident,
  type CaseRecord, type IncidentRecord, type AuditEvent, type ProductMatchDecision, type ReportabilityStatus,
} from '@/lib/operations-repository';

const DECISION_LABELS: Record<ProductMatchDecision, string> = {
  pending: 'Pending Review', confirmed: 'Confirmed', unable_to_confirm: 'Unable to Confirm', possible_duplicate: 'Possible Duplicate',
};

const DECISION_COLORS: Record<ProductMatchDecision, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  unable_to_confirm: 'bg-red-50 text-red-700 border-red-200',
  possible_duplicate: 'bg-blue-50 text-blue-700 border-blue-200',
};

const REPORT_COLORS: Record<ReportabilityStatus, string> = {
  pending: 'bg-red-50 text-red-700',
  filed: 'bg-emerald-50 text-emerald-700',
  documented_non_reportable: 'bg-slate-50 text-slate-700',
};

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [incidentRationale, setIncidentRationale] = useState('');
  const [incidentAction, setIncidentAction] = useState<ReportabilityStatus | ''>('');

  const refresh = () => {
    seedOperations();
    const c = getCase(id);
    if (!c) { setLoading(false); return; }
    setRecord(c);
    setIncident(getIncidentForCase(c.id) ?? null);
    setAudit(getAllAudit().filter(a => a.reference?.includes(c.caseRef) || a.details?.includes(c.caseRef) || a.reference === c.incidentId).slice(-15).reverse());
    setLoading(false);
    if (c.incidentId) {
      const inc = getIncidentForCase(c.id);
      if (inc) setIncident(inc);
    }
  };

  useEffect(() => { refresh(); }, [id]);

  const handleDecision = async (decision: ProductMatchDecision, reason?: string) => {
    if (!record) return;
    setSubmitting(true);
    updateCase(record.id, {
      productMatchDecision: decision,
      productMatchReason: reason || `Decision: ${DECISION_LABELS[decision]}`,
      productMatchRuleVersion: 'v1.0',
      ...(decision === 'unable_to_confirm' ? { queueReason: reason || 'Product could not be confirmed' } : {}),
    }, {
      actor: 'Admin User', action: `Case ${record.caseRef}: Product match ${decision}`,
      category: 'case', details: reason || DECISION_LABELS[decision],
    });
    refresh();
    setSubmitting(false);
  };

  const handleIncidentAction = async (status: ReportabilityStatus) => {
    if (!record?.incidentId) return;
    if (!incidentRationale.trim()) return;
    setSubmitting(true);
    updateIncident(record.incidentId, {
      reportabilityReview: { status, rationale: incidentRationale, decidedAt: new Date().toISOString(), reviewerId: 'admin' },
    }, {
      actor: 'Admin User',
      action: `Incident ${record.incidentId}: ${status === 'filed' ? 'Escalated for filing' : 'Documented non-reportable'}`,
      category: 'incident',
      details: incidentRationale,
    });
    setIncidentAction('');
    setIncidentRationale('');
    refresh();
    setSubmitting(false);
  };

  const canClose = record && record.status !== 'closed' && record.status !== 'resolved';
  const isBlockedByIncident = incident && incident.reportabilityReview.status === 'pending';
  const tentativeClosing = isBlockedByIncident;

  if (loading) return <div className="animate-pulse p-8 text-text-tertiary">Loading case...</div>;
  if (!record) return <div className="p-8 text-center"><p className="text-text-primary font-bold mb-2">Case Not Found</p><Link href="/cases" className="text-brand-emerald hover:underline text-sm">Back to Cases</Link></div>;

  const cse = record;

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/cases" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"><ArrowLeft className="h-4 w-4" />Cases</Link>
          <div className="h-5 w-px bg-border" />
          <h1 className="text-xl font-bold text-text-primary font-mono">{cse.caseRef}</h1>
          <StatusBadge variant={cse.status as any} />
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', DECISION_COLORS[cse.productMatchDecision])}>{DECISION_LABELS[cse.productMatchDecision]}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer hover:bg-surface-secondary text-text-secondary">
            <RefreshCw className="h-3.5 w-3.5" />Refresh
          </button>
        </div>
      </div>

      {/* Incident Gate Warning */}
      {isBlockedByIncident && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800">Incident Reportability Gate</p>
            <p className="text-xs text-red-700 mt-0.5">
              This Case is linked to Incident {cse.incidentId} with reportability review pending.
              The Case cannot be closed until the incident is reviewed and resolved.
            </p>
          </div>
        </div>
      )}

      {/* Three-column layout */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* ── Left: Evidence Review ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><FileText className="h-4 w-4 text-text-tertiary" />Evidence Review</CardTitle></CardHeader>
            <CardContent>
              {cse.evidence.length > 0 ? (
                <div className="space-y-2">
                  {cse.evidence.map(ev => (
                    <div key={ev.id} className="flex items-start justify-between p-3 rounded-lg bg-surface-secondary border">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-elevated"><FileText className="h-4 w-4 text-text-tertiary" /></div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{ev.fileName}</p>
                          <p className="text-xs text-text-tertiary">
                            {ev.type.replace(/_/g, ' ')} · {new Date(ev.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {ev.verified ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-amber-500" />}
                        <button className="text-xs font-medium text-brand-emerald hover:underline cursor-pointer" onClick={() => {
                          updateCase(cse.id, {}, { actor: 'Admin User', action: `Evidence ${ev.fileName} accessed`, category: 'pii', details: `Evidence review` });
                          refresh();
                        }}>View</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-text-tertiary">No evidence submitted.</p>}
            </CardContent>
          </Card>

          {/* Consumer Info */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><User className="h-4 w-4 text-text-tertiary" />Consumer</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-semibold text-text-primary">{cse.consumerName}</p>
              <p className="text-sm text-text-secondary">{cse.consumerEmail}</p>
              {cse.consumerPhone && <p className="text-sm text-text-secondary">{cse.consumerPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</p>}
            </CardContent>
          </Card>
        </div>

        {/* ── Center: Product Identification + Decision ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><Package className="h-4 w-4 text-text-tertiary" />Product Identification</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><span className="text-text-tertiary">SKU</span><p className="font-mono font-semibold text-text-primary">{cse.sku}</p></div>
                {cse.upc && <div><span className="text-text-tertiary">UPC/EAN</span><p className="font-mono font-semibold text-text-primary">{cse.upc}</p></div>}
                {cse.gtin && <div><span className="text-text-tertiary">GTIN-14</span><p className="font-mono font-semibold text-text-primary">{cse.gtin}</p></div>}
                {cse.model && <div><span className="text-text-tertiary">Model</span><p className="font-mono font-semibold text-text-primary">{cse.model}</p></div>}
                {cse.lotCode && <div><span className="text-text-tertiary">Lot / Batch</span><p className="font-mono font-semibold text-text-primary">{cse.lotCode}</p></div>}
                {cse.dateCode && <div><span className="text-text-tertiary">Date / Expiry</span><p className="font-mono font-semibold text-text-primary">{cse.dateCode}</p></div>}
                {cse.shape && <div><span className="text-text-tertiary">Shape</span><p className="font-semibold text-text-primary">{cse.shape}</p></div>}
                {cse.flavor && <div><span className="text-text-tertiary">Flavor</span><p className="font-semibold text-text-primary">{cse.flavor}</p></div>}
              </div>

              {/* Product Match Decision */}
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Product Match Decision</span>
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', DECISION_COLORS[cse.productMatchDecision])}>{DECISION_LABELS[cse.productMatchDecision]}</span>
                </div>
                {cse.productMatchReason && <p className="text-xs text-text-secondary">{cse.productMatchReason}</p>}
                {cse.productMatchRuleVersion && <p className="text-[10px] text-text-tertiary">Rule version: {cse.productMatchRuleVersion}</p>}

                {/* Decision Buttons */}
                {cse.productMatchDecision === 'pending' && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button onClick={() => handleDecision('confirmed', 'Product identifiers within affected scope; evidence verified')}
                      className="text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer transition-colors disabled:opacity-50" disabled={submitting}>
                      <CheckCircle2 className="inline h-3.5 w-3.5 mr-1" />Confirm Product Match
                    </button>
                    <button onClick={() => handleDecision('unable_to_confirm', 'Product identifiers could not be confirmed against affected scope')}
                      className="text-xs font-semibold px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 cursor-pointer transition-colors disabled:opacity-50" disabled={submitting}>
                      <XCircle className="inline h-3.5 w-3.5 mr-1" />Unable to Confirm
                    </button>
                    <button onClick={() => handleDecision('possible_duplicate', 'Potential duplicate; same consumer + product pattern detected')}
                      className="text-xs font-semibold px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 cursor-pointer transition-colors disabled:opacity-50" disabled={submitting}>
                      <Copy className="inline h-3.5 w-3.5 mr-1" />Route as Possible Duplicate
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Purchase & Order */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><Store className="h-4 w-4 text-text-tertiary" />Purchase & Order Evidence</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {cse.orderNumber ? (
                <>
                  <div className="flex items-center gap-2"><span className="text-text-tertiary text-xs">Order:</span><span className="font-mono text-sm font-semibold text-text-primary">{cse.orderNumber.slice(0, 6)}****</span></div>
                  {cse.orderDate && <div className="flex items-center gap-2"><Calendar className="h-3 w-3 text-text-tertiary" /><span className="text-xs text-text-secondary">{cse.orderDate}</span></div>}
                  {cse.orderAmount != null && <div className="flex items-center gap-2"><DollarSign className="h-3 w-3 text-text-tertiary" /><span className="text-xs text-text-secondary">${cse.orderAmount.toFixed(2)}</span></div>}
                  {cse.retailerName && <div className="flex items-center gap-2"><Store className="h-3 w-3 text-text-tertiary" /><span className="text-xs text-text-secondary">{cse.retailerName}</span></div>}
                </>
              ) : (
                <p className="text-sm text-text-tertiary">No order data — consumer may not have receipt.</p>
              )}
              {cse.remedyTitle && (
                <div className="pt-2 border-t mt-2">
                  <span className="text-xs text-text-tertiary">Remedy: </span>
                  <span className="text-sm font-semibold text-text-primary">{cse.remedyTitle}</span>
                  {cse.refundAmount && <span className="text-xs text-text-secondary ml-2">· up to ${cse.refundAmount.toFixed(2)}</span>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Risk Flags + Incident + Audit ── */}
        <div className="space-y-4">
          {/* Risk Flags */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-text-tertiary" />Consistency & Risk Checks</CardTitle></CardHeader>
            <CardContent>
              {cse.riskFlags.length > 0 ? (
                <div className="space-y-1.5">
                  {cse.riskFlags.map(f => (
                    <div key={f} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-xs font-semibold text-red-700">
                      <AlertTriangle className="h-3 w-3 shrink-0" />{f.replace(/_/g, ' ')}
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-text-tertiary">No risk flags.</p>}
            </CardContent>
          </Card>

          {/* Incident */}
          {incident && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-red-500" />Incident Report</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-text-secondary">{incident.narrative}</p>
                <div className="flex flex-wrap gap-1.5">
                  {incident.eventTypes.map(t => <span key={t} className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-50 text-red-600">{t}</span>)}
                </div>
                {incident.occurredAt && <p className="text-xs text-text-tertiary">Occurred: {new Date(incident.occurredAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>}
                {incident.injurySeverity && <p className="text-xs text-text-tertiary">Severity: {incident.injurySeverity}</p>}

                {/* Reportability */}
                <div className="pt-3 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Reportability</span>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', REPORT_COLORS[incident.reportabilityReview.status])}>
                      {incident.reportabilityReview.status === 'pending' ? 'PENDING' : incident.reportabilityReview.status === 'filed' ? 'FILED' : 'NON-REPORTABLE'}
                    </span>
                  </div>

                  {incident.reportabilityReview.status === 'pending' && (
                    <div className="space-y-2">
                      <textarea value={incidentRationale} onChange={e => setIncidentRationale(e.target.value)}
                        placeholder="Enter rationale before confirming..."
                        className="w-full h-16 text-xs p-2 rounded-lg border bg-surface-secondary outline-none resize-none"
                        style={{ borderColor: 'var(--border)' }} />
                      <div className="flex gap-2">
                        <button onClick={() => handleIncidentAction('filed')}
                          className="flex-1 text-[10px] font-bold px-2 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 cursor-pointer transition-colors disabled:opacity-50"
                          disabled={submitting || !incidentRationale.trim()}>
                          <ExternalLink className="inline h-3 w-3 mr-1" />Escalate for Filing
                        </button>
                        <button onClick={() => handleIncidentAction('documented_non_reportable')}
                          className="flex-1 text-[10px] font-bold px-2 py-1.5 rounded-md bg-slate-600 text-white hover:bg-slate-700 cursor-pointer transition-colors disabled:opacity-50"
                          disabled={submitting || !incidentRationale.trim()}>
                          <CheckCircle2 className="inline h-3 w-3 mr-1" />Document Non-Reportable
                        </button>
                      </div>
                      {!incidentRationale.trim() && <p className="text-[10px] text-red-600">Rationale is required before confirming incident outcome.</p>}
                    </div>
                  )}

                  {incident.reportabilityReview.rationale && (
                    <p className="text-xs text-text-secondary italic">Rationale: {incident.reportabilityReview.rationale}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Closing Gate Warning */}
          {tentativeClosing && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
              <p className="font-semibold">Case Cannot Be Closed</p>
              <p className="mt-1">Incident reportability review must be completed before this Case can be resolved or closed.</p>
            </div>
          )}
        </div>
      </div>

      {/* Audit Trail */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Audit Trail</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {audit.map(e => (
              <div key={e.id} className="flex items-start gap-3 py-2 border-b last:border-0" style={{ borderColor: 'rgba(0,53,39,0.06)' }}>
                <div className={cn('h-2 w-2 rounded-full mt-2 shrink-0',
                  e.category === 'case' && 'bg-blue-500', e.category === 'incident' && 'bg-red-500',
                  e.category === 'remedy' && 'bg-emerald-500', e.category === 'pii' && 'bg-purple-500', e.category === 'system' && 'bg-slate-400',
                )} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary">{e.action}</p>
                  <p className="text-[11px] text-text-tertiary mt-0.5 flex items-center gap-1"><Users className="h-3 w-3" />{e.actor}<span>·</span>{new Date(e.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  {e.details && <p className="text-xs text-text-tertiary mt-1 italic">{e.details}</p>}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary shrink-0">{e.category}</span>
              </div>
            ))}
            {audit.length === 0 && <p className="text-sm text-text-tertiary text-center py-4">No audit events recorded.</p>}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
