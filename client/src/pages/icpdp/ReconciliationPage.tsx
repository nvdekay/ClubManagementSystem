import { useParams } from "react-router";
import { FinanceWorkspace } from "@/components/custom/FinanceWorkspace";
export function ReconciliationPage() {
  const { id = "" } = useParams();
  return <FinanceWorkspace context={{ kind: "admin" }} id={id} />;
}
