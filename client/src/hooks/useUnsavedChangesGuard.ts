import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useBlocker, type BlockerFunction } from 'react-router'

import { useConfirm } from '@/hooks/useConfirm'

// Asks before leaving a form with unsaved changes: in-app navigation goes through the app confirm
// dialog, closing or reloading the tab through the browser's own beforeunload prompt.
// Call the returned `allowNavigation()` right before navigating away after a successful save.
export function useUnsavedChangesGuard(dirty: boolean): { allowNavigation: () => void } {
  const { t } = useTranslation()
  const confirm = useConfirm()
  const dirtyRef = useRef(dirty)
  const bypassRef = useRef(false)
  useEffect(() => {
    dirtyRef.current = dirty
    if (dirty) {
      bypassRef.current = false
    }
  }, [dirty])

  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      dirtyRef.current && !bypassRef.current && currentLocation.pathname !== nextLocation.pathname,
    [],
  )
  const blocker = useBlocker(shouldBlock)
  // The blocker object is recreated on re-render; the dialog resolves against the latest one.
  const blockerRef = useRef(blocker)
  useEffect(() => {
    blockerRef.current = blocker
  })

  const blocked = blocker.state === 'blocked'
  useEffect(() => {
    if (!blocked) {
      return
    }
    void confirm(t('common.unsavedChanges'), {
      title: t('common.unsavedChangesTitle'),
      confirmLabel: t('common.unsavedChangesLeave'),
    }).then((leave) => {
      const current = blockerRef.current
      if (current.state !== 'blocked') {
        return
      }
      if (leave) {
        current.proceed()
      } else {
        current.reset()
      }
    })
  }, [blocked, confirm, t])

  useEffect(() => {
    if (!dirty) {
      return
    }
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const allowNavigation = useCallback(() => {
    bypassRef.current = true
  }, [])
  return { allowNavigation }
}
