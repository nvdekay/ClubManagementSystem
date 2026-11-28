import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'

import { PageHeader } from '@/components/layout/PageHeader'
import { ViolationDetailView } from '@/pages/icpdp/ViolationDetailView'
import { IcpdpOfficerGate } from '@/pages/icpdp/IcpdpOfficerGate'
import { ViolationList } from '@/pages/icpdp/ViolationList'

// Trang ICPDP danh sách ca vi phạm của CLB
export function ViolationsPage() {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader title={t('violations.title')} description={t('violations.description')} />
      <IcpdpOfficerGate deniedMessage={t('violations.unauthorized')}>
        {(csrfToken) => <ViolationList csrfToken={csrfToken} />}
      </IcpdpOfficerGate>
    </>
  )
}

// Trang ICPDP chi tiết một ca vi phạm
export function ViolationDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  return (
    <IcpdpOfficerGate deniedMessage={t('violations.unauthorized')}>
      {(csrfToken) => (id ? <ViolationDetailView id={id} csrfToken={csrfToken} /> : null)}
    </IcpdpOfficerGate>
  )
}
