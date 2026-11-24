import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AppLinkedText } from '@/components/ui/linked-text/AppLinkedText'
import { documentHref, documentTextParts } from '@/utils/documentLinks'

describe('document hyperlinks', () => {
  it.each([
    'javascript:alert(1)',
    'data:text/html,test',
    'file:///C:/test',
    'vbscript:msgbox(1)',
    '//example.com/path',
    '#local',
    `java${String.fromCharCode(9)}script:alert(1)`,
  ])('does not activate unsafe or unresolved URLs: %s', (value) => {
    expect(documentHref(value)).toBeNull()
  })
  it('allows web and email links without losing query strings or fragments', () => {
    expect(documentHref('https://example.com/view?a=1&b=2#section')).toBe(
      'https://example.com/view?a=1&b=2#section',
    )
    expect(documentHref('www.example.com/path')).toBe('https://www.example.com/path')
    expect(documentHref('mailto:test@example.com')).toBe('mailto:test@example.com')
  })
  it('keeps identical Word labels attached to their own distinct destinations', () => {
    expect(
      documentTextParts('Link / Link', [
        { start: 0, end: 4, href: 'https://example.com/one' },
        { start: 7, end: 11, href: 'https://example.com/two' },
      ]),
    ).toEqual([
      { text: 'Link', href: 'https://example.com/one' },
      { text: ' / ' },
      { text: 'Link', href: 'https://example.com/two' },
    ])
  })
  it('recognises plain URLs while retaining punctuation and balanced URL parentheses', () => {
    const text =
      'Tài liệu (https://example.com/doc). Xem https://example.com/wiki/Test_(topic), hoặc www.example.com.'
    const parts = documentTextParts(text)
    expect(parts.map((part) => part.text).join('')).toBe(text)
    expect(parts.filter((part) => part.href).map((part) => part.href)).toEqual([
      'https://example.com/doc',
      'https://example.com/wiki/Test_(topic)',
      'https://www.example.com/',
    ])
  })
  it('ignores invalid link offsets and preserves Unicode source text', () => {
    const text = '😀 Tại đây'
    const parts = documentTextParts(text, [
      { start: -1, end: 3, href: 'https://example.com/bad' },
      { start: 3, end: text.length, href: 'https://example.com/right' },
      { start: 999, end: 1000, href: 'https://example.com/bad' },
    ])
    expect(parts.map((part) => part.text).join('')).toBe(text)
    expect(parts.filter((part) => part.href)).toEqual([
      { text: 'Tại đây', href: 'https://example.com/right' },
    ])
  })
  it('opens a labelled link in a separate tab and escapes source markup', () => {
    const text = '<img onerror=alert(1)>'
    const html = renderToStaticMarkup(
      createElement(AppLinkedText, {
        text,
        links: [{ start: 0, end: text.length, href: 'https://example.com/' }],
      }),
    )
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('&lt;img onerror=alert(1)&gt;')
    expect(html).not.toContain('<img')
  })
})
