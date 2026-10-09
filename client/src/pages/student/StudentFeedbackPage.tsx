import { useId, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { ClubLogo } from "@/components/custom/ClubLogo";
import { StudentFeedbackList } from "@/components/custom/StudentFeedbackList";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSearchInput } from "@/components/ui/search-input/AppSearchInput";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useClub, useClubs } from "@/hooks/useDiscovery";
import { useMyStudentFeedback, useSendStudentFeedback } from "@/hooks/useStudentFeedback";
import type { FeedbackCategory, FeedbackRecipient } from "@/services/studentFeedback";
import { cn } from "@/utils/cn";

const MAX_MESSAGE = 2000;
const categories: FeedbackCategory[] = ["suggestion", "praise", "issue"];
const categoryKeys = { suggestion: "studentFeedback.category_suggestion", praise: "studentFeedback.category_praise",
  issue: "studentFeedback.category_issue" } as const;

export function StudentFeedbackPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const sent = useMyStudentFeedback(Boolean(auth.data));
  const send = useSendStudentFeedback();
  const inFlight = useRef(false);
  const messageId = useId();
  const anonymousId = useId();
  const [recipient, setRecipient] = useState<FeedbackRecipient>("CLUB");
  const [club, setClub] = useState<{ id: string; name: string } | null>(null);
  const [clubSearch, setClubSearch] = useState("");
  const [eventId, setEventId] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [done, setDone] = useState(false);
  const clubs = useClubs(clubSearch, "", 1);
  const clubDetail = useClub(club?.id ?? "");
  const events = clubDetail.data ? [...clubDetail.data.upcomingEvents, ...clubDetail.data.history] : [];
  const clubMissing = recipient === "CLUB" && !club;

  function chooseClub(next: { id: string; name: string } | null) {
    setClub(next);
    setEventId("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.data || inFlight.current || clubMissing || !event.currentTarget.reportValidity()) return;
    inFlight.current = true;
    setDone(false);
    try {
      await send.mutateAsync({ recipient, category, message: message.trim(), isAnonymous,
        ...(club ? { clubId: club.id } : {}), ...(club && eventId ? { eventId } : {}), csrfToken: auth.data.csrfToken });
      setMessage("");
      setDone(true);
    } catch {
      // send.isError renders the message below.
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <>
      <PageHeader title={t("studentFeedback.title")} description={t("studentFeedback.description")} />
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby="feedback-form-title" className="rounded-3xl bg-surface-app p-5 sm:p-6">
          <h2 id="feedback-form-title" className="font-heading text-xl font-bold">{t("studentFeedback.formTitle")}</h2>
          <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-5">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t("studentFeedback.recipientLabel")}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["CLUB", "ICPDP"] as const).map((value) => (
                  <label key={value} className={cn("flex min-h-11 items-start gap-3 rounded-2xl border border-border-app bg-bg-app p-3 text-sm has-checked:border-primary-app has-checked:bg-primary-soft-app")}>
                    <input type="radio" name="recipient" value={value} checked={recipient === value}
                      onChange={() => setRecipient(value)} className="mt-0.5 accent-primary-app" />
                    <span>
                      <span className="block font-semibold">{value === "CLUB" ? t("studentFeedback.recipientClub") : t("studentFeedback.recipientIcpdp")}</span>
                      <span className="block text-xs text-muted-app">{value === "CLUB" ? t("studentFeedback.recipientClubHint") : t("studentFeedback.recipientIcpdpHint")}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-2">
              <p className="text-sm font-medium">{recipient === "CLUB" ? t("studentFeedback.clubLabel") : t("studentFeedback.clubOptionalLabel")}</p>
              {club ? (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary-app bg-bg-app p-3">
                  <span className="min-w-0 flex-1 text-sm font-semibold break-words">{t("studentFeedback.clubSelected", { name: club.name })}</span>
                  <AppButton type="button" variant="secondary" onClick={() => chooseClub(null)}>
                    {recipient === "CLUB" ? t("studentFeedback.clubChange") : t("studentFeedback.clubClear")}
                  </AppButton>
                </div>
              ) : (
                <div className="space-y-2">
                  <AppSearchInput className="w-full" placeholder={t("studentFeedback.clubSearch")}
                    aria-label={t("studentFeedback.clubSearch")} onSearch={setClubSearch} />
                  {clubs.isPending ? <AppSkeleton className="h-24 w-full" />
                    : clubs.isError ? <p role="alert" className="text-sm text-danger-app">{clubs.error.message}</p>
                      : clubs.data.items.length === 0 ? <p className="text-sm text-muted-app">{t("studentFeedback.clubNone")}</p>
                        : <ul className="max-h-64 divide-y divide-border-app overflow-y-auto rounded-2xl border border-border-app bg-bg-app">
                          {clubs.data.items.map((item) => (
                            <li key={item.id}>
                              <button type="button" onClick={() => chooseClub({ id: item.id, name: item.name })}
                                className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-primary-soft-app focus-visible:bg-primary-soft-app focus-visible:outline-none">
                                <ClubLogo name={item.name} logoUrl={item.logoUrl} size={32} className="rounded-lg" />
                                <span className="min-w-0 flex-1 break-words">{item.name}</span>
                              </button>
                            </li>
                          ))}
                        </ul>}
                  {recipient === "CLUB" && <p className="text-xs text-muted-app">{t("studentFeedback.clubRequired")}</p>}
                </div>
              )}
            </div>

            {club && events.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("studentFeedback.eventLabel")}</p>
                <AppSelect label={t("studentFeedback.eventLabel")} value={eventId} className="w-full" onChange={setEventId}
                  options={[{ value: "", label: t("studentFeedback.eventNone") },
                    ...events.map((item) => ({ value: item.id, label: item.title }))]} />
              </div>
            )}

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t("studentFeedback.categoryLabel")}</legend>
              <div className="flex flex-wrap gap-2">
                {categories.map((value) => (
                  <label key={value} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-app bg-bg-app px-4 text-sm has-checked:border-primary-app has-checked:bg-primary-soft-app has-checked:text-primary-app">
                    <input type="radio" name="category" value={value} checked={category === value}
                      onChange={() => setCategory(value)} className="accent-primary-app" />
                    {t(categoryKeys[value])}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <label htmlFor={messageId} className="block text-sm font-medium">{t("studentFeedback.messageLabel")}</label>
              <AppTextarea id={messageId} value={message} required maxLength={MAX_MESSAGE} rows={5} className="w-full"
                placeholder={t("studentFeedback.messagePlaceholder")} onChange={(event) => setMessage(event.target.value)} />
              <p className="text-right text-xs text-muted-app tabular-nums">
                {t("studentFeedback.messageCount", { count: message.length, max: MAX_MESSAGE })}</p>
            </div>

            <div className="flex items-start gap-3">
              <input id={anonymousId} type="checkbox" checked={isAnonymous} onChange={(event) => setIsAnonymous(event.target.checked)}
                className="mt-1 size-4 shrink-0 accent-primary-app" />
              <label htmlFor={anonymousId} className="min-w-0 text-sm">
                <span className="font-medium">{t("studentFeedback.anonymous")}</span>
                <span className="block text-muted-app">{t("studentFeedback.anonymousHint")}</span>
              </label>
            </div>

            <AppButton type="submit" disabled={send.isPending || clubMissing || !message.trim()}>
              {send.isPending ? t("studentFeedback.submitting") : t("studentFeedback.submit")}
            </AppButton>
            {done && !send.isError && <p role="status" className="text-sm font-semibold text-success-app">{t("studentFeedback.sent")}</p>}
            {send.isError && <AppNotice tone="danger" role="alert" title={t("studentFeedback.error")}><p>{send.error.message}</p></AppNotice>}
          </form>
        </section>

        <section aria-labelledby="feedback-sent-title">
          <h2 id="feedback-sent-title" className="mb-4 font-heading text-xl font-bold">{t("studentFeedback.sentTitle")}</h2>
          {sent.isPending ? <AppSkeleton className="h-40 w-full" />
            : sent.isError ? <AppNotice tone="danger" role="alert" title={t("studentFeedback.loadError")}>
              <AppButton variant="secondary" onClick={() => void sent.refetch()}>{t("studentFeedback.retry")}</AppButton></AppNotice>
              : <StudentFeedbackList items={sent.data} variant="sent" emptyMessage={t("studentFeedback.sentEmpty")} />}
        </section>
      </div>
    </>
  );
}
