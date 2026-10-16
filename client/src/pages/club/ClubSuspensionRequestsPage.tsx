import { useParams } from "react-router";
import { SuspensionRequestWorkspace } from "@/components/custom/SuspensionRequestWorkspace";
export function ClubSuspensionRequestsPage() { const { clubId = "" } = useParams(); return <SuspensionRequestWorkspace clubId={clubId} />; }
