import { useTranslation } from "react-i18next";

/** Red asterisk after a label; pair it with `required` on the control so screen readers hear it too. */
export function AppRequiredMark() {
  const { t } = useTranslation();
  return <span className="ml-0.5 font-semibold text-danger-app" title={t("common.requiredField")} aria-hidden="true">*</span>;
}
