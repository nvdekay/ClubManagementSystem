import { type ReactTable, type RowData } from "@tanstack/react-table";

import { type AppTableFeatures } from "./AppTable";

interface AppTableColumnToggleProps<T extends RowData> {
  table: ReactTable<AppTableFeatures, T>;
  label: string;
}

export function AppTableColumnToggle<T extends RowData>({ table, label }: AppTableColumnToggleProps<T>) {
  return (
    <details className="relative self-start">
      <summary className="inline-flex h-11 sm:h-9 list-none items-center rounded-md border border-border-app px-3 text-sm text-text-app transition-colors select-none hover:bg-surface-app focus-visible:ring-1 focus-visible:ring-ring-app focus-visible:border-ring-app focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        {label} ▾
      </summary>
      <div className="absolute z-20 mt-1 flex min-w-40 flex-col gap-2 rounded-lg border border-border-app bg-surface-app p-3 shadow-lg">
        {table
          .getAllLeafColumns()
          .filter((column) => column.getCanHide())
          .map((column) => (
            <label key={column.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={column.getIsVisible()}
                onChange={column.getToggleVisibilityHandler()}
              />
              {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
            </label>
          ))}
      </div>
    </details>
  );
}
