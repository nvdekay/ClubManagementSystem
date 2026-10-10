import { useId, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { membershipStateLabels } from "@/components/custom/MembershipStateBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useMembershipAction } from "@/hooks/useMemberSpace";
import type { ClubRosterMember, ManagedMembershipState } from "@/services/memberSpace";
import { cn } from "@/utils/cn";

const nextStates: Record<"Active" | "Inactive", ManagedMembershipState[]> = {
  Active: ["Inactive", "Banned"],
  Inactive: ["Active", "Banned"],
};
const actionLabels = { Active: "memberSpace.toActive", Inactive: "memberSpace.toInactive",
  Banned: "memberSpace.toBanned" } as const;
const formTitles = { Active: "memberSpace.stateFormTitle_Active", Inactive: "memberSpace.stateFormTitle_Inactive",
  Banned: "memberSpace.stateFormTitle_Banned" } as const;

interface ClubMemberStateDialogProps {
  member: ClubRosterMember;
  clubId: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** UC21: change one member's status (effective today); a ban needs a reason. Mount it only while open. */
export function ClubMemberStateDialog({ member, clubId, onClose, onSaved }: ClubMemberStateDialogProps) {
  const { t } = useTranslation();
  const auth = useAuth();
  const action = useMembershipAction();
  const inFlight = useRef(false);
  const reasonId = useId();
  const options = member.state === "Active" || member.state === "Inactive" ? nextStates[member.state] : [];
  // Default to the reversible change; a ban is always a deliberate pick.
  const [target, setTarget] = useState<ManagedMembershipState | undefined>(options[0]);
  const [reason, setReason] = useState("");
  const banned = target === "Banned";
  const name = member.displayName ?? "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.data || !target || inFlight.current || !event.currentTarget.reportValidity()) return;
    inFlight.current = true;
    try {
      await action.mutateAsync({ kind: "state", clubId, membershipId: member.id, state: target,
        ...(reason.trim() ? { reason: reason.trim() } : {}), csrfToken: auth.data.csrfToken });
      onSaved(t("memberSpace.stateSaved", { name, state: t(membershipStateLabels[target]) }));
      onClose();
    } catch {
      // action.isError renders below.
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <AppDialog open title={t("memberSpace.changeState")} closeLabel={t("memberSpace.close")} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t("memberSpace.newState")}</legend>
          <div className="flex flex-wrap gap-2">
            {options.map((state) => (
              <label key={state} className={cn("flex min-h-11 items-center gap-2 rounded-full border border-border-app px-4 text-sm font-semibold", {
                "border-primary-app bg-primary-soft-app": target === state && state !== "Banned",
                "border-danger-app bg-danger-app/10 text-danger-app": target === state && state === "Banned",
              })}>
                <input type="radio" name="target" value={state} checked={target === state}
                  onChange={() => { setTarget(state); action.reset(); }} />
                {t(actionLabels[state])}
              </label>
            ))}
          </div>
        </fieldset>
        {target && (
          <div className={cn("space-y-3 rounded-2xl bg-surface-app p-4", { "bg-danger-app/10": banned })}>
            <p className="font-semibold break-words">{t(formTitles[target], { name })}</p>
            <p className="text-sm text-muted-app">{t("memberSpace.stateEffective")}</p>
            {banned && <p className="text-sm font-medium text-danger-app">{t("memberSpace.banWarning")}</p>}
            <div className="space-y-1.5">
              <label htmlFor={reasonId} className="block text-sm font-medium">
                {banned ? t("memberSpace.stateReason") : t("memberSpace.stateReasonOptional")}</label>
              <AppTextarea id={reasonId} value={reason} required={banned} maxLength={2000} rows={3}
                className="w-full" onChange={(event) => setReason(event.target.value)} />
            </div>
          </div>
        )}
        {action.isError && <AppNotice tone="danger" role="alert" title={t("memberSpace.stateError")}>
          <p>{action.error.message}</p></AppNotice>}
        <div className="flex flex-wrap justify-end gap-2">
          <AppButton type="button" variant="ghost" onClick={onClose}>{t("memberSpace.cancel")}</AppButton>
          <AppButton type="submit" disabled={!target || action.isPending || (banned && !reason.trim())}
            className={cn({ "bg-danger-app": banned })}>
            {action.isPending ? t("memberSpace.stateSaving") : t("memberSpace.stateConfirm")}</AppButton>
        </div>
      </form>
    </AppDialog>
  );
}
