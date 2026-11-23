import { ReportWorkspace } from "@/components/custom/ReportWorkspace";
// Trang ICPDP xem báo cáo sự kiện của các CLB
export function EventReportsPage() {
  return <ReportWorkspace context={{ kind: "admin" }} />;
}
