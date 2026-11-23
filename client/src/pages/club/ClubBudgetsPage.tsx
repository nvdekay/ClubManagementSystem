import { useParams } from "react-router";
import { FinanceWorkspace } from "@/components/custom/FinanceWorkspace";
export function ClubBudgetsPage() {
  const { clubId = "" } = useParams();
  return <FinanceWorkspace context={{ kind: "club", clubId }} />;
}
