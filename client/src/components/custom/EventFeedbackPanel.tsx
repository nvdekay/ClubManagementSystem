import { useState } from "react";
import { useTranslation } from "react-i18next";

import { EventFeedbackForm, EventFeedbackSummary } from "@/components/custom/EventFeedbackForm";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useEventFeedbackContext } from "@/hooks/useEventFeedback";

/** Event page section for UC48; renders nothing unless the signed-in student checked in (E3). */
export function EventFeedbackPanel({ eventId }: { eventId: string }) {
  const { t } = useTranslation();
  const auth = useAuth();
  const context = useEventFeedbackContext(eventId, Boolean(auth.data));
  const [justSent, setJustSent] = useState(false);
  if (!auth.data) return null;
  if (context.isPending) return <AppSkeleton className="mt-8 h-32 w-full" />;
  if (context.isError) {
    return <AppNotice tone="danger" role="alert" className="mt-8" title={t("eventFeedback.loadError")}>
      <p>{context.error.message}</p></AppNotice>;
  }
  if (!context.data.attended) return null;
  const { feedback, canSubmit, closesAt } = context.data;
  return (
    <section aria-labelledby="event-feedback-title" className="mt-8 rounded-3xl bg-surface-app p-5 sm:p-6">
      <h2 id="event-feedback-title" className="font-heading text-xl font-bold">{t("eventFeedback.title")}</h2>
      <div className="mt-4">
        {feedback ? <div className="space-y-2">
          {justSent && <p role="status" className="text-sm font-semibold text-success-app">{t("eventFeedback.submitted")}</p>}
          <EventFeedbackSummary feedback={feedback} /></div>
          : canSubmit ? <EventFeedbackForm eventId={eventId} closesAt={closesAt} onSubmitted={() => setJustSent(true)} />
            : <AppNotice>{t("eventFeedback.closed")}</AppNotice>}
      </div>
    </section>
  );
}
