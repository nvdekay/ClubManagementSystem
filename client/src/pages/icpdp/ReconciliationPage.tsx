import { useParams } from 'react-router'
import { FinanceWorkspace } from '@/components/custom/FinanceWorkspace'
// Trang ICPDP đối soát tài chính của một ngân sách
export function ReconciliationPage() {
  const { id = '' } = useParams()
  return <FinanceWorkspace context={{ kind: 'admin' }} id={id} />
}
