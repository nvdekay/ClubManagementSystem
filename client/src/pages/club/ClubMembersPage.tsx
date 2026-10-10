import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createColumnHelper, useTable } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { MembershipStateBadge, membershipStateLabels } from "@/components/custom/MembershipStateBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppPagination } from "@/components/ui/pagination/AppPagination";
import { AppSearchInput } from "@/components/ui/search-input/AppSearchInput";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppTable, appTableFeatures, type AppTableFeatures } from "@/components/ui/table/AppTable";
import { AppTableLimitSelect } from "@/components/ui/table/AppTableLimitSelect";
import { useAuth } from "@/hooks/useAuth";
import { useClubMembers, useClubWithdrawals, useMembershipAction } from "@/hooks/useMemberSpace";
import type { Locale } from "@/i18n";
import type { ClubRosterMember, WithdrawalRequest } from "@/services/memberSpace";
import { formatDay } from "@/utils/formatDate";

import { ClubMemberStateDialog } from "./ClubMemberStateDialog";
import { exportClubMembers } from "./exportClubMembers";

const EMPTY: ClubRosterMember[] = [];
const helper = createColumnHelper<AppTableFeatures, ClubRosterMember>();
const ALL = "";
const NO_ROLE = "__none__";

/** UC21 A1 for members with club.member.manage: roster and leave requests (UC22) to execute. */
export function ClubMembersPage() {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === "vi" ? "vi" : "en";
  const { clubId } = useParams();
  const auth = useAuth();
  const signedIn = Boolean(auth.data);
  const members = useClubMembers(clubId, signedIn);
  const withdrawals = useClubWithdrawals(clubId, signedIn);
  const action = useMembershipAction();
  const inFlight = useRef(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const [doneId, setDoneId] = useState<string | null>(null);
  // Banned members leave the roster, so the confirmation lives at page level.
  const [stateNotice, setStateNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState(ALL);
  const [roleFilter, setRoleFilter] = useState(ALL);
  const [dialog, setDialog] = useState<{ kind: "state" | "history"; member: ClubRosterMember } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  const roster = members.data ?? EMPTY;
  const waiting = (withdrawals.data ?? []).filter((item) => item.state === "Pending" || item.state === "Held");
  const closeDialog = useCallback(() => setDialog(null), []);

  const roles = useMemo(() => [...new Set(roster.flatMap((member) => member.positions))], [roster]);
  // Filtering happens before the table so the paginated, sorted model works on matches only.
  const filtered = useMemo(() => {
    const needle = search.toLocaleLowerCase();
    return roster.filter((member) => (!needle || (member.displayName ?? "").toLocaleLowerCase().includes(needle)
        || member.email.toLocaleLowerCase().includes(needle))
      && (stateFilter === ALL || member.state === stateFilter)
      && (roleFilter === ALL || (roleFilter === NO_ROLE ? member.positions.length === 0
        : member.positions.includes(roleFilter))));
  }, [roster, search, stateFilter, roleFilter]);

  const columns = useMemo(() => helper.columns([
    helper.accessor((member) => member.displayName ?? "", { id: "name", header: t("memberSpace.colName"),
      sortFn: "text", cell: (info) => <span className="font-medium break-words">{info.getValue()}</span> }),
    helper.accessor("email", { header: t("memberSpace.colEmail"), enableSorting: false,
      cell: (info) => <span className="break-all text-muted-app">{info.getValue()}</span> }),
    helper.accessor("positions", { header: t("memberSpace.colPositions"), enableSorting: false,
      cell: (info) => info.getValue().length ? (
        <div className="flex min-w-36 flex-wrap gap-1">
          {info.getValue().map((role) => <AppBadge key={role} tone="info">{role}</AppBadge>)}
        </div>
      ) : <span className="text-muted-app">—</span> }),
    helper.accessor("state", { header: t("memberSpace.colState"), enableSorting: false,
      cell: (info) => <MembershipStateBadge state={info.getValue()} /> }),
    helper.accessor("joinedAt", { header: t("memberSpace.colJoined"), sortFn: "text",
      cell: (info) => <span className="tabular-nums">{formatDay(info.getValue(), locale)}</span> }),
    helper.display({ id: "actions", header: t("memberSpace.colActions"), cell: ({ row }) => (
      <div className="flex min-w-48 flex-wrap gap-1">
        <AppButton variant="secondary" className="min-h-9 px-3 sm:min-h-9"
          onClick={() => setDialog({ kind: "state", member: row.original })}>{t("memberSpace.changeState")}</AppButton>
        <AppButton variant="ghost" className="min-h-9 px-3 sm:min-h-9"
          onClick={() => setDialog({ kind: "history", member: row.original })}>{t("memberSpace.history")}</AppButton>
      </div>
    ) }),
  ]), [t, locale]);

  const table = useTable({ features: appTableFeatures, columns, data: filtered,
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } } });
  const { pageIndex, pageSize } = table.state.pagination;

  async function execute(request: WithdrawalRequest) {
    if (new Date(request.requestedEffectiveDate).getTime() > currentTime) return;
    if (!auth.data || !clubId || inFlight.current || !window.confirm(t("memberSpace.executeConfirm"))) return;
    inFlight.current = true;
    setDoneId(null);
    try {
      await action.mutateAsync({ kind: "execute", clubId, requestId: request.id, csrfToken: auth.data.csrfToken });
      setDoneId(request.id);
    } catch {
      // action.isError renders below.
    } finally {
      inFlight.current = false;
    }
  }

  async function exportRows() {
    setExporting(true);
    setExportFailed(false);
    try {
      await exportClubMembers(table.getPrePaginatedRowModel().rows.map((row) => row.original),
        roster[0]?.clubName ?? "club", { name: t("memberSpace.colName"), email: t("memberSpace.colEmail"),
          positions: t("memberSpace.colPositions"), state: t("memberSpace.colState"),
          joined: t("memberSpace.colJoined"), stateLabel: (state) => t(membershipStateLabels[state]) });
    } catch {
      setExportFailed(true);
    } finally {
      setExporting(false);
    }
  }

  const error = members.error ?? withdrawals.error;
  return (
    <>
      <PageHeader title={t("memberSpace.membersPageTitle")} description={t("memberSpace.membersPageDescription")}
        actions={<AppButton variant="secondary" disabled={exporting || filtered.length === 0}
          onClick={() => void exportRows()}>{exporting ? t("memberSpace.exporting") : t("memberSpace.exportXlsx")}</AppButton>} />
      {exportFailed && <AppNotice tone="danger" role="alert" className="mb-6" title={t("memberSpace.exportError")} />}
      {error ? <AppNotice tone="danger" role="alert" title={t("memberSpace.loadError")}><p>{error.message}</p></AppNotice> : (
        <div className="min-w-0 space-y-8">
          {(waiting.length > 0 || action.isError || doneId) && (
            <section aria-labelledby="leave-requests" className="rounded-2xl border border-warning-app/40 bg-warning-app/5 p-4 sm:p-5">
              <h2 id="leave-requests" className="flex flex-wrap items-center gap-2 font-heading text-lg font-bold">
                {t("memberSpace.withdrawals")}
                {waiting.length > 0 && <AppBadge tone="warning" className="whitespace-normal">{t("memberSpace.withdrawalsCount", { count: waiting.length })}</AppBadge>}
              </h2>
              {action.isError && <AppNotice tone="danger" role="alert" className="mt-3" title={t("memberSpace.executeError")}>
                <p>{action.error.message}</p></AppNotice>}
              {doneId && !action.isError && <p role="status" className="mt-3 text-sm font-semibold text-success-app">{t("memberSpace.executed")}</p>}
              {waiting.length > 0 && (
                <div className="mt-3 overflow-x-auto rounded-lg border border-border-app bg-bg-app">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-app text-left text-xs font-medium tracking-wide text-muted-app uppercase">
                      <tr>
                        <th className="px-3 py-2">{t("memberSpace.colMember")}</th>
                        <th className="px-3 py-2">{t("memberSpace.colReason")}</th>
                        <th className="px-3 py-2">{t("memberSpace.colRequestedFor")}</th>
                        <th className="px-3 py-2"><span className="sr-only">{t("memberSpace.colActions")}</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {waiting.map((request) => (
                        <tr key={request.id} className="border-t border-border-app align-top">
                          <td className="px-3 py-2">
                            <p className="min-w-32 font-semibold break-words">{request.memberName}</p>
                            {request.state === "Held" && <AppBadge tone="warning" className="mt-1 whitespace-normal">{t("memberSpace.held")}</AppBadge>}
                          </td>
                          <td className="min-w-48 px-3 py-2 break-words whitespace-pre-line">{request.reason}</td>
                          <td className="px-3 py-2 tabular-nums">{formatDay(request.requestedEffectiveDate, locale)}</td>
                          <td className="px-3 py-2 text-right">
                            <AppButton className="min-h-9 px-3 sm:min-h-9" disabled={action.isPending || new Date(request.requestedEffectiveDate).getTime() > currentTime}
                              onClick={() => void execute(request)}>
                              {action.isPending ? t("memberSpace.executing") : new Date(request.requestedEffectiveDate).getTime() > currentTime
                                ? t("memberSpace.notEffectiveYet") : t("memberSpace.execute")}</AppButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
          <section aria-labelledby="roster" className="space-y-4">
            <h2 id="roster" className="font-heading text-lg font-bold">{t("memberSpace.roster")}</h2>
            {stateNotice && <p role="status" className="text-sm font-semibold text-success-app">{stateNotice}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <AppSearchInput onSearch={setSearch} aria-label={t("memberSpace.searchLabel")}
                placeholder={t("memberSpace.searchPlaceholder")} className="min-w-0 flex-1 basis-60" />
              <AppSelect value={stateFilter} onChange={setStateFilter} label={t("memberSpace.filterState")} options={[
                { value: ALL, label: t("memberSpace.allStates") },
                { value: "Active", label: t(membershipStateLabels.Active) },
                { value: "Inactive", label: t(membershipStateLabels.Inactive) },
              ]} />
              <AppSelect value={roleFilter} onChange={setRoleFilter} label={t("memberSpace.filterPosition")} options={[
                { value: ALL, label: t("memberSpace.allPositions") },
                ...roles.map((role) => ({ value: role, label: role })),
                { value: NO_ROLE, label: t("memberSpace.noRole") },
              ]} />
            </div>
            <AppTable table={table} loading={members.isPending}
              emptyMessage={roster.length ? t("memberSpace.rosterNoMatch") : t("memberSpace.rosterEmpty")} />
            {!members.isPending && filtered.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-app">
                  {t("memberSpace.rosterCount", { shown: filtered.length, total: roster.length })}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <AppTableLimitSelect value={pageSize} onChange={(size) => table.setPageSize(size)}
                    label={t("memberSpace.rowsPerPage")} options={[10, 20, 50, 100]} />
                  <AppPagination pageIndex={pageIndex} pageCount={table.getPageCount()}
                    onPageChange={(index) => table.setPageIndex(index)} prevLabel={t("memberSpace.prevPage")}
                    nextLabel={t("memberSpace.nextPage")} pageLabel={(page) => t("memberSpace.pageLabel", { page })}
                    navLabel={t("memberSpace.pages")} />
                </div>
              </div>
            )}
          </section>
        </div>
      )}
      {dialog?.kind === "state" && clubId && <ClubMemberStateDialog member={dialog.member} clubId={clubId}
        onClose={closeDialog} onSaved={setStateNotice} />}
      {dialog?.kind === "history" && (
        <AppDialog open title={t("memberSpace.history")} closeLabel={t("memberSpace.close")} onClose={closeDialog}>
          <p className="mb-3 font-semibold break-words">{dialog.member.displayName}</p>
          {(dialog.member.statusHistory ?? []).length === 0 ? <p className="text-sm text-muted-app">{t("memberSpace.historyEmpty")}</p> : (
            <ol className="space-y-2 text-sm">
              {(dialog.member.statusHistory ?? []).map((item, index) => (
                <li key={`${item.at}-${index}`} className="rounded-xl bg-surface-app px-3 py-2">
                  <span>{t("memberSpace.historyItem", { from: t(membershipStateLabels[item.fromState]),
                    to: t(membershipStateLabels[item.toState]), date: formatDay(item.effectiveDate, locale) })}</span>
                  {item.reason && <span className="block break-words text-muted-app">{item.reason}</span>}
                </li>
              ))}
            </ol>
          )}
        </AppDialog>
      )}
    </>
  );
}
