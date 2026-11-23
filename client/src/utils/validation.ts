// Cùng dạng dữ liệu server chấp nhận, nên trường bị đánh dấu lỗi ở đây sẽ không bao giờ được server chấp nhận (và ngược lại).
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Kiểm tra chuỗi có đúng dạng email hay không
export function isEmail(value: string): boolean {
  return emailPattern.test(value.trim());
}

// Kiểm tra chuỗi là URL http hoặc https hợp lệ
export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
