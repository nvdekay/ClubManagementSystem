import { useTranslation } from "react-i18next";

import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import type { Locale } from "@/i18n";
import type { FeedbackCategory, ReceivedFeedback } from "@/services/studentFeedback";
import { formatDate } from "@/utils/formatDate";

const categoryKeys = { suggestion: "studentFeedback.category_suggestion", praise: "studentFeedback.category_praise",
  issue: "studentFeedback.category_issue" } as const;
const categoryTone: Record<FeedbackCategory, AppBadgeTone> = { suggestion: "info", praise: "success", issue: "warning" };

interface StudentFeedbackListProps {
  items: ReceivedFeedback[];
  /** "sent" shows the recipient (student view); "received" shows the sender (club/ICPDP inbox). */
  variant: "sent" | "received";
  emptyMessage: string;
}

/** One-way feedback rows (UC50). Anonymous senders are omitted by the API; this only renders what it gets. */
export function StudentFeedbackList({ items, variant, emptyMessage }: StudentFeedbackListProps) {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === "vi" ? "vi" : "en";
  if (items.length === 0) return <p className="py-10 text-center text-muted-app">{emptyMessage}</p>;
  return (
    <ul className="divide-y divide-border-app border-y border-border-app">
      {items.map((item) => (
        <li key={item.id} className="flex gap-4 px-2 py-4">
          <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft-app text-primary-app">
            <AppIcon name={item.recipient === "ICPDP" ? "shield" : "users"} />
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <AppBadge tone={categoryTone[item.category]}>{t(categoryKeys[item.category])}</AppBadge>
              {item.isAnonymous && <AppBadge>{t("studentFeedback.anonymousTag")}</AppBadge>}
              <span className="text-sm font-semibold break-words">
                {variant === "sent"
                  ? item.recipient === "ICPDP" ? t("studentFeedback.toIcpdp") : t("studentFeedback.toClub", { name: item.clubName ?? "" })
                  : item.sender ? t("studentFeedback.from", { name: item.sender.displayName }) : t("studentFeedback.fromAnonymous")}
              </span>
            </div>
            <p className="break-words whitespace-pre-line">{item.message}</p>
            <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-app">
              {variant === "received" && item.sender && <span className="break-all">{item.sender.email}</span>}
              {item.recipient === "ICPDP" && item.clubName && <span>{t("studentFeedback.aboutClub", { name: item.clubName })}</span>}
              {item.eventTitle && <span className="break-words">{t("studentFeedback.aboutEvent", { title: item.eventTitle })}</span>}
              <span>{t("studentFeedback.sentOn", { date: formatDate(item.submittedAt, locale) })}</span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
