import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'

import { PageHeader } from '@/components/layout/PageHeader'
import { ViolationDetailView } from '@/pages/icpdp/ViolationDetailView'
import { ViolationGate } from '@/pages/icpdp/ViolationGate'
import { ViolationList } from '@/pages/icpdp/ViolationList'

// Trang ICPDP danh sách ca vi phạm của CLB
export function ViolationsPage() {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader title={t('violations.title')} description={t('violations.description')} />
      <ViolationGate>{(csrfToken) => <ViolationList csrfToken={csrfToken} />}</ViolationGate>
    </>
  )
}

// Trang ICPDP chi tiết một ca vi phạm
export function ViolationDetailPage() {
  const { id } = useParams()
  return (
    <ViolationGate>
      {(csrfToken) => (id ? <ViolationDetailView id={id} csrfToken={csrfToken} /> : null)}
    </ViolationGate>
  )
}
