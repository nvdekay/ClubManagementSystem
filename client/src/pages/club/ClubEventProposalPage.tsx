/**
 * Trang tạo và nộp lại đề xuất sự kiện của CLB.
 * Luồng xử lý: nhập DOCX -> xem dữ liệu trích xuất -> lưu nháp -> đính kèm file -> nộp duyệt.
 * eventProposalImport đọc dữ liệu từ tài liệu; useClubEvents thực hiện các thao tác ghi qua API.
 */
import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { appToast } from "@/components/ui/toast/AppToast";
import { useAuth } from "@/hooks/useAuth";
import { useClubEvent, useClubEventMutation, useClubEventOptions, useEventProposalDocumentAccess, useEventProposalTemplate, useEventProposalPreview } from "@/hooks/useClubEvents";
import { ClubEventErrorMessage } from "@/pages/club/ClubEventErrorMessage";
import { EventProposalPreview } from "@/pages/club/EventProposalPreview";
import { EventProposalDocument } from "@/pages/club/EventProposalDocument";
import { bookingsScheduleError, numberError, sectionLabel, stateLabel, stateTones, type DecisionComments } from "@/pages/club/clubEventFormat";
import { EVENT_PROPOSAL_TEMPLATE_DOWNLOAD_URL, type ClubEvent, type ClubEventDetail, type ClubEventInput, type ClubEventOptions } from "@/services/clubEvents";
import { formatBytes, proposalFileType } from "@/utils/proposalFile";
import { importEventProposal, type ProposalImport } from "@/utils/eventProposalImport";

const sectionCardClass = "space-y-4 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs sm:p-6";
const secondaryLinkClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border-app bg-bg-app px-3.5 font-heading text-sm font-medium text-text-app shadow-xs transition-colors hover:bg-surface-app focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app focus-visible:outline-none sm:min-h-9";

/** Khởi tạo bản nháp rỗng; các giá trị mặc định vẫn phải qua kiểm tra dữ liệu nhập. */
function freshEvent(): ClubEventInput {
  return {
    title: "",
    objective: "",
    plan: "",
    startAt: "",
    endAt: "",
    venueText: "",
    audienceScope: "PUBLIC",
    capacity: 0,
    budgetLines: [],
    bookingIds: [],
    registrationForm: [],
    occurrences: [],
  };
}

/** Khôi phục dữ liệu đầu vào từ bản nháp đã lưu hoặc đề xuất được trả về để chỉnh sửa. */
function inputFromEvent(event: ClubEvent): ClubEventInput {
  return {
    title: event.title,
    objective: event.objective,
    plan: event.plan,
    startAt: event.startAt,
    endAt: event.endAt,
    venueText: event.venueText,
    propertyId: event.propertyId,
    audienceScope: event.audienceScope,
    capacity: event.capacity,
    riskNote: event.riskNote,
    facilityNeeds: event.facilityNeeds,
    occurrences: (event.occurrences ?? []).map((o) => ({
      startAt: o.startAt,
      endAt: o.endAt,
      propertyId: o.propertyId ?? event.propertyId,
      venueText: o.venueText ?? event.venueText ?? "",
    })),
    budgetLines: event.budgetLines,
    bookingIds: event.bookingIds,
    registrationForm: event.registrationForm ?? [],
  };
}

interface ProposalFormProps {
  clubId: string;
  csrfToken: string;
  detail?: ClubEventDetail;
  options?: ClubEventOptions;
  optionsError?: unknown;
}

/** Quản lý bản nháp đã nhập, bản xem trước tài liệu và thứ tự lưu nháp, tải file, nộp duyệt. */
function ProposalForm({ clubId, csrfToken, detail, options, optionsError }: ProposalFormProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const mutation = useClubEventMutation(clubId);
  const existing = detail?.event;
  // Trạng thái bản nháp: dữ liệu sự kiện đã trích xuất và mốc thời gian cố định để kiểm tra lịch.
  const [draft, setDraft] = useState<ClubEventInput>(() => (existing ? inputFromEvent(existing) : freshEvent()));
  const [editorOpenedAt] = useState(() => Date.now());
  // Giữ phiên bản mới nhất từ server cho lần ghi tiếp theo trong lúc chưa tải lại chi tiết.
  const [createdDraft, setCreatedDraft] = useState<ClubEvent | null>(null);
  const [formError, setFormError] = useState<unknown>(null);
  // Giữ file ở trình duyệt đến khi có bản nháp và mã sự kiện để tải file lên.
  const [pendingFile, setPendingFile] = useState<{ file: File; mimeType: string } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  // Tách trạng thái đọc/tải file khỏi lỗi API để từng khu vực hiển thị đúng nguyên nhân lỗi.
  const [documentMissing, setDocumentMissing] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [reading, setReading] = useState(false);
  const [imported, setImported] = useState<ProposalImport | null>(null);
  const importSequence = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const template = useEventProposalTemplate(true);
  const documentAccess = useEventProposalDocumentAccess(clubId);

  const eventsListUrl = `/club/${encodeURIComponent(clubId)}/events`;
  // Xác định mã, phiên bản hiện tại và chọn xem file vừa nhập hoặc file đã lưu.
  const isNew = !existing && !createdDraft;
  const activeId = existing?.id ?? createdDraft?.id;
  const activeVersion = createdDraft?.version ?? existing?.version ?? 0;
  const savedDocument = createdDraft ? createdDraft.proposalDocument : existing?.proposalDocument;
  const savedPreview = useEventProposalPreview(clubId, activeId ?? "", savedDocument?.id ?? "",
    Boolean(activeId && savedDocument && !pendingFile && !fileError && !reading));
  const previewFile = pendingFile?.file ?? savedPreview.data;
  const documentError = fileError ?? (documentMissing && !savedDocument && !pendingFile ? t("common.fieldRequired") : null);

  // Đề xuất mở lại giữ yêu cầu chỉnh sửa gần nhất của ICPDP để đánh dấu các mục cần sửa.
  const revisionRequest = [...(detail?.decisions ?? [])].reverse().find((d) => d.outcome === "Request revision");
  const revisionSections =
    existing?.state === "Revision Requested"
      ? (revisionRequest?.comments as DecisionComments | undefined)?.sections ?? []
      : [];

  // Trả về nhãn đánh dấu nếu mục này nằm trong yêu cầu chỉnh sửa gần nhất.
  function flag(...parts: string[]) {
    return existing && parts.some((part) => revisionSections.includes(part)) ? t("common.revisionFlagged") : undefined;
  }

  const format = new Intl.DateTimeFormat(i18n.language === "vi" ? "vi-VN" : "en-GB", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  });

  // Kiểm tra dữ liệu trích xuất trước khi lưu; server vẫn kiểm tra lại theo quy tắc riêng.
  const required = t("common.fieldRequired");
  const eventErrors: Record<string, string | null> = {
    title: draft.title.trim() ? null : required,
    objective: draft.objective.trim() ? null : required,
    plan: draft.plan.trim() ? null : required,
    startAt: new Date(draft.startAt).getTime() > editorOpenedAt ? null : t("common.dateNotPast"),
    endAt: Date.parse(draft.endAt) > Date.parse(draft.startAt) ? null : t("common.endAfterStart"),
    venue:
      draft.venueText?.trim() ||
      draft.propertyId ||
      (draft.occurrences?.length && draft.occurrences.every((o) => Boolean(o.venueText?.trim() || o.propertyId)))
        ? null
        : t("clubEvents.venueRequired"),
    capacity: numberError(t, draft.capacity, 1, 100000),
    bookings: bookingsScheduleError(
      t,
      draft.bookingIds,
      options?.bookings,
      draft.propertyId,
      draft.occurrences?.length
        ? draft.occurrences
        : [{ startAt: draft.startAt, endAt: draft.endAt, propertyId: draft.propertyId }],
    ),
    // Đề xuất chỉ dành cho thành viên cần ít nhất một dòng kinh phí đề nghị.
  };
  // Kiểm tra từng dòng kinh phí, giữ chỉ số dòng trong khóa lỗi để xác định đúng vị trí.
  draft.budgetLines.forEach((line, index) => {
    eventErrors[`budget.${index}.category`] = line.category.trim() ? null : required;
    eventErrors[`budget.${index}.purpose`] = line.purpose.trim() ? null : required;
    eventErrors[`budget.${index}.amount`] = numberError(t, line.amount, 1, 1000000000000);
  });
  // Câu hỏi đăng ký dạng lựa chọn phải có nhãn và ít nhất một phương án.
  draft.registrationForm?.forEach((field, index) => {
    eventErrors[`form.${index}.label`] = field.label.trim() ? null : required;
    eventErrors[`form.${index}.options`] =
      ["select", "radio", "checkbox"].includes(field.type) && !field.options?.some((option) => option.trim())
        ? required
        : null;
  });
  // Mỗi buổi bổ sung phải có khoảng thời gian và địa điểm hợp lệ.
  draft.occurrences?.forEach((occurrence, index) => {
    eventErrors[`occurrence.${index}.endAt`] =
      Date.parse(occurrence.endAt) > Date.parse(occurrence.startAt) ? null : t("common.endAfterStart");
    eventErrors[`occurrence.${index}.venue`] =
      occurrence.venueText?.trim() || occurrence.propertyId ? null : t("clubEvents.venueRequired");
  });
  // Loại thông báo trùng và xác định điều kiện cho phép lưu nháp hoặc nộp duyệt.
  const invalidValues = [...new Set(Object.values(eventErrors).filter((error): error is string => Boolean(error)))];
  const canPersist = !reading && !fileError && (Boolean(pendingFile) || Boolean(savedDocument))
    && !imported?.missing.length && invalidValues.length === 0;

  // Đọc tài liệu được chọn rồi thay toàn bộ dữ liệu bản nháp bằng kết quả đọc.
  async function pickFile(file: File | undefined) {
    if (!file) return;
    const sequence = ++importSequence.current;
    setDraft(freshEvent());
    setImported(null);
    setPendingFile(null);
    setFileError(null);
    setFormError(null);
    setUploadFailed(false);
    setReading(false);
    const mimeType = proposalFileType(file, ["docx"]);
    if (!mimeType) { setFileError(t("clubEvents.importDocxOnly")); return; }
    setReading(true);
    try {
      const result = await importEventProposal(file);
      // Bỏ qua kết quả đọc file cũ nếu người dùng đã chọn file mới trong lúc chờ.
      if (sequence !== importSequence.current) return;
      setImported(result);
      setDraft(result.input);
      setPendingFile({ file, mimeType });
    } catch {
      if (sequence === importSequence.current) setFileError(t("clubEvents.importFailed"));
    } finally {
      if (sequence === importSequence.current) setReading(false);
    }
  }

  /** Xin đường dẫn truy cập tạm thời cho tài liệu đã lưu rồi mở trong tab riêng. */
  async function openDocument(inline: boolean) {
    if (!activeId) return;
    try {
      const access = await documentAccess.mutateAsync({ id: activeId, inline });
      // Giữ nguyên bản nháp khi trình duyệt hiển thị hoặc tải tài liệu xuống.
      window.open(access.url, "_blank", "noopener,noreferrer");
    } catch {
      // Lỗi thao tác được hiển thị tại khu vực tài liệu.
    }
  }

  /** Lưu nháp trước, đính kèm file đang chờ, sau đó nộp phiên bản mới nhất nếu được yêu cầu. */
  async function persist(shouldSubmit: boolean) {
    if (!savedDocument && !pendingFile) {
      setDocumentMissing(true);
      return;
    }
    if (!canPersist) return;
    setFormError(null);
    setUploadFailed(false);
    let savedEvent: ClubEvent;
    try {
      const result = activeId
        ? await mutation.mutateAsync({
            kind: "action",
            id: activeId,
            action: "save",
            body: { ...draft, expectedVersion: activeVersion },
            csrfToken,
          })
        : await mutation.mutateAsync({
            kind: "create",
            input: draft,
            csrfToken,
          });
      savedEvent = result.event;
      setCreatedDraft(savedEvent);
    } catch (error) {
      setFormError(error);
      return;
    }

    // Đính kèm file làm tăng phiên bản; bước nộp phải dùng phiên bản vừa được server trả về.
    if (pendingFile) {
      try {
        const uploaded = await mutation.mutateAsync({
          kind: "upload-document",
          id: savedEvent.id,
          file: pendingFile.file,
          mimeType: pendingFile.mimeType,
          csrfToken,
        });
        savedEvent = uploaded.event;
        setCreatedDraft(savedEvent);
        setPendingFile(null);
      } catch (error) {
        // Giữ mã bản nháp và file đang chờ để lần thử lại cập nhật đúng bản nháp, tránh tạo trùng.
        setUploadFailed(true);
        setFormError(error);
        return;
      }
    }

    if (!shouldSubmit) {
      appToast.success(t("clubEvents.success"));
      navigate(`${eventsListUrl}?event=${encodeURIComponent(savedEvent.id)}`);
      return;
    }

    try {
      const submitted = await mutation.mutateAsync({
        kind: "action",
        id: savedEvent.id,
        action: "submit",
        body: { expectedVersion: savedEvent.version },
        csrfToken,
      });
      appToast.success(t("clubEvents.submittedSuccess"));
      navigate(`${eventsListUrl}?event=${encodeURIComponent(submitted.event.id)}`);
    } catch (error) {
      setFormError(error);
    }
  }

  /** Gửi form mặc định chỉ lưu nháp; nút riêng thực hiện nộp đề xuất để duyệt. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void persist(false);
  }

  return (
    <div className="max-w-7xl">
      {/* Tiêu đề trang, liên kết quay lại và trạng thái hồ sơ đã lưu. */}
      <PageHeader
        title={t(existing ? "clubEvents.edit" : "clubEvents.create")}
        description={t("clubEvents.notice")}
        back={{ to: eventsListUrl, label: t("clubEvents.back") }}
        actions={
          existing && (
            <AppBadge tone={stateTones[existing.state] ?? "neutral"}>
              {stateLabel(t, existing.state)}
            </AppBadge>
          )
        }
      />

      <form noValidate onSubmit={handleSubmit} className="space-y-6">
        {/* Hiển thị yêu cầu chỉnh sửa của ICPDP khi đề xuất được trả về. */}
        {!isNew && revisionSections.length > 0 && (
          <div role="status" className="rounded-xl border-l-4 border-warning-app bg-warning-app/10 px-4 py-3 text-sm">
            <p className="font-semibold">
              {t("clubEvents.revisionSections")}: {revisionSections.map((s) => sectionLabel(t, s)).join(", ")}
            </p>
            {revisionRequest?.reason && <p className="mt-1 whitespace-pre-wrap break-words">{revisionRequest.reason}</p>}
          </div>
        )}

        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        {/* Khu vực tài liệu: hướng dẫn nhập, file mẫu và tài liệu vừa chọn hoặc đã lưu. */}
        <section id="proposal-document" className={sectionCardClass}>
          <div>
            <h2 className="font-heading text-base font-semibold">{t("clubEvents.proposalDocumentSection")}</h2>
            <p className="mt-1 text-sm text-muted-app">{t("clubEvents.proposalDocumentHint")}</p>
            <details className="mt-2 text-sm text-muted-app">
              <summary className="font-medium">{t("clubEvents.importGuideTitle")}</summary>
              <p className="mt-2">{t("clubEvents.importGuide")}</p>
            </details>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-app bg-surface-app p-4 text-sm">
            <div className="min-w-0">
              <p className="font-medium">{t("clubEvents.templateTitle")}</p>
              {template.data ? (
                <p className="break-words text-muted-app">
                  {template.data.fileName} · {formatBytes(template.data.bytes)} ·{" "}
                  {template.data.isSystemDefault
                    ? t("clubEvents.templateDefault")
                    : t("clubEvents.templateUpdated", { date: format.format(new Date(template.data.updatedAt)) })}
                </p>
              ) : template.isError ? (
                <p className="text-danger-app">{t("clubEvents.templateLoadError")}</p>
              ) : (
                <AppSkeleton className="mt-1 h-4 w-48" />
              )}
            </div>
            {/* Mở tab riêng để giữ nguyên bản nháp dù server trả file trực tiếp hay chuyển hướng. */}
            <a href={EVENT_PROPOSAL_TEMPLATE_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className={secondaryLinkClass}>
              <AppIcon name="download" className="size-4" />
              {t("clubEvents.templateDownload")}
            </a>
          </div>
          <div className="space-y-2 text-sm">
            <p className="flex flex-wrap items-center gap-2 font-medium text-text-app">
              <span>
                {t("clubEvents.proposalDocumentField")}
                <AppRequiredMark />
              </span>
              {flag("content") && <AppBadge tone="warning">{flag("content")}</AppBadge>}
            </p>
            {/* Xóa giá trị ô chọn file ẩn sau khi chọn để có thể chọn lại cùng một file. */}
            <input
              ref={fileInput}
              type="file"
              accept=".docx"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                void pickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {/* File vừa chọn chờ tải lên; file đã lưu có thao tác tải xuống hoặc xem. */}
            {pendingFile ? (
              <div className="rounded-xl border border-border-app bg-surface-app p-3">
                <p className="break-words font-medium">{pendingFile.file.name} · {formatBytes(pendingFile.file.size)}</p>
                <p className="text-muted-app">{t("clubEvents.proposalDocumentPending")}</p>
              </div>
            ) : savedDocument ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-app bg-surface-app p-3">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="break-words font-medium">{savedDocument.fileName} · {formatBytes(savedDocument.bytes)}</p>
                  <p className="text-muted-app">{t("clubEvents.proposalDocumentUploaded", { date: format.format(new Date(savedDocument.uploadedAt)) })}</p>
                </div>
                <AppButton type="button" variant="secondary" disabled={documentAccess.isPending} onClick={() => void openDocument(false)}>
                  <AppIcon name="download" className="size-4" />
                  {t("clubEvents.proposalDocumentDownload")}
                </AppButton>
                {savedDocument.mimeType === "application/pdf" && (
                  <AppButton type="button" variant="ghost" disabled={documentAccess.isPending} onClick={() => void openDocument(true)}>
                    {t("clubEvents.proposalDocumentView")}
                  </AppButton>
                )}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <AppButton
                type="button"
                variant="secondary"
                disabled={mutation.isPending || reading}
                aria-invalid={documentError ? true : undefined}
                onClick={() => fileInput.current?.click()}
              >
                <AppIcon name="file" className="size-4" />
                {t(pendingFile ? "clubEvents.proposalDocumentRechoose" : savedDocument ? "clubEvents.proposalDocumentReplace" : "clubEvents.proposalDocumentChoose")}
              </AppButton>
              <span className="text-muted-app">{t("clubEvents.importDocxOnly")}</span>
            </div>
            {/* Hiển thị lỗi file, tiến trình trích xuất, kết quả kiểm tra và lỗi truy cập tài liệu. */}
            <AppFieldError message={documentError} />
            {reading && <p role="status" className="text-muted-app">{t("clubEvents.importReading")}</p>}
            {imported && !reading && <p role="status" className="text-success-app">{t("clubEvents.importRead")}</p>}
            {imported && imported.missing.length > 0 && <AppNotice tone="warning" role="alert">
              <p>{t("clubEvents.importMissing")}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {imported.missing.map((key) => <li key={key}>{t(`clubEvents.${key}`, { defaultValue: key })}</li>)}
              </ul>
            </AppNotice>}
            {(imported || existing) && invalidValues.length > 0 && <AppNotice tone="warning" role="alert">
              <p>{t("clubEvents.importInvalid")}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">{invalidValues.map((error) => <li key={error}>{error}</li>)}</ul>
            </AppNotice>}
            {documentAccess.isError && <ClubEventErrorMessage error={documentAccess.error} />}
          </div>
        </section>

        {/* Khung xem toàn bộ tài liệu, kèm trạng thái đang tải, chưa có file hoặc tải file đã lưu bị lỗi. */}
        <div className="min-w-0">
          {!fileError && !reading && previewFile ? <EventProposalDocument file={previewFile} />
            : reading || (!pendingFile && savedDocument && !fileError && savedPreview.isPending) ? <AppSkeleton className="h-[76vh] min-h-[420px] w-full" />
              : <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-app bg-surface-app p-8 text-center">
                <AppIcon name="file" className="size-12 text-muted-app" />
                <h2 className="font-heading text-xl font-semibold">{t("clubEvents.documentViewer")}</h2>
                <p className="max-w-sm text-sm leading-relaxed text-muted-app">{t("clubEvents.documentEmpty")}</p>
              </div>}
          {!pendingFile && savedPreview.isError && <div className="mt-3"><AppNotice tone="warning" role="alert">{t("clubEvents.documentLoadError")}</AppNotice></div>}
        </div>
        </div>
        {/* Các trường trích xuất chỉ đọc để hệ thống kiểm tra thông tin đề xuất. */}
        {(imported || (existing && !fileError && !reading)) && <EventProposalPreview input={draft} extracted={imported ?? undefined} file={previewFile} missing={imported?.missing ?? []} />}

        {/* Hiển thị lỗi lưu hồ sơ hoặc tải dữ liệu lựa chọn và giữ lại bản nháp hiện tại. */}
        {(Boolean(formError) || Boolean(optionsError)) && (
          <AppNotice tone="danger">
            {uploadFailed && <p className="mb-1 text-sm font-semibold">{t("clubEvents.proposalDocumentUploadFailed")}</p>}
            <ClubEventErrorMessage error={formError ?? optionsError} />
          </AppNotice>
        )}

        {/* Nhóm nút quay lại, lưu nháp và lưu rồi nộp; hai nút ghi dữ liệu dùng chung điều kiện kiểm tra. */}
        <div className="flex flex-wrap items-center gap-3">
          <Link to={eventsListUrl} className={secondaryLinkClass}>
            {t("clubEvents.cancelForm")}
          </Link>
          <AppButton type="submit" variant="secondary" disabled={mutation.isPending || !canPersist}>
            {t("clubEvents.save")}
          </AppButton>
          <AppButton type="button" disabled={mutation.isPending || !canPersist} onClick={() => void persist(true)}>
            <AppIcon name="send" className="size-4" />
            {t("clubEvents.saveAndSubmit")}
          </AppButton>
        </div>
      </form>
    </div>
  );
}

/** Trang UC25: kiểm tra quyền trong CLB và tải đề xuất còn được phép chỉnh sửa. */
export function ClubEventProposalPage() {
  const { clubId = "", eventId } = useParams();
  const { t } = useTranslation();
  const auth = useAuth();
  // Xác định quyền trong đúng CLB trước khi cho phép tải dữ liệu được bảo vệ.
  const permissions = auth.data?.workspaces.find((w) => w.kind === "club" && w.clubId === clubId)?.permissions ?? [];
  const allowed = permissions.includes("club.event.manage");
  const detail = useClubEvent(clubId, eventId ?? "", allowed && Boolean(eventId));
  const options = useClubEventOptions(clubId, allowed);
  const eventsListUrl = `/club/${encodeURIComponent(clubId)}/events`;

  // Chỉ chờ truy vấn đã bật, sau đó phân biệt lỗi thiếu quyền và hồ sơ không tồn tại.
  if (auth.isPending || (eventId && allowed && detail.isPending)) {
    return (
      <div className="max-w-4xl space-y-4">
        <AppSkeleton className="h-12 w-2/3" />
        <AppSkeleton className="h-72 w-full" />
      </div>
    );
  }
  if (!allowed || !auth.data) {
    return <AppNotice tone="danger" role="alert">{t("clubEvents.noAccess")}</AppNotice>;
  }
  if (eventId && (detail.isError || !detail.data)) {
    return (
      <div className="max-w-4xl">
        <PageHeader title={t("clubEvents.edit")} back={{ to: eventsListUrl, label: t("clubEvents.back") }} />
        <AppNotice tone="danger">
          {detail.error ? <ClubEventErrorMessage error={detail.error} /> : <p>{t("clubEvents.notFound")}</p>}
        </AppNotice>
      </div>
    );
  }
  // Không cho chỉnh sửa qua form tạo nếu đề xuất đã nộp hoặc đã chốt trạng thái.
  if (eventId && detail.data && !["Draft", "Revision Requested"].includes(detail.data.event.state)) {
    return (
      <div className="max-w-4xl">
        <PageHeader
          title={detail.data.event.title}
          back={{ to: eventsListUrl, label: t("clubEvents.back") }}
          actions={
            <AppBadge tone={stateTones[detail.data.event.state] ?? "neutral"}>
              {stateLabel(t, detail.data.event.state)}
            </AppBadge>
          }
        />
        <AppNotice tone="warning">{t("clubEvents.notEditable")}</AppNotice>
      </div>
    );
  }

  return (
    // Khởi tạo lại trạng thái form khi chuyển giữa bản nháp mới và một đề xuất khác.
    <ProposalForm
      key={eventId ?? "new"}
      clubId={clubId}
      csrfToken={auth.data.csrfToken}
      detail={eventId ? detail.data : undefined}
      options={options.data}
      optionsError={options.error}
    />
  );
}
