import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { appToast } from "@/components/ui/toast/AppToast";
import { useClubRoleAction } from "@/hooks/useClubRoles";
import type { ClubRole, ClubRoleOverview } from "@/services/clubRoles";
import { cn } from "@/utils/cn";

interface ClubRoleAssignDialogProps {
  clubId: string;
  csrfToken: string;
  role: ClubRole;
  members: ClubRoleOverview["members"];
  onClose: () => void;
}

/** Gives one regular role to an Active member who does not hold it yet. Mounted only while open. */
export function ClubRoleAssignDialog({ clubId, csrfToken, role, members, onClose }: ClubRoleAssignDialogProps) {
  const { t } = useTranslation();
  const action = useClubRoleAction();
  const [search, setSearch] = useState("");
  const [membershipId, setMembershipId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const holderIds = new Set(role.holders.map((holder) => holder.membershipId));
  const candidates = members.filter((member) => member.state === "Active" && !holderIds.has(member.membershipId));
  const query = search.trim().toLowerCase();
  const matches = candidates.filter((member) => !query
    || member.displayName.toLowerCase().includes(query) || member.email.toLowerCase().includes(query));
  // E2: a one-holder role that is already taken cannot take a second holder.
  const takenBy = role.isSingleHolder ? role.holders[0] : undefined;

  async function assign() {
    const member = candidates.find((item) => item.membershipId === membershipId);
    if (!member) return;
    try {
      await action.mutateAsync({ kind: "assign", clubId, roleId: role.id, csrfToken, input: {
        membershipId,
        ...(from ? { effectiveFrom: new Date(`${from}T00:00:00`).toISOString() } : {}),
        ...(to ? { effectiveTo: new Date(`${to}T23:59:59`).toISOString() } : {}),
      } });
      appToast.success(t("clubRoles.assignedSuccess", { name: member.displayName, role: role.name }));
      onClose();
    } catch { /* Rendered below, inside the dialog. */ }
  }

  return (
    <AppDialog open title={t("clubRoles.assign")} onClose={onClose} closeLabel={t("clubRoles.close")}>
      <p className="-mt-2 mb-4 text-sm text-muted-app break-words">{role.name}</p>
      {takenBy ? <>
        <AppNotice tone="warning" role="status">{t("clubRoles.singleHolderTaken", { name: takenBy.displayName })}</AppNotice>
        <div className="mt-5 flex flex-wrap justify-end"><AppButton variant="secondary" onClick={onClose}>{t("clubRoles.close")}</AppButton></div>
      </> : (
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void assign(); }}>
          <AppInput type="search" className="block w-full" value={search} autoFocus aria-label={t("clubRoles.searchMember")}
            placeholder={t("clubRoles.searchMember")} onChange={(event) => setSearch(event.target.value)} />
          <fieldset>
            <legend className="sr-only">{t("clubRoles.member")}</legend>
            {!candidates.length ? <p className="text-sm text-muted-app">{t("clubRoles.noAssignableMembers")}</p>
              : !matches.length ? <p className="text-sm text-muted-app">{t("clubRoles.noMatchingMembers")}</p>
                : <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border-app p-1">{matches.map((member) => (
                  <li key={member.membershipId}><label className={cn("flex items-center gap-3 rounded-lg p-2 hover:bg-surface-app",
                    { "bg-primary-soft-app hover:bg-primary-soft-app": member.membershipId === membershipId })}>
                    <input type="radio" name="member" className="size-4 shrink-0 accent-primary-app" checked={member.membershipId === membershipId}
                      onChange={() => setMembershipId(member.membershipId)} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium break-words">{member.displayName}</span>
                      <span className="block text-xs text-muted-app break-all">{member.email}</span>
                    </span>
                  </label></li>
                ))}</ul>}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">{t("clubRoles.start")}<AppInput className="mt-2 block w-full font-normal" type="date"
              value={from} onChange={(event) => setFrom(event.target.value)} /></label>
            <label className="block text-sm font-semibold">{t("clubRoles.end")}<AppInput className="mt-2 block w-full font-normal" type="date"
              value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></label>
          </div>
          {action.isError && <AppNotice tone="danger" role="alert">{action.error.message}</AppNotice>}
          <div className="flex flex-wrap justify-end gap-2">
            <AppButton type="button" variant="secondary" onClick={onClose}>{t("clubRoles.cancel")}</AppButton>
            <AppButton type="submit" disabled={action.isPending || !membershipId}>{t("clubRoles.assignButton")}</AppButton>
          </div>
        </form>
      )}
    </AppDialog>
  );
}
