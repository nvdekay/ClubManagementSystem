import { useState } from 'react'
import { useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppEmptyState } from '@/components/ui/empty-state/AppEmptyState'
import { AppInput } from '@/components/ui/input/AppInput'
import { AppTextarea } from '@/components/ui/textarea/AppTextarea'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { useAuth } from '@/hooks/useAuth'
import { useWorkspacePermission } from '@/hooks/useWorkspacePermission'
import { useClubInvitations, useRespondToInvitation } from '@/hooks/useClubInvitations'
import { useFieldValidation } from '@/hooks/useFieldValidation'
import { formatDate } from '@/utils/formatDate'
import { AppErrorNotice } from '@/components/ui/notice/AppErrorNotice'
import { AppField } from '@/components/ui/field/AppField'

// Trang CLB nhận lời mời tham gia sự kiện và phản hồi
export function ClubInvitationsPage() {
  const { clubId = '' } = useParams()
  const { t, i18n } = useTranslation()
  const auth = useAuth()
  const allowed = useWorkspacePermission(clubId, 'club.event.manage')
  const list = useClubInvitations(clubId, allowed)
  const action = useRespondToInvitation(clubId)
  const [drafts, setDrafts] = useState<
    Record<string, { note: string; representative: string; members: string }>
  >({})
  // Cập nhật nháp ghi chú, người đại diện hoặc thành viên của một lời mời
  function edit(id: string, field: 'note' | 'representative' | 'members', value: string) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] ?? { note: '', representative: '', members: '' }), [field]: value },
    }))
  }
  // Mỗi lời mời có một form phản hồi. Ghi chú chỉ bắt buộc khi từ chối, nên chỉ kiểm tra ở lần bấm từ chối.
  const errors: Record<string, string | null> = Object.fromEntries(
    (list.data ?? []).map(({ id }) => [
      'note:' + id,
      drafts[id]?.note.trim() ? null : t('clubInvitations.declineReasonRequired'),
    ]),
  )
  const field = useFieldValidation(errors)
  // Chấp nhận hoặc từ chối lời mời (từ chối cần lý do)
  async function respond(id: string, outcome: 'Accepted' | 'Declined') {
    if (!auth.data || action.isPending) {
      return
    }
    if (outcome === 'Declined') {
      field.touch('note:' + id)
      if (errors['note:' + id]) {
        return
      }
    }
    const draft = drafts[id]
    try {
      await action.mutateAsync({
        id,
        csrfToken: auth.data.csrfToken,
        input: {
          outcome,
          responseNote: draft?.note,
          ...(outcome === 'Accepted'
            ? {
                responseDetails: {
                  representative: draft?.representative ?? '',
                  members: Number(draft?.members || 0),
                },
              }
            : {}),
        },
      })
    } catch {
      /* Lỗi của mutation được hiển thị bên dưới. */
    }
  }
  if (auth.isPending) {
    return <AppSkeleton className="h-64 w-full" />
  }
  if (!allowed) {
    return <AppNotice tone="danger">{t('clubInvitations.denied')}</AppNotice>
  }
  return (
    <>
      <PageHeader
        title={t('clubInvitations.title')}
        description={t('clubInvitations.description')}
      />
      {list.isPending && <AppSkeleton className="h-64 w-full" />}
      {list.isError && (
        <AppErrorNotice onRetry={() => void list.refetch()} retryVariant="primary">
          {list.error.message}
        </AppErrorNotice>
      )}
      {action.isError && (
        <AppNotice tone="danger" role="alert">
          {action.error.message}
        </AppNotice>
      )}
      {action.isSuccess && (
        <AppNotice tone="success" role="status">
          {t('clubInvitations.success')}
        </AppNotice>
      )}
      {list.data?.length === 0 && (
        <AppEmptyState variant="boxed" message={t('clubInvitations.empty')} />
      )}
      <div className="space-y-6">
        {list.data?.map((invitation) => {
          const editable =
            invitation.status === 'Pending' &&
            new Date(invitation.deadline) > new Date() &&
            ['Approved', 'Upcoming'].includes(invitation.event.state) &&
            new Date(invitation.event.startAt) > new Date()
          const draft = drafts[invitation.id]
          return (
            <section
              key={invitation.id}
              className="space-y-3 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="font-heading text-base font-semibold break-words">
                  {invitation.event.title}
                </h2>
                <AppBadge
                  tone={
                    invitation.status === 'Accepted'
                      ? 'success'
                      : invitation.status === 'Declined'
                        ? 'danger'
                        : invitation.status === 'Pending'
                          ? 'warning'
                          : 'neutral'
                  }
                >
                  {t(`clubInvitations.${invitation.status}`)}
                </AppBadge>
              </div>
              <p className="text-sm text-muted-app">
                {formatDate(invitation.event.startAt, i18n.language)} · {invitation.event.venue}
              </p>
              <p className="text-sm whitespace-pre-wrap break-words">
                {invitation.event.objective}
              </p>
              <p className="text-sm whitespace-pre-wrap break-words">
                {invitation.event.coordination}
              </p>
              <p className="text-sm text-muted-app">
                {t('clubInvitations.deadline')}: {formatDate(invitation.deadline, i18n.language)}
              </p>
              {invitation.responseNote && (
                <p className="text-sm whitespace-pre-wrap break-words">{invitation.responseNote}</p>
              )}
              {editable && (
                <div className="space-y-3">
                  <AppField label={t('clubInvitations.representative')}>
                    <AppInput
                      maxLength={2000}
                      className="mt-1.5 block w-full font-normal"
                      value={draft?.representative ?? ''}
                      onChange={(e) => edit(invitation.id, 'representative', e.target.value)}
                    />
                  </AppField>
                  <AppField label={t('clubInvitations.members')}>
                    <AppInput
                      type="number"
                      min="0"
                      step="1"
                      className="mt-1.5 block w-full font-normal"
                      value={draft?.members ?? ''}
                      onChange={(e) => edit(invitation.id, 'members', e.target.value)}
                    />
                  </AppField>
                  <AppField
                    label={t('clubInvitations.note')}
                    error={field.error('note:' + invitation.id)}
                  >
                    <AppTextarea
                      maxLength={5000}
                      className="mt-1.5 block w-full font-normal"
                      value={draft?.note ?? ''}
                      aria-invalid={field.error('note:' + invitation.id) ? true : undefined}
                      onChange={(e) => edit(invitation.id, 'note', e.target.value)}
                    />
                  </AppField>
                  <div className="flex flex-wrap gap-3">
                    <AppButton
                      disabled={action.isPending}
                      onClick={() => void respond(invitation.id, 'Accepted')}
                    >
                      {t('clubInvitations.accept')}
                    </AppButton>
                    <AppButton
                      variant="secondary"
                      disabled={action.isPending}
                      onClick={() => void respond(invitation.id, 'Declined')}
                    >
                      {t('clubInvitations.decline')}
                    </AppButton>
                  </div>
                </div>
              )}
            </section>
          )
        })}
      </div>
    </>
  )
}
