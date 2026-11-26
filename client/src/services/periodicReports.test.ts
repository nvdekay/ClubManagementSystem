import { afterEach, describe, expect, it, vi } from 'vitest'
import { uploadPeriodicEvidenceImage } from '@/services/clubPeriodicReports'
import { evidenceDisplayUrl, isEvidenceReference } from '@/services/periodicReports'

const reference = 'ucms-evidence:0000000000000000000000c1:0123456789abcdef0123456789abcdef'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('periodic report evidence links', () => {
  it('resolves uploaded references through the signed URL map', () => {
    const signed = 'https://files.example/asset?sig=1'
    expect(isEvidenceReference(reference)).toBe(true)
    expect(evidenceDisplayUrl(reference, { [reference]: signed })).toBe(signed)
    expect(evidenceDisplayUrl(reference, {})).toBeUndefined()
  })

  it('passes external links and legacy data: URLs through unchanged', () => {
    const legacy = 'data:image/png;base64,iVBORw0KGgo='
    expect(evidenceDisplayUrl('https://drive.google.com/x', undefined)).toBe(
      'https://drive.google.com/x',
    )
    expect(evidenceDisplayUrl(legacy, undefined)).toBe(legacy)
    expect(isEvidenceReference(legacy)).toBe(false)
    expect(evidenceDisplayUrl(undefined, undefined)).toBeUndefined()
  })

  it('uploads the raw image with its type and the CSRF token', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ data: { reference, url: 'https://files.example/a', mimeType: 'image/png' } }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const file = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' })
    const uploaded = await uploadPeriodicEvidenceImage('club1', file, 'csrf-token')
    expect(uploaded.reference).toBe(reference)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/clubs/club1/periodic-reports/evidence-images',
      expect.objectContaining({
        method: 'POST',
        body: file,
        headers: { 'Content-Type': 'image/png', 'X-CSRF-Token': 'csrf-token' },
      }),
    )
  })
})
