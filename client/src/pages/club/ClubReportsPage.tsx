import { useParams } from "react-router";
import { ReportWorkspace } from "@/components/custom/ReportWorkspace";
export function ClubReportsPage() {
  const { clubId = "" } = useParams();
  return <ReportWorkspace context={{ kind: "club", clubId }} />;
}
