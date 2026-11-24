import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProposalSection } from '@/utils/eventProposalImport'
import {
  appendProposalReason,
  changeProposalComment,
  reconcileProposalComments,
  recoverProposalComments,
  type TrackedProposalComment,
} from '@/utils/proposalReason'

interface Draft {
  reason: string
  comments: TrackedProposalComment[]
}

function readDraft(key: string, authorName: string): Draft {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key) ?? 'null')
    if (
      value &&
      typeof value === 'object' &&
      'reason' in value &&
      typeof value.reason === 'string' &&
      value.reason.length <= 5000
    ) {
      const reason = value.reason
      const rawComments: unknown[] =
        'comments' in value && Array.isArray(value.comments) ? value.comments : []
      const comments = rawComments.filter((entry): entry is TrackedProposalComment => {
        if (!entry || typeof entry !== 'object') {
          return false
        }
        const c = entry as Partial<TrackedProposalComment>
        return (
          typeof c.id === 'string' &&
          typeof c.sectionId === 'string' &&
          typeof c.sectionTitle === 'string' &&
          typeof c.authorName === 'string' &&
          typeof c.content === 'string' &&
          typeof c.createdAt === 'string' &&
          (c.createdAt === '' || Number.isFinite(Date.parse(c.createdAt))) &&
          typeof c.start === 'number' &&
          Number.isInteger(c.start) &&
          typeof c.end === 'number' &&
          Number.isInteger(c.end) &&
          c.start >= 0 &&
          c.end <= reason.length &&
          reason.slice(c.start, c.end) === `[${c.sectionTitle}]\n${c.content}`
        )
      })
      return {
        reason,
        comments: rawComments.length ? comments : recoverProposalComments(reason, authorName),
      }
    }
  } catch {
    /* Storage may be unavailable; keep the draft in memory. */
  }
  return { reason: '', comments: [] }
}

/** Cache only the decision draft for this account and revision; submission persists it as reason. */
export function useProposalReasonDraft(
  userId: string,
  eventId: string,
  revisionNo: number,
  authorName: string,
) {
  const { t } = useTranslation()
  const key = `proposal-decision-reason:${userId}:${eventId}:${revisionNo}`
  const [state, setState] = useState(() => ({ key, draft: readDraft(key, authorName) }))
  const scopedDraft = state.key === key ? state.draft : readDraft(key, authorName)
  const draft = scopedDraft.comments.some((comment) => typeof comment.start !== 'number')
    ? { ...scopedDraft, comments: recoverProposalComments(scopedDraft.reason, authorName) }
    : scopedDraft

  function update(next: Draft) {
    setState({ key, draft: next })
    try {
      sessionStorage.setItem(key, JSON.stringify(next))
    } catch {
      /* In-memory editing still works. */
    }
  }

  async function addComment(section: ProposalSection, content: string) {
    const title = (section.title || t('clubEvents.extractedIntroduction')).trim()
    const reason = appendProposalReason(draft.reason, title, content)
    if (reason === null) {
      throw new Error(t('proposalComments.reasonTooLong'))
    }
    const previous = draft.reason.trim()
    update({
      reason,
      comments: [
        ...reconcileProposalComments(draft.reason, previous, draft.comments),
        {
          id: crypto.randomUUID(),
          sectionId: section.id,
          sectionTitle: title,
          authorName,
          content: content.trim(),
          createdAt: new Date().toISOString(),
          start: previous.length + (previous ? 2 : 0),
          end: reason.length,
        },
      ],
    })
  }

  async function editComment(id: string, content: string) {
    const next = changeProposalComment(draft.reason, draft.comments, id, content)
    if (!next) {
      throw new Error(t('proposalComments.reasonTooLong'))
    }
    update(next)
  }
  async function deleteComment(id: string) {
    const next = changeProposalComment(draft.reason, draft.comments, id)
    if (!next) {
      throw new Error(t('proposalComments.saveError'))
    }
    update(next)
  }
  function setReason(reason: string) {
    update({ reason, comments: reconcileProposalComments(draft.reason, reason, draft.comments) })
  }
  function clear() {
    setState({ key, draft: { reason: '', comments: [] } })
    try {
      sessionStorage.removeItem(key)
    } catch {
      /* No persisted draft to clear. */
    }
  }
  return {
    reason: draft.reason,
    comments: draft.comments,
    addComment,
    editComment,
    deleteComment,
    setReason,
    clear,
  }
}
