import { useId, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useMembershipAction } from "@/hooks/useMemberSpace";
import { MemberSpaceError } from "@/services/memberSpace";

interface ClubMemberOnboardDialogProps {
  clubId: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** UC20 A1: a Club Leader adds a student outside recruitment, with a recorded reason. Mount it only while open. */
export function ClubMemberOnboardDialog({ clubId, onClose, onSaved }: ClubMemberOnboardDialogProps) {
  const { t } = useTranslation();
  const auth = useAuth();
  const action = useMembershipAction();
  const inFlight = useRef(false);
  const emailId = useId();
  const reasonId = useId();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.data || inFlight.current || !event.currentTarget.reportValidity()) return;
    inFlight.current = true;
    try {
      await action.mutateAsync({ kind: "onboard", clubId, email: email.trim(), reason: reason.trim(), csrfToken: auth.data.csrfToken });
      onSaved(t("memberSpace.onboardSaved", { email: email.trim() }));
      onClose();
    } catch {
      // action.isError renders below.
    } finally {
      inFlight.current = false;
    }
  }

  const status = action.error instanceof MemberSpaceError ? action.error.status : 0;
  const errorText = status === 404 ? t("memberSpace.onboardNotFound") : status === 409 ? t("memberSpace.onboardAlready")
    : status === 403 ? t("memberSpace.onboardBanned") : action.error?.message;

  return (
    <AppDialog open title={t("memberSpace.onboardTitle")} closeLabel={t("memberSpace.close")} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <p className="text-sm text-muted-app">{t("memberSpace.onboardHint")}</p>
        <div className="space-y-1.5">
          <label htmlFor={emailId} className="block text-sm font-medium">{t("memberSpace.onboardEmail")}</label>
          <AppInput id={emailId} type="email" required maxLength={320} autoComplete="off" value={email} className="w-full"
            onChange={(event) => { setEmail(event.target.value); action.reset(); }} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={reasonId} className="block text-sm font-medium">{t("memberSpace.onboardReason")}</label>
          <AppTextarea id={reasonId} required maxLength={2000} rows={3} value={reason} className="w-full"
            onChange={(event) => setReason(event.target.value)} />
        </div>
        {action.isError && <AppNotice tone="danger" role="alert" title={t("memberSpace.onboardError")}>
          <p>{errorText}</p></AppNotice>}
        <div className="flex flex-wrap justify-end gap-2">
          <AppButton type="button" variant="ghost" onClick={onClose}>{t("memberSpace.cancel")}</AppButton>
          <AppButton type="submit" disabled={action.isPending || !email.trim() || !reason.trim()}>
            {action.isPending ? t("memberSpace.onboardSaving") : t("memberSpace.onboardSubmit")}</AppButton>
        </div>
      </form>
    </AppDialog>
  );
}
