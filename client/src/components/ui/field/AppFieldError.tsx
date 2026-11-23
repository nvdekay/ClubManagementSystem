interface AppFieldErrorProps {
  /** Không render gì khi là null, nên nơi gọi có thể truyền thẳng `field.error("name")`. */
  message: string | null | undefined;
  id?: string;
}

// Thông báo lỗi dưới một trường nhập
/** Thông báo ngay dưới một control; liên kết bằng `aria-describedby={id}` trên control. */
export function AppFieldError({ message, id }: AppFieldErrorProps) {
  if (!message) return null;
  return <span id={id} role="alert" className="mt-1 block text-xs font-normal text-danger-app">{message}</span>;
}
