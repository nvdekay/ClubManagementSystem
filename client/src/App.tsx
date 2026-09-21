import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createColumnHelper, useTable, type PaginationState } from "@tanstack/react-table";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppSearchInput } from "@/components/ui/search-input/AppSearchInput";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppSwitch } from "@/components/ui/switch/AppSwitch";
import { AppTable, appTableFeatures } from "@/components/ui/table/AppTable";
import { AppTableColumnToggle } from "@/components/ui/table/AppTableColumnToggle";
import { AppTableLimitSelect } from "@/components/ui/table/AppTableLimitSelect";
import { AppPagination } from "@/components/ui/pagination/AppPagination";
import { AppToaster, appToast } from "@/components/ui/toast/AppToast";
import { useTranslation } from "react-i18next";

import { useCreateUser, useUsers } from "@/hooks/useUsers";
import { type Locale } from "@/i18n";
import { type User } from "@/services/users";
import { formatDate } from "@/utils/formatDate";

type Theme = "light" | "dark";

const columnHelper = createColumnHelper<typeof appTableFeatures, User>();
// Stable fallback — a fresh [] every render would rebuild the table's row models.
const NO_USERS: User[] = [];

function initialTheme(): Theme {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Lucide sun/moon, inlined: single use site, and emoji render per-OS (no-emoji-icons rule).
const iconProps = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "size-4 text-muted-app",
} as const;

function SunIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function App() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale; // only ever set to "en" | "vi" (see i18n/index.ts)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 5 });
  // Server-side pagination: each page is its own request, sized by the select.
  const usersQuery = useUsers(search, pagination.pageSize, pagination.pageIndex * pagination.pageSize);
  const createMutation = useCreateUser();

  // A new search means a new result set — jump back to its first page.
  const onSearch = useCallback((value: string) => {
    setSearch(value);
    setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }));
  }, []);
  const onPageSize = useCallback((value: number) => {
    setPagination({ pageIndex: 0, pageSize: value });
  }, []);

  const users = usersQuery.data?.items ?? NO_USERS;
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", { header: t("users.namePlaceholder") }),
        columnHelper.accessor("email", { header: t("users.emailPlaceholder") }),
        // ISO strings sort chronologically as text, so the default sortFn is correct.
        columnHelper.accessor("createdAt", {
          header: t("users.createdAtHeader"),
          cell: (info) => formatDate(info.getValue(), locale),
        }),
      ]),
    [t, locale],
  );
  const table = useTable({
    features: appTableFeatures,
    data: users,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    // The server pages; the table only reports page count from the server's total.
    manualPagination: true,
    rowCount: usersQuery.data?.total ?? 0,
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    createMutation.mutate(
      { email: String(data.get("email")), name: String(data.get("name")) },
      { onSuccess: () => form.reset() },
    );
  }

  const error = createMutation.isError
    ? createMutation.error.message || t("common.requestFailed")
    : usersQuery.isError
      ? t("users.loadError")
      : "";
  const pending = createMutation.isPending;

  return (
    <main className="mx-auto my-8 max-w-[480px] font-sans">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">{t("users.title")}</h1>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-sm">
            <SunIcon />
            <AppSwitch
              checked={theme === "dark"}
              onChange={(on) => setTheme(on ? "dark" : "light")}
              aria-label={t("common.darkModeLabel")}
            />
            <MoonIcon />
          </span>
          <span className="flex items-center gap-1 text-sm">
            EN
            <AppSwitch
              checked={locale === "vi"}
              onChange={(on) => void i18n.changeLanguage(on ? "vi" : "en")}
              aria-label={t("common.languageLabel")}
            />
            VI
          </span>
        </div>
      </div>
      <AppCard className="mt-4">
        <form onSubmit={onSubmit} className="flex flex-wrap gap-2">
          <AppInput name="name" placeholder={t("users.namePlaceholder")} required className="min-w-32 flex-1" />
          <AppInput
            name="email"
            type="email"
            placeholder={t("users.emailPlaceholder")}
            required
            className="min-w-32 flex-1"
          />
          <AppButton disabled={pending}>{t("users.add")}</AppButton>
        </form>
        {error && <p className="mt-2 text-danger-app">{error}</p>}
        <AppSearchInput className="mt-4 w-full" placeholder={t("users.searchPlaceholder")} onSearch={onSearch} />
        <div className="mt-4 flex flex-col gap-2">
          <AppTableColumnToggle table={table} label={t("users.columnsLabel")} />
          <AppTable table={table} loading={usersQuery.isPending} emptyMessage={search ? t("users.noResults") : t("users.noUsers")} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <AppTableLimitSelect value={pagination.pageSize} onChange={onPageSize} label={t("users.limitLabel")} />
            <AppPagination
              pageIndex={pagination.pageIndex}
              pageCount={table.getPageCount()}
              onPageChange={(pageIndex) => setPagination((p) => ({ ...p, pageIndex }))}
              prevLabel={t("users.previousPage")}
              nextLabel={t("users.nextPage")}
              pageLabel={(page) => t("users.gotoPage", { page })}
              navLabel={t("users.paginationLabel")}
            />
          </div>
        </div>
      </AppCard>

      <h2 className="mt-8 text-lg font-semibold">{t("demo.componentDemo")}</h2>
      <div className="mt-4 flex flex-col gap-4">
        <AppCard>
          <p className="text-sm font-medium">AppButton</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <AppButton>{t("demo.primary")}</AppButton>
            <AppButton variant="secondary">{t("demo.secondary")}</AppButton>
            <AppButton disabled>{t("demo.disabled")}</AppButton>
          </div>
        </AppCard>
        <AppCard>
          <p className="text-sm font-medium">AppInput</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <AppInput placeholder={t("demo.typeSomething")} />
            <AppInput placeholder={t("demo.disabled")} disabled />
          </div>
        </AppCard>
        <AppCard>
          <p className="text-sm font-medium">AppEmptyState</p>
          <div className="mt-2">
            <AppEmptyState message={t("demo.nothingHere")} />
          </div>
        </AppCard>
        <AppCard>
          <p className="text-sm font-medium">AppSkeleton</p>
          {/* Loading-card pattern: real AppCard frame, skeleton content sized to the future layout. */}
          <div className="mt-2 flex items-center gap-3">
            <AppSkeleton className="size-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <AppSkeleton className="h-4 w-1/3" />
              <AppSkeleton className="h-4 w-2/3" />
            </div>
          </div>
        </AppCard>
        <AppCard>
          <p className="text-sm font-medium">AppToast</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <AppButton onClick={() => appToast.success(t("demo.toastSuccess"))}>{t("demo.success")}</AppButton>
            <AppButton onClick={() => appToast.danger(t("demo.toastDanger"))}>{t("demo.danger")}</AppButton>
            <AppButton onClick={() => appToast.warning(t("demo.toastWarning"))}>{t("demo.warning")}</AppButton>
          </div>
        </AppCard>
      </div>
      <AppToaster theme={theme} />
    </main>
  );
}
