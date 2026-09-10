import {
  approveResolution,
  cancelResolution,
  completeResolution,
  recordShipment,
  type ApiResult,
  type CaseDetail,
  type CaseResolution,
  type CaseSummary,
} from '@/lib/api-client';

export type ResolutionAction =
  | 'resolution:approve'
  | 'resolution:complete'
  | 'resolution:cancel'
  | 'resolution:ship';

export type CaseAction = `transition:${string}` | ResolutionAction;

export interface CaseOperationsView {
  transitions: string[];
  resolutionActions: ResolutionAction[];
  blockingReasons: string[];
}

export function getCaseOperationsView(
  record: Pick<CaseSummary | CaseDetail, 'workflow'>,
): CaseOperationsView {
  const actions = record.workflow?.allowedActions ?? [];
  return {
    transitions: actions
      .filter((action): action is `transition:${string}` => action.startsWith('transition:'))
      .map((action) => action.slice('transition:'.length)),
    resolutionActions: actions.filter(
      (action): action is ResolutionAction =>
        action === 'resolution:approve' ||
        action === 'resolution:complete' ||
        action === 'resolution:cancel' ||
        action === 'resolution:ship',
    ),
    blockingReasons: record.workflow?.blockingReasons ?? [],
  };
}

export function formatBlockingReason(reason: string): string {
  switch (reason) {
    case 'resolution_not_externally_completed':
      return 'Resolution must be externally completed before the case can move to closure.';
    case 'reportability_pending':
      return 'Reportability review must be closed before the case can be closed.';
    default:
      return reason.replace(/_/g, ' ');
  }
}

export function formatWorkflowLabel(value: string): string {
  return value.replace(/_/g, ' ');
}

export async function runResolutionAction(
  caseReference: string,
  action: ResolutionAction,
  input: {
    note: string;
    expectedVersion: number;
    type?: 'replacement' | 'refund';
    refundAmountMinor?: number;
    currency?: string;
    externalReference?: string;
    trackingNumber?: string;
  },
): Promise<ApiResult<CaseResolution>> {
  switch (action) {
    case 'resolution:approve':
      return approveResolution(caseReference, {
        type: input.type ?? 'replacement',
        note: input.note,
        expectedVersion: input.expectedVersion,
        refundAmountMinor: input.refundAmountMinor,
        currency: input.currency,
      });
    case 'resolution:complete':
      return completeResolution(caseReference, {
        note: input.note,
        expectedVersion: input.expectedVersion,
        externalReference: input.externalReference,
      });
    case 'resolution:ship':
      return recordShipment(caseReference, {
        trackingNumber: input.trackingNumber?.trim() ?? '',
        expectedVersion: input.expectedVersion,
      });
    case 'resolution:cancel':
      return cancelResolution(caseReference, {
        note: input.note,
        expectedVersion: input.expectedVersion,
      });
  }
}
