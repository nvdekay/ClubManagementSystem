import { useId, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppStarRating } from "@/components/ui/star-rating/AppStarRating";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useSubmitEventFeedback } from "@/hooks/useEventFeedback";
import type { Locale } from "@/i18n";
import type { MyEventFeedback } from "@/services/eventFeedback";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/formatDate";

const MAX_COMMENT = 2000;

const ratingWords = ["eventFeedback.ratingWord1", "eventFeedback.ratingWord2", "eventFeedback.ratingWord3",
  "eventFeedback.ratingWord4", "eventFeedback.ratingWord5"] as const;

/** i18n key of the word shown next to a 1–5 rating. */
function ratingWord(rating: number) {
  return ratingWords[Math.min(Math.max(rating, 1), 5) - 1]!;
}

/** Read-only view of the author's own submission (stars, comment, date). */
export function EventFeedbackSummary({ feedback }: { feedback: MyEventFeedback }) {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === "vi" ? "vi" : "en";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span role="img" aria-label={t("eventFeedback.star", { count: feedback.rating })} className="flex">
          {[1, 2, 3, 4, 5].map((star) => <AppIcon key={star} name="star" className={cn("size-5",
            star <= feedback.rating ? "fill-current text-warning-app" : "text-border-app")} />)}
        </span>
        <span className="text-sm font-semibold">{t(ratingWord(feedback.rating))}</span>
        {feedback.isAnonymous && <span className="rounded-full bg-surface-strong-app px-2.5 py-0.5 text-xs font-semibold text-muted-app">
          {t("eventFeedback.anonymousTag")}</span>}
      </div>
      <p className="text-sm break-words whitespace-pre-line">{feedback.comment}</p>
      <p className="text-xs text-muted-app">{t("eventFeedback.submittedOn", { date: formatDate(feedback.submittedAt, locale) })}</p>
    </div>
  );
}

interface EventFeedbackFormProps {
  eventId: string;
  closesAt: string | null;
  onSubmitted?: (feedback: MyEventFeedback) => void;
}

/** UC48: one immutable star rating + comment per checked-in attendee, optionally anonymous. */
export function EventFeedbackForm({ eventId, closesAt, onSubmitted }: EventFeedbackFormProps) {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === "vi" ? "vi" : "en";
  const auth = useAuth();
  const submit = useSubmitEventFeedback();
  const inFlight = useRef(false);
  const commentId = useId();
  const anonymousId = useId();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.data || inFlight.current || !event.currentTarget.reportValidity()) return;
    inFlight.current = true;
    try {
      const saved = await submit.mutateAsync({ eventId, rating, comment: comment.trim(), isAnonymous,
        csrfToken: auth.data.csrfToken });
      onSubmitted?.(saved);
    } catch {
      // submit.isError renders the message below.
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <form onSubmit={(event) => void send(event)} className="space-y-4">
      <p className="text-sm text-muted-app">{t("eventFeedback.intro")}</p>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t("eventFeedback.ratingLabel")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <AppStarRating value={rating} onChange={setRating} required label={t("eventFeedback.ratingLabel")}
            starLabel={(count) => t("eventFeedback.star", { count })} />
          {rating > 0 && <span className="text-sm font-semibold text-warning-app">{t(ratingWord(rating))}</span>}
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={commentId} className="block text-sm font-medium">{t("eventFeedback.commentLabel")}</label>
        <AppTextarea id={commentId} value={comment} required maxLength={MAX_COMMENT} rows={4} className="w-full"
          placeholder={t("eventFeedback.commentPlaceholder")} onChange={(event) => setComment(event.target.value)} />
        <p className="text-right text-xs text-muted-app tabular-nums">
          {t("eventFeedback.commentCount", { count: comment.length, max: MAX_COMMENT })}</p>
      </div>
      <div className="flex items-start gap-3">
        <input id={anonymousId} type="checkbox" checked={isAnonymous} onChange={(event) => setIsAnonymous(event.target.checked)}
          className="mt-1 size-4 shrink-0 accent-primary-app" />
        <label htmlFor={anonymousId} className="min-w-0 text-sm">
          <span className="font-medium">{t("eventFeedback.anonymous")}</span>
          <span className="block text-muted-app">{t("eventFeedback.anonymousHint")}</span>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <AppButton type="submit" disabled={submit.isPending || rating === 0 || !comment.trim()}>
          {submit.isPending ? t("eventFeedback.submitting") : t("eventFeedback.submit")}
        </AppButton>
        {closesAt && <span className="text-xs text-muted-app">{t("eventFeedback.closesAt", { date: formatDate(closesAt, locale) })}</span>}
      </div>
      {submit.isError && <AppNotice tone="danger" role="alert" title={t("eventFeedback.error")}><p>{submit.error.message}</p></AppNotice>}
    </form>
  );
}
