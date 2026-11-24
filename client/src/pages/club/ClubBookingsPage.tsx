import { useParams } from 'react-router'
import { BookingWorkspace } from '@/components/custom/BookingWorkspace'

// Trang booking phòng và thiết bị của CLB
export function ClubBookingsPage() {
  const { clubId } = useParams()
  return <BookingWorkspace clubId={clubId ?? ''} />
}
