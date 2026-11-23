import type { ClubRosterMember } from "@/services/memberSpace";

interface ExportLabels {
  name: string;
  email: string;
  positions: string;
  state: string;
  joined: string;
  /** Localized label of a membership state. */
  stateLabel: (state: ClubRosterMember["state"]) => string;
}

const vietnamDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric",
  month: "2-digit", day: "2-digit" });

/** YYYY-MM-DD of the Vietnam calendar day — the day the server compares membership dates by. */
function dayKey(value: string | Date): string {
  return vietnamDay.format(new Date(value));
}

function header(value: string) {
  return { value, fontWeight: "bold" as const };
}

/** UC21: writes the given (already filtered and sorted) roster to `<club>-members-<YYYY-MM-DD>.xlsx`. */
export async function exportClubMembers(members: ClubRosterMember[], clubName: string, labels: ExportLabels) {
  // Loaded on demand so the xlsx writer stays out of the main bundle.
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const safeName = clubName.replace(/[\\/:*?"<>|]+/g, "").trim().replace(/\s+/g, "-") || "club";
  await writeExcelFile(members, {
    stickyRowsCount: 1,
    columns: [
      { header: header(labels.name), width: 28, cell: (member) => ({ value: member.displayName ?? "" }) },
      { header: header(labels.email), width: 32, cell: (member) => ({ value: member.email }) },
      { header: header(labels.positions), width: 36, cell: (member) => ({ value: member.positions.join(", ") }) },
      { header: header(labels.state), width: 16, cell: (member) => ({ value: labels.stateLabel(member.state) }) },
      // A UTC-midnight Date of the Vietnam day, so Excel shows the same calendar day as the app.
      { header: header(labels.joined), width: 14, cell: (member) => ({ value: new Date(dayKey(member.joinedAt)),
        type: Date, format: "dd/mm/yyyy" }) },
    ],
  }).toFile(`${safeName}-members-${dayKey(new Date())}.xlsx`);
}
