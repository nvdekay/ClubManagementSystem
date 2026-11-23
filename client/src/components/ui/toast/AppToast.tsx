import { Toaster, toast, type ToasterProps } from "sonner";

// Project toast API over sonner — the only file that imports the lib.
// Variant vocabulary matches the design tokens ("danger", not sonner's "error").
export const appToast = {
  success: (message: string) => toast.success(message),
  danger: (message: string) => toast.error(message),
  warning: (message: string) => toast.warning(message),
};

interface AppToasterProps {
  theme: ToasterProps["theme"];
}

// Mount once, in App.tsx. `theme` keeps toasts in sync with the .dark toggle;
// richColors gives each variant an accessible bg/text pair in both themes.
export function AppToaster({ theme }: AppToasterProps) {
  return <Toaster richColors closeButton position="top-right" theme={theme} />;
}
