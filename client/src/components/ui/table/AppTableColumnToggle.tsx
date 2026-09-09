import { type ReactTable, type RowData } from "@tanstack/react-table";

import { type AppTableFeatures } from "./AppTable";

interface AppTableColumnToggleProps<T extends RowData> {
  table: ReactTable<AppTableFeatures, T>;
  label: string;
}

export function AppTableColumnToggle<T extends RowData>({ table, label }: AppTableColumnToggleProps<T>) {
  return (
    <details className="relative self-start">
      <summary className="list-none rounded border border-border-app px-3 py-1 text-sm text-text-app select-none [&::-webkit-details-marker]:hidden">
        {label} ▾
      </summary>
      <div className="absolute z-10 mt-1 flex min-w-40 flex-col gap-2 rounded border border-border-app bg-surface-app p-3 shadow-md">
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
