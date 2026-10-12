import { useId, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { useAuth } from "@/hooks/useAuth";
import { useEventCheckIn } from "@/hooks/useEventCheckIns";
import type { Locale } from "@/i18n";
import type { CheckInResult } from "@/services/eventCheckIns";
import { formatDate } from "@/utils/formatDate";

interface EventCheckInFormProps {
  eventId: string;
  /** Pre-filled from a scanned QR deep link. */
  initialCode?: string;
  autoFocus?: boolean;
  onCheckedIn?: (result: CheckInResult) => void;
}

/** UC31 self check-in: the student types (or a QR deep link pre-fills) the code shown at the venue. */
export function EventCheckInForm({ eventId, initialCode = "", autoFocus, onCheckedIn }: EventCheckInFormProps) {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === "vi" ? "vi" : "en";
  const auth = useAuth();
  const checkIn = useEventCheckIn();
  const inFlight = useRef(false);
  const inputId = useId();
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<CheckInResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.data || inFlight.current || !code.trim()) return;
    inFlight.current = true;
    try {
      const done = await checkIn.mutateAsync({ eventId, code: code.trim(), csrfToken: auth.data.csrfToken });
      setResult(done);
      onCheckedIn?.(done);
    } catch {
      // checkIn.isError renders the message below.
    } finally {
      inFlight.current = false;
    }
  }

  if (result) {
    return (
      <AppNotice tone="success" role="status"
        title={result.alreadyCheckedIn ? t("eventRegistrations.checkInAlready") : t("eventRegistrations.checkInSuccess")}>
        <p>{t("eventRegistrations.checkedInAt", { date: formatDate(result.checkedInAt, locale) })}</p>
        <p>{result.feedbackClosesAt
          ? t("eventRegistrations.feedbackOpenUntil", { date: formatDate(result.feedbackClosesAt, locale) })
          : t("eventRegistrations.feedbackOpenNoDeadline")}</p>
      </AppNotice>
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-3">
      <label htmlFor={inputId} className="block text-sm font-medium">{t("eventRegistrations.checkInCode")}</label>
      <p className="text-sm text-muted-app">{t("eventRegistrations.checkInHint")}</p>
      <div className="flex flex-wrap gap-2">
        <AppInput id={inputId} value={code} required maxLength={64} autoComplete="off" autoCapitalize="characters"
          spellCheck={false} autoFocus={autoFocus} onChange={(event) => setCode(event.target.value)}
          className="min-w-0 flex-1 basis-48 font-mono tracking-wider uppercase" />
        <AppButton type="submit" disabled={checkIn.isPending || !code.trim()} className="shrink-0">
          {checkIn.isPending ? t("eventRegistrations.checkingIn") : t("eventRegistrations.checkInSubmit")}
        </AppButton>
      </div>
      {checkIn.isError && <AppNotice tone="danger" role="alert" title={t("eventRegistrations.checkInError")}>
        <p>{checkIn.error.message}</p></AppNotice>}
    </form>
  );
}
