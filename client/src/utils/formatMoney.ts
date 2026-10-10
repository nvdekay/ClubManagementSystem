// Every amount the API returns is a whole number of VND.
export function formatMoney(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}
