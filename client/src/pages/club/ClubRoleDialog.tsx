import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { appToast } from "@/components/ui/toast/AppToast";
import { useClubRoleAction } from "@/hooks/useClubRoles";
import type { ClubRole, ClubRoleInput } from "@/services/clubRoles";
import { groupPermissions, permissionDescription, permissionLabel } from "./clubRolePermissions";

interface ClubRoleDialogProps {
  clubId: string;
  csrfToken: string;
  /** Undefined creates a new regular role. Never the leader role (E7). */
  role?: ClubRole;
  departments: string[];
  grantablePermissions: string[];
  onClose: () => void;
  inline?: boolean;
  readOnly?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

/** Create/edit form for one role. Mounted only while open, so its draft and error reset on every open. */
export function ClubRoleDialog({ clubId, csrfToken, role, departments, grantablePermissions, onClose, inline = false, readOnly = false, onDirtyChange }: ClubRoleDialogProps) {
  const { t } = useTranslation();
  const action = useClubRoleAction();
  const [draft, setDraft] = useState<ClubRoleInput>({ name: role?.name ?? "", unit: role?.unit ?? "",
    isSingleHolder: role?.isSingleHolder ?? false, permissionCodes: [...(role?.permissionCodes ?? [])], reason: "" });
  // A4/E6: board seats and the default Members role keep their holder mode.
  const holderLocked = Boolean(role && (role.isBoardSeat || role.isDefaultMemberRole));
  const groups = groupPermissions(grantablePermissions);

  function setCodes(codes: string[], checked: boolean) {
    onDirtyChange?.(true);
    setDraft((current) => ({ ...current, permissionCodes: checked
      ? [...new Set([...current.permissionCodes, ...codes])]
      : current.permissionCodes.filter((code) => !codes.includes(code)) }));
  }

  async function save() {
    if (readOnly) return;
    const input = { ...draft, name: draft.name.trim(), unit: draft.unit || undefined, reason: draft.reason?.trim() || undefined };
    try {
      await action.mutateAsync(role ? { kind: "update", clubId, roleId: role.id, input, csrfToken } : { kind: "create", clubId, input, csrfToken });
      appToast.success(role ? t("clubRoles.updatedSuccess") : t("clubRoles.createdSuccess"));
      onDirtyChange?.(false);
      onClose();
    } catch { /* Rendered below, inside the dialog. */ }
  }

  const form = (
      <form onChange={() => onDirtyChange?.(true)} className="space-y-5" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <fieldset disabled={readOnly || action.isPending} className="space-y-5">
        {role?.isBoardSeat && <AppNotice tone="info">{t("clubRoles.boardEditHint")}</AppNotice>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">{t("clubRoles.name")}
            <AppInput className="mt-2 block w-full font-normal" value={draft.name} maxLength={120} required autoFocus={!inline}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
          <div className="text-sm font-semibold">{t("clubRoles.unit")}
            <AppSelect disabled={readOnly || action.isPending} className="mt-2 block w-full" label={t("clubRoles.unit")} value={draft.unit ?? ""}
              options={[{ value: "", label: t("clubRoles.noUnit") }, ...departments.map((name) => ({ value: name, label: name }))]}
              onChange={(unit) => { onDirtyChange?.(true); setDraft((current) => ({ ...current, unit })); }} /></div>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary-app" checked={draft.isSingleHolder} disabled={holderLocked}
            onChange={(event) => setDraft((current) => ({ ...current, isSingleHolder: event.target.checked }))} />
          {t("clubRoles.singleHolder")}</label>

        <fieldset>
          <legend className="text-sm font-semibold">{t("clubRoles.permissions")}{" "}
            <span className="text-xs font-normal text-muted-app">{t("clubRoles.selectedCount", { count: draft.permissionCodes.length, total: grantablePermissions.length })}</span></legend>
          <p className="mt-1 text-xs text-muted-app">{t("clubRoles.permissionsHint")}</p>
          <div className="mt-3 grid items-start gap-3 xl:grid-cols-2">{groups.map((group) => {
            const all = group.codes.every((code) => draft.permissionCodes.includes(code));
            return (
              <section key={group.labelKey} className="rounded-xl border border-border-app p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">{t(group.labelKey)}</h3>
                  <button type="button" className="rounded-full px-2 py-1 text-xs font-semibold text-primary-app hover:bg-primary-soft-app"
                    onClick={() => setCodes(group.codes, !all)}>{all ? t("clubRoles.selectNone") : t("clubRoles.selectAll")}</button>
                </div>
                <ul className="mt-2 space-y-1">{group.codes.map((code) => (
                  <li key={code}><label className="flex items-start gap-3 rounded-lg p-2 hover:bg-surface-app">
                    <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-primary-app" checked={draft.permissionCodes.includes(code)}
                      onChange={(event) => setCodes([code], event.target.checked)} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{permissionLabel(t, code)}</span>
                      {permissionDescription(t, code) && <span className="block text-xs text-muted-app">{permissionDescription(t, code)}</span>}
                    </span>
                  </label></li>
                ))}</ul>
              </section>
            );
          })}</div>
        </fieldset>

        {!readOnly && <label className="block text-sm font-semibold">{t("clubRoles.reason")}
          <AppInput className="mt-2 block w-full font-normal" value={draft.reason} maxLength={500}
            onChange={(event) => setDraft((current) => ({ ...current, reason: event.target.value }))} /></label>}

        {action.isError && <AppNotice tone="danger" role="alert">{action.error.message}</AppNotice>}
        {!readOnly && <div className="flex flex-wrap justify-end gap-2">
          <AppButton type="button" variant="secondary" onClick={onClose}>{t("clubRoles.cancel")}</AppButton>
          <AppButton type="submit" disabled={readOnly || action.isPending || !draft.name.trim()}>
            {action.isPending ? t("clubRoles.saving") : t("clubRoles.save")}</AppButton>
        </div>}
        </fieldset>
      </form>
  );
  if (inline) return <section className="rounded-2xl border border-border-app bg-bg-app p-4 sm:p-5">{form}</section>;
  return <AppDialog open title={role ? t("clubRoles.editRole") : t("clubRoles.addRole")} onClose={onClose}
    closeLabel={t("clubRoles.close")} className="w-[min(100%-2rem,44rem)]">{form}</AppDialog>;
}
