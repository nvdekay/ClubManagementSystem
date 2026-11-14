import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import type { ClubEventError } from "@/services/clubEvents";

interface ClubEventErrorMessageProps {
  error: unknown;
}

function obligationLabel(t: TFunction, item: string) {
  const [key, value] = item.split(":", 2);
  switch (key) {
    case "overdueSettlement": return t("clubEvents.overdueSettlement");
    case "overdueRefund": return t("clubEvents.overdueRefund");
    case "overduePeriodicReport": return t("clubEvents.overduePeriodicReport", { period: value ?? "" });
    case "overduePostEventReport": return t("clubEvents.overduePostEventReport");
    default: return item;
  }
}

/** Spells out what the server named (UC25 E2 obligations, UC30 E1 affected registrations) instead of its raw message. */
export function ClubEventErrorMessage({ error }: ClubEventErrorMessageProps) {
  const { t } = useTranslation();
  if (!error) return null;
  const details = error instanceof Error && "details" in error ? (error as ClubEventError).details : undefined;
  const className = "break-words text-sm text-danger-app";
  if (details?.obligations?.length) {
    return (
      <div role="alert" className={className}>
        <p>{t("clubEvents.blockedByObligations")}</p>
        <ul className="mt-1 list-disc pl-5">
          {details.obligations.map((item) => <li key={item}>{obligationLabel(t, item)}</li>)}
        </ul>
      </div>
    );
  }
  if (details?.registrationIds?.length) {
    return <p role="alert" className={className}>{t("clubEvents.capacityBelowConfirmed", { count: details.registrationIds.length })}</p>;
  }
  if (details?.conflicts?.length) {
    return <p role="alert" className={className}>{t("clubEvents.blockingConflicts", { count: details.conflicts.length })}</p>;
  }
  return <p role="alert" className={className}>{error instanceof Error ? error.message : String(error)}</p>;
}
