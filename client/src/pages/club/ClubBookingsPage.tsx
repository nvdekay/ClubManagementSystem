import { useParams } from "react-router";
import { BookingWorkspace } from "@/components/custom/BookingWorkspace";

export function ClubBookingsPage() {
  const { clubId } = useParams();
  return <BookingWorkspace clubId={clubId ?? ""} />;
}
