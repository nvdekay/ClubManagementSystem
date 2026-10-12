import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppSearchInput } from "@/components/ui/search-input/AppSearchInput";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAccountAction, useAccounts } from "@/hooks/useAccounts";
import { useAuth } from "@/hooks/useAuth";
import { type AccountAction, type SystemRoleCode } from "@/services/accounts";
import { cn } from "@/utils/cn";

export function AccountsPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const [search, setSearch] = useState("");
  const [targetId, setTargetId] = useState("");
  const [roleCode, setRoleCode] = useState<SystemRoleCode>("ICPDP_OFFICER");
  const [reason, setReason] = useState("");
  const accounts = useAccounts(search, true);
  const accountAction = useAccountAction();
  const target = accounts.data?.items.find((item) => item.user.id === targetId);
  const roleOptions: Array<{ value: SystemRoleCode; label: string }> = [
    { value: "ICPDP_OFFICER", label: t("auth.officerRole") },
    { value: "ATTENDANCE_UNLOCK", label: t("auth.attendanceRole") },
  ];

  function systemRoleLabel(code: string): string {
    if (code === "ICPDP_OFFICER") return t("auth.officerRole");
    if (code === "ATTENDANCE_UNLOCK") return t("auth.attendanceRole");
    return code;
  }

  async function updateAccount(kind: AccountAction["kind"]) {
    if (!auth.data || !target) return;
    const action: AccountAction = kind === "grant" || kind === "revoke"
      ? { kind, userId: target.user.id, roleCode, reason }
      : { kind, userId: target.user.id, reason };
    try {
      await accountAction.mutateAsync({ action, csrfToken: auth.data.csrfToken });
      setReason("");
    } catch {
      // The mutation exposes the error state below.
    }
  }

  return (
    <>
      <PageHeader title={t("auth.manageAccounts")} description={t("auth.manageAccountsDescription")} />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-label={t("auth.manageAccounts")}>
          <AppSearchInput className="w-full" placeholder={t("auth.searchUsers")} onSearch={setSearch} />
          {accounts.isPending ? (
            <div className="mt-4 space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-16 w-full" />)}</div>
          ) : accounts.isError ? (
            <p role="alert" className="mt-4 text-sm text-danger-app">{accounts.error.message}</p>
          ) : accounts.data.items.length === 0 ? (
            <p className="mt-6 text-sm text-muted-app">{t("auth.noUsers")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-border-app border-y border-border-app">
              {accounts.data.items.map((item) => (
                <li key={item.user.id} className={cn("flex flex-wrap items-center justify-between gap-3 px-2 py-3.5", {
                  "bg-primary-soft-app": item.user.id === targetId,
                })}>
                  <div className="min-w-0">
                    <p className="font-semibold">{item.user.displayName}</p>
                    <p className="truncate text-sm text-muted-app">{item.user.email}</p>
                    <p className="mt-1 text-xs text-muted-app">
                      <span className={cn("font-semibold", item.user.accountState === "Locked" ? "text-danger-app" : "text-success-app")}>
                        {item.user.accountState === "Locked" ? t("auth.lockedState") : t("auth.activeState")}
                      </span>
                      {item.systemRoles.length > 0 && ` · ${item.systemRoles.map(systemRoleLabel).join(", ")}`}
                    </p>
                  </div>
                  <AppButton variant="secondary" aria-pressed={item.user.id === targetId}
                    onClick={() => { setTargetId(item.user.id); setReason(""); accountAction.reset(); }}>
                    {t("auth.manage")}
                  </AppButton>
                </li>
              ))}
            </ul>
          )}
        </section>

        {target && (
          <section aria-label={target.user.displayName} className="space-y-4 rounded-2xl bg-surface-app p-5 lg:sticky lg:top-6">
            <div>
              <h2 className="font-heading text-lg font-bold">{target.user.displayName}</h2>
              <p className="truncate text-sm text-muted-app">{target.user.email}</p>
            </div>
            <label className="block text-sm font-medium">
              {t("auth.role")}
              <AppSelect className="mt-2 block w-full" label={t("auth.role")}
                value={roleCode} options={roleOptions} onChange={setRoleCode} />
            </label>
            <label className="block text-sm font-medium">
              {t("auth.reason")}
              <AppInput className="mt-2 block w-full" value={reason}
                onChange={(event) => setReason(event.target.value)} maxLength={1000} />
            </label>
            <div className="flex flex-wrap gap-2">
              <AppButton disabled={accountAction.isPending} onClick={() => void updateAccount("grant")}>
                {t("auth.grant")}
              </AppButton>
              <AppButton variant="secondary" disabled={accountAction.isPending || !reason.trim()}
                onClick={() => void updateAccount("revoke")}>{t("auth.revoke")}</AppButton>
              <AppButton variant="secondary" disabled={accountAction.isPending || !reason.trim()}
                onClick={() => void updateAccount("lock")}>{t("auth.lock")}</AppButton>
              <AppButton variant="secondary" disabled={accountAction.isPending || !reason.trim()}
                onClick={() => void updateAccount("unlock")}>{t("auth.unlock")}</AppButton>
            </div>
            {accountAction.isError && (
              <p role="alert" className="text-sm text-danger-app">
                {t("auth.saveError")} {accountAction.error.message}
              </p>
            )}
            {accountAction.isSuccess && (
              <p role="status" className="text-sm text-success-app">{t("auth.saveSuccess")}</p>
            )}
          </section>
        )}
      </div>
    </>
  );
}
