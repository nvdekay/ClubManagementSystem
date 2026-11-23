import {
  columnVisibilityFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  type ReactTable,
  type RowData,
} from "@tanstack/react-table";

import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";

// One feature set for every App table — v9 only ships APIs for registered features,
// so the whole ui/table/ kit (pagination, column toggle) types against this.
// sortFns must list every fn the 'auto' resolver can pick for our columns
// (string data → "text"/"alphanumeric"), or v9 silently falls back to sortFn_basic.
export const appTableFeatures = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});
export type AppTableFeatures = typeof appTableFeatures;

interface AppTableProps<T extends RowData> {
  table: ReactTable<AppTableFeatures, T>;
  /** Rendered inside the body when there are no rows — header stays visible. */
  emptyMessage: string;
  /** Initial load: renders a page of skeleton rows instead of the empty state. */
  loading?: boolean;
}

export function AppTable<T extends RowData>({ table, emptyMessage, loading }: AppTableProps<T>) {
  const rows = table.getRowModel().rows;
  return (
    <div aria-busy={loading} className="overflow-x-auto rounded-xl border border-border-app bg-bg-app">
      {/* min-w: on phones the wrapper scrolls sideways instead of squeezing columns until emails break per letter. */}
      <table className="w-full min-w-3xl text-sm">
        <thead className="bg-surface-app">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                    className="px-4 py-2.5 text-left text-xs font-medium text-muted-app"
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 font-medium"
                      >
                        <table.FlexRender header={header} />
                        {sorted === "asc" && <span aria-hidden>↑</span>}
                        {sorted === "desc" && <span aria-hidden>↓</span>}
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: table.options.state?.pagination?.pageSize ?? 5 }, (_, i) => (
              <tr key={i} className="border-t border-border-app">
                {table.getVisibleLeafColumns().map((column) => (
                  <td key={column.id} className="px-4 py-3">
                    <AppSkeleton className="h-5" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr className="border-t border-border-app">
              <td colSpan={table.getVisibleLeafColumns().length} className="px-4 py-10 sm:text-center">
                {/* Pinned to the visible part of the scroll box so phones never cut the message off. */}
                <div className="sticky left-4 max-w-[calc(100vw-6rem)] sm:max-w-none"><AppEmptyState message={emptyMessage} /></div>
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-t border-border-app hover:bg-surface-app">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
