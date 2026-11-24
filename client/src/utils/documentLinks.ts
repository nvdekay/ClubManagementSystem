export interface DocumentLink {
  start: number
  end: number
  href: string
}
export interface DocumentTextPart {
  text: string
  href?: string
}

// Only normal document navigation is allowed; never treat script/data URLs as hyperlinks.
export function documentHref(value: string): string | null {
  if (
    !value ||
    Array.from(value.trim()).some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  ) {
    return null
  }
  try {
    const url = new URL(value.trim().startsWith('www.') ? `https://${value.trim()}` : value.trim())
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function plainParts(text: string): DocumentTextPart[] {
  const parts: DocumentTextPart[] = []
  const pattern = /\b(?:https?:\/\/|www\.)[^\s<>"]+/giu
  let offset = 0
  for (const match of text.matchAll(pattern)) {
    let label = match[0].replace(/[.,;:!?]+$/u, '')
    for (const [open, close] of [
      ['(', ')'],
      ['[', ']'],
      ['{', '}'],
    ]) {
      while (label.endsWith(close!) && label.split(close!).length > label.split(open!).length) {
        label = label.slice(0, -1)
      }
    }
    const href = documentHref(label)
    if (!href) {
      continue
    }
    if (match.index > offset) {
      parts.push({ text: text.slice(offset, match.index) })
    }
    parts.push({ text: label, href })
    offset = match.index + label.length
  }
  if (offset < text.length) {
    parts.push({ text: text.slice(offset) })
  }
  return parts
}

// Explicit Word link offsets take precedence over URL recognition in plain text.
export function documentTextParts(
  text: string,
  links: readonly DocumentLink[] = [],
): DocumentTextPart[] {
  const parts: DocumentTextPart[] = []
  let offset = 0
  for (const link of [...links].sort((a, b) => a.start - b.start)) {
    if (
      !Number.isInteger(link.start) ||
      !Number.isInteger(link.end) ||
      link.start < offset ||
      link.end <= link.start ||
      link.end > text.length
    ) {
      continue
    }
    const href = documentHref(link.href)
    if (!href) {
      continue
    }
    parts.push(...plainParts(text.slice(offset, link.start)), {
      text: text.slice(link.start, link.end),
      href,
    })
    offset = link.end
  }
  parts.push(...plainParts(text.slice(offset)))
  return parts
}
