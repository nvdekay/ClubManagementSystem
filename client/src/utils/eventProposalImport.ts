import { proposalDocumentMaxBytes } from '@/utils/proposalFile'
import type { ClubEventInput, EventBudgetLine } from '@/services/clubEvents'
import {
  parseWordXml,
  readDocxXml,
  readDocxRelationships,
  type WordDocument,
  type WordBlock,
} from '@/utils/docxDocument'
import type { DocumentLink } from '@/utils/documentLinks'

export interface ProposalSection {
  id: string
  title: string
  titleLinks?: DocumentLink[]
  blocks: WordBlock[]
}

export interface ProposalImport {
  input: ClubEventInput
  fields: { label: string; value: string; links?: DocumentLink[] }[]
  missing: string[]
  sections: ProposalSection[]
}

// Keep every source block in order; grouping changes presentation, never the source content.
export function proposalSections(document: WordDocument): ProposalSection[] {
  const sections: ProposalSection[] = []
  const blocks =
    document.blocks ??
    document.tables.map((rows): WordBlock => ({
      kind: 'table',
      rows: rows.map((row) => row.map((text) => ({ text, columnSpan: 1, rowSpan: 1 }))),
    }))
  for (const block of blocks) {
    const major =
      block.kind === 'paragraph' && (block.heading === 1 || /^[A-HĐ][.)]\s+\S/u.test(block.text))
    if (major || !sections.length) {
      sections.push({
        id: `section-${sections.length + 1}`,
        title: major && block.kind === 'paragraph' ? block.text : '',
        titleLinks: major && block.kind === 'paragraph' ? block.links : undefined,
        blocks: [],
      })
    }
    sections[sections.length - 1]!.blocks.push(block)
  }
  return sections
}

function normalized(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function content(value: string): string {
  return /^\s*(?:\[.*\]|\.{2,}|…|0(?:\s*[đ₫])?)?\s*$/.test(value) ? '' : value.trim()
}

// Parse an explicit Vietnamese calendar date and time without locale-dependent Date parsing.
export function proposalDateTime(date: string, time: string): string {
  const d = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/.exec(date)
  const h = /\b([01]?\d|2[0-3])\s*[:hH]\s*([0-5]\d)\b/.exec(time)
  if (!d || !h) {
    return ''
  }
  const day = Number(d[1]),
    month = Number(d[2]),
    year = Number(d[3])
  const check = new Date(Date.UTC(year, month - 1, day))
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return ''
  }
  return new Date(Date.UTC(year, month - 1, day, Number(h[1]) - 7, Number(h[2]))).toISOString()
}

function money(value: string): number | undefined {
  if (!/^\s*(?:\d+|\d{1,3}(?:[.\s]\d{3})+)(?:[,][0]+)?\s*(?:₫|đ|vnd)?\s*$/i.test(value)) {
    return undefined
  }
  const result = Number(value.replace(/[,][0]+/, '').replace(/[^\d]/g, ''))
  return Number.isSafeInteger(result) ? result : undefined
}

// Map the supplied Word template; never use the general expense budget as the requested grant.
export function mapProposalDocument(document: WordDocument): ProposalImport {
  const overview = document.tables.find((table) =>
    table.some((row) => normalized(row[1] ?? '') === 'ten su kien'),
  )
  if (!overview) {
    throw new Error('unknown_template')
  }
  const fields: ProposalImport['fields'] = []
  for (const row of overview) {
    if (row.length < 3) {
      continue
    }
    const label = row[1]?.trim() ?? ''
    const value = content(row.slice(2).join('\n'))
    if (label && !['hang muc', 'noi dung'].includes(normalized(label))) {
      fields.push({ label, value })
    } else if (!label && value && fields.length) {
      fields[fields.length - 1]!.value += `\n${value}`
    }
  }
  function get(...labels: string[]): string {
    for (const label of labels) {
      const field = fields.find((entry) => normalized(entry.label) === label && entry.value)
      if (field) {
        return field.value
      }
    }
    return ''
  }
  const richOverview = document.blocks?.find(
    (block) =>
      block.kind === 'table' &&
      block.rows.some((row) => row.some((cell) => normalized(cell.text) === 'ten su kien')),
  )
  if (richOverview?.kind === 'table') {
    for (const field of fields) {
      const row = richOverview.rows.find((cells) =>
        cells.some((cell) => cell.text.trim() === field.label),
      )
      const labelIndex = row?.findIndex((cell) => cell.text.trim() === field.label) ?? -1
      const value = labelIndex >= 0 ? row?.[labelIndex + 1] : undefined
      if (value?.text === field.value) {
        field.links = value.links
      }
    }
  }
  const title = get('ten su kien')
  const objective = [get('muc dich'), get('muc tieu')].filter(Boolean).join('\n\n')
  const plan = get('noi dung su kien', 'noi dung cuoc thi', 'ke hoach hoat dong')
  const eventDate = get('thoi gian dien ra su kien', 'ngay to chuc', 'ngay dien ra su kien')
  const start = get('thoi gian bat dau', 'gio bat dau')
  const end = get('thoi gian ket thuc', 'gio ket thuc')
  let startAt = proposalDateTime(start || eventDate, start || eventDate)
  let endAt = proposalDateTime(end || eventDate, end || eventDate)
  if (!startAt && start) {
    startAt = proposalDateTime(eventDate, start)
  }
  if (!endAt && end) {
    endAt = proposalDateTime(eventDate, end)
  }
  const dates = eventDate.match(/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{4}\b/g) ?? []
  if (!startAt && !endAt && dates.length === 1) {
    const inlineTimes = eventDate.match(/\b(?:[01]?\d|2[0-3])\s*[:hH]\s*[0-5]\d\b/g) ?? []
    if (inlineTimes.length === 2) {
      startAt = proposalDateTime(eventDate, inlineTimes[0]!)
      endAt = proposalDateTime(eventDate, inlineTimes[1]!)
    } else {
      const agenda = document.tables.find((table) =>
        /agenda (?:d\s*-\s*day|su kien)/.test(normalized(table[0]?.join(' ') ?? '')),
      )
      const times = (agenda ?? []).flatMap(
        (row) => (row[1] ?? '').match(/\b(?:[01]?\d|2[0-3])\s*[:hH]\s*[0-5]\d\b/g) ?? [],
      )
      if (times.length > 1) {
        const instants = times.map((time) => proposalDateTime(eventDate, time))
        if (
          instants.every(
            (instant, i) => Boolean(instant) && (i === 0 || instant >= instants[i - 1]!),
          )
        ) {
          startAt = instants[0] ?? ''
          endAt = instants[instants.length - 1] ?? ''
        }
      }
    }
  }
  const venueText = get('dia diem', 'dia diem to chuc')
  const capacityText = get(
    'so luong nguoi tham gia',
    'so luong nguoi tham gia toi da',
    'suc chua',
    'so luong nguoi tham gia (du kien)',
    'so luong thi sinh (du kien)',
  )
  const capacityMatch = /^\s*(\d+)\s*(?:nguoi|sinh vien|thi sinh|khach)?\s*$/i.exec(
    normalized(capacityText),
  )
  const capacity = capacityMatch ? Number(capacityMatch[1]) : 0
  const audience = normalized(get('doi tuong', 'doi tuong tham gia'))
  const memberOnly = /(?:thanh vien|noi bo).*clb|clb.*(?:thanh vien|noi bo)/.test(audience)
  const publicAudience = /sinh vien|cong khai|public|moi nguoi/.test(audience)
  const support = document.tables.find((table) =>
    normalized(table[0]?.join(' ') ?? '').includes('de xuat ho tro tu phong pdp'),
  )
  const budgetLines: EventBudgetLine[] = []
  let invalidBudget = false
  for (const row of (support ?? []).slice(2)) {
    if (!/^\d+$/.test(row[0]?.trim() ?? '')) {
      continue
    }
    const purpose = content(row[1] ?? '')
    const amount = money(row[5] ?? '')
    if (!purpose && !amount) {
      continue
    }
    if (!purpose || !amount || amount > 1e12) {
      invalidBudget = true
      continue
    }
    budgetLines.push({
      category: purpose,
      purpose,
      amount,
      plannedItems: row.slice(1, 5).filter(Boolean).join(' · '),
    })
  }
  const supportHeading = document.paragraphs.findIndex((p) =>
    normalized(p).includes('ho tro co so vat chat'),
  )
  const facilityNeeds =
    supportHeading < 0 ? '' : document.paragraphs.slice(supportHeading + 1).join('\n')
  const missing = [
    !title && 'titleField',
    !objective && 'objective',
    !plan && 'plan',
    !startAt && 'start',
    !endAt && 'end',
    !venueText && 'venue',
    (!capacity || capacity > 100000) && 'capacity',
    !memberOnly && !publicAudience && 'audience',
    invalidBudget && 'budget',
  ].filter((key): key is string => Boolean(key))
  return {
    sections: proposalSections(document),
    fields,
    missing: [...new Set(missing)],
    input: {
      title,
      objective,
      plan,
      startAt,
      endAt,
      venueText,
      capacity,
      audienceScope: 'PUBLIC',
      riskNote: get('ghi chu rui ro'),
      facilityNeeds,
      budgetLines,
      bookingIds: [],
      registrationForm: [],
      occurrences: [],
    },
  }
}

export async function importEventProposal(file: File): Promise<ProposalImport> {
  if (
    !file.name.toLowerCase().endsWith('.docx') ||
    file.size > proposalDocumentMaxBytes ||
    !file.size
  ) {
    throw new Error('invalid_docx')
  }
  const buffer = await file.arrayBuffer()
  const [xml, rels] = await Promise.all([readDocxXml(buffer), readDocxRelationships(buffer)])
  return mapProposalDocument(parseWordXml(xml, rels))
}
