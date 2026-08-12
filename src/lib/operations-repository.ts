// ============================================================
// KOI Admin — Unified Operations Repository
// Single source of truth for Cases, Queues, Incidents, Jobs,
// Remedy Tasks, and Audit Events. Serialised to localStorage.
// ============================================================

export type QueueKind = 'urgent_injury_safety' | 'manual_review' | 'unable_to_confirm' | 'possible_duplicate' | 'remedy_exception' | 'integration_exception';
export type IncidentEventType = 'injury' | 'illness' | 'choking' | 'ingestion' | 'fire' | 'overheating' | 'property_damage' | 'near_miss' | 'other' | 'unknown';
export type ReportabilityStatus = 'pending' | 'filed' | 'documented_non_reportable';
export type ProductMatchDecision = 'pending' | 'confirmed' | 'unable_to_confirm' | 'possible_duplicate';
export type CaseStatus = 'submitted' | 'under_review' | 'verified' | 'remedy_issued' | 'resolved' | 'closed' | 'rejected';
export type JobStatus = 'pending' | 'running' | 'completed' | 'partial_failure' | 'failed';

export interface AuditEvent { id: string; actor: string; action: string; timestamp: string; reference?: string; category: 'case' | 'incident' | 'remedy' | 'job' | 'export' | 'pii' | 'rule' | 'system'; details?: string; }
export interface EvidenceRecord { id: string; type: string; fileName: string; uploadedAt: string; verified: boolean; }

export interface CaseRecord {
  id: string; caseRef: string; status: CaseStatus; consumerName: string; consumerEmail: string; consumerPhone: string;
  productName: string; sku: string; upc?: string; gtin?: string; model?: string; lotCode?: string; dateCode?: string; shape?: string; flavor?: string;
  evidence: EvidenceRecord[]; orderNumber?: string; orderAmount?: number; orderDate?: string; retailerName?: string;
  remedyType: 'replacement' | 'refund' | 'repair'; remedyTitle: string; refundAmount?: number;
  productMatchDecision: ProductMatchDecision; productMatchReason?: string; productMatchRuleVersion?: string;
  riskFlags: string[]; incidentId?: string; submittedAt: string; updatedAt: string; assignedTo?: string; queueReason?: string;
}

export interface IncidentRecord { id: string; caseId: string; eventTypes: IncidentEventType[]; narrative: string; occurredAt?: string; injurySeverity?: string; reportabilityReview: { status: ReportabilityStatus; reviewerId?: string; rationale?: string; decidedAt?: string; }; createdAt: string; }
export interface QueueCard { kind: QueueKind; label: string; description: string; count: number; oldestAt?: string; sla: string; icon: string; color: string; }
export interface JobRecord { id: string; type: string; status: JobStatus; recordsTotal: number; recordsProcessed: number; recordsFailed: number; failedRowCount?: number; createdAt: string; completedAt?: string; retryCount: number; }

const KEY = 'koi_operations';

interface Store { cases: CaseRecord[]; incidents: IncidentRecord[]; jobs: JobRecord[]; audit: AuditEvent[]; }

function load(): Store { if (typeof window === 'undefined') return { cases: [], incidents: [], jobs: [], audit: [] }; try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : { cases: [], incidents: [], jobs: [], audit: [] }; } catch { return { cases: [], incidents: [], jobs: [], audit: [] }; } }
function save(s: Store) { if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(s)); }

// ── Seed ──
export function seedOperations() {
  const s = load(); if (s.cases.length > 0) return;
  const ts = Date.now();
  const cases: CaseRecord[] = [
    { id: 'c1', caseRef: 'KOI-0001', status: 'verified', consumerName: 'Sarah Chen', consumerEmail: 'sarah.chen@email.com', consumerPhone: '13812341234', productName: 'Music Lollipop', sku: 'MUSIC-LOLLIPOP-18G', model: 'ML-18G', lotCode: 'ML-2406-A', dateCode: '06/2024', shape: 'Bear', flavor: 'Peach', evidence: [{ id: 'ev1', type: 'product_photo', fileName: 'lollipop-label.jpg', uploadedAt: new Date(ts-15*864e5).toISOString(), verified: true }, { id: 'ev2', type: 'serial_number', fileName: 'lot-code.jpg', uploadedAt: new Date(ts-15*864e5).toISOString(), verified: true }], orderNumber: 'AMZ-2025-07821', orderAmount: 5.99, orderDate: '2024-08-15', retailerName: 'Amazon', remedyType: 'replacement', remedyTitle: 'Free Replacement Product', productMatchDecision: 'confirmed', productMatchReason: 'Lot ML-2406-A within affected scope; photo matches packaging', productMatchRuleVersion: 'v1.0', riskFlags: [], submittedAt: new Date(ts-20*864e5).toISOString(), updatedAt: new Date(ts-14*864e5).toISOString() },
    { id: 'c2', caseRef: 'KOI-0002', status: 'under_review', consumerName: 'James Wilson', consumerEmail: 'jwilson@email.com', consumerPhone: '18611223344', productName: 'Music Lollipop', sku: 'MUSIC-LOLLIPOP-18G', model: 'ML-18G', lotCode: 'ML-2408-C', dateCode: '08/2024', shape: 'Heart', flavor: 'Peach', evidence: [{ id: 'ev3', type: 'serial_number', fileName: 'lot-code-2.jpg', uploadedAt: new Date(ts-8*864e5).toISOString(), verified: true }, { id: 'ev4', type: 'product_photo', fileName: 'lollipop.jpg', uploadedAt: new Date(ts-8*864e5).toISOString(), verified: false }], orderNumber: 'KR-2025-15500', orderAmount: 4.49, orderDate: '2024-12-20', retailerName: 'Kroger', remedyType: 'replacement', remedyTitle: 'Free Replacement Product', productMatchDecision: 'pending', riskFlags: ['lot_code_borderline'], submittedAt: new Date(ts-10*864e5).toISOString(), updatedAt: new Date(ts-6*864e5).toISOString() },
    { id: 'c3', caseRef: 'KOI-0003', status: 'submitted', consumerName: 'Emily Davis', consumerEmail: 'emily.d@email.com', consumerPhone: '13956785678', productName: 'Music Lollipop', sku: 'MUSIC-LOLLIPOP-18G', lotCode: 'ML-2407-B', dateCode: '07/2024', shape: 'Strawberry', flavor: 'Strawberry', evidence: [{ id: 'ev5', type: 'product_photo', fileName: 'package.png', uploadedAt: new Date(ts-3*864e5).toISOString(), verified: false }], remedyType: 'refund', remedyTitle: 'Full Refund', refundAmount: 5.99, productMatchDecision: 'pending', riskFlags: [], incidentId: 'inc1', submittedAt: new Date(ts-5*864e5).toISOString(), updatedAt: new Date(ts-3*864e5).toISOString() },
    { id: 'c4', caseRef: 'KOI-0004', status: 'remedy_issued', consumerName: 'Amanda Torres', consumerEmail: 'atorres@email.com', consumerPhone: '15287654321', productName: 'Music Lollipop', sku: 'MUSIC-LOLLIPOP-18G', lotCode: 'ML-2407-B', dateCode: '07/2024', shape: 'Bear', flavor: 'Strawberry', evidence: [{ id: 'ev6', type: 'proof_of_purchase', fileName: 'receipt.pdf', uploadedAt: new Date(ts-30*864e5).toISOString(), verified: true }], orderNumber: 'WM-2025-11209', orderAmount: 4.99, orderDate: '2024-10-22', retailerName: 'Walmart', remedyType: 'replacement', remedyTitle: 'Free Replacement Product', productMatchDecision: 'confirmed', productMatchReason: 'Lot + photo confirmed', productMatchRuleVersion: 'v1.0', riskFlags: [], submittedAt: new Date(ts-35*864e5).toISOString(), updatedAt: new Date(ts-15*864e5).toISOString() },
    { id: 'c5', caseRef: 'KOI-0005', status: 'submitted', consumerName: 'Marcus Johnson', consumerEmail: 'mjohnson@email.com', consumerPhone: '15012349876', productName: 'Music Lollipop', sku: 'MUSIC-LOLLIPOP-18G', lotCode: 'ML-2405-Z', dateCode: '05/2024', shape: 'Dinosaur', flavor: 'Peach', evidence: [{ id: 'ev7', type: 'product_photo', fileName: 'lollipop-front.jpg', uploadedAt: new Date(ts-2*864e5).toISOString(), verified: false }], remedyType: 'refund', remedyTitle: 'Full Refund', refundAmount: 5.99, productMatchDecision: 'pending', riskFlags: ['lot_code_outside_scope', 'no_receipt'], submittedAt: new Date(ts-4*864e5).toISOString(), updatedAt: new Date(ts-2*864e5).toISOString() },
    { id: 'c6', caseRef: 'KOI-0006', status: 'rejected', consumerName: 'Jennifer Wu', consumerEmail: 'jwu@email.com', consumerPhone: '18755443322', productName: 'Music Lollipop', sku: 'MUSIC-LOLLIPOP-18G', lotCode: 'ML-2409-X', dateCode: '09/2024', shape: 'Strawberry', flavor: 'Peach', evidence: [{ id: 'ev8', type: 'product_photo', fileName: 'wrong-product.jpg', uploadedAt: new Date(ts-40*864e5).toISOString(), verified: false }], remedyType: 'replacement', remedyTitle: 'Free Replacement Product', productMatchDecision: 'unable_to_confirm', productMatchReason: 'Lot code outside scope; photo does not match affected packaging', productMatchRuleVersion: 'v1.0', riskFlags: ['lot_code_outside_scope', 'photo_mismatch'], queueReason: 'Lot ML-2409-X not in affected range', submittedAt: new Date(ts-45*864e5).toISOString(), updatedAt: new Date(ts-14*864e5).toISOString() },
  ];
  const incidents: IncidentRecord[] = [{ id: 'inc1', caseId: 'c3', eventTypes: ['injury'], narrative: 'Child sustained minor burn when pajama sleeve caught flame.', occurredAt: '2026-06-10T21:30:00Z', injurySeverity: 'minor', reportabilityReview: { status: 'pending' }, createdAt: new Date(ts-5*864e5).toISOString() }];
  const jobs: JobRecord[] = [{ id: 'job1', type: 'Claim Export — June 2026', status: 'completed', recordsTotal: 1420, recordsProcessed: 1420, recordsFailed: 0, createdAt: new Date(ts-7*864e5).toISOString(), completedAt: new Date(ts-7*864e5+3e5).toISOString(), retryCount: 0 }, { id: 'job2', type: 'Refund Reconciliation — July 2026', status: 'partial_failure', recordsTotal: 856, recordsProcessed: 830, recordsFailed: 26, failedRowCount: 26, createdAt: new Date(ts-1*864e5).toISOString(), retryCount: 1 }];
  const audit: AuditEvent[] = [
    { id: 'a1', actor: 'Admin (Jane Smith)', action: 'Case KOI-0001: Product match confirmed', timestamp: new Date(ts-14*864e5).toISOString(), category: 'case', reference: 'KOI-0001', details: 'Lot ML-2406-A within affected scope' },
    { id: 'a2', actor: 'Admin (Jane Smith)', action: 'Case KOI-0001: Status → Verified', timestamp: new Date(ts-14*864e5).toISOString(), category: 'case', reference: 'KOI-0001' },
    { id: 'a3', actor: 'Admin (Tom Harris)', action: 'Case KOI-0002: Under Review', timestamp: new Date(ts-8*864e5).toISOString(), category: 'case', reference: 'KOI-0002' },
    { id: 'a4', actor: 'System', action: 'Case KOI-0006: Unable to confirm — routed to queue', timestamp: new Date(ts-14*864e5).toISOString(), category: 'case', reference: 'KOI-0006', details: 'Lot ML-2409-X outside scope' },
    { id: 'a5', actor: 'System', action: 'Job Refund Reconciliation: Partial failure — 26/856 rows', timestamp: new Date(ts-1*864e5).toISOString(), category: 'job', reference: 'job2' },
    { id: 'a6', actor: 'Admin (Jane Smith)', action: 'Case KOI-0004: Remedy authorized → Processing', timestamp: new Date(ts-15*864e5).toISOString(), category: 'remedy', reference: 'KOI-0004' },
    { id: 'a7', actor: 'Admin (Tom Harris)', action: 'Incident INC-001 reviewed — pending CPSC filing', timestamp: new Date(ts-5*864e5).toISOString(), category: 'incident', reference: 'inc1' },
    { id: 'a8', actor: 'System', action: 'Case KOI-0001 evidence accessed', timestamp: new Date(ts-14*864e5).toISOString(), category: 'pii', reference: 'KOI-0001' },
  ];
  save({ cases, incidents, jobs, audit });
}

// ── Queries ──
export function getAllCases(): CaseRecord[] { return load().cases; }
export function getCase(id: string): CaseRecord | undefined { return load().cases.find(c => c.id === id); }
export function getCaseByRef(ref: string): CaseRecord | undefined { return load().cases.find(c => c.caseRef === ref); }
export function getCasesByStatus(s: CaseStatus): CaseRecord[] { return load().cases.filter(c => c.status === s); }

export function getQueues(): QueueCard[] {
  const cases = getAllCases(); const now = Date.now();
  const defs: Omit<QueueCard, 'count' | 'oldestAt'>[] = [
    { kind: 'urgent_injury_safety', label: 'Urgent Injury / Safety', description: 'Cases with reported injuries or safety hazards', sla: '4h', icon: 'AlertTriangle', color: '#BA1A1A' },
    { kind: 'manual_review', label: 'Manual Review', description: 'Cases requiring human review of evidence', sla: '24h', icon: 'Search', color: '#D97706' },
    { kind: 'unable_to_confirm', label: 'Unable to Confirm', description: 'Product match could not be confirmed', sla: '48h', icon: 'XCircle', color: '#D97706' },
    { kind: 'possible_duplicate', label: 'Possible Duplicate', description: 'Potential duplicate submissions', sla: '24h', icon: 'Copy', color: '#2563EB' },
    { kind: 'remedy_exception', label: 'Remedy Exception', description: 'Remedy processing failures', sla: '8h', icon: 'Package', color: '#BA1A1A' },
    { kind: 'integration_exception', label: 'Integration Exception', description: 'External system integration errors', sla: '12h', icon: 'Wifi', color: '#7C3AED' },
  ];
  return defs.map(d => {
    let f: CaseRecord[] = [];
    if (d.kind === 'urgent_injury_safety') f = cases.filter(c => { const i = getIncidentForCase(c.id); return i && i.reportabilityReview?.status === 'pending' && i.eventTypes?.includes('injury'); });
    else if (d.kind === 'manual_review') f = cases.filter(c => c.productMatchDecision === 'pending' && c.status !== 'rejected' && c.status !== 'closed');
    else if (d.kind === 'unable_to_confirm') f = cases.filter(c => c.productMatchDecision === 'unable_to_confirm');
    else if (d.kind === 'possible_duplicate') f = cases.filter(c => c.productMatchDecision === 'possible_duplicate');
    else if (d.kind === 'remedy_exception') f = cases.filter(c => c.remedyType && c.status === 'remedy_issued');
    const s = f.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
    return { ...d, count: f.length, oldestAt: s[0]?.submittedAt };
  });
}

export function updateCase(id: string, patch: Partial<CaseRecord>, a: Pick<AuditEvent, 'actor' | 'action' | 'category' | 'details'>) {
  const s = load(); const i = s.cases.findIndex(c => c.id === id); if (i === -1) return null;
  s.cases[i] = { ...s.cases[i], ...patch, updatedAt: new Date().toISOString() };
  s.audit.push({ id: 'a_' + Date.now(), ...a, timestamp: new Date().toISOString(), reference: s.cases[i].caseRef });
  save(s); return s.cases[i];
}

export function getAllIncidents(): IncidentRecord[] { return load().incidents; }
export function getIncidentForCase(caseId: string): IncidentRecord | undefined { return load().incidents.find(i => i.caseId === caseId); }

export function updateIncident(id: string, patch: Partial<IncidentRecord>, a: Pick<AuditEvent, 'actor' | 'action' | 'category' | 'details'>) {
  const s = load(); const i = s.incidents.findIndex(inc => inc.id === id); if (i === -1) return null;
  s.incidents[i] = { ...s.incidents[i], ...patch };
  s.audit.push({ id: 'a_' + Date.now(), ...a, timestamp: new Date().toISOString() });
  save(s); return s.incidents[i];
}

export function getAllJobs(): JobRecord[] { return load().jobs; }
export function getAllAudit(): AuditEvent[] { return load().audit; }
export function getFilteredAudit(cats: string[]): AuditEvent[] { const a = load().audit; return cats.length === 0 ? a : a.filter(e => cats.includes(e.category)); }

export function getStats() {
  const cs = getAllCases(); const active = cs.filter(c => c.status !== 'closed' && c.status !== 'rejected').length;
  const pending = cs.filter(c => c.productMatchDecision === 'pending' && c.status !== 'rejected').length;
  const urgent = getQueues().find(q => q.kind === 'urgent_injury_safety')?.count ?? 0;
  const unconfirmed = cs.filter(c => c.productMatchDecision === 'unable_to_confirm').length;
  const total = cs.length; const closed = cs.filter(c => c.status === 'closed' || c.status === 'resolved').length;
  const failingJobs = getAllJobs().filter(j => j.status === 'partial_failure' || j.status === 'failed').length;
  return { active, pending, urgent, unconfirmed, total, closed, failingJobs, rate: total > 0 ? Math.round((closed / total) * 100) : 0 };
}
