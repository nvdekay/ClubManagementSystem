import { useTranslation } from "react-i18next";

import { StudentFeedbackList } from "@/components/custom/StudentFeedbackList";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useIcpdpFeedbackInbox } from "@/hooks/useStudentFeedback";

/** ICPDP inbox for UC50 feedback students addressed to the university. */
export function StudentFeedbackInboxPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const inbox = useIcpdpFeedbackInbox(Boolean(auth.data));
  return (
    <>
      <PageHeader title={t("studentFeedback.inboxTitle")} description={t("studentFeedback.inboxIcpdpDescription")} />
      {inbox.isPending ? <AppSkeleton className="h-48 w-full" />
        : inbox.isError ? <AppNotice tone="danger" role="alert" title={t("studentFeedback.loadError")}>
          <p>{inbox.error.message}</p>
          <AppButton variant="secondary" onClick={() => void inbox.refetch()}>{t("studentFeedback.retry")}</AppButton></AppNotice>
          : <StudentFeedbackList items={inbox.data} variant="received" emptyMessage={t("studentFeedback.inboxEmpty")} />}
    </>
  );
}
