"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, PackageX, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getDisposalRetention,
  listDisposalTasks,
  updateDisposalRetention,
  type DisposalQueueRow,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/rbac";
import { cn } from "@/lib/utils";

/**
 * Disposal review queue.
 *
 * Shows what a task is waiting on rather than only what state it is in: the
 * blocking reasons come from the server's own policy evaluation, which is the same
 * one the consumer surface uses, so this screen cannot disagree with what a
 * consumer is being told.
 *
 * The admin disposal endpoints are not in the published OpenAPI document, matching
 * every other /admin route in the service.
 */

const ELIGIBILITY_LABELS: Record<
  DisposalQueueRow["eligibilityStatus"],
  string
> = {
  pending_confirmation: "Awaiting confirmation",
  confirmed_eligible: "Confirmed affected",
  not_applicable: "No disposal needed",
  ineligible: "Not part of the recall",
};

const ELIGIBILITY_STYLES: Record<
  DisposalQueueRow["eligibilityStatus"],
  string
> = {
  pending_confirmation: "bg-amber-50 text-amber-700",
  confirmed_eligible: "bg-emerald-50 text-emerald-700",
  not_applicable: "bg-slate-50 text-slate-700",
  ineligible: "bg-slate-50 text-slate-700",
};

const EVIDENCE_LABELS: Record<
  NonNullable<DisposalQueueRow["evidenceReviewStatus"]>,
  string
> = {
  pending: "Pending review",
  accepted: "Accepted",
  needs_resubmission: "Resubmission asked",
  superseded: "Superseded",
};

const AUTHORIZATION_LABELS: Record<
  NonNullable<DisposalQueueRow["authorizationStatus"]>,
  string
> = {
  active: "Active",
  suspended: "Suspended",
  revoked: "Revoked",
};

/** Internal codes are not shown to an operator as-is; the reason is what matters. */
const BLOCKING_LABELS: Record<string, string> = {
  ELIGIBILITY_NOT_CONFIRMED: "Eligibility not confirmed",
  DISPOSAL_NOT_APPLICABLE: "Disposal does not apply",
  PRODUCT_RULED_INELIGIBLE: "Product ruled out",
  INSTRUCTION_NOT_APPROVED: "No approved instructions",
  INSTRUCTION_WITHDRAWN: "Instructions withdrawn",
  APPROVAL_NOT_AUTHORIZING: "Approval does not authorize disposal",
  EVIDENCE_NOT_SUBMITTED: "No photos yet",
  EVIDENCE_PENDING_REVIEW: "Photos awaiting review",
  EVIDENCE_NEEDS_RESUBMISSION: "Photos need resubmitting",
  DISPOSAL_ON_HOLD: "On hold",
  TASK_CLOSED: "Closed",
};

function shortId(id: string) {
  return id.slice(0, 8);
}

interface QueueState {
  rows: DisposalQueueRow[];
  error: string | null;
  loading: boolean;
}

/**
 * Pure read: returns the next state instead of setting it, so the effect below
 * never calls a setter synchronously and Refresh can reuse it.
 */
async function readQueue(): Promise<QueueState> {
  const result = await listDisposalTasks();
  return result.ok
    ? { rows: result.data.tasks, error: null, loading: false }
    : { rows: [], error: result.error.detail, loading: false };
}

export default function DisposalQueuePage() {
  const { can } = usePermissions();
  const [state, setState] = useState<QueueState>({
    rows: [],
    error: null,
    loading: true,
  });
  const [attempt, setAttempt] = useState(0);
  const [retentionDays, setRetentionDays] = useState<string>("48");
  const [retentionSaving, setRetentionSaving] = useState(false);
  const [retentionMsg, setRetentionMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void readQueue().then((next) => {
      if (!cancelled) setState(next);
    });
    void getDisposalRetention().then((res) => {
      if (!cancelled && res.ok) {
        setRetentionDays(
          res.data.retentionDays !== null ? String(res.data.retentionDays) : "",
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const saveRetention = async () => {
    setRetentionSaving(true);
    setRetentionMsg(null);
    const num =
      retentionDays.trim() === "" ? null : Number.parseInt(retentionDays, 10);
    const res = await updateDisposalRetention(num);
    setRetentionSaving(false);
    if (res.ok) {
      setRetentionMsg("Retention period updated successfully.");
      setTimeout(() => setRetentionMsg(null), 3000);
    } else {
      setRetentionMsg(res.error.detail);
    }
  };

  const { rows, error, loading: isLoading } = state;
  const load = () => setAttempt((previous) => previous + 1);

  if (!can("disposal.review")) {
    return (
      <div className="p-6">
        <p className="text-sm text-text-secondary">
          This queue requires the Compliance role.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">
            Disposal Review
          </h1>
          <p className="text-xs text-text-tertiary">
            Tasks where a consumer may be asked to dispose of a recalled
            product. Nothing is permitted until eligibility, an authorizing
            approval, accepted photos and no active hold all line up.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-2">
        <h2 className="text-sm font-semibold text-text-primary">
          Evidence Retention Period
        </h2>
        <p className="text-xs text-text-tertiary">
          Configure how many days uploaded photo evidence is retained after
          review. Leave blank for permanent retention.
        </p>
        <div className="flex items-center gap-3 pt-1">
          <input
            type="number"
            min="0"
            value={retentionDays}
            onChange={(e) => setRetentionDays(e.target.value)}
            placeholder="e.g. 48"
            className="h-8 w-32 rounded-md border border-slate-300 px-2.5 text-sm"
          />
          <span className="text-sm text-text-secondary">days</span>
          <Button
            size="sm"
            disabled={retentionSaving || !can("disposal.hold.manage")}
            onClick={() => void saveRetention()}
          >
            {retentionSaving ? "Saving…" : "Save retention"}
          </Button>
          {retentionMsg && (
            <span
              className={cn(
                "text-xs",
                retentionMsg.includes("success")
                  ? "text-emerald-600"
                  : "text-red-600",
              )}
            >
              {retentionMsg}
            </span>
          )}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 text-sm text-red-600"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {isLoading ? (
        <p role="status" className="text-sm text-text-secondary">
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <div className="flex items-center gap-2 rounded border border-dashed p-6 text-sm text-text-tertiary">
          <PackageX className="h-4 w-4" aria-hidden="true" />
          No disposal tasks. This is the expected state until a campaign has
          approved instructions that authorize consumer disposal.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th
                  scope="col"
                  className="h-10 px-4 font-semibold text-text-secondary"
                >
                  Task
                </th>
                <th
                  scope="col"
                  className="h-10 px-4 font-semibold text-text-secondary"
                >
                  Case
                </th>
                <th
                  scope="col"
                  className="h-10 px-4 font-semibold text-text-secondary"
                >
                  Eligibility
                </th>
                <th
                  scope="col"
                  className="h-10 px-4 font-semibold text-text-secondary"
                >
                  Instructions
                </th>
                <th
                  scope="col"
                  className="h-10 px-4 font-semibold text-text-secondary"
                >
                  Photos
                </th>
                <th
                  scope="col"
                  className="h-10 px-4 font-semibold text-text-secondary"
                >
                  Permission
                </th>
                <th
                  scope="col"
                  className="h-10 px-4 font-semibold text-text-secondary"
                >
                  Waiting on
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.taskId}
                  className="border-b hover:bg-surface-secondary"
                >
                  <td
                    className="px-4 py-3 font-mono text-xs text-text-tertiary"
                    title={row.taskId}
                  >
                    {shortId(row.taskId)}…
                  </td>
                  <td className="px-4 py-3">
                    {row.caseReference ? (
                      <Link
                        href={`/cases/${encodeURIComponent(row.caseReference)}`}
                        className="text-sm font-medium text-text-primary hover:text-brand-emerald hover:underline"
                      >
                        {row.caseReference}
                      </Link>
                    ) : (
                      <span className="text-text-tertiary">Not yet a case</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        ELIGIBILITY_STYLES[row.eligibilityStatus],
                      )}
                    >
                      {ELIGIBILITY_LABELS[row.eligibilityStatus]}
                    </span>
                    <span className="block text-[10px] text-text-tertiary mt-0.5">
                      {row.productCount} product
                      {row.productCount === 1 ? "" : "s"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {row.instructionVersionNumber === null
                      ? "—"
                      : `v${row.instructionVersionNumber}`}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {row.evidenceReviewStatus
                      ? EVIDENCE_LABELS[row.evidenceReviewStatus]
                      : "—"}
                    {row.holdActive && (
                      <span className="block text-[10px] font-semibold text-amber-700 mt-0.5">
                        evidence on hold
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {row.authorizationStatus
                      ? AUTHORIZATION_LABELS[row.authorizationStatus]
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.blockingReasons.length === 0 ? (
                        <span className="text-xs text-text-tertiary">
                          Nothing
                        </span>
                      ) : (
                        row.blockingReasons.map((reason) => (
                          <span
                            key={reason}
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700"
                          >
                            {BLOCKING_LABELS[reason] ?? reason}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
