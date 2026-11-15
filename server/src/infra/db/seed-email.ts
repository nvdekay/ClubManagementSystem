// Sinh email sinh viên từ tên hiển thị và số thứ tự
// Sinh viên được seed có địa chỉ kiểu FPT (<given><initials>he<studentNo>@fpt.edu.vn) để founder có thể
// gán họ bằng email trông như thật; studentNo giữ cho mọi địa chỉ là duy nhất.
export function studentEmail(displayName: string, studentNo: number): string {
  const parts = displayName.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().split(/\s+/).filter(Boolean);
  const given = parts.at(-1) ?? "student";
  const initials = parts.slice(0, -1).map((part) => part[0]).join("");
  return `${given}${initials}he${studentNo}@fpt.edu.vn`;
}
