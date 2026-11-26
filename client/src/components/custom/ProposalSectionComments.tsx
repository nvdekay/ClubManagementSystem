import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppTextarea } from '@/components/ui/textarea/AppTextarea'
import { formatShortDateTime } from '@/utils/formatDate'

export interface ProposalCommentView {
  id: string
  authorName: string
  content: string
  createdAt: string
}

interface ProposalSectionCommentsProps {
  title: string
  comments: ProposalCommentView[]
  authorName?: string
  onAdd?: (content: string) => Promise<unknown>
  onEdit?: (id: string, content: string) => Promise<unknown>
  onDelete?: (id: string) => Promise<unknown>
}

/** Keep drafts local until an explicit submit succeeds; failures retain the text. */
export function ProposalSectionComments({
  title,
  comments,
  authorName,
  onAdd,
  onEdit,
  onDelete,
}: ProposalSectionCommentsProps) {
  const { t, i18n } = useTranslation()
  const fieldId = useId()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  async function saveEdit() {
    if (!onEdit || !editingId || !editDraft.trim() || pending) {
      return
    }
    setPending(true)
    setFailed(null)
    try {
      await onEdit(editingId, editDraft.trim())
      setEditingId(null)
    } catch (error) {
      setFailed(error instanceof Error ? error.message : t('proposalComments.saveError'))
    } finally {
      setPending(false)
    }
  }

  async function remove(id: string) {
    if (!onDelete || pending) {
      return
    }
    setPending(true)
    setFailed(null)
    try {
      await onDelete(id)
      if (editingId === id) {
        setEditingId(null)
      }
    } catch (error) {
      setFailed(error instanceof Error ? error.message : t('proposalComments.saveError'))
    } finally {
      setPending(false)
    }
  }

  async function submit() {
    const content = draft.trim()
    if (!onAdd || !content || content.length > 2000 || pending) {
      return
    }
    setPending(true)
    setFailed(null)
    try {
      await onAdd(content)
      setDraft('')
      setOpen(false)
    } catch (error) {
      setFailed(error instanceof Error ? error.message : t('proposalComments.saveError'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="relative" aria-label={t('proposalComments.forSection', { title })}>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {comments.length > 0 && (
          <span className="text-xs text-muted-app">
            {t('proposalComments.count', { count: comments.length })}
          </span>
        )}
        {(onAdd || comments.length > 0) && (
          <AppButton
            type="button"
            variant="secondary"
            aria-expanded={open}
            aria-controls={`${fieldId}-panel`}
            onClick={() => setOpen((previous) => !previous)}
          >
            <span aria-hidden="true">＋</span>
            {t('proposalComments.add')}
          </AppButton>
        )}
      </div>
      {open && (
        <div
          id={`${fieldId}-panel`}
          className="absolute top-full right-0 z-30 mt-2 max-h-[60vh] w-[min(22rem,calc(100vw-3rem))] space-y-3 overflow-y-auto overscroll-contain rounded-xl border border-border-app bg-bg-app p-3 shadow-lg"
        >
          {comments.map((comment) => (
            <article
              key={comment.id}
              className="rounded-xl border border-border-app bg-bg-app p-4 text-sm shadow-xs"
            >
              <p className="break-words font-semibold">{comment.authorName}</p>
              {comment.createdAt && (
                <p className="mt-1 text-xs text-muted-app">
                  {formatShortDateTime(comment.createdAt, i18n.language)}
                </p>
              )}
              {editingId === comment.id ? (
                <form
                  className="mt-3 space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void saveEdit()
                  }}
                >
                  <AppTextarea
                    autoFocus
                    aria-label={t('proposalComments.edit')}
                    value={editDraft}
                    maxLength={2000}
                    disabled={pending}
                    onChange={(event) => setEditDraft(event.target.value)}
                    className="min-h-24 w-full"
                  />
                  <div className="flex justify-end gap-2">
                    <AppButton
                      type="button"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => {
                        setEditingId(null)
                        setFailed(null)
                      }}
                    >
                      {t('proposalComments.cancel')}
                    </AppButton>
                    <AppButton type="submit" disabled={pending || !editDraft.trim()}>
                      {t('proposalComments.save')}
                    </AppButton>
                  </div>
                </form>
              ) : (
                <>
                  <p className="mt-3 whitespace-pre-wrap break-words leading-6">
                    {comment.content}
                  </p>
                  <div className="mt-2 flex justify-end gap-1">
                    {onEdit && (
                      <AppButton
                        type="button"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => {
                          setEditingId(comment.id)
                          setEditDraft(comment.content)
                          setFailed(null)
                        }}
                      >
                        {t('proposalComments.edit')}
                      </AppButton>
                    )}
                    {onDelete && (
                      <AppButton
                        type="button"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => void remove(comment.id)}
                      >
                        {t('proposalComments.delete')}
                      </AppButton>
                    )}
                  </div>
                </>
              )}
            </article>
          ))}
          {open && onAdd && !editingId && (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void submit()
              }}
              className="space-y-3 rounded-xl border border-primary-app/40 bg-bg-app p-4 shadow-sm"
            >
              <p className="text-sm font-semibold">{authorName}</p>
              <label htmlFor={fieldId} className="block text-xs font-medium text-muted-app">
                {t('proposalComments.forSection', { title })}
              </label>
              <AppTextarea
                id={fieldId}
                autoFocus
                value={draft}
                maxLength={2000}
                disabled={pending}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t('proposalComments.placeholder')}
                className="min-h-24 w-full"
              />
              <p className="text-xs leading-5 text-muted-app">{t('proposalComments.reasonHint')}</p>
              <div className="flex items-center justify-end gap-2">
                <AppButton
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    setOpen(false)
                    setDraft('')
                    setFailed(null)
                  }}
                >
                  {t('proposalComments.cancel')}
                </AppButton>
                <AppButton type="submit" disabled={pending || !draft.trim()}>
                  {t(pending ? 'proposalComments.saving' : 'proposalComments.submit')}
                </AppButton>
              </div>
            </form>
          )}
          {failed && (
            <p role="alert" className="text-sm text-danger-app">
              {failed}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
