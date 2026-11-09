import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { useAccountAction } from "@/hooks/useAccounts";
import { useAuth } from "@/hooks/useAuth";
import { useViolations } from "@/hooks/useViolations";
import type { AccountAction, AdminUserPage, SystemRoleCode } from "@/services/accounts";

type AccountRow = AdminUserPage["items"][number];

const ROLES: SystemRoleCode[] = ["ICPDP_OFFICER", "ICPDP_HEAD", "ATTENDANCE_UNLOCK"];

/**
 * UC03 for one account, in two clearly separate parts: the ICPDP system roles it holds (grant at once,
 * revoke with a reason), and locking or unlocking the whole account (always with a reason).
 */
export function AccountManageDialog({ account, onClose }: { account: AccountRow | undefined; onClose: () => void }) {
  const { t } = useTranslation();
  const auth = useAuth();
  const action = useAccountAction();
  // Which role is waiting for its revocation reason, and that reason.
  const [revoking, setRevoking] = useState<SystemRoleCode | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [lockReason, setLockReason] = useState("");
  const [violationId, setViolationId] = useState("");
  const [shown, setShown] = useState<{ revoke: boolean; lock: boolean }>({ revoke: false, lock: false });
  const [done, setDone] = useState<string | null>(null);
  // UC03 A1: an emergency lock may be recorded under an open UC40 case.
  const violations = useViolations(Boolean(account) && account?.user.accountState === "Active");
  const caseOptions = [{ value: "", label: t("auth.noLinkedCase") },
    ...(violations.data ?? []).filter((item) => !["Resolved", "Closed"].includes(item.state))
      .map((item) => ({ value: item.id, label: `${item.title} · ${item.clubName}` }))];

  function roleName(code: SystemRoleCode) {
    return code === "ICPDP_OFFICER" ? t("auth.officerRoleShort") : code === "ICPDP_HEAD" ? t("auth.headRoleShort") : t("auth.attendanceRoleShort");
  }
  function roleHint(code: SystemRoleCode) {
    return code === "ICPDP_OFFICER" ? t("auth.officerRoleHint") : code === "ICPDP_HEAD" ? t("auth.headRoleHint") : t("auth.attendanceRoleHint");
  }

  function close() {
    if (action.isPending) return;
    setRevoking(null); setRevokeReason(""); setLockReason(""); setViolationId("");
    setShown({ revoke: false, lock: false }); setDone(null); action.reset();
    onClose();
  }

  async function run(next: AccountAction, message: string) {
    if (!auth.data) return;
    setDone(null);
    try {
      await action.mutateAsync({ action: next, csrfToken: auth.data.csrfToken });
      setDone(message);
      setRevoking(null); setRevokeReason(""); setLockReason(""); setViolationId("");
      setShown({ revoke: false, lock: false });
    } catch {
      // The mutation exposes its error below.
    }
  }

  if (!account) return <AppDialog open={false} title="" closeLabel={t("auth.close")} onClose={onClose}>{null}</AppDialog>;
  const { user, systemRoles } = account;
  const locked = user.accountState === "Locked";
  const revokeError = shown.revoke && !revokeReason.trim() ? t("common.fieldRequired") : null;
  const lockError = shown.lock && !lockReason.trim() ? t("common.fieldRequired") : null;

  return <AppDialog open title={t("auth.manageTitle")} closeLabel={t("auth.close")} onClose={close}>
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-surface-app p-4">
        <div className="min-w-0">
          <p className="font-semibold break-words">{user.displayName}</p>
          <p className="text-sm break-all text-muted-app">{user.email}</p>
        </div>
        <AppBadge tone={locked ? "danger" : "success"}>{locked ? t("auth.lockedState") : t("auth.activeState")}</AppBadge>
      </div>

      {done && <AppNotice tone="success" role="status">{done}</AppNotice>}
      {action.isError && <AppNotice tone="danger" role="alert">{t("auth.saveError")} {action.error.message}</AppNotice>}

      <section aria-labelledby="account-roles">
        <h3 id="account-roles" className="font-heading font-bold">{t("auth.rolesSection")}</h3>
        <p className="mt-1 text-sm text-muted-app">{t("auth.rolesSectionHint")}</p>
        <ul className="mt-3 divide-y divide-border-app rounded-xl border border-border-app">
          {ROLES.map((code) => {
            const held = systemRoles.includes(code);
            const needsOfficer = code === "ICPDP_HEAD" && !held && !systemRoles.includes("ICPDP_OFFICER");
            return <li key={code} className="p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">{roleName(code)}
                    {held && <AppBadge tone="success">{t("auth.roleHeld")}</AppBadge>}</p>
                  <p className="mt-0.5 text-xs text-muted-app">{roleHint(code)}</p>
                  {needsOfficer && <p className="mt-1 text-xs text-warning-app">{t("auth.headNeedsOfficer")}</p>}
                </div>
                {held
                  ? <AppButton variant="secondary" disabled={action.isPending || revoking === code}
                    onClick={() => { setRevoking(code); setRevokeReason(""); setShown((s) => ({ ...s, revoke: false })); }}>{t("auth.revoke")}</AppButton>
                  : <AppButton disabled={action.isPending || needsOfficer}
                    onClick={() => void run({ kind: "grant", userId: user.id, roleCode: code, reason: "" }, t("auth.granted", { role: roleName(code) }))}>{t("auth.grant")}</AppButton>}
              </div>
              {revoking === code && <form noValidate className="mt-3 space-y-2" onSubmit={(event) => {
                event.preventDefault(); setShown((s) => ({ ...s, revoke: true }));
                if (revokeReason.trim()) void run({ kind: "revoke", userId: user.id, roleCode: code, reason: revokeReason }, t("auth.revoked", { role: roleName(code) }));
              }}>
                <label className="block text-sm font-medium">{t("auth.revokeReason")}<AppRequiredMark />
                  <AppInput className="mt-1 block w-full" value={revokeReason} maxLength={1000} autoFocus
                    aria-invalid={revokeError ? true : undefined} onChange={(event) => setRevokeReason(event.target.value)} /></label>
                <AppFieldError message={revokeError} />
                <div className="flex flex-wrap gap-2">
                  <AppButton type="submit" disabled={action.isPending}>{t("auth.confirmRevoke")}</AppButton>
                  <AppButton type="button" variant="ghost" onClick={() => setRevoking(null)}>{t("auth.cancel")}</AppButton>
                </div>
              </form>}
            </li>;
          })}
        </ul>
        <p className="mt-2 text-xs text-muted-app">{t("auth.signOutNote")}</p>
      </section>

      <section aria-labelledby="account-lock" className="rounded-xl border border-danger-app/40 p-4">
        <h3 id="account-lock" className="font-heading font-bold text-danger-app">{locked ? t("auth.unlockSection") : t("auth.lockSection")}</h3>
        <p className="mt-1 text-sm text-muted-app">{locked ? t("auth.unlockSectionHint") : t("auth.lockSectionHint")}</p>
        {locked && account.lockCase && <p className="mt-2 text-sm break-words">
          {t("auth.lockCase", { title: account.lockCase.title, club: account.lockCase.clubName })}</p>}
        <form noValidate className="mt-3 space-y-3" onSubmit={(event) => {
          event.preventDefault(); setShown((s) => ({ ...s, lock: true }));
          if (!lockReason.trim()) return;
          void run(locked ? { kind: "unlock", userId: user.id, reason: lockReason }
            : { kind: "lock", userId: user.id, reason: lockReason, ...(violationId ? { violationId } : {}) },
          locked ? t("auth.unlocked") : t("auth.locked"));
        }}>
          <label className="block text-sm font-medium">{locked ? t("auth.unlockReason") : t("auth.lockReason")}<AppRequiredMark />
            <AppInput className="mt-1 block w-full" value={lockReason} maxLength={1000}
              aria-invalid={lockError ? true : undefined} onChange={(event) => setLockReason(event.target.value)} /></label>
          <AppFieldError message={lockError} />
          {!locked && <div className="text-sm font-medium">{t("auth.linkedCase")}
            <AppSelect fitWidth className="mt-1 block w-full" label={t("auth.linkedCase")}
              value={violationId} options={caseOptions} onChange={setViolationId} /></div>}
          <AppButton type="submit" variant={locked ? "primary" : "secondary"} disabled={action.isPending}
            className={locked ? undefined : "border-danger-app text-danger-app hover:border-danger-app hover:text-danger-app"}>
            {locked ? t("auth.unlock") : t("auth.lock")}</AppButton>
        </form>
      </section>
    </div>
  </AppDialog>;
}
