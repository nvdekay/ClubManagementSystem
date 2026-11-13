import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppMoneyInput } from "@/components/ui/money-input/AppMoneyInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useConfirm } from "@/hooks/useConfirm";
import { useEventDefenseActions } from "@/hooks/useEventDefense";
import { useEventProposalAction } from "@/hooks/useEventProposalReviews";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { apiErrors } from "@/i18n/apiErrors";
import {
  EVENT_REVIEW_SECTIONS,
  type EventProposalDetail,
  type EventReviewOutcome,
  type EventReviewSection,
} from "@/services/eventProposalReviews";
import { cn } from "@/utils/cn";

function resolveDecisionError(error: Error | null | undefined, fallback: string): string {
  if (!error) return fallback;
  if (error.message === apiErrors.vi.unknown || error.message === apiErrors.en.unknown) {
    return fallback;
  }
  return error.message || fallback;
}

interface ProposalDecisionPanelProps {
  detail: EventProposalDetail;
  csrfToken: string;
  postDefense?: boolean;
  onSuccess?: () => void;
}

const ACTIVE_DEFENSE_STATES = new Set(["SCHEDULED", "CONFIRMED", "RESCHEDULE_REQUESTED", "IN_PROGRESS"]);

export function ProposalDecisionPanel({ detail, csrfToken, postDefense = false, onSuccess }: ProposalDecisionPanelProps) {
  const { t, i18n } = useTranslation();
  const askConfirm = useConfirm();
  const reviewAction = useEventProposalAction();
  const defenseAction = useEventDefenseActions();

  const { event, budget, versions, activeDefenseSession } = detail;
  const hasBlockingDefense = Boolean(activeDefenseSession && ACTIVE_DEFENSE_STATES.has(activeDefenseSession.state));
  const outcomes: EventReviewOutcome[] = postDefense
    ? ["Reject", "Approve", "Request revision", "Re-defense"]
    : ["Request revision", "Approve", "Reject"];

  const [outcome, setOutcome] = useState<EventReviewOutcome>(hasBlockingDefense ? "Request revision" : "Approve");
  const [reason, setReason] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [deadline, setDeadline] = useState("");
  const [sections, setSections] = useState<EventReviewSection[]>([]);
  const [conditions, setConditions] = useState("");
  const [amounts, setAmounts] = useState<Record<number, { amount?: string; reason?: string }>>({});

  const current = versions.find((version) => version.revisionNo === event.currentRevisionNo) ?? versions.at(-1);
  const lines = current?.budgetLines ?? [];
  const approvedAmounts = lines.map((line, index) => {
    const raw = amounts[index]?.amount;
    return raw === undefined ? budget?.lines[index]?.approvedAmount ?? line.amount : Number(raw);
  });

  const defenseCutoffMessage = (() => {
    if (outcome !== "Request revision" || !deadline) return null;
    const deadlineDate = new Date(deadline);
    if (deadlineDate <= new Date()) return t("eventReviews.deadlineRequired");
    if (hasBlockingDefense && activeDefenseSession) {
      const gapMs = new Date(activeDefenseSession.startAt).getTime() - deadlineDate.getTime();
      if (gapMs < 12 * 60 * 60 * 1000) {
        return t("eventDefense.revisionBeforeDefenseHint");
      }
    }
    return null;
  })();

  const field = useFieldValidation<string>({
    reason: outcome !== "Approve" && !reason.trim() ? t("eventReviews.reasonRequired") : null,
    sections: outcome === "Request revision" && !sections.length ? t("eventReviews.sectionsRequired") : null,
    deadline: outcome === "Request revision"
      ? (!deadline ? t("eventReviews.deadlineRequired") : defenseCutoffMessage)
      : null,
    ...Object.fromEntries(lines.flatMap((line, index) => {
      const value = approvedAmounts[index]!;
      const approve = outcome === "Approve";
      return [
        [`amount${index}`, approve && (!Number.isInteger(value) || value < 0 || value > line.amount) ? t("eventReviews.amountInvalid") : null],
        [`amountReason${index}`, approve && value < line.amount
          && !(amounts[index]?.reason?.trim() || budget?.lines[index]?.reason?.trim()) ? t("eventReviews.amountReasonRequired") : null],
      ];
    })),
  });

  function money(value: number) {
    return new Intl.NumberFormat(i18n.language, { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
  }

  function outcomeLabel(value: EventReviewOutcome) {
    switch (value) {
      case "Approve": return t("eventReviews.approve");
      case "Reject": return t("eventReviews.reject");
      case "Request revision": return t("eventReviews.requestRevision");
      case "Re-defense": return t("eventDefense.outcomeReDefense");
    }
  }

  function sectionLabel(value: string) {
    switch (value) {
      case "schedule": return t("eventReviews.sectionschedule");
      case "venue": return t("eventReviews.sectionvenue");
      case "content": return t("eventReviews.sectioncontent");
      case "risk": return t("eventReviews.sectionrisk");
      case "budget": return t("eventReviews.sectionbudget");
      default: return t("eventReviews.sectionother");
    }
  }

  function toggleSection(section: EventReviewSection) {
    setSections((prev) => (prev.includes(section) ? prev.filter((item) => item !== section) : [...prev, section]));
  }

  function editLine(index: number, change: { amount?: string; reason?: string }) {
    setAmounts((prev) => ({ ...prev, [index]: { ...prev[index], ...change } }));
  }

  const isPending = reviewAction.isPending || defenseAction.isPending;
  const mutationError = postDefense ? defenseAction.error : reviewAction.error;
  const isSuccess = postDefense
    ? defenseAction.isSuccess && defenseAction.variables?.kind === "decideAfter"
    : reviewAction.isSuccess && reviewAction.variables?.kind === "decide";

  const approvedTotal = approvedAmounts.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);

  async function submitDecision() {
    if (!field.touchAll()) return;
    const prompt = outcome === "Approve"
      ? t("eventReviews.confirmApprove")
      : outcome === "Reject"
        ? t("eventReviews.confirmReject")
        : outcome === "Re-defense"
          ? t("eventDefense.confirmReDefense")
          : t("eventReviews.confirmRevision");
    if (!(await askConfirm(prompt))) return;

    const input = {
      outcome,
      reason: reason.trim() || undefined,
      reviewNote: reviewNote.trim() || undefined,
      ...(outcome === "Request revision" ? { sections, revisionDeadlineAt: new Date(deadline).toISOString() } : {}),
      ...(outcome === "Approve" ? {
        conditions: conditions.split("\n").map((item) => item.trim()).filter(Boolean),
        budgetLines: approvedAmounts.map((approvedAmount, index) => ({
          approvedAmount,
          ...(approvedAmount < lines[index]!.amount
            ? { reason: amounts[index]?.reason?.trim() || budget?.lines[index]?.reason }
            : {}),
        })),
      } : {}),
    };

    try {
      if (postDefense) {
        defenseAction.reset();
        await defenseAction.mutateAsync({ kind: "decideAfter", eventId: event.id, input, csrfToken });
      } else {
        reviewAction.reset();
        await reviewAction.mutateAsync({ kind: "decide", id: event.id, csrfToken, input });
      }
      onSuccess?.();
    } catch (error) {
      console.error("[ProposalDecisionPanel] submit decision failed:", error);
    }
  }

  return (
    <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
      <h2 className="font-heading text-base font-semibold">
        {postDefense ? t("eventDefense.postDecisionTitle") : t("eventReviews.decisionPanel")}
      </h2>
      <p className="mt-1 text-sm text-muted-app">
        {postDefense ? t("eventDefense.postDecisionHint") : t("eventReviews.decisionHint")}
      </p>

      {hasBlockingDefense && !postDefense && (
        <div className="mt-4">
          <AppNotice tone="warning">{t("eventDefense.confirmDecisionLockedNotice")}</AppNotice>
        </div>
      )}

      <div className={cn("mt-5 grid gap-1 rounded-lg border border-border-app bg-surface-app p-1", {
        "grid-cols-2 sm:grid-cols-4": outcomes.length === 4,
        "grid-cols-3": outcomes.length === 3,
      })}>
        {outcomes.map((value) => {
          const disabledByDefense = !postDefense && hasBlockingDefense && value !== "Request revision";
          return (
            <button
              key={value}
              type="button"
              disabled={disabledByDefense}
              aria-pressed={outcome === value}
              onClick={() => { setOutcome(value); reviewAction.reset(); defenseAction.reset(); }}
              className={cn(
                "min-h-11 rounded-md px-2 py-1.5 text-xs font-medium text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app disabled:opacity-40 sm:min-h-9",
                { "bg-segment-app text-text-app shadow-xs": outcome === value },
              )}
            >
              {outcomeLabel(value)}
            </button>
          );
        })}
      </div>

      {outcome === "Request revision" && (
        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-text-app">
            {t("eventReviews.sections")}<AppRequiredMark />
          </legend>
          <div className="mt-3 space-y-1">
            {EVENT_REVIEW_SECTIONS.map((section) => (
              <label key={section} className="flex min-h-10 items-center gap-3 rounded-lg px-2 text-sm hover:bg-surface-app">
                <input
                  type="checkbox"
                  checked={sections.includes(section)}
                  onChange={() => { toggleSection(section); field.touch("sections"); }}
                  className="size-4 accent-primary-app"
                />
                {sectionLabel(section)}
              </label>
            ))}
          </div>
          <AppFieldError message={field.error("sections")} />
          <label className="mt-4 block text-sm font-medium text-text-app">
            {t("eventReviews.deadline")}<AppRequiredMark />
            <AppInput
              type="datetime-local"
              value={deadline}
              {...field.control("deadline")}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1.5 block w-full font-normal"
            />
            <AppFieldError message={field.error("deadline")} />
          </label>
          {hasBlockingDefense && (
            <p className="mt-2 text-xs text-muted-app">{t("eventDefense.revisionBeforeDefenseHint")}</p>
          )}
        </fieldset>
      )}

      {outcome === "Approve" && lines.length > 0 && (
        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-text-app">{t("eventReviews.approveAmounts")}</legend>
          <p className="mt-1 text-xs text-muted-app">{t("eventReviews.approveAmountsHint")}</p>
          <div className="mt-3 space-y-4">
            {lines.map((line, index) => {
              const lowered = approvedAmounts[index]! < line.amount;
              return (
                <div key={index}>
                  <label className="block text-sm font-medium text-text-app">
                    <span className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium break-words">{line.category}</span>
                      <span className="text-xs text-muted-app">
                        {t("eventReviews.requestedAmount")}: {money(line.amount)}
                      </span>
                    </span>
                    <AppMoneyInput
                      value={amounts[index]?.amount ?? String(budget?.lines[index]?.approvedAmount ?? line.amount)}
                      {...field.control(`amount${index}`)}
                      onValueChange={(digits) => editLine(index, { amount: digits })}
                      className="mt-1.5 w-full tabular-nums"
                    />
                    <AppFieldError message={field.error(`amount${index}`)} />
                  </label>
                  {lowered && (
                    <>
                      <AppInput
                        aria-label={t("eventReviews.reductionReason")}
                        placeholder={t("eventReviews.reductionReason")}
                        value={amounts[index]?.reason ?? budget?.lines[index]?.reason ?? ""}
                        maxLength={500}
                        {...field.control(`amountReason${index}`)}
                        onChange={(e) => editLine(index, { reason: e.target.value })}
                        className="mt-2 w-full"
                      />
                      <AppFieldError message={field.error(`amountReason${index}`)} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-sm font-semibold">{t("eventReviews.approvedTotal", { amount: money(approvedTotal) })}</p>
        </fieldset>
      )}

      {outcome === "Approve" && (
        <label className="mt-4 block text-sm font-medium text-text-app">
          {t("eventReviews.conditions")}
          <AppTextarea
            className="mt-1.5 min-h-24 w-full font-normal"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            placeholder={t("eventReviews.conditionsHint")}
          />
        </label>
      )}

      <label className="mt-4 block text-sm font-medium text-text-app">
        {t("eventReviews.reason")}{outcome !== "Approve" && <AppRequiredMark />}
        <AppTextarea
          className="mt-1.5 min-h-24 w-full font-normal"
          value={reason}
          maxLength={5000}
          {...field.control("reason", outcome !== "Approve")}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("eventReviews.reasonHint")}
        />
        <AppFieldError message={field.error("reason")} />
      </label>

      <label className="mt-4 block text-sm font-medium text-text-app">
        {t("eventReviews.reviewNote")}
        <AppTextarea
          className="mt-1.5 min-h-24 w-full font-normal"
          value={reviewNote}
          maxLength={10000}
          onChange={(e) => setReviewNote(e.target.value)}
          placeholder={t("eventReviews.reviewNoteHint")}
        />
      </label>

      <AppButton className="mt-6 w-full" disabled={isPending} onClick={() => void submitDecision()}>
        {isPending ? t("eventReviews.submitting") : t("eventReviews.submit")}
      </AppButton>

      {mutationError && (
        <p role="alert" className="mt-3 text-sm text-danger-app">
          {resolveDecisionError(mutationError, t("eventReviews.actionError"))}
        </p>
      )}
      {isSuccess && <div className="mt-3"><AppNotice role="status">{t("eventReviews.success")}</AppNotice></div>}
    </section>
  );
}
