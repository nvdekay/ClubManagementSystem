import { Toaster, toast, type ToasterProps } from "sonner";

// API toast của dự án bọc ngoài sonner — đây là file duy nhất import thư viện này.
// Tên variant khớp với design token ("danger", không phải "error" của sonner).
export const appToast = {
  success: (message: string) => toast.success(message),
  danger: (message: string) => toast.error(message),
  warning: (message: string) => toast.warning(message),
};

interface AppToasterProps {
  theme: ToasterProps["theme"];
}

// Vùng hiển thị toast, đồng bộ theme sáng/tối
// Chỉ mount một lần, trong App.tsx. `theme` giữ toast đồng bộ với nút bật/tắt .dark;
// richColors cấp cho mỗi variant một cặp màu nền/chữ đủ tương phản ở cả hai theme.
export function AppToaster({ theme }: AppToasterProps) {
  return <Toaster richColors closeButton position="top-right" theme={theme} />;
}
