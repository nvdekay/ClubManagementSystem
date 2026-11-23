import { createContext, useContext } from "react";

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
}

export type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Promise-based replacement for `window.confirm`, rendered as the app's modal by AppConfirmProvider. */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside AppConfirmProvider");
  return confirm;
}
