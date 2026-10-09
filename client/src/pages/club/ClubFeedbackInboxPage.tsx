import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { StudentFeedbackList } from "@/components/custom/StudentFeedbackList";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useClubFeedbackInbox } from "@/hooks/useStudentFeedback";

/** Club inbox for UC50 feedback addressed to this club (club.feedback.view). */
export function ClubFeedbackInboxPage() {
  const { t } = useTranslation();
  const { clubId } = useParams();
  const auth = useAuth();
  const inbox = useClubFeedbackInbox(clubId, Boolean(auth.data));
  return (
    <>
      <PageHeader title={t("studentFeedback.inboxTitle")} description={t("studentFeedback.inboxClubDescription")} />
      {inbox.isPending ? <AppSkeleton className="h-48 w-full" />
        : inbox.isError ? <AppNotice tone="danger" role="alert" title={t("studentFeedback.loadError")}>
          <p>{inbox.error.message}</p>
          <AppButton variant="secondary" onClick={() => void inbox.refetch()}>{t("studentFeedback.retry")}</AppButton></AppNotice>
          : <StudentFeedbackList items={inbox.data} variant="received" emptyMessage={t("studentFeedback.inboxEmpty")} />}
    </>
  );
}
