import { createContext, useContext } from "react";

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
}

export type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);

// Hook mở hộp thoại xác nhận trả về Promise thay cho window.confirm
/** Thay thế `window.confirm` theo kiểu Promise, được AppConfirmProvider hiển thị bằng modal của ứng dụng. */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside AppConfirmProvider");
  return confirm;
}
