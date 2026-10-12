// Every amount the API returns is a whole number of VND.
const moneyFormatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(value: number, locale: string): string {
  let formatter = moneyFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    });
    moneyFormatters.set(locale, formatter);
  }
  return formatter.format(value);
}
