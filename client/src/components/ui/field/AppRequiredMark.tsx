import { useTranslation } from "react-i18next";

// Dấu sao đỏ đánh dấu trường bắt buộc
/** Dấu sao đỏ sau nhãn; dùng kèm `required` trên control để trình đọc màn hình cũng đọc được. */
export function AppRequiredMark() {
  const { t } = useTranslation();
  return <span className="ml-0.5 font-semibold text-danger-app" title={t("common.requiredField")} aria-hidden="true">*</span>;
}
