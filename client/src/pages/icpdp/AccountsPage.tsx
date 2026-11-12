import { useCallback, useMemo, useState } from "react";
import { createColumnHelper, useTable } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppPagination } from "@/components/ui/pagination/AppPagination";
import { AppSearchInput } from "@/components/ui/search-input/AppSearchInput";
import { AppTable, appTableFeatures, type AppTableFeatures } from "@/components/ui/table/AppTable";
import { useAccounts } from "@/hooks/useAccounts";
import { type AdminUserClub, type AdminUserPage } from "@/services/accounts";
import { AccountManageDialog } from "./AccountManageDialog";

type AccountRow = AdminUserPage["items"][number];

const PAGE_SIZE = 10;
const columns = createColumnHelper<AppTableFeatures, AccountRow>();
const emptyRows: AccountRow[] = [];

export function AccountsPage() {
  const { t } = useTranslation();
  // Search term and page move together: a new term always starts again from page 1.
  const [query, setQuery] = useState({ search: "", page: 1 });
  const { search, page } = query;
  const [targetId, setTargetId] = useState("");
  const accounts = useAccounts(search, page, PAGE_SIZE, true);
  // AppSearchInput calls this again after renders with the same term, so the page only resets on a new term.
  const applySearch = useCallback((value: string) => {
    setQuery((current) => current.search === value ? current : { search: value, page: 1 });
  }, []);
  const rows = accounts.data?.items ?? emptyRows;
  const target = rows.find((item) => item.user.id === targetId);
  const pageCount = accounts.data ? Math.max(1, Math.ceil(accounts.data.total / PAGE_SIZE)) : 1;

  function membershipLabel(club: AdminUserClub): string {
    return club.membershipState === "Active" ? t("auth.membershipActive")
      : club.membershipState === "Inactive" ? t("auth.membershipInactive")
        : club.membershipState === "Banned" ? t("auth.membershipBanned") : club.membershipState;
  }

  function systemRoleLabel(code: string): string {
    if (code === "ICPDP_OFFICER") return t("auth.officerRoleShort");
    if (code === "ICPDP_HEAD") return t("auth.headRoleShort");
    if (code === "ATTENDANCE_UNLOCK") return t("auth.attendanceRoleShort");
    return code;
  }


  const tableColumns = useMemo(() => columns.columns([
    columns.accessor((row) => row.user.displayName, { id: "user", header: t("auth.colUser"), cell: (info) => <div className="min-w-44">
      <p className="font-medium break-words">{info.row.original.user.displayName}</p>
      <p className="text-xs break-all text-muted-app">{info.row.original.user.email}</p>
    </div> }),
    columns.accessor((row) => row.user.accountState, { id: "state", header: t("auth.colState"), cell: (info) => <div>
      <AppBadge tone={info.getValue() === "Locked" ? "danger" : "success"}>
        {info.getValue() === "Locked" ? t("auth.lockedState") : t("auth.activeState")}</AppBadge>
      {info.row.original.lockCase && <p className="mt-1 max-w-56 text-xs break-words text-danger-app">
        {t("auth.lockCase", { title: info.row.original.lockCase.title, club: info.row.original.lockCase.clubName })}</p>}
    </div> }),
    columns.accessor((row) => row.systemRoles.join(","), { id: "roles", header: t("auth.colRoles"), cell: (info) =>
      info.row.original.systemRoles.length ? <div className="flex flex-wrap gap-1">{info.row.original.systemRoles.map((code) =>
        <AppBadge key={code} tone="info">{systemRoleLabel(code)}</AppBadge>)}</div>
        : <span className="text-muted-app">—</span> }),
    columns.accessor((row) => row.clubs.length, { id: "clubs", header: t("auth.colClubs"), cell: (info) => {
      const clubs = info.row.original.clubs;
      if (!clubs.length) return <span className="text-muted-app">{t("auth.noClubs")}</span>;
      return <ul className="min-w-56 space-y-0.5 text-xs">{clubs.slice(0, 2).map((club) => <li key={club.clubId} className="break-words">
        <span className="font-medium">{club.clubName}</span>
        <span className="text-muted-app"> · {[membershipLabel(club), ...club.positions].join(" · ")}</span></li>)}
        {clubs.length > 2 && <li className="text-muted-app">{t("auth.moreClubs", { count: clubs.length - 2 })}</li>}</ul>;
    } }),
    columns.display({ id: "actions", header: t("auth.colActions"), cell: (info) =>
      <AppButton variant="secondary" onClick={() => setTargetId(info.row.original.user.id)}>{t("auth.manage")}</AppButton> }),
  // The label helpers only read t.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [t]);
  const table = useTable({ features: appTableFeatures, columns: tableColumns, data: rows,
    initialState: { pagination: { pageIndex: 0, pageSize: PAGE_SIZE } } });

  return (
    <>
      <PageHeader title={t("auth.manageAccounts")} description={t("auth.manageAccountsDescription")} />
      <section aria-label={t("auth.manageAccounts")} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AppSearchInput className="w-full sm:max-w-md" placeholder={t("auth.searchUsers")}
            onSearch={applySearch} />
          {accounts.data && <p className="text-sm text-muted-app">{t("auth.totalUsers", { count: accounts.data.total })}</p>}
        </div>
        {accounts.isError ? <p role="alert" className="text-sm text-danger-app">{accounts.error.message}</p> : <>
          <AppTable table={table} emptyMessage={t("auth.noUsers")} loading={accounts.isPending} />
          <AppPagination pageIndex={page - 1} pageCount={pageCount} onPageChange={(index) => setQuery((current) => ({ ...current, page: index + 1 }))}
            prevLabel={t("users.previousPage")} nextLabel={t("users.nextPage")}
            pageLabel={(value) => t("users.gotoPage", { page: value })} navLabel={t("users.paginationLabel")} />
        </>}
      </section>

      <AccountManageDialog account={target} onClose={() => setTargetId("")} />
    </>
  );
}
