import { useId, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { useMembershipAction } from "@/hooks/useMemberSpace";
import { MemberSpaceError } from "@/services/memberSpace";
import { isEmail } from "@/utils/validation";

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
  const field = useFieldValidation({
    email: email.trim() ? (isEmail(email) ? null : t("common.invalidEmail")) : t("common.fieldRequired"),
    reason: reason.trim() ? null : t("common.fieldRequired"),
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!field.touchAll() || !auth.data || inFlight.current || !event.currentTarget.reportValidity()) return;
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
    <AppDialog open title={t("memberSpace.onboardTitle")} closeLabel={t("memberSpace.close")} onClose={onClose}
      footer={<>
        <AppButton type="button" variant="ghost" onClick={onClose}>{t("memberSpace.cancel")}</AppButton>
        <AppButton type="submit" form={`${emailId}-form`} disabled={action.isPending}>
          {action.isPending ? t("memberSpace.onboardSaving") : t("memberSpace.onboardSubmit")}</AppButton>
      </>}>
      <form id={`${emailId}-form`} noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
        <p className="text-sm text-muted-app">{t("memberSpace.onboardHint")}</p>
        <div className="space-y-1.5">
          <label htmlFor={emailId} className="block text-sm font-medium text-text-app">{t("memberSpace.onboardEmail")}<AppRequiredMark /></label>
          <AppInput id={emailId} type="email" maxLength={320} autoComplete="off" value={email} className="w-full"
            {...field.control("email")} onChange={(event) => { setEmail(event.target.value); action.reset(); }} />
          <AppFieldError message={field.error("email")} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={reasonId} className="block text-sm font-medium text-text-app">{t("memberSpace.onboardReason")}<AppRequiredMark /></label>
          <AppTextarea id={reasonId} maxLength={2000} rows={3} value={reason} className="w-full"
            {...field.control("reason")} onChange={(event) => setReason(event.target.value)} />
          <AppFieldError message={field.error("reason")} />
        </div>
        {action.isError && <AppNotice tone="danger" role="alert" title={t("memberSpace.onboardError")}>
          <p>{errorText}</p></AppNotice>}
      </form>
    </AppDialog>
  );
}
