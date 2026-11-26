// Opens a tab while still inside the click gesture (so popup blockers allow it), then points it at the
// URL once it resolves. The blank tab is closed again when resolving fails, and the error is rethrown.
export async function openInNewTab(resolveUrl: () => Promise<string>): Promise<void> {
  const tab = window.open('', '_blank')
  try {
    const url = await resolveUrl()
    if (tab) {
      // The tab could not be opened with `noopener` (that returns null), so detach it here instead.
      tab.opener = null
      tab.location.href = url
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  } catch (error) {
    tab?.close()
    throw error
  }
}
