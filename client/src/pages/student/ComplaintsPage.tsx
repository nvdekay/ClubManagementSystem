import { useId, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { ClubLogo } from "@/components/custom/ClubLogo";
import { ComplaintCard, complaintTypeKey } from "@/components/custom/ComplaintCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSearchInput } from "@/components/ui/search-input/AppSearchInput";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { appToast } from "@/components/ui/toast/AppToast";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useMyComplaints, useSubmitComplaint, useWithdrawComplaint } from "@/hooks/useComplaints";
import { useConfirm } from "@/hooks/useConfirm";
import { useClub, useClubs } from "@/hooks/useDiscovery";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { COMPLAINT_TYPES, type ComplaintEvidence, type ComplaintType } from "@/services/complaints";

const MAX_TEXT = 4000;
const MAX_EVIDENCE = 5;

/** UC50: send a complaint to ICPDP (BR38) and follow or withdraw it. */
export function ComplaintsPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const confirm = useConfirm();
  const mine = useMyComplaints(Boolean(auth.data));
  const send = useSubmitComplaint();
  const withdraw = useWithdrawComplaint();
  const inFlight = useRef(false);
  const descriptionId = useId();
  const [club, setClub] = useState<{ id: string; name: string } | null>(null);
  const [clubSearch, setClubSearch] = useState("");
  const [eventId, setEventId] = useState("");
  const [type, setType] = useState<ComplaintType>("CONDUCT");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState<ComplaintEvidence[]>([]);
  const [done, setDone] = useState(false);
  const clubs = useClubs(clubSearch, "", 1);
  const clubDetail = useClub(club?.id ?? "");
  const events = clubDetail.data ? [...clubDetail.data.upcomingEvents, ...clubDetail.data.history] : [];
  const field = useFieldValidation({
    club: club ? null : t("complaints.clubRequired"),
    description: description.trim() ? null : t("common.fieldRequired"),
  });

  function chooseClub(next: { id: string; name: string } | null) {
    setClub(next);
    setEventId("");
    if (next) field.touch("club");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!field.touchAll() || !auth.data || !club || inFlight.current) return;
    inFlight.current = true;
    setDone(false);
    try {
      await send.mutateAsync({ clubId: club.id, ...(eventId ? { eventId } : {}), type, description: description.trim(),
        evidence: evidence.filter((item) => item.url.trim()), csrfToken: auth.data.csrfToken });
      setDescription("");
      setEvidence([]);
      field.reset();
      setDone(true);
    } catch {
      // send.isError renders the message below.
    } finally {
      inFlight.current = false;
    }
  }

  async function withdrawOne(id: string) {
    if (!auth.data || !(await confirm(t("complaints.withdrawConfirm")))) return;
    try {
      await withdraw.mutateAsync({ id, csrfToken: auth.data.csrfToken });
      appToast.success(t("complaints.withdrawn"));
    } catch (error) {
      appToast.danger(error instanceof Error ? error.message : t("complaints.error"));
    }
  }

  return (
    <>
      <PageHeader title={t("complaints.title")} description={t("complaints.description")} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby="complaint-form-title" className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs sm:p-6">
          <h2 id="complaint-form-title" className="font-heading text-base font-semibold">{t("complaints.formTitle")}</h2>
          <form noValidate onSubmit={(event) => void submit(event)} className="mt-5 space-y-5">
            <div className="space-y-2"
              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) field.touch("club"); }}>
              <p className="text-sm font-medium">{t("complaints.clubLabel")}<AppRequiredMark /></p>
              {club ? (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-brand-app bg-primary-soft-app p-3">
                  <span className="min-w-0 flex-1 text-sm font-semibold break-words">{t("complaints.clubSelected", { name: club.name })}</span>
                  <AppButton type="button" variant="secondary" onClick={() => chooseClub(null)}>
                    {t("complaints.clubChange")}
                  </AppButton>
                </div>
              ) : (
                <div className="space-y-2">
                  <AppSearchInput className="w-full" placeholder={t("complaints.clubSearch")}
                    aria-label={t("complaints.clubSearch")} onSearch={setClubSearch} />
                  {clubs.isPending ? <AppSkeleton className="h-24 w-full" />
                    : clubs.isError ? <p role="alert" className="text-sm text-danger-app">{clubs.error.message}</p>
                      : clubs.data.items.length === 0 ? <AppEmptyState message={t("complaints.clubNone")} />
                        : <ul className="max-h-64 divide-y divide-border-app overflow-y-auto rounded-lg border border-border-app bg-bg-app">
                          {clubs.data.items.map((item) => (
                            <li key={item.id}>
                              <button type="button" onClick={() => chooseClub({ id: item.id, name: item.name })}
                                className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface-app focus-visible:bg-surface-app focus-visible:outline-none">
                                <ClubLogo name={item.name} logoUrl={item.logoUrl} size={32} className="rounded-lg" />
                                <span className="min-w-0 flex-1 break-words">{item.name}</span>
                              </button>
                            </li>
                          ))}
                        </ul>}
                  {field.error("club") ? <AppFieldError message={field.error("club")} />
                    : <p className="text-xs text-muted-app">{t("complaints.clubRequired")}</p>}
                </div>
              )}
            </div>

            {club && events.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("complaints.eventLabel")}</p>
                <AppSelect label={t("complaints.eventLabel")} value={eventId} className="w-full" onChange={setEventId}
                  options={[{ value: "", label: t("complaints.eventNone") },
                    ...events.map((item) => ({ value: item.id, label: item.title }))]} />
              </div>
            )}

            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">{t("complaints.typeLabel")}</legend>
              <div className="flex flex-wrap gap-2">
                {COMPLAINT_TYPES.map((value) => (
                  <label key={value} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border-app bg-bg-app px-3.5 text-sm sm:min-h-9 has-checked:border-brand-app has-checked:bg-primary-soft-app has-checked:text-primary-app">
                    <input type="radio" name="type" value={value} checked={type === value}
                      onChange={() => setType(value)} className="accent-primary-app" />
                    {t(complaintTypeKey(value))}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <label htmlFor={descriptionId} className="block text-sm font-medium">{t("complaints.descriptionLabel")}<AppRequiredMark /></label>
              <AppTextarea id={descriptionId} value={description} {...field.control("description")} maxLength={MAX_TEXT} rows={5}
                className="w-full" placeholder={t("complaints.descriptionPlaceholder")}
                onChange={(event) => setDescription(event.target.value)} />
              <AppFieldError message={field.error("description")} />
              <p className="text-right text-xs text-muted-app tabular-nums">
                {t("complaints.count", { count: description.length, max: MAX_TEXT })}</p>
            </div>

            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">{t("complaints.evidenceLabel")}</legend>
              <p className="text-xs text-muted-app">{t("complaints.evidenceHint")}</p>
              {evidence.map((item, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2">
                  <AppInput className="min-w-0 flex-1 basis-40" aria-label={t("complaints.evidenceName")} placeholder={t("complaints.evidenceName")}
                    value={item.label} maxLength={120}
                    onChange={(event) => setEvidence((list) => list.map((row, at) => at === index ? { ...row, label: event.target.value } : row))} />
                  <AppInput className="min-w-0 flex-[2] basis-56" type="url" aria-label={t("complaints.evidenceUrl")}
                    placeholder={t("complaints.evidenceUrl")} value={item.url} maxLength={500}
                    onChange={(event) => setEvidence((list) => list.map((row, at) => at === index ? { ...row, url: event.target.value } : row))} />
                  <AppButton type="button" variant="secondary" onClick={() => setEvidence((list) => list.filter((_row, at) => at !== index))}>
                    {t("complaints.removeEvidence")}</AppButton>
                </div>
              ))}
              {evidence.length < MAX_EVIDENCE && <AppButton type="button" variant="secondary"
                onClick={() => setEvidence((list) => [...list, { label: "", url: "" }])}>{t("complaints.addEvidence")}</AppButton>}
            </fieldset>

            <AppButton type="submit" disabled={send.isPending}>
              {send.isPending ? t("complaints.submitting") : t("complaints.submit")}
            </AppButton>
            {done && !send.isError && <p role="status" className="text-sm font-semibold text-success-app">{t("complaints.sent")}</p>}
            {send.isError && <AppNotice tone="danger" role="alert" title={t("complaints.error")}><p>{send.error.message}</p></AppNotice>}
          </form>
        </section>

        <section aria-labelledby="complaint-mine-title">
          <h2 id="complaint-mine-title" className="mb-4 font-heading text-base font-semibold">{t("complaints.mineTitle")}</h2>
          {mine.isPending ? <AppSkeleton className="h-40 w-full" />
            : mine.isError ? <AppNotice tone="danger" role="alert" title={t("complaints.loadError")}>
              <AppButton variant="secondary" onClick={() => void mine.refetch()}>{t("complaints.retry")}</AppButton></AppNotice>
              : mine.data.length === 0 ? <AppEmptyState variant="boxed" message={t("complaints.mineEmpty")} />
                : <ul className="space-y-3">{mine.data.map((item) => <li key={item.id}>
                  <ComplaintCard title={item.clubName ?? ""} state={item.state} type={item.type} description={item.description}
                    evidence={item.evidence} eventTitle={item.eventTitle} at={item.submittedAt} responseDueAt={item.responseDueAt}
                    note={item.triage ? { label: t("complaints.decisionReason"), text: item.triage.reason } : undefined}
                    closureReason={item.closure?.reason}
                    extra={item.linkedComplaintId ? <p className="mt-1 text-xs text-muted-app">{t("complaints.linked")}</p> : undefined}
                    actions={["Submitted", "Under Triage"].includes(item.state) ? <AppButton variant="secondary"
                      disabled={withdraw.isPending} onClick={() => void withdrawOne(item.id)}>{t("complaints.withdraw")}</AppButton> : undefined} />
                </li>)}</ul>}
        </section>
      </div>
    </>
  );
}
