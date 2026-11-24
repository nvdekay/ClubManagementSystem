import { useParams } from 'react-router'
import { SuspensionRequestWorkspace } from '@/components/custom/SuspensionRequestWorkspace'
// Trang yêu cầu tạm ngưng hoạt động của CLB
export function ClubSuspensionRequestsPage() {
  const { clubId = '' } = useParams()
  return <SuspensionRequestWorkspace clubId={clubId} />
}
