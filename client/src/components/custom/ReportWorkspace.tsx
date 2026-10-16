import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { formatMoney } from "@/utils/formatMoney";
import { formatDay } from "@/utils/formatDate";
import type { accountability } from "@/i18n/accountability";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppPagination } from "@/components/ui/pagination/AppPagination";
import { useAuth } from "@/hooks/useAuth";
import {
  useAccountabilityAction,
  useReportDetail,
  useReportObligations,
} from "@/hooks/useAccountability";
import { useOpenViolation } from "@/hooks/useViolations";
import type {
  AccountabilityContext,
  ReportDetail,
  ReportObligation,
  ReportInput,
  ReportSnapshot,
} from "@/services/accountability";

function reportState(state: string): keyof typeof accountability.en {
  return (
    (
      {
        Draft: "draft",
        Submitted: "submitted",
        Accepted: "accepted",
        "Returned for correction": "returned",
        Completed: "completed",
        Closed: "closed",
        "Report Submitted": "submitted",
      } as Record<string, keyof typeof accountability.en>
    )[state] ?? "state"
  );
}
function Figures({ figures }: { figures: ReportSnapshot }) {
  const { t, i18n } = useTranslation();
  const budget = figures.budget as {
    approvedTotal?: number;
    disbursedTotal?: number;
  } | null;
  const proposal = figures.proposal as {
    payload?: { title?: string; objective?: string; plan?: string };
    revisionNo?: number;
    conditions?: string[];
  } | null;
  const feedback = figures.feedback as {
    visible?: boolean;
    averageRating?: number;
    respondents?: number;
    comments?: string[];
  } | null;
  return (
    <div className="space-y-4 rounded-xl border border-border-app p-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(["confirmed", "attended", "absent"] as const).map((key) => (
          <div key={key}>
            <dt className="text-sm text-muted-app">
              {t(`accountability.${key}`)}
            </dt>
            <dd className="text-xl font-semibold tabular-nums">
              {figures.attendance[key]}
            </dd>
          </div>
        ))}
      </dl>
      {proposal && (
        <section>
          <h3 className="font-semibold">{t("accountability.proposal")}</h3>
          <p className="whitespace-pre-wrap break-words text-sm">
            {proposal.payload?.objective}
          </p>
          <p className="whitespace-pre-wrap break-words text-sm">
            {proposal.payload?.plan}
          </p>
          {proposal.conditions?.map((condition, i) => (
            <p key={i} className="mt-2 break-words text-sm">
              {condition}
            </p>
          ))}
        </section>
      )}
      {budget ? (
        <dl className="grid grid-cols-2 gap-3">
          {(["approvedTotal", "disbursedTotal"] as const).map((key) => (
            <div key={key}>
              <dt className="text-sm text-muted-app">
                {t(
                  key === "approvedTotal"
                    ? "accountability.approved"
                    : "accountability.advanced",
                )}
              </dt>
              <dd className="font-semibold tabular-nums">
                {formatMoney(budget[key] ?? 0, i18n.language)}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>{t("accountability.noBudget")}</p>
      )}
      <section>
        <h3 className="font-semibold">{t("accountability.feedback")}</h3>
        {feedback?.visible ? (
          <>
            <p>{feedback.averageRating} / 5</p>
            {feedback.comments?.map((comment, i) => (
              <p key={i} className="mt-1 break-words text-sm">
                {comment}
              </p>
            ))}
          </>
        ) : (
          <p className="text-sm text-muted-app">
            {t("accountability.hiddenFeedback")}
          </p>
        )}
      </section>
    </div>
  );
}
function ReportEditor({
  data,
  context,
  token,
  actorId,
}: {
  data: ReportDetail;
  context: AccountabilityContext;
  token: string;
  actorId: string;
}) {
  const { t } = useTranslation();
  const admin = context.kind === "admin";
  const latest = data.versions[0];
  const draft =
    !latest || ["Draft", "Returned for correction"].includes(latest.state);
  const [input, setInput] = useState<ReportInput>({
    actualResult: latest?.actualResult ?? "",
    incidents: latest?.incidents ?? "",
    lessonsLearned: latest?.lessonsLearned ?? "",
    evidence: latest?.evidence ?? [],
  });
  const [severity, setSeverity] = useState<"MINOR" | "MODERATE" | "SERIOUS">(
    "MINOR",
  );
  const [reason, setReason] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [violationId, setViolationId] = useState(
    latest?.findingViolationId ?? "",
  );
  const mutation = useAccountabilityAction(
    context,
    "report",
    data.obligation.eventId,
  );
  const openViolation = useOpenViolation();
  const claimable =
    latest?.state === "Submitted" &&
    (!latest.task?.assigneeId || latest.task.assigneeId === actorId);
  const claimed = latest?.task?.assigneeId === actorId;
  async function act(body: object, confirm = false) {
    if (
      confirm &&
      !window.confirm(
        t(
          admin
            ? "accountability.confirmDecision"
            : "accountability.confirmSubmit",
        ),
      )
    )
      return;
    try {
      await mutation.mutateAsync({
        body: { ...body, revision: data.obligation.revision },
        token,
      });
    } catch {
      /* Render mutation error. */
    }
  }
  async function finding() {
    if (!latest || !reason.trim()) return;
    try {
      const created = await openViolation.mutateAsync({
        csrfToken: token,
        input: {
          clubId: latest.clubId,
          originType: "REPORT_FINDING",
          originRefId: latest.eventId,
          severity,
          title: data.obligation.eventTitle,
          description: reason,
          evidence: latest.evidence.map((item) => ({
            note: item.note,
            url: item.url,
          })),
        },
      });
      setViolationId(created.id);
    } catch {
      /* Render mutation error. */
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 text-sm">
        <span>
          {t(
            `accountability.${reportState(latest?.state ?? data.obligation.state)}`,
          )}
        </span>
        {data.obligation.overdue || latest?.lateFlag ? (
          <span className="text-danger-app">{t("accountability.late")}</span>
        ) : null}
      </div>
      <section>
        <h2 className="mb-3 font-heading text-lg font-bold">
          {t(
            latest?.submittedAt
              ? "accountability.snapshot"
              : "accountability.preview",
          )}
        </h2>
        <Figures
          figures={latest?.submittedAt ? latest.preloadedFigures : data.preview}
        />
      </section>
      {admin && latest?.submittedAt && (
        <details>
          <summary className="font-semibold">
            {t("accountability.preview")}
          </summary>
          <div className="mt-3">
            <Figures figures={data.preview} />
          </div>
        </details>
      )}
      {!admin && draft && !data.obligation.attendanceFinalized && (
        <AppNotice tone="warning">
          {t("accountability.attendanceRequired")}{" "}
          {context.kind === "club" && (
            <Link
              className="font-semibold text-accent-app underline"
              to={`/club/${context.clubId}/event-attendance`}
            >
              {t("accountability.openAttendance")}
            </Link>
          )}
        </AppNotice>
      )}
      {!admin && draft ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void act({ kind: "save", input });
          }}
        >
          {(["actualResult", "incidents", "lessonsLearned"] as const).map(
            (key) => (
              <label key={key} className="block text-sm font-semibold">
                {t(`accountability.${key}`)}
                <AppTextarea
                  className="mt-2 w-full"
                  required={key === "actualResult"}
                  maxLength={10000}
                  value={input[key] ?? ""}
                  onChange={(e) =>
                    setInput({ ...input, [key]: e.target.value })
                  }
                />
              </label>
            ),
          )}
          <p className="text-sm text-muted-app">
            {t("accountability.evidenceHint")}
          </p>
          <label className="block text-sm">
            {t("accountability.link")}
            <AppInput
              className="mt-1 w-full"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            {t("accountability.evidenceNote")}
            <AppInput
              className="mt-1 w-full"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <AppButton
            type="button"
            variant="secondary"
            disabled={
              !url.startsWith("https://") || input.evidence.length >= 20
            }
            onClick={() => {
              setInput({
                ...input,
                evidence: [...input.evidence, { note, url }],
              });
              setUrl("");
              setNote("");
            }}
          >
            {t("accountability.addEvidence")}
          </AppButton>
          <ul className="space-y-2">
            {input.evidence.map((item, i) => (
              <li key={i}>
                <a
                  className="break-all text-accent-app underline"
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.note || item.url}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <AppButton
              type="submit"
              disabled={
                mutation.isPending || !data.obligation.attendanceFinalized
              }
            >
              {t("accountability.save")}
            </AppButton>
            {latest?.state === "Draft" && (
              <AppButton
                type="button"
                variant="secondary"
                disabled={
                  mutation.isPending ||
                  JSON.stringify(input) !==
                    JSON.stringify({
                      actualResult: latest.actualResult,
                      incidents: latest.incidents ?? "",
                      lessonsLearned: latest.lessonsLearned ?? "",
                      evidence: latest.evidence,
                    })
                }
                onClick={() => void act({ kind: "submit" }, true)}
              >
                {t("accountability.submit")}
              </AppButton>
            )}
          </div>
        </form>
      ) : (
        latest && (
          <section className="space-y-3">
            {(["actualResult", "incidents", "lessonsLearned"] as const).map(
              (key) => (
                <div key={key}>
                  <h3 className="text-sm font-semibold">
                    {t(`accountability.${key}`)}
                  </h3>
                  <p className="whitespace-pre-wrap break-words">
                    {latest[key] || "—"}
                  </p>
                </div>
              ),
            )}
            {latest.evidence.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block break-all text-accent-app underline"
              >
                {item.note || item.url}
              </a>
            ))}
          </section>
        )
      )}
      {admin && (
        <section className="space-y-3 border-t border-border-app pt-5">
          {claimable && !claimed && (
            <AppButton
              disabled={mutation.isPending}
              onClick={() => void act({ kind: "claim" })}
            >
              {t("accountability.claim")}
            </AppButton>
          )}
          {latest?.state === "Submitted" && !claimable && (
            <AppNotice>{t("accountability.taskAssigned")}</AppNotice>
          )}
          {(claimed || data.obligation.overdue) && (
            <label className="block text-sm font-semibold">
              {t("accountability.reason")}
              <AppTextarea
                className="mt-2 w-full"
                value={reason}
                maxLength={2000}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          )}
          {claimed && (
            <>
              <div className="flex flex-wrap gap-3">
                <AppButton
                  disabled={!reason.trim() || mutation.isPending}
                  onClick={() =>
                    void act(
                      { kind: "decision", outcome: "accept", reason },
                      true,
                    )
                  }
                >
                  {t("accountability.accept")}
                </AppButton>
                <AppButton
                  variant="secondary"
                  disabled={!reason.trim() || mutation.isPending}
                  onClick={() =>
                    void act(
                      { kind: "decision", outcome: "return", reason },
                      true,
                    )
                  }
                >
                  {t("accountability.return")}
                </AppButton>
              </div>
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
              <div className="flex flex-wrap items-center gap-3">
                <AppButton
                  variant="secondary"
                  disabled={
                    !reason.trim() || !!violationId || openViolation.isPending
                  }
                  onClick={() => void finding()}
                >
                  {t("accountability.openViolation")}
                </AppButton>
                {violationId && (
                  <>
                    <Link
                      className="text-accent-app underline"
                      to={`/workspace/violations/${violationId}`}
                    >
                      {t("accountability.violation")}
                    </Link>
                    <AppButton
                      disabled={!reason.trim() || mutation.isPending}
                      onClick={() =>
                        void act(
                          {
                            kind: "decision",
                            outcome: "finding",
                            reason,
                            violationId,
                          },
                          true,
                        )
                      }
                    >
                      {t("accountability.finding")}
                    </AppButton>
                  </>
                )}
              </div>
            </>
          )}
          {data.obligation.overdue && (
            <AppButton
              variant="secondary"
              disabled={!reason.trim() || mutation.isPending}
              onClick={() => void act({ kind: "overdue", reason }, true)}
            >
              {t("accountability.missing")}
            </AppButton>
          )}
        </section>
      )}
      {mutation.isError && (
        <AppNotice tone="danger" role="alert">
          {mutation.error.message}
        </AppNotice>
      )}
      {openViolation.isError && (
        <AppNotice tone="danger" role="alert">
          {openViolation.error.message}
        </AppNotice>
      )}
      <section className="space-y-3">
        <h2 className="font-heading text-lg font-bold">
          {t("accountability.history")}
        </h2>
        {data.versions.map((version) => (
          <details
            key={version.id}
            className="rounded-xl border border-border-app p-3"
          >
            <summary>
              {t("accountability.version", { number: version.versionNo })} ·{" "}
              {t(`accountability.${reportState(version.state)}`)}
            </summary>
            <p className="mt-2 whitespace-pre-wrap break-words">
              {version.actualResult}
            </p>
            {version.decisionReason && (
              <p className="mt-2 break-words">{version.decisionReason}</p>
            )}
            {version.submittedAt && (
              <div className="mt-3">
                <Figures figures={version.preloadedFigures} />
              </div>
            )}
          </details>
        ))}
      </section>
    </div>
  );
}
export function ReportWorkspace({
  context,
}: {
  context: AccountabilityContext;
}) {
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const [selected, setSelected] = useState("");
  const [page, setPage] = useState(0);
  const allowed =
    context.kind === "admin"
      ? auth.data?.systemRoles.includes("ICPDP_OFFICER")
      : auth.data?.workspaces.some(
          (w) =>
            w.kind === "club" &&
            w.clubId === context.clubId &&
            w.permissions.includes("club.report.submit"),
        );
  const list = useReportObligations(context, !!allowed);
  const detail = useReportDetail(context, selected, !!allowed);
  if (auth.isPending) return <AppSkeleton className="h-40 w-full" />;
  if (!allowed || !auth.data)
    return <AppNotice tone="danger">{t("accountability.access")}</AppNotice>;
  const items = (list.data ?? []).filter(
    (item): item is ReportObligation => !("configurationError" in item),
  );
  const configurationIssues = (list.data ?? []).filter(
    (item) => "configurationError" in item,
  );
  const count = Math.max(1, Math.ceil(items.length / 10));
  return (
    <div className="space-y-6">
      <PageHeader title={t("accountability.reports")} />
      {configurationIssues.map((item) => (
        <AppNotice key={item.eventId} tone="warning">
          {item.eventTitle}: {t("accountability.deadlineMissing")}
        </AppNotice>
      ))}
      {list.isPending ? (
        <AppSkeleton className="h-32 w-full" />
      ) : list.isError ? (
        <AppNotice tone="danger" role="alert">
          {list.error.message}
          <AppButton variant="secondary" onClick={() => void list.refetch()}>
            {t("accountability.retry")}
          </AppButton>
        </AppNotice>
      ) : items.length ? (
        <>
          <AppSelect
            label={t("accountability.select")}
            value={selected}
            options={[
              { value: "", label: t("accountability.select") },
              ...items.slice(page * 10, page * 10 + 10).map((item) => ({
                value: item.eventId,
                label: `${item.eventTitle} · ${t("accountability.due")}: ${formatDay(item.dueAt, i18n.language)}${item.overdue ? ` · ${t("accountability.late")}` : ""}`,
              })),
            ]}
            onChange={setSelected}
            className="w-full"
          />
          <AppPagination
            pageIndex={page}
            pageCount={count}
            onPageChange={setPage}
            prevLabel={t("accountability.previous")}
            nextLabel={t("accountability.next")}
            pageLabel={(p) => t("accountability.page", { page: p })}
            navLabel={t("accountability.pagination")}
          />
        </>
      ) : (
        <AppNotice>{t("accountability.empty")}</AppNotice>
      )}
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
            <ReportEditor
              key={`${selected}-${detail.data.obligation.revision}`}
              data={detail.data}
              context={context}
              token={auth.data.csrfToken}
              actorId={auth.data.user.id}
            />
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
