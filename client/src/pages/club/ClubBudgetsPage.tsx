import { useParams } from "react-router";
import { FinanceWorkspace } from "@/components/custom/FinanceWorkspace";
// Trang ngân sách và tài chính của CLB
export function ClubBudgetsPage() {
  const { clubId = "" } = useParams();
  return <FinanceWorkspace context={{ kind: "club", clubId }} />;
}
