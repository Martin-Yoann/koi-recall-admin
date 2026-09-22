"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, PackageX, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmDisposalEligibility,
  confirmDisposalProduct,
  getDisposalTaskForAdmin,
  getDocumentAccessUrl,
  reviewDisposalBatch,
  type DisposalLatestBatch,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/rbac";
import { cn } from "@/lib/utils";

/**
 * Product and eligibility decisions for one disposal task, shown inside the case
 * it belongs to.
 *
 * Self-contained on purpose: the case detail page is already very long, and the
 * first attempt at wiring this into it put an effect above the case variable's
 * declaration. A component that owns its own state cannot repeat that, and one
 * line on the case page is a change small enough to read.
 *
 * Both decisions are structural, not cosmetic:
 *  - a product is only treated as confirmed when a person says so, because a
 *    potential match must never be promoted by inference;
 *  - eligibility confirmation requires a note, and is sent with the version the
 *    page was rendered from, so a stale tab cannot decide an old state.
 */

interface DisposalTaskShape {
  id: string;
  status: string;
  eligibilityStatus:
    | "pending_confirmation"
    | "confirmed_eligible"
    | "not_applicable"
    | "ineligible";
  version: number;
  instructionVersionNumber: number | null;
  latestBatchReviewStatus:
    "pending" | "accepted" | "needs_resubmission" | "superseded" | null;
  authorizationStatus: "active" | "suspended" | "revoked" | null;
  holdActive: boolean;
}

interface DisposalProductShape {
  campaignProductId: string;
  quantity: number;
  confirmedAffected: boolean;
}

interface DisposalDetailShape {
  task: DisposalTaskShape;
  products: DisposalProductShape[];
  allowedActions: string[];
  blockingReasons: string[];
}

interface Props {
  disposalTaskId: string;
  caseReference: string;
}

const ELIGIBILITY_LABELS: Record<
  DisposalTaskShape["eligibilityStatus"],
  string
> = {
  pending_confirmation: "Awaiting confirmation",
  confirmed_eligible: "Confirmed affected",
  not_applicable: "No disposal needed",
  ineligible: "Not part of the recall",
};

const ELIGIBILITY_STYLES: Record<
  DisposalTaskShape["eligibilityStatus"],
  string
> = {
  pending_confirmation: "bg-amber-50 text-amber-700",
  confirmed_eligible: "bg-emerald-50 text-emerald-700",
  not_applicable: "bg-slate-100 text-slate-700",
  ineligible: "bg-slate-100 text-slate-700",
};

/** Internal codes are not shown to an operator as-is. */
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

const ELIGIBILITY_CHOICES = [
  { value: "confirmed_eligible" as const, label: "Confirmed affected" },
  {
    value: "not_applicable" as const,
    label: "No disposal needed for this recall",
  },
  { value: "ineligible" as const, label: "Not part of the recall" },
];

export function DisposalTaskPanel({ disposalTaskId, caseReference }: Props) {
  const { can } = usePermissions();
  const [detail, setDetail] = useState<DisposalDetailShape | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [note, setNote] = useState("");
  const [batch, setBatch] = useState<DisposalLatestBatch | null>(null);
  const [decision, setDecision] = useState<"accepted" | "needs_resubmission">(
    "accepted",
  );
  const [reasonCode, setReasonCode] = useState("recognition_unclear");
  const [rationale, setRationale] = useState("");
  const [choice, setChoice] =
    useState<(typeof ELIGIBILITY_CHOICES)[number]["value"]>(
      "confirmed_eligible",
    );

  const mayReview = can("disposal.review");

  useEffect(() => {
    let cancelled = false;
    void getDisposalTaskForAdmin(disposalTaskId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setDetail(result.data as unknown as DisposalDetailShape);
        setBatch(
          (
            result.data as unknown as {
              latestBatch?: DisposalLatestBatch | null;
            }
          ).latestBatch ?? null,
        );
        setLoadError(null);
      } else {
        setLoadError(result.error.detail);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [disposalTaskId, attempt]);

  const refresh = () => setAttempt((previous) => previous + 1);

  const onConfirmProduct = async (product: DisposalProductShape) => {
    setBusy(true);
    setActionError(null);
    const result = await confirmDisposalProduct(
      disposalTaskId,
      product.campaignProductId,
      product.quantity,
    );
    setBusy(false);
    if (!result.ok) {
      setActionError(result.error.detail);
      return;
    }
    refresh();
  };

  const onSubmitEligibility = async () => {
    if (!detail) return;
    setBusy(true);
    setActionError(null);
    const result = await confirmDisposalEligibility(disposalTaskId, {
      eligibilityStatus: choice,
      note: note.trim(),
      expectedVersion: detail.task.version,
    });
    setBusy(false);
    if (!result.ok) {
      setActionError(result.error.detail);
      return;
    }
    setNote("");
    refresh();
  };

  const onSubmitReview = async () => {
    if (!batch) return;
    setBusy(true);
    setActionError(null);
    const result = await reviewDisposalBatch(batch.id, {
      decision,
      rationale: rationale.trim(),
      ...(decision === "needs_resubmission"
        ? { reasonCode: reasonCode as never }
        : {}),
    });
    setBusy(false);
    if (!result.ok) {
      setActionError(result.error.detail);
      return;
    }
    setRationale("");
    refresh();
  };

  const onOpenDocument = async (documentId: string) => {
    setActionError(null);
    const result = await getDocumentAccessUrl(caseReference, documentId);
    if (!result.ok) {
      setActionError(result.error.detail);
      return;
    }
    const url =
      (result.data as { downloadUrl?: string; url?: string }).downloadUrl ??
      (result.data as { url?: string }).url;
    if (url) window.open(url, "_blank", "noopener");
  };

  if (loadError) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
        {loadError}
      </div>
    );
  }

  if (!detail) {
    return <p className="text-xs text-text-tertiary">Loading disposal task…</p>;
  }

  const { task, products, blockingReasons } = detail;
  const unconfirmed = products.filter(
    (product) => product.confirmedAffected === false,
  );

  return (
    <div className="space-y-4 rounded-xl border border-violet-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-text-primary">
            Product disposal
          </p>
          <p className="text-xs text-text-tertiary">
            Applies to {caseReference}. Nothing is permitted until eligibility,
            an authorizing approval, accepted photos and no active hold all line
            up.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={busy}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-surface-secondary/60 p-3">
          <p className="text-text-tertiary">Eligibility</p>
          <span
            className={cn(
              "mt-1 inline-block rounded-full px-2 py-0.5 font-semibold",
              ELIGIBILITY_STYLES[task.eligibilityStatus],
            )}
          >
            {ELIGIBILITY_LABELS[task.eligibilityStatus]}
          </span>
        </div>
        <div className="rounded-lg bg-surface-secondary/60 p-3">
          <p className="text-text-tertiary">Instructions</p>
          <p className="mt-1 font-semibold text-text-primary">
            {task.instructionVersionNumber === null
              ? "—"
              : `v${task.instructionVersionNumber}`}
          </p>
        </div>
        <div className="rounded-lg bg-surface-secondary/60 p-3">
          <p className="text-text-tertiary">Photos</p>
          <p className="mt-1 font-semibold text-text-primary capitalize">
            {task.latestBatchReviewStatus?.replace(/_/g, " ") ?? "—"}
          </p>
        </div>
        <div className="rounded-lg bg-surface-secondary/60 p-3">
          <p className="text-text-tertiary">Permission</p>
          <p className="mt-1 font-semibold text-text-primary capitalize">
            {task.authorizationStatus ?? "—"}
          </p>
          {task.holdActive && (
            <p className="mt-0.5 text-[10px] font-semibold text-amber-700">
              evidence on hold
            </p>
          )}
        </div>
      </div>

      {blockingReasons.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {blockingReasons.map((reason) => (
            <span
              key={reason}
              className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
            >
              {BLOCKING_LABELS[reason] ?? reason}
            </span>
          ))}
        </div>
      )}

      {/* ── A6-2: which products this task covers ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-text-primary">Products</p>
        <ul className="space-y-2">
          {products.map((product) => (
            <li
              key={product.campaignProductId}
              className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 text-xs"
            >
              <span
                className="font-mono text-text-tertiary"
                title={product.campaignProductId}
              >
                {product.campaignProductId.slice(0, 8)}…
              </span>
              <span className="text-text-secondary">
                Qty {product.quantity}
              </span>
              {product.confirmedAffected ? (
                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Confirmed affected
                </span>
              ) : mayReview ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void onConfirmProduct(product)}
                >
                  Confirm affected
                </Button>
              ) : (
                <span className="text-text-tertiary">Not confirmed</span>
              )}
            </li>
          ))}
          {products.length === 0 && (
            <li className="flex items-center gap-2 text-xs text-text-tertiary">
              <PackageX className="h-3.5 w-3.5" aria-hidden="true" />
              No products are attached to this task.
            </li>
          )}
        </ul>
        <p className="text-[11px] text-text-tertiary">
          A potential match is never treated as confirmed. Each product is
          recorded only when a person says so.
        </p>
      </div>

      {/* ── A6-4: the photo review ── */}
      {batch && (
        <div className="space-y-3 rounded border border-dashed p-3">
          <p className="text-xs font-semibold text-text-primary">
            Evidence batch {batch.batchNumber} ·{" "}
            {batch.reviewStatus.replace(/_/g, " ")}
          </p>
          <ul className="space-y-1.5">
            {batch.documents.map((document) => (
              <li
                key={document.documentId}
                className="flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <span className="text-text-primary">{document.fileName}</span>
                <span className="text-text-tertiary capitalize">
                  {document.status.replace(/_/g, " ")}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void onOpenDocument(document.documentId)}
                >
                  View photo
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-text-tertiary">
            Technical status only. A photo passing our checks is not the same as
            it showing what the instructions ask for — that is this decision.
          </p>

          {mayReview && batch.reviewStatus === "pending" && (
            <div className="space-y-2.5">
              <fieldset className="space-y-1.5">
                <legend className="sr-only">Review decision</legend>
                <label className="flex items-center gap-2 text-xs text-text-primary">
                  <input
                    type="radio"
                    name={`disposal-review-${batch.id}`}
                    checked={decision === "accepted"}
                    onChange={() => setDecision("accepted")}
                  />
                  Accept these photos
                </label>
                <label className="flex items-center gap-2 text-xs text-text-primary">
                  <input
                    type="radio"
                    name={`disposal-review-${batch.id}`}
                    checked={decision === "needs_resubmission"}
                    onChange={() => setDecision("needs_resubmission")}
                  />
                  Ask for different photos
                </label>
              </fieldset>

              {decision === "needs_resubmission" && (
                <div className="space-y-1.5">
                  <Label
                    htmlFor={`disposal-reason-${batch.id}`}
                    className="text-xs font-medium"
                  >
                    Reason (the consumer is shown this)
                  </Label>
                  <select
                    id={`disposal-reason-${batch.id}`}
                    value={reasonCode}
                    onChange={(event) => setReasonCode(event.target.value)}
                    className="w-full rounded border px-2 py-1.5 text-xs"
                  >
                    <option value="recognition_unclear">
                      The product is not identifiable
                    </option>
                    <option value="coverage_insufficient">
                      Not enough of the product is shown
                    </option>
                    <option value="photo_unreadable">
                      The photo is unreadable
                    </option>
                    <option value="wrong_product">
                      This looks like a different product
                    </option>
                    <option value="safety_step_not_visible">
                      A required step is not visible
                    </option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label
                  htmlFor={`disposal-rationale-${batch.id}`}
                  className="text-xs font-medium"
                >
                  Rationale (at least 10 characters, recorded in the audit
                  trail)
                </Label>
                <Textarea
                  id={`disposal-rationale-${batch.id}`}
                  rows={2}
                  value={rationale}
                  onChange={(event) => setRationale(event.target.value)}
                />
              </div>
              <Button
                size="sm"
                disabled={busy || rationale.trim().length < 10}
                onClick={() => void onSubmitReview()}
              >
                {busy ? "Recording…" : "Record review"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── A6-3: the eligibility decision ── */}
      {mayReview && (
        <div className="space-y-3 rounded border border-dashed p-3">
          <p className="text-xs font-semibold text-text-primary">
            Eligibility decision
          </p>
          {unconfirmed.length > 0 && (
            <p className="text-[11px] text-amber-700">
              Confirm at least one product above before this task can be
              eligible.
            </p>
          )}
          <fieldset className="space-y-1.5">
            <legend className="sr-only">Eligibility</legend>
            {ELIGIBILITY_CHOICES.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 text-xs text-text-primary"
              >
                <input
                  type="radio"
                  name={`disposal-eligibility-${disposalTaskId}`}
                  value={option.value}
                  checked={choice === option.value}
                  onChange={() => setChoice(option.value)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>
          <div className="space-y-1.5">
            <Label
              htmlFor={`disposal-note-${disposalTaskId}`}
              className="text-xs font-medium"
            >
              Note (at least 10 characters)
            </Label>
            <Textarea
              id={`disposal-note-${disposalTaskId}`}
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What did you check, and against what?"
            />
          </div>
          <Button
            size="sm"
            disabled={busy || note.trim().length < 10}
            onClick={() => void onSubmitEligibility()}
          >
            {busy ? "Recording…" : "Record decision"}
          </Button>
        </div>
      )}

      {actionError && (
        <p
          role="alert"
          className="flex items-center gap-2 text-xs text-red-600"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {actionError}
        </p>
      )}
    </div>
  );
}
