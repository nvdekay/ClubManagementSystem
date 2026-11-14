import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { SponsoredItems } from "./SponsoredItems";
import { formatMoney } from "@/utils/formatMoney";
import { formatDay } from "@/utils/formatDate";
import { useOpenViolation } from "@/hooks/useViolations";
import type { accountability } from "@/i18n/accountability";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppMoneyInput } from "@/components/ui/money-input/AppMoneyInput";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppPagination } from "@/components/ui/pagination/AppPagination";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import {
  useAccountabilityAction,
  useClubFinances,
  useFinanceDetail,
} from "@/hooks/useAccountability";
import type {
  AccountabilityContext,
  Expense,
  FinanceDetail,
  FinancialEvidence,
} from "@/services/accountability";
import { useConfirm } from "@/hooks/useConfirm";

function stateKey(state: string): keyof typeof accountability.en {
  return (
    (
      {
        Approved: "approved",
        Disbursed: "disbursed",
        "Settlement Submitted": "settlementSubmitted",
        "Reconciliation Pending": "reconciliationPending",
        Reconciled: "reconciled",
        "Recovery Pending": "recoveryPending",
        Closed: "closed",
        Cancelled: "cancelled",
      } as Record<string, keyof typeof accountability.en>
    )[state] ?? "state"
  );
}
function historyKey(action: string): keyof typeof accountability.en {
  const suffix = action.replace(/^SETTLEMENT_/, "");
  return (
    (
      {
        SUBMIT: "submitted",
        RETURN: "returned",
        FINALIZE: "finalize",
        EXPENSE: "expenseRecorded",
        EVIDENCE: "evidenceAdded",
        CLAIM: "reviewClaimed",
      } as Record<string, keyof typeof accountability.en>
    )[suffix] ?? "details"
  );
}
function FinanceEditor({
  data,
  context,
  token,
  actorId,
}: {
  data: FinanceDetail;
  context: AccountabilityContext;
  token: string;
  actorId: string;
}) {
  const { t, i18n } = useTranslation();
  const askConfirm = useConfirm();
  // The dialogs' submit buttons live in the pinned footer, outside their <form>, and point back with form={id}.
  const expenseFormId = useId();
  const evidenceFormId = useId();
  const admin = context.kind === "admin";
  const openViolation = useOpenViolation();
  const [findingId, setFindingId] = useState("");
  const [severity, setSeverity] = useState<"MINOR" | "MODERATE" | "SERIOUS">(
    "MINOR",
  );
  const mutation = useAccountabilityAction(context, "finance", data.id);
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [evidenceFor, setEvidenceFor] = useState("");
  const [link, setLink] = useState("");
  const [evidenceType, setEvidenceType] =
    useState<FinancialEvidence["type"]>("INVOICE");
  const [reason, setReason] = useState("");
  const [reviews, setReviews] = useState<
    Record<string, { outcome: "Accepted" | "Rejected"; reason: string }>
  >({});
  const [page, setPage] = useState(0);
  const today = new Date().toISOString().slice(0, 10);
  const expenseField = useFieldValidation({
    category: category.trim() ? null : t("common.fieldRequired"),
    amount: !amount.trim()
      ? t("common.fieldRequired")
      : !Number.isSafeInteger(Number(amount))
        ? t("common.invalidNumber")
        : Number(amount) < 1
          ? t("common.numberMin", { min: 1 })
          : null,
    date: !date
      ? t("common.fieldRequired")
      : date > today
        ? t("accountability.dateNotFuture")
        : null,
  });
  // The server accepts HTTPS evidence links only.
  const evidenceField = useFieldValidation({
    link: !link.trim()
      ? t("common.fieldRequired")
      : !URL.canParse(link) || new URL(link).protocol !== "https:"
        ? t("accountability.httpsRequired")
        : null,
  });
  const reasonField = useFieldValidation({
    reason: reason.trim() ? null : t("common.fieldRequired"),
  });
  const reviewField = useFieldValidation(
    Object.fromEntries(
      data.expenses.map((expense) => [
        expense.id,
        reviews[expense.id]?.reason.trim() ? null : t("common.fieldRequired"),
      ]),
    ),
  );
  const editable =
    !admin && ["Disbursed", "Reconciliation Pending"].includes(data.state);
  const overdue =
    admin &&
    ["Disbursed", "Reconciliation Pending"].includes(data.state) &&
    !!data.settlementDueAt &&
    new Date(data.settlementDueAt) < new Date();
  const claimed = data.task?.assigneeId === actorId;
  const reviewable =
    admin && ((claimed && data.state === "Settlement Submitted") || overdue);
  const canSubmit = [
    "Completed",
    "Report Submitted",
    "Closed",
    "Cancelled",
  ].includes(data.eventState);
  async function act(body: object, confirm?: "submit" | "finalize") {
    if (
      confirm &&
      !(await askConfirm(
        t(
          confirm === "submit"
            ? "accountability.confirmSubmit"
            : "accountability.confirmFinalize",
        ),
      ))
    )
      return;
    try {
      await mutation.mutateAsync({
        body: { ...body, revision: data.revision },
        token,
      });
      setEditing(null);
      setEvidenceFor("");
      expenseField.reset();
      evidenceField.reset();
    } catch {
      /* Render mutation error. */
    }
  }
  function edit(expense: Expense | "new") {
    setEditing(expense);
    expenseField.reset();
    setCategory(
      expense === "new" ? (data.lines[0]?.category ?? "") : expense.category,
    );
    setAmount(expense === "new" ? "" : String(expense.amount));
    setDate(
      expense === "new"
        ? new Date().toISOString().slice(0, 10)
        : expense.spentAt.slice(0, 10),
    );
    setDescription(expense === "new" ? "" : (expense.description ?? ""));
  }
  const expensePage = data.expenses.slice(page * 10, page * 10 + 10);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-heading text-lg font-semibold break-words">{data.eventTitle}</h2>
        <AppBadge>
          {t(`accountability.${stateKey(data.state)}`)}
        </AppBadge>
        {data.isSettlementLate && (
          <AppBadge tone="danger">
            {t("accountability.late")}
          </AppBadge>
        )}
      </div>
      {data.eventState === "Closed" && (
        <AppNotice>{t("accountability.reportClosed")}</AppNotice>
      )}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {(
          [
            "approvedTotal",
            "advanceTotal",
            "recordedTotal",
            "supportedTotal",
            "unsupportedTotal",
            "remaining",
          ] as const
        ).map((key, i) => (
          <div key={key} className="rounded-xl border border-border-app bg-bg-app p-4 shadow-xs">
            <dt className="text-xs text-muted-app">
              {t(
                `accountability.${(["approved", "advanced", "recorded", "supported", "unsupported", "remaining"] as const)[i]}`,
              )}
            </dt>
            <dd className="mt-1 break-words text-xl font-semibold tabular-nums">
              {formatMoney(data.totals[key], i18n.language)}
            </dd>
          </div>
        ))}
        <div className="rounded-xl border border-border-app bg-bg-app p-4 shadow-xs">
          <dt className="text-xs text-muted-app">{t("accountability.due")}</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">{formatDay(data.settlementDueAt, i18n.language)}</dd>
        </div>
        {data.settlementBalance !== undefined && (
          <div className="rounded-xl border border-border-app bg-bg-app p-4 shadow-xs">
            <dt className="text-xs text-muted-app">
              {t("accountability.balance")}
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">
              {formatMoney(data.settlementBalance, i18n.language)}
            </dd>
          </div>
        )}
        {data.recoveryAmount !== undefined && data.recoveryAmount > 0 && (
          <>
            <div className="rounded-xl border border-border-app bg-bg-app p-4 shadow-xs">
              <dt className="text-xs text-muted-app">
                {t("accountability.refund")}
              </dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">
                {formatMoney(
                  data.recoveryAmount - data.refundedTotal,
                  i18n.language,
                )}
              </dd>
            </div>
            <div className="rounded-xl border border-border-app bg-bg-app p-4 shadow-xs">
              <dt className="text-xs text-muted-app">
                {t("accountability.recoveryDue")}
              </dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{formatDay(data.recoveryDueAt, i18n.language)}</dd>
            </div>
          </>
        )}
      </dl>
      <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
        <h3 className="mb-3 font-heading text-base font-semibold">
          {t("accountability.approved")}
        </h3>
        <ul className="divide-y divide-border-app">
          {data.lines.map((line, i) => (
            <li
              key={i}
              className="flex flex-wrap justify-between gap-3 py-2.5 text-sm"
            >
              <span className="break-words">{line.category}</span>
              <span className="tabular-nums">
                {formatMoney(line.approvedAmount, i18n.language)}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-heading text-base font-semibold">
            {t("accountability.expenses")}
          </h3>
          {editable && (
            <AppButton onClick={() => edit("new")}>
              {t("accountability.newExpense")}
            </AppButton>
          )}
        </div>
        {!data.expenses.length && (
          <AppEmptyState variant="boxed" message={t("accountability.empty")} />
        )}
        {expensePage.map((expense) => (
          <article
            key={expense.id}
            className="space-y-3 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs"
          >
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h4 className="font-semibold break-words">
                  {expense.category}
                </h4>
                <p className="text-sm text-muted-app">
                  {formatDay(expense.spentAt, i18n.language)}
                </p>
              </div>
              <p className="font-semibold tabular-nums">
                {formatMoney(expense.amount, i18n.language)}
              </p>
            </div>
            {expense.description && (
              <p className="whitespace-pre-wrap break-words text-sm">
                {expense.description}
              </p>
            )}
            {expense.isOutOfCategory && (
              <p className="text-sm text-danger-app">
                {t("accountability.outOfCategory")}
              </p>
            )}
            {expense.isOverRemaining && (
              <p className="text-sm text-danger-app">
                {t("accountability.overRemaining")}
              </p>
            )}
            {!expense.hasEvidence && (
              <p className="text-sm text-danger-app">
                {t("accountability.noEvidence")}
              </p>
            )}
            <ul className="space-y-1">
              {expense.evidences.map((evidence) => (
                <li key={evidence.id}>
                  <a
                    className="break-all text-sm text-primary-app hover:underline"
                    href={evidence.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t(
                      `accountability.${evidence.type === "INVOICE" ? "invoice" : evidence.type === "RECEIPT" ? "receipt" : "proof"}`,
                    )}{" "}
                    · {formatDay(evidence.uploadedAt, i18n.language)}
                  </a>
                </li>
              ))}
            </ul>
            {editable && (
              <div className="flex flex-wrap gap-3">
                <AppButton variant="secondary" onClick={() => edit(expense)}>
                  {t("accountability.edit")}
                </AppButton>
                <AppButton
                  variant="secondary"
                  onClick={() => {
                    setEvidenceFor(expense.id);
                    setLink("");
                    evidenceField.reset();
                  }}
                >
                  {t("accountability.addEvidence")}
                </AppButton>
              </div>
            )}
            {reviewable && (
              <div className="grid gap-3 sm:grid-cols-2">
                <AppSelect
                  label={t("accountability.result")}
                  value={
                    reviews[expense.id]?.outcome ??
                    (expense.hasEvidence ? "Accepted" : "Rejected")
                  }
                  options={[
                    {
                      value: "Accepted",
                      label: t("accountability.accept"),
                      disabled: !expense.hasEvidence,
                    },
                    { value: "Rejected", label: t("accountability.reject") },
                  ]}
                  onChange={(outcome) =>
                    setReviews({
                      ...reviews,
                      [expense.id]: {
                        outcome,
                        reason: reviews[expense.id]?.reason ?? "",
                      },
                    })
                  }
                />
                <label className="text-sm font-medium text-text-app">
                  {t("accountability.reason")}
                  <AppRequiredMark />
                  <AppInput
                    className="mt-1.5 block w-full font-normal"
                    maxLength={2000}
                    {...reviewField.control(expense.id)}
                    value={reviews[expense.id]?.reason ?? ""}
                    onChange={(e) =>
                      setReviews({
                        ...reviews,
                        [expense.id]: {
                          outcome:
                            reviews[expense.id]?.outcome ??
                            (expense.hasEvidence ? "Accepted" : "Rejected"),
                          reason: e.target.value,
                        },
                      })
                    }
                  />
                  <AppFieldError message={reviewField.error(expense.id)} />
                </label>
              </div>
            )}
            {expense.reviewOutcome && (
              <p className="text-sm">
                {t(
                  expense.reviewOutcome === "Accepted"
                    ? "accountability.accepted"
                    : "accountability.reject",
                )}{" "}
                · {expense.reviewReason}
              </p>
            )}
          </article>
        ))}
        <AppPagination
          pageIndex={page}
          pageCount={Math.max(1, Math.ceil(data.expenses.length / 10))}
          onPageChange={setPage}
          prevLabel={t("accountability.previous")}
          nextLabel={t("accountability.next")}
          pageLabel={(p) => t("accountability.page", { page: p })}
          navLabel={t("accountability.pagination")}
        />
      </section>
      {editable && canSubmit && (
        <AppButton
          disabled={mutation.isPending}
          onClick={() => void act({ kind: "submit" }, "submit")}
        >
          {t("accountability.submit")}
        </AppButton>
      )}
      {admin && data.state === "Settlement Submitted" && !claimed && (
        <AppButton
          disabled={mutation.isPending || !!data.task?.assigneeId}
          onClick={() => void act({ kind: "claim" })}
        >
          {t("accountability.claim")}
        </AppButton>
      )}
      {admin && claimed && data.state === "Settlement Submitted" && (
        <label className="block text-sm font-medium text-text-app">
          {t("accountability.reason")}
          <AppRequiredMark />
          <AppTextarea
            value={reason}
            maxLength={2000}
            className="mt-2 w-full"
            {...reasonField.control("reason")}
            onChange={(e) => setReason(e.target.value)}
          />
          <AppFieldError message={reasonField.error("reason")} />
          <AppButton
            className="mt-3"
            variant="secondary"
            disabled={mutation.isPending}
            onClick={() => {
              if (!reasonField.touchAll()) return;
              void act({ kind: "return", reason }, "submit");
            }}
          >
            {t("accountability.return")}
          </AppButton>
        </label>
      )}
      {reviewable && (
        <AppButton
          disabled={mutation.isPending}
          onClick={() => {
            if (!reviewField.touchAll()) return;
            void act(
              {
                kind: "finalize",
                overdue,
                reviews: data.expenses.map((expense) => ({
                  expenseId: expense.id,
                  outcome:
                    reviews[expense.id]?.outcome ??
                    (expense.hasEvidence ? "Accepted" : "Rejected"),
                  reason: reviews[expense.id]?.reason ?? "",
                })),
              },
              "finalize",
            );
          }}
        >
          {t(
            overdue
              ? "accountability.overdueFinalize"
              : "accountability.finalize",
          )}
        </AppButton>
      )}
      {admin && ["Reconciled", "Recovery Pending"].includes(data.state) && (
        <Link
          className="inline-block text-sm font-medium text-primary-app hover:underline"
          to={`/workspace/budgets/${data.id}`}
        >
          {t("accountability.flow")}
        </Link>
      )}
      {admin &&
        data.state === "Recovery Pending" &&
        data.recoveryDueAt &&
        new Date(data.recoveryDueAt) < new Date() && (
          <section className="space-y-3 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <label className="block text-sm font-medium text-text-app">
              {t("accountability.reason")}
              <AppRequiredMark />
              <AppTextarea
                className="mt-2 w-full"
                value={reason}
                maxLength={2000}
                {...reasonField.control("reason")}
                onChange={(e) => setReason(e.target.value)}
              />
              <AppFieldError message={reasonField.error("reason")} />
            </label>
            <AppSelect
              label={t("accountability.severity")}
              value={severity}
              options={[
                { value: "MINOR", label: t("accountability.minor") },
                { value: "MODERATE", label: t("accountability.moderate") },
                { value: "SERIOUS", label: t("accountability.serious") },
              ]}
              onChange={setSeverity}
            />
            {findingId ? (
              <Link
                className="text-sm font-medium text-primary-app hover:underline"
                to={`/workspace/violations/${findingId}`}
              >
                {t("accountability.details")}
              </Link>
            ) : (
              <AppButton
                disabled={openViolation.isPending}
                onClick={() => {
                  if (!reasonField.touchAll()) return;
                  openViolation.mutate(
                    {
                      csrfToken: token,
                      input: {
                        clubId: data.clubId,
                        originType: "FINANCIAL_EXCEPTION",
                        originRefId: data.id,
                        severity,
                        title: data.eventTitle,
                        description: reason,
                      },
                    },
                    { onSuccess: (value) => setFindingId(value.id) },
                  );
                }}
              >
                {t("accountability.financialFinding")}
              </AppButton>
            )}
            {openViolation.isError && (
              <AppNotice tone="danger" role="alert">
                {openViolation.error.message}
              </AppNotice>
            )}
          </section>
        )}
      {mutation.isError && (
        <AppNotice tone="danger" role="alert">
          {mutation.error.message}
        </AppNotice>
      )}
      <section className="space-y-3">
        <h3 className="font-heading text-base font-semibold">
          {t("accountability.history")}
        </h3>
        {data.history.map((entry, i) => (
          <details key={i} className="rounded-xl border border-border-app bg-bg-app px-4 py-3 text-sm">
            <summary>
              {formatDay(entry.at, i18n.language)} ·{" "}
              {t(`accountability.${historyKey(entry.action)}`)}
            </summary>
            {entry.reason && <p className="mt-2 break-words">{entry.reason}</p>}
            {((entry.snapshot as { expenses?: Expense[] })?.expenses ?? []).map(
              (expense) => (
                <p key={expense.id} className="mt-2 text-sm">
                  {expense.category} ·{" "}
                  {formatMoney(expense.amount, i18n.language)} ·{" "}
                  {t(
                    expense.hasEvidence
                      ? "accountability.supported"
                      : "accountability.unsupported",
                  )}
                </p>
              ),
            )}
          </details>
        ))}
      </section>
      <AppDialog
        open={!!editing}
        title={t(
          editing === "new"
            ? "accountability.newExpense"
            : "accountability.edit",
        )}
        onClose={() => setEditing(null)}
        closeLabel={t("accountability.close")}
        footer={
          <AppButton disabled={mutation.isPending} type="submit" form={expenseFormId}>
            {t("accountability.save")}
          </AppButton>
        }
      >
        <form
          id={expenseFormId}
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!expenseField.touchAll()) return;
            void act({
              kind: "expense",
              expenseId: editing && editing !== "new" ? editing.id : undefined,
              input: {
                category,
                amount: Number(amount),
                spentAt: new Date(`${date}T00:00:00+07:00`).toISOString(),
                description,
              },
            });
          }}
        >
          <label className="block text-sm font-medium text-text-app">
            {t("accountability.category")}
            <AppRequiredMark />
            <AppInput
              {...expenseField.control("category")}
              maxLength={100}
              className="mt-1.5 block w-full font-normal"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <AppFieldError message={expenseField.error("category")} />
          </label>
          <label className="block text-sm font-medium text-text-app">
            {t("accountability.amount")}
            <AppRequiredMark />
            <AppMoneyInput
              {...expenseField.control("amount")}
              className="mt-1.5 block w-full font-normal"
              value={amount}
              onValueChange={setAmount}
            />
            <AppFieldError message={expenseField.error("amount")} />
          </label>
          <label className="block text-sm font-medium text-text-app">
            {t("accountability.date")}
            <AppRequiredMark />
            <AppInput
              {...expenseField.control("date")}
              type="date"
              max={today}
              className="mt-1.5 block w-full font-normal"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <AppFieldError message={expenseField.error("date")} />
          </label>
          <label className="block text-sm font-medium text-text-app">
            {t("accountability.description")}
            <AppTextarea
              maxLength={2000}
              className="mt-1.5 block w-full font-normal"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          {mutation.isError && (
            <AppNotice tone="danger" role="alert">
              {mutation.error.message}
            </AppNotice>
          )}
        </form>
      </AppDialog>
      <AppDialog
        open={!!evidenceFor}
        title={t("accountability.addEvidence")}
        onClose={() => setEvidenceFor("")}
        closeLabel={t("accountability.close")}
        footer={
          <AppButton disabled={mutation.isPending} type="submit" form={evidenceFormId}>
            {t("accountability.addEvidence")}
          </AppButton>
        }
      >
        <form
          id={evidenceFormId}
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!evidenceField.touchAll()) return;
            void act({
              kind: "evidence",
              expenseId: evidenceFor,
              input: { type: evidenceType, externalLink: link },
            });
          }}
        >
          <p className="text-sm text-muted-app">
            {t("accountability.evidenceHint")}
          </p>
          <AppSelect
            label={t("accountability.evidenceType")}
            value={evidenceType}
            options={[
              { value: "INVOICE", label: t("accountability.invoice") },
              { value: "RECEIPT", label: t("accountability.receipt") },
              { value: "PROOF_OF_PAYMENT", label: t("accountability.proof") },
            ]}
            onChange={setEvidenceType}
          />
          <label className="block text-sm font-medium text-text-app">
            {t("accountability.link")}
            <AppRequiredMark />
            <AppInput
              {...evidenceField.control("link")}
              type="url"
              maxLength={2000}
              className="mt-1.5 block w-full font-normal"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
            <AppFieldError message={evidenceField.error("link")} />
          </label>
          {mutation.isError && (
            <AppNotice tone="danger" role="alert">
              {mutation.error.message}
            </AppNotice>
          )}
        </form>
      </AppDialog>
    </div>
  );
}
export function FinanceWorkspace({
  context,
  id = "",
}: {
  context: AccountabilityContext;
  id?: string;
}) {
  const { t } = useTranslation();
  const auth = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  function setSelected(value: string) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set("budget", value); else next.delete("budget");
      next.delete("event");
      return next;
    }, { replace: true });
  }
  const allowed =
    context.kind === "admin"
      ? auth.data?.systemRoles.includes("ICPDP_OFFICER")
      : auth.data?.workspaces.some(
          (w) =>
            w.kind === "club" &&
            w.clubId === context.clubId &&
            w.permissions.includes("club.expense.record"),
        );
  const list = useClubFinances(
    context.kind === "club" ? context.clubId : "",
    !!allowed && context.kind === "club",
  );
  const selected = id || searchParams.get("budget")
    || list.data?.find((item) => item.eventId === searchParams.get("event"))?.id || "";
  const detail = useFinanceDetail(context, selected, !!allowed);
  if (auth.isPending) return <AppSkeleton className="h-40 w-full" />;
  if (!allowed || !auth.data)
    return <AppNotice tone="danger">{t("accountability.access")}</AppNotice>;
  return (
    <div className="space-y-6">
      <PageHeader
        title={t(
          context.kind === "admin"
            ? "accountability.review"
            : "accountability.finances",
        )}
      />
      {context.kind === "club" &&
        (list.isPending ? (
          <AppSkeleton className="h-20 w-full" />
        ) : list.isError ? (
          <AppNotice tone="danger" role="alert">
            {list.error.message}
            <AppButton onClick={() => void list.refetch()}>
              {t("accountability.retry")}
            </AppButton>
          </AppNotice>
        ) : list.data?.length ? (
          <AppSelect
            className="w-full sm:max-w-xl"
            label={t("accountability.select")}
            value={selected}
            onChange={setSelected}
            options={[
              { value: "", label: t("accountability.select") },
              ...list.data.map((item) => ({
                value: item.id,
                label: `${item.eventTitle} · ${t(`accountability.${stateKey(item.state)}`)}`,
              })),
            ]}
          />
        ) : (
          <AppEmptyState variant="boxed" message={t("accountability.empty")} />
        ))}
      {selected ? (
        detail.isPending ? (
          <AppSkeleton className="h-60 w-full" />
        ) : detail.isError ? (
          <AppNotice tone="danger" role="alert">
            {detail.error.message}
            <AppButton onClick={() => void detail.refetch()}>
              {t("accountability.retry")}
            </AppButton>
          </AppNotice>
        ) : (
          detail.data && (
            <SponsoredItems key={selected} budgetId={selected}
              clubId={context.kind === "club" ? context.clubId : undefined} csrfToken={auth.data.csrfToken}
              fallback={<FinanceEditor
              key={`${selected}-${detail.data.revision}`}
              data={detail.data}
              context={context}
              token={auth.data.csrfToken}
              actorId={auth.data.user.id}
              />} />
          )
        )
      ) : (
        <p className="text-sm text-muted-app">
          {t("accountability.noSelection")}
        </p>
      )}
    </div>
  );
}
