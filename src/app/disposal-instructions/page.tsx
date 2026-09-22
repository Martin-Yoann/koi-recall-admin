"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createDisposalInstruction,
  listDisposalInstructions,
  publishDisposalInstruction,
  recordDisposalInstructionApproval,
  withdrawDisposalInstruction,
  type DisposalInstructionSummary,
} from "@/lib/api-client";
import { usePermissions } from "@/lib/rbac";
import { cn } from "@/lib/utils";

/**
 * Disposal instruction content library.
 *
 * The one thing this screen must not blur is what an approval *authorizes*. A
 * Notice of Violation, a laboratory report, a Form 332 inventory procedure or a
 * CBP seizure record can each be recorded — the history matters — but none of them
 * can authorize telling a consumer to destroy the product. That rule is enforced
 * by a database constraint, so the material is described here in those terms and
 * the server's computed answer is shown after every recording, rather than left to
 * an operator's assumption that "approved" means "we may ask the consumer to act".
 */

type MaterialType =
  | "recall_expectation_letter"
  | "cap_or_written_coordination"
  | "nov"
  | "laboratory_report"
  | "form_332_inventory_procedure"
  | "cbp_seizure_record"
  | "other";

const MATERIAL_LABELS: Record<MaterialType, string> = {
  recall_expectation_letter: "Recall Expectation Letter",
  cap_or_written_coordination: "CAP or written coordination",
  nov: "Notice of Violation",
  laboratory_report: "Laboratory report",
  form_332_inventory_procedure: "Form 332 (enterprise inventory)",
  cbp_seizure_record: "CBP seizure record",
  other: "Other",
};

/** Materials that can authorize consumer disposal, with the scope and measure they require. */
const AUTHORIZING_MATERIALS = [
  "recall_expectation_letter",
  "cap_or_written_coordination",
] as const;

const SCOPE_LABELS: Record<string, string> = {
  consumer_held_product: "Consumer-held product",
  enterprise_inventory: "Enterprise inventory",
  port_involved_goods: "Port-involved goods",
  not_determined: "Not determined",
};

const MEASURE_LABELS: Record<string, string> = {
  consumer_disposal: "Consumer disposal",
  consumer_return: "Consumer return",
  professional_recycling: "Professional recycling",
  other_compensation: "Other compensation",
  not_determined: "Not determined",
};

type Scope =
  | "consumer_held_product"
  | "enterprise_inventory"
  | "port_involved_goods"
  | "not_determined";
type Measure =
  | "consumer_disposal"
  | "consumer_return"
  | "professional_recycling"
  | "other_compensation"
  | "not_determined";

const STATUS_STYLES: Record<DisposalInstructionSummary["status"], string> = {
  draft: "bg-slate-100 text-slate-700",
  approved: "bg-emerald-50 text-emerald-700",
  withdrawn: "bg-red-50 text-red-700",
};

/** Lines typed one per row, so a list field stays a list and not a paragraph. */
function toLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default function DisposalInstructionsPage() {
  const { can } = usePermissions();
  const mayPublish = can("disposal.instructions.publish");

  const [versions, setVersions] = useState<DisposalInstructionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Create-draft form
  const [campaignVersionId, setCampaignVersionId] = useState("");
  const [title, setTitle] = useState("");
  const [steps, setSteps] = useState("");
  const [warnings, setWarnings] = useState("");
  const [requirements, setRequirements] = useState("");
  const [declarationTextVersion, setDeclarationTextVersion] = useState("");

  // Approval form, keyed by the version it targets
  const [approvalFor, setApprovalFor] = useState<string | null>(null);
  const [materialType, setMaterialType] = useState<MaterialType>(
    "recall_expectation_letter",
  );
  const [scope, setScope] = useState<Scope>("consumer_held_product");
  const [measure, setMeasure] = useState<Measure>("consumer_disposal");
  const [referenceText, setReferenceText] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");

  const refresh = () => setAttempt((previous) => previous + 1);

  useEffect(() => {
    let cancelled = false;
    void listDisposalInstructions().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setVersions(result.data.versions);
        setError(null);
      } else {
        setError(result.error.detail);
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const run = async <T,>(
    work: Promise<
      { ok: true; data: T } | { ok: false; error: { detail: string } }
    >,
    onOk?: (data: T) => string,
  ) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await work;
    setBusy(false);
    if (!result.ok) {
      setError(result.error.detail);
      return;
    }
    setNotice(onOk ? onOk(result.data) : "Done.");
    refresh();
  };

  if (!mayPublish) {
    return (
      <div className="p-6">
        <p className="text-sm text-text-secondary">
          This library requires the Compliance role.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">
            Disposal Instructions
          </h1>
          <p className="text-xs text-text-tertiary">
            Approved content a consumer follows. A correction is a new version:
            an approved version is never edited in place.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={busy}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Refresh
        </Button>
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
      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-emerald-700"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {notice}
        </p>
      )}

      {isLoading ? (
        <p role="status" className="text-sm text-text-secondary">
          Loading…
        </p>
      ) : versions.length === 0 ? (
        <p className="rounded border border-dashed p-6 text-sm text-text-tertiary">
          No instruction versions yet. Nothing can be enabled until one is
          approved and backed by material that authorizes consumer disposal.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th
                  scope="col"
                  className="h-10 px-4 font-semibold text-text-secondary"
                >
                  Version
                </th>
                <th
                  scope="col"
                  className="h-10 px-4 font-semibold text-text-secondary"
                >
                  Title
                </th>
                <th
                  scope="col"
                  className="h-10 px-4 font-semibold text-text-secondary"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="h-10 px-4 font-semibold text-text-secondary"
                >
                  Authorizes disposal
                </th>
                <th
                  scope="col"
                  className="h-10 px-4 font-semibold text-text-secondary"
                >
                  Approvals
                </th>
                <th
                  scope="col"
                  className="h-10 px-4 font-semibold text-text-secondary"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {versions.map((version) => (
                <tr
                  key={version.id}
                  className="border-b align-top hover:bg-surface-secondary"
                >
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    v{version.versionNumber} · {version.locale}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-primary">
                    {version.title}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        STATUS_STYLES[version.status],
                      )}
                    >
                      {version.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {version.authorizesConsumerDisposal ? (
                      <span className="font-semibold text-emerald-700">
                        Yes
                      </span>
                    ) : (
                      <span className="font-semibold text-amber-700">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {version.approvalCount}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {version.status === "draft" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => {
                              setApprovalFor(version.id);
                              setNotice(null);
                              setError(null);
                            }}
                          >
                            Record material
                          </Button>
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              void run(
                                publishDisposalInstruction(
                                  version.id,
                                ) as Promise<
                                  | { ok: true; data: null }
                                  | { ok: false; error: { detail: string } }
                                >,
                                () =>
                                  `Version ${version.versionNumber} published.${version.authorizesConsumerDisposal ? "" : " Note: it does not yet authorize consumer disposal, so no task will open."}`,
                              )
                            }
                          >
                            Publish
                          </Button>
                        </>
                      )}
                      {version.status === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => {
                            setApprovalFor(version.id);
                            setNotice(null);
                            setError(null);
                          }}
                        >
                          Request withdrawal
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Record approval material ── */}
      {approvalFor && (
        <div className="space-y-3 rounded border border-dashed p-4">
          <p className="text-sm font-semibold text-text-primary">
            Record approval material
          </p>
          <p className="text-xs text-text-tertiary">
            Only a Recall Expectation Letter or written coordination, scoped to
            the consumer-held product and selecting consumer disposal,
            authorizes telling a consumer to destroy the product. Anything else
            is recorded as history and cannot be stored as a permission — the
            database refuses it.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Material</Label>
              <select
                value={materialType}
                onChange={(e) =>
                  setMaterialType(e.target.value as MaterialType)
                }
                className="w-full rounded border px-2 py-1.5 text-xs"
              >
                {Object.entries(MATERIAL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-text-tertiary">
                {AUTHORIZING_MATERIALS.includes(materialType as never)
                  ? "Can authorize consumer disposal, if scope and measure agree."
                  : "Cannot authorize consumer disposal, whatever else is chosen."}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Scope</Label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as Scope)}
                className="w-full rounded border px-2 py-1.5 text-xs"
              >
                {Object.entries(SCOPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Measure</Label>
              <select
                value={measure}
                onChange={(e) => setMeasure(e.target.value as Measure)}
                className="w-full rounded border px-2 py-1.5 text-xs"
              >
                {Object.entries(MEASURE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Reference</Label>
            <Input
              value={referenceText}
              onChange={(e) => setReferenceText(e.target.value)}
              placeholder="Letter or CAP reference"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void run(
                  recordDisposalInstructionApproval(approvalFor, {
                    materialType,
                    scope,
                    measure,
                    ...(referenceText.trim()
                      ? { referenceText: referenceText.trim() }
                      : {}),
                  }) as Promise<
                    | {
                        ok: true;
                        data: {
                          approvalId: string;
                          authorizesConsumerDisposal: boolean;
                        };
                      }
                    | { ok: false; error: { detail: string } }
                  >,
                  (data) =>
                    data.authorizesConsumerDisposal
                      ? "Recorded. This material authorizes consumer disposal."
                      : "Recorded as history. It does not authorize consumer disposal, so no task will open.",
                )
              }
            >
              {busy ? "Recording…" : "Record this material"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setApprovalFor(null)}
            >
              Close
            </Button>
          </div>

          {/* Withdrawal runs against the version the operator opened. */}
          <div className="space-y-1.5 border-t pt-3">
            <Label className="text-xs font-medium">
              Or withdraw this version
            </Label>
            <p className="text-[11px] text-text-tertiary">
              Withdrawing suspends every live permission resting on this
              version. It does not erase what already happened.
            </p>
            <Textarea
              rows={2}
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              placeholder="Why (at least 10 characters)"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={busy || withdrawReason.trim().length < 10}
              onClick={() =>
                void run(
                  withdrawDisposalInstruction(
                    approvalFor,
                    withdrawReason.trim(),
                  ) as Promise<
                    | { ok: true; data: { suspendedAuthorizations: number } }
                    | { ok: false; error: { detail: string } }
                  >,
                  (data) =>
                    `Withdrawn. ${data.suspendedAuthorizations} live permission(s) suspended.`,
                )
              }
            >
              Withdraw version
            </Button>
          </div>
        </div>
      )}

      {/* ── Create a draft version ── */}
      <div className="space-y-3 rounded border p-4">
        <p className="text-sm font-semibold text-text-primary">
          Create a draft version
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Campaign version ID</Label>
            <Input
              value={campaignVersionId}
              onChange={(e) => setCampaignVersionId(e.target.value)}
              placeholder="UUID of the published campaign version"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Declaration text version
            </Label>
            <Input
              value={declarationTextVersion}
              onChange={(e) => setDeclarationTextVersion(e.target.value)}
              placeholder="e.g. disposal-statement-v1"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Steps (one per line)</Label>
          <Textarea
            rows={3}
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Safety warnings (one per line)
          </Label>
          <Textarea
            rows={2}
            value={warnings}
            onChange={(e) => setWarnings(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            What the photos must show (one per line)
          </Label>
          <Textarea
            rows={2}
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          disabled={
            busy ||
            campaignVersionId.trim().length === 0 ||
            title.trim().length === 0 ||
            declarationTextVersion.trim().length === 0 ||
            toLines(steps).length === 0 ||
            toLines(warnings).length === 0
          }
          onClick={() =>
            void run(
              createDisposalInstruction({
                campaignVersionId: campaignVersionId.trim(),
                locale: "en-US",
                title: title.trim(),
                steps: toLines(steps).map((text, index) => ({
                  order: index + 1,
                  text,
                })),
                referenceImages: [],
                safetyWarnings: toLines(warnings),
                recognitionRequirements: toLines(requirements),
                declarationTextVersion: declarationTextVersion.trim(),
              }) as Promise<
                | {
                    ok: true;
                    data: {
                      instructionVersionId: string;
                      versionNumber: number;
                    };
                  }
                | { ok: false; error: { detail: string } }
              >,
              (data) =>
                `Draft version ${data.versionNumber} created. Record its approval material before publishing.`,
            )
          }
        >
          {busy ? "Creating…" : "Create draft"}
        </Button>
        <p className="text-[11px] text-text-tertiary">
          Publishing does not require an authorizing approval, on purpose: a
          version backed only by a Notice of Violation is a real and visible
          state — the content exists and nothing is enabled.
        </p>
      </div>
    </div>
  );
}
