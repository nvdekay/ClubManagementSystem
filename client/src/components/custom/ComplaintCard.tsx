import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import type { Locale } from "@/i18n";
import type { ComplaintClubResponse, ComplaintEvidence, ComplaintState } from "@/services/complaints";
import { formatDate } from "@/utils/formatDate";

const stateTone: Record<ComplaintState, AppBadgeTone> = {
  Submitted: "info", "Under Triage": "info", Dismissed: "neutral", Forwarded: "warning", "Club Responded": "info",
  Escalated: "danger", Closed: "success", Withdrawn: "neutral",
};

export function complaintStateKey(state: ComplaintState) {
  switch (state) {
    case "Submitted": return "complaints.state_Submitted" as const;
    case "Under Triage": return "complaints.state_Under Triage" as const;
    case "Dismissed": return "complaints.state_Dismissed" as const;
    case "Forwarded": return "complaints.state_Forwarded" as const;
    case "Club Responded": return "complaints.state_Club Responded" as const;
    case "Escalated": return "complaints.state_Escalated" as const;
    case "Closed": return "complaints.state_Closed" as const;
    case "Withdrawn": return "complaints.state_Withdrawn" as const;
  }
}

export function complaintTypeKey(type: string) {
  switch (type) {
    case "CONDUCT": return "complaints.type_CONDUCT" as const;
    case "EVENT": return "complaints.type_EVENT" as const;
    case "FINANCE": return "complaints.type_FINANCE" as const;
    case "SAFETY": return "complaints.type_SAFETY" as const;
    case "suggestion": return "complaints.type_suggestion" as const;
    case "praise": return "complaints.type_praise" as const;
    case "issue": return "complaints.type_issue" as const;
    default: return "complaints.type_OTHER" as const;
  }
}

interface ComplaintCardProps {
  title: string;
  state: ComplaintState;
  type: string;
  description: string;
  evidence: ComplaintEvidence[];
  eventTitle?: string;
  at: string;
  responseDueAt?: string;
  note?: { label: string; text: string };
  clubResponse?: ComplaintClubResponse;
  closureReason?: string;
  extra?: ReactNode;
  actions?: ReactNode;
}

/** One complaint (UC50–UC52) for any reader; the caller decides which fields it may show (D5). */
export function ComplaintCard(props: ComplaintCardProps) {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === "vi" ? "vi" : "en";
  const overdue = props.state === "Forwarded" && props.responseDueAt && new Date(props.responseDueAt) < new Date();
  return (
    <article className="rounded-2xl border border-border-app p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <AppBadge tone={stateTone[props.state]}>{t(complaintStateKey(props.state))}</AppBadge>
        <AppBadge>{t(complaintTypeKey(props.type))}</AppBadge>
        {overdue && <AppBadge tone="danger">{t("complaints.overdue")}</AppBadge>}
        <span className="min-w-0 font-semibold break-words">{props.title}</span>
      </div>
      <p className="mt-2 break-words whitespace-pre-line">{props.description}</p>
      {props.evidence.length > 0 && <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {props.evidence.map((item) => <li key={item.url}>
          <a className="break-all text-primary-app underline" href={item.url} target="_blank" rel="noreferrer noopener">{item.label}</a>
        </li>)}
      </ul>}
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-app">
        {props.eventTitle && <span className="break-words">{t("complaints.aboutEvent", { title: props.eventTitle })}</span>}
        <span>{t("complaints.submittedOn", { date: formatDate(props.at, locale) })}</span>
        {props.responseDueAt && props.state === "Forwarded"
          && <span>{t("complaints.dueOn", { date: formatDate(props.responseDueAt, locale) })}</span>}
      </p>
      {props.extra}
      {props.note && props.note.text && <div className="mt-3 rounded-xl bg-surface-app p-3 text-sm">
        <p className="font-semibold">{props.note.label}</p><p className="break-words whitespace-pre-line">{props.note.text}</p></div>}
      {props.clubResponse && <div className="mt-3 rounded-xl bg-surface-app p-3 text-sm">
        <p className="font-semibold">{t("complaints.clubAnswer")}</p>
        <p className="break-words whitespace-pre-line">{props.clubResponse.text}</p>
        <p className="mt-2 font-semibold">{t("complaints.clubAction")}</p>
        <p className="break-words whitespace-pre-line">{props.clubResponse.action}</p></div>}
      {props.closureReason && <div className="mt-3 rounded-xl bg-surface-app p-3 text-sm">
        <p className="font-semibold">{t("complaints.closureReason")}</p><p className="break-words">{props.closureReason}</p></div>}
      {props.actions && <div className="mt-4 flex flex-wrap gap-2">{props.actions}</div>}
    </article>
  );
}
