import { renderAsync } from 'docx-preview'
import { Previewer } from 'pagedjs'
import { documentHref, documentTextParts } from '@/utils/documentLinks'

import './proposalDocumentFrame.css'

const target = document.getElementById('pages')!
let sequence = 0
let pageWidth = 794
let zoom: number | 'fit' = 'fit'
let currentId = ''

function send(type: string, extra: Record<string, unknown> = {}) {
  window.parent.postMessage(
    { channel: 'proposal-preview', type, id: currentId, ...extra },
    window.location.origin,
  )
}

function applyZoom() {
  const value =
    zoom === 'fit' ? Math.min(1.25, Math.max(0.15, (window.innerWidth - 32) / pageWidth)) : zoom
  const pages = target.querySelector<HTMLElement>('.pagedjs_pages')
  if (pages) {
    pages.style.setProperty('zoom', String(value))
  }
  send('zoom', { zoom: Math.round(value * 100) })
}

function setColors(colors: unknown) {
  if (!colors || typeof colors !== 'object') {
    return
  }
  for (const key of ['canvas', 'paper', 'ink', 'shadow']) {
    const value = (colors as Record<string, unknown>)[key]
    if (typeof value === 'string' && CSS.supports('color', value)) {
      document.documentElement.style.setProperty(`--viewer-${key}`, value)
    }
  }
}

function enableDocumentLinks(container: HTMLElement) {
  for (const link of container.querySelectorAll('a')) {
    const original = link.getAttribute('href') ?? ''
    if (original.startsWith('#') && original.length > 1) {
      continue
    }
    const href = documentHref(original)
    if (!href) {
      link.removeAttribute('href')
      continue
    }
    link.href = href
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
  }
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    if (!node.parentElement?.closest('a, style, script')) {
      nodes.push(node)
    }
  }
  for (const node of nodes) {
    const parts = documentTextParts(node.textContent ?? '')
    if (!parts.some((part) => part.href)) {
      continue
    }
    const fragment = document.createDocumentFragment()
    for (const part of parts) {
      if (!part.href) {
        fragment.append(document.createTextNode(part.text))
        continue
      }
      const link = document.createElement('a')
      link.href = part.href
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.textContent = part.text
      fragment.append(link)
    }
    node.replaceWith(fragment)
  }
}

// Render the full source before pagination; never rebuild the document from extracted fields.
async function render(file: File, id: string) {
  const version = ++sequence
  currentId = id
  target.replaceChildren()
  const staging = document.createElement('div')
  const styles = document.createElement('div')
  staging.style.position = 'absolute'
  staging.style.left = '-20000px'
  document.body.append(staging, styles)
  let preview: Previewer | undefined
  try {
    await renderAsync(await file.arrayBuffer(), staging, styles, {
      className: 'proposal-docx',
      inWrapper: false,
      breakPages: false,
      ignoreLastRenderedPageBreak: false,
      ignoreFonts: false,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true,
      renderAltChunks: false,
      renderChanges: false,
      useBase64URL: true,
    })
    if (version !== sequence) {
      return
    }
    const sections = Array.from(staging.querySelectorAll<HTMLElement>('section.proposal-docx'))
    if (!sections.length) {
      throw new Error('empty_document')
    }
    for (const element of staging.querySelectorAll('script, iframe, object, embed')) {
      element.remove()
    }
    enableDocumentLinks(staging)
    // Word tables are built with direct TR children; pagination expects valid row groups.
    for (const table of staging.querySelectorAll('table')) {
      const rows = Array.from(table.children).filter((child) => child.tagName === 'TR')
      if (rows.length) {
        const group = document.createElement('tbody')
        table.insertBefore(group, rows[0]!)
        for (const row of rows) {
          group.append(row)
        }
      }
    }
    // Google Docs exports some headings with a hanging indent but no matching left margin.
    // Keep the leading section letter inside the printable area instead of clipping it.
    for (const paragraph of staging.querySelectorAll('p')) {
      const computed = getComputedStyle(paragraph)
      const indent = Number.parseFloat(computed.textIndent) || 0
      const margin = Number.parseFloat(computed.marginLeft) || 0
      const padding = Number.parseFloat(computed.paddingLeft) || 0
      if (indent < 0 && margin + padding + indent < 0) {
        paragraph.style.marginLeft = `${-indent - padding}px`
      }
    }
    const first = sections[0]!
    const width = first.style.width || '210mm'
    const height = first.style.minHeight || '297mm'
    const margins = [
      first.style.paddingTop,
      first.style.paddingRight,
      first.style.paddingBottom,
      first.style.paddingLeft,
    ]
      .map((value) => value || '20mm')
      .join(' ')
    const content = document.createElement('div')
    for (const section of sections) {
      for (const property of [
        'width',
        'min-height',
        'height',
        'padding',
        'padding-top',
        'padding-right',
        'padding-bottom',
        'padding-left',
      ]) {
        section.style.removeProperty(property)
      }
      content.append(section)
    }
    const css =
      Array.from(styles.querySelectorAll('style'))
        .map((style) => style.textContent)
        .join('\n') +
      `
      @page { size: ${width} ${height}; margin: ${margins};
        @top-center { content: element(proposalHeader); }
        @bottom-center { content: element(proposalFooter); }
        @bottom-right { content: counter(page); font-family: serif; font-size: 9pt; }
      }
      section.proposal-docx { width: auto !important; min-height: 0 !important; padding: 0 !important; box-shadow: none !important; }
      .proposal-docx header { position: running(proposalHeader); width: 100%; }
      .proposal-docx footer { position: running(proposalFooter); width: 100%; }
      .proposal-docx article { margin: 0 !important; }
      .proposal-docx img { max-width: 100%; }
      .proposal-docx table { max-width: 100%; }
      .proposal-docx tr { break-inside: avoid; }
      .proposal-docx thead { display: table-header-group; }
      .proposal-docx h1, .proposal-docx h2, .proposal-docx h3 { break-after: avoid; }
      .proposal-docx p[class*="proposal-docx-num-"] { text-indent: 0 !important; }
      .proposal-docx p[class*="proposal-docx-num-"]::before { position: static !important; right: auto !important; margin-right: .35em; }
    `
    preview = new Previewer()
    const flow = await preview.preview(content, [{ [window.location.href]: css }], target)
    if (version !== sequence) {
      return
    }
    await document.fonts.ready
    const pages = target.querySelectorAll<HTMLElement>('.pagedjs_page')
    pageWidth = pages[0]?.getBoundingClientRect().width || 794
    if (!flow.total || flow.total > 300) {
      throw new Error('invalid_pagination')
    }
    zoom = 'fit'
    applyZoom()
    send('rendered', { pages: flow.total })
    window.scrollTo(0, 0)
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Document preview failed', error)
    }
    if (version === sequence) {
      target.replaceChildren()
      send('error')
    }
  } finally {
    staging.remove()
    styles.remove()
    // Keep generated pagination styles until this isolated frame is replaced by the parent.
    if (version !== sequence) {
      preview?.polisher.destroy()
    }
  }
}

window.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (
    event.source !== window.parent ||
    event.origin !== window.location.origin ||
    !event.data ||
    typeof event.data !== 'object'
  ) {
    return
  }
  const data = event.data as Record<string, unknown>
  if (data.channel !== 'proposal-preview') {
    return
  }
  if (data.type === 'initialize') {
    send('ready')
    return
  }
  setColors(data.colors)
  if (data.type === 'render' && data.file instanceof File && typeof data.id === 'string') {
    void render(data.file, data.id)
  }
  if (data.id !== currentId) {
    return
  }
  if (data.type === 'zoom' && (data.value === 'fit' || typeof data.value === 'number')) {
    zoom = data.value === 'fit' ? 'fit' : Math.min(2, Math.max(0.25, data.value))
    applyZoom()
  }
  if (data.type === 'page' && typeof data.page === 'number') {
    target
      .querySelectorAll('.pagedjs_page')
      [Math.max(0, Math.floor(data.page) - 1)]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
  }
  if (data.type === 'print') {
    window.print()
  }
})
window.addEventListener('resize', applyZoom)
let scrollPending = false
window.addEventListener(
  'scroll',
  () => {
    if (scrollPending) {
      return
    }
    scrollPending = true
    requestAnimationFrame(() => {
      scrollPending = false
      const pages = Array.from(target.querySelectorAll<HTMLElement>('.pagedjs_page'))
      const page = pages.findIndex(
        (p) => p.getBoundingClientRect().bottom > window.innerHeight * 0.25,
      )
      if (page >= 0) {
        send('page', { page: page + 1 })
      }
    })
  },
  { passive: true },
)
send('ready')
