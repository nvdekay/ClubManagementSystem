// Seeded students get FPT-style addresses (<given><initials>he<studentNo>@fpt.edu.vn) so a founder can
// assign them by an email that looks like the real thing; studentNo keeps every address unique.
export function studentEmail(displayName: string, studentNo: number): string {
  const parts = displayName.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().split(/\s+/).filter(Boolean);
  const given = parts.at(-1) ?? "student";
  const initials = parts.slice(0, -1).map((part) => part[0]).join("");
  return `${given}${initials}he${studentNo}@fpt.edu.vn`;
}
