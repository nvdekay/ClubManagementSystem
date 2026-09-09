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
    <div aria-busy={loading} className="overflow-x-auto rounded-lg border border-border-app">
      <table className="w-full text-sm">
        <thead className="bg-surface-app">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                    className="px-3 py-2 text-left font-medium text-muted-app"
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
                  <td key={column.id} className="px-3 py-2">
                    <AppSkeleton className="h-5" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr className="border-t border-border-app">
              <td colSpan={table.getVisibleLeafColumns().length} className="px-3 py-8 text-center">
                <AppEmptyState message={emptyMessage} />
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-t border-border-app hover:bg-surface-app">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
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
