// Nguồn duy nhất quyết định cách app hiển thị mốc thời gian từ backend.
const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

// Định dạng ngày giờ từ backend theo locale
export function formatDate(
  value: string | number | Date,
  locale: string,
): string {
  return new Intl.DateTimeFormat(locale, DATE_FORMAT).format(new Date(value));
}

const dayFormatters = new Map<string, Intl.DateTimeFormat>();

// Định dạng chỉ ngày theo giờ Việt Nam
/** Chỉ ngày theo lịch, giờ Việt Nam — cho các ngày mà server so sánh theo ngày (vd ngày rời CLB). */
export function formatDay(
  value: string | number | Date | undefined,
  locale: string,
): string {
  if (value === undefined) return "—";

  let formatter = dayFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: "Asia/Ho_Chi_Minh",
    });
    dayFormatters.set(locale, formatter);
  }
  return formatter.format(new Date(value));
}

const inputFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

// Đổi thời điểm thành giá trị YYYY-MM-DD của input ngày theo giờ Việt Nam
/** Giá trị `YYYY-MM-DD` của ô nhập ngày cho một thời điểm, tính theo giờ Việt Nam. */
export function vnDateInput(value: string | number | Date = new Date()): string {
  return inputFormatter.format(new Date(value));
}

// Trả về mốc đầu hoặc cuối của một ngày theo giờ Việt Nam
/** Thời điểm bắt đầu của một ngày theo lịch Việt Nam (`YYYY-MM-DD`), hoặc mili-giây cuối cùng của ngày đó. */
export function vnDayBoundary(day: string, edge: "start" | "end"): string {
  return new Date(`${day}T${edge === "start" ? "00:00:00.000" : "23:59:59.999"}+07:00`).toISOString();
}

// Giá trị input ngày của ngày mai theo giờ Việt Nam
/** Giá trị ô nhập ngày của ngày mai theo giờ Việt Nam, cho các trường phải nằm trong tương lai. */
export function vnTomorrowInput(): string {
  return vnDateInput(Date.now() + 86_400_000);
}

const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

// Định dạng thời gian sự kiện theo thứ tự cố định cho cả hai ngôn ngữ
/**
 * Thời gian sự kiện theo một thứ tự cố định cho cả hai ngôn ngữ, giờ Việt Nam:
 * "Th 6, 13/11 · 22:26" (vi) và "Fri 13 Nov · 22:26" (en). Định dạng vi mặc định của trình duyệt lại đặt giờ lên trước.
 */
export function formatEventWhen(value: string | number | Date, locale: string): string {
  const date = new Date(value);
  const vi = locale.startsWith("vi");
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: VN_TIME_ZONE }).format(date);
  const day = new Intl.DateTimeFormat(locale, vi ? { day: "2-digit", month: "2-digit", timeZone: VN_TIME_ZONE }
    : { day: "numeric", month: "short", timeZone: VN_TIME_ZONE }).format(date).replace("-", "/");
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: VN_TIME_ZONE }).format(date);
  return `${weekday}${vi ? "," : ""} ${day} · ${time}`;
}

// Tách ngày và tháng ngắn cho huy hiệu lịch
/** Cặp giá trị cho huy hiệu lịch, đủ ngắn cho ô hẹp: { day: "13", month: "T11" } (vi) hoặc "Nov" (en). */
export function formatDayBadge(value: string | number | Date, locale: string): { day: string; month: string } {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat(locale, { day: "2-digit", timeZone: VN_TIME_ZONE }).format(date);
  const month = locale.startsWith("vi")
    ? `T${new Intl.DateTimeFormat("en-GB", { month: "numeric", timeZone: VN_TIME_ZONE }).format(date)}`
    : new Intl.DateTimeFormat(locale, { month: "short", timeZone: VN_TIME_ZONE }).format(date);
  return { day, month };
}
