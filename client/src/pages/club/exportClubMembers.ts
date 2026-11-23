import type { ClubRosterMember } from "@/services/memberSpace";

interface ExportLabels {
  name: string;
  email: string;
  positions: string;
  state: string;
  joined: string;
  /** Nhãn đã dịch của trạng thái thành viên. */
  stateLabel: (state: ClubRosterMember["state"]) => string;
}

const vietnamDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric",
  month: "2-digit", day: "2-digit" });

// Định dạng ngày theo múi giờ Việt Nam để so sánh/ghi ra file
/** YYYY-MM-DD của ngày theo lịch Việt Nam — ngày mà server dùng để so sánh ngày thành viên. */
function dayKey(value: string | Date): string {
  return vietnamDay.format(new Date(value));
}

// Tạo ô tiêu đề in đậm cho dòng đầu của file xlsx
function header(value: string) {
  return { value, fontWeight: "bold" as const };
}

/** UC21: ghi danh sách thành viên đã lọc và sắp xếp vào `<club>-members-<YYYY-MM-DD>.xlsx`. */
export async function exportClubMembers(members: ClubRosterMember[], clubName: string, labels: ExportLabels) {
  // Tải theo yêu cầu để thư viện ghi xlsx không nằm trong bundle chính.
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const safeName = clubName.replace(/[\\/:*?"<>|]+/g, "").trim().replace(/\s+/g, "-") || "club";
  await writeExcelFile(members, {
    stickyRowsCount: 1,
    columns: [
      { header: header(labels.name), width: 28, cell: (member) => ({ value: member.displayName ?? "" }) },
      { header: header(labels.email), width: 32, cell: (member) => ({ value: member.email }) },
      { header: header(labels.positions), width: 36, cell: (member) => ({ value: member.positions.join(", ") }) },
      { header: header(labels.state), width: 16, cell: (member) => ({ value: labels.stateLabel(member.state) }) },
      // Date lúc nửa đêm UTC của ngày Việt Nam, để Excel hiện cùng ngày với ứng dụng.
      { header: header(labels.joined), width: 14, cell: (member) => ({ value: new Date(dayKey(member.joinedAt)),
        type: Date, format: "dd/mm/yyyy" }) },
    ],
  }).toFile(`${safeName}-members-${dayKey(new Date())}.xlsx`);
}
