// Nguồn duy nhất quyết định cách app hiển thị mốc thời gian từ backend: luôn theo giờ Việt Nam,
// locale suy ra từ ngôn ngữ i18n, formatter được cache theo locale + tuỳ chọn.

export const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh'

// Maps an i18n language ('vi', 'en', or an already regional tag) to the Intl locale used for dates
/** `vi` → `vi-VN`, mọi ngôn ngữ khác → `en-GB` (ngày trước tháng, giờ 24h, giống thứ tự của bản tiếng Việt). */
export function dateLocale(language: string): string {
  return language.startsWith('vi') ? 'vi-VN' : 'en-GB'
}

const formatters = new Map<string, Intl.DateTimeFormat>()

// Cached Intl.DateTimeFormat for a language and options, always in Vietnam time
export function dateFormatter(
  language: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const locale = dateLocale(language)
  const key = `${locale}|${JSON.stringify(options)}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone: VN_TIME_ZONE })
    formatters.set(key, formatter)
  }
  return formatter
}

// Formats a backend timestamp with explicit Intl options, in Vietnam time
export function formatDateWith(
  value: string | number | Date,
  language: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return dateFormatter(language, options).format(new Date(value))
}

// Định dạng ngày giờ từ backend theo locale
/** Ngày + giờ (`dateStyle: medium`, `timeStyle: short`), giờ Việt Nam. */
export function formatDate(value: string | number | Date, locale: string): string {
  return formatDateWith(value, locale, { dateStyle: 'medium', timeStyle: 'short' })
}

// Ngày + giờ dạng ngắn (dd/mm/yyyy hh:mm), giờ Việt Nam
export function formatShortDateTime(value: string | number | Date, locale: string): string {
  return formatDateWith(value, locale, { dateStyle: 'short', timeStyle: 'short' })
}

// Định dạng chỉ ngày theo giờ Việt Nam
/** Chỉ ngày theo lịch, giờ Việt Nam — cho các ngày mà server so sánh theo ngày (vd ngày rời CLB). */
export function formatDay(value: string | number | Date | undefined, locale: string): string {
  if (value === undefined) {
    return '—'
  }
  return formatDateWith(value, locale, { dateStyle: 'medium' })
}

// Chỉ giờ (hh:mm), giờ Việt Nam
export function formatTime(value: string | number | Date, locale: string): string {
  return formatDateWith(value, locale, { timeStyle: 'short' })
}

const inputFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: VN_TIME_ZONE })

// Đổi thời điểm thành giá trị YYYY-MM-DD của input ngày theo giờ Việt Nam
/** Giá trị `YYYY-MM-DD` của ô nhập ngày cho một thời điểm, tính theo giờ Việt Nam. */
export function vnDateInput(value: string | number | Date = new Date()): string {
  return inputFormatter.format(new Date(value))
}

// Trả về mốc đầu hoặc cuối của một ngày theo giờ Việt Nam
/** Thời điểm bắt đầu của một ngày theo lịch Việt Nam (`YYYY-MM-DD`), hoặc mili-giây cuối cùng của ngày đó. */
export function vnDayBoundary(day: string, edge: 'start' | 'end'): string {
  return new Date(
    `${day}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}+07:00`,
  ).toISOString()
}

// Giá trị input ngày của ngày mai theo giờ Việt Nam
/** Giá trị ô nhập ngày của ngày mai theo giờ Việt Nam, cho các trường phải nằm trong tương lai. */
export function vnTomorrowInput(): string {
  return vnDateInput(Date.now() + 86_400_000)
}

// Định dạng thời gian sự kiện theo thứ tự cố định cho cả hai ngôn ngữ
/**
 * Thời gian sự kiện theo một thứ tự cố định cho cả hai ngôn ngữ, giờ Việt Nam:
 * "Th 6, 13/11 · 22:26" (vi) và "Fri 13 Nov · 22:26" (en). Định dạng vi mặc định của trình duyệt lại đặt giờ lên trước.
 */
export function formatEventWhen(value: string | number | Date, locale: string): string {
  const vi = locale.startsWith('vi')
  const weekday = formatDateWith(value, locale, { weekday: 'short' })
  const day = formatDateWith(
    value,
    locale,
    vi ? { day: '2-digit', month: '2-digit' } : { day: 'numeric', month: 'short' },
  ).replace('-', '/')
  const time = formatDateWith(value, locale, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  return `${weekday}${vi ? ',' : ''} ${day} · ${time}`
}

// Tách ngày và tháng ngắn cho huy hiệu lịch
/** Cặp giá trị cho huy hiệu lịch, đủ ngắn cho ô hẹp: { day: "13", month: "T11" } (vi) hoặc "Nov" (en). */
export function formatDayBadge(
  value: string | number | Date,
  locale: string,
): { day: string; month: string } {
  const day = formatDateWith(value, locale, { day: '2-digit' })
  const month = locale.startsWith('vi')
    ? `T${formatDateWith(value, 'en', { month: 'numeric' })}`
    : formatDateWith(value, locale, { month: 'short' })
  return { day, month }
}

// Nhãn tháng ngắn cho trục biểu đồ từ giá trị `YYYY-MM`
/** Chỉ một từ ngắn: "T5" ở tiếng Việt ("Tháng 5" bị xuống dòng trên điện thoại), "May" ở tiếng Anh. */
export function formatMonthAxis(month: string, language: string): string {
  return language.startsWith('vi')
    ? `T${Number(month.slice(5))}`
    : formatDateWith(`${month}-01T00:00:00Z`, language, { month: 'short' })
}

// Nhãn tháng đầy đủ kèm năm từ giá trị `YYYY-MM`
export function formatMonthLong(month: string, language: string): string {
  return formatDateWith(`${month}-01T00:00:00Z`, language, { month: 'long', year: 'numeric' })
}
