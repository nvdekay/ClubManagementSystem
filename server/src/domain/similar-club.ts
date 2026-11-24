/**
 * Gợi ý tham khảo về "CLB tương tự" cho hồ sơ thành lập (UC07/UC08). Thuần và xác định:
 * không dùng dịch vụ ngoài, cùng đầu vào luôn cho cùng thứ hạng. Không bao giờ chặn việc gì.
 */

export type SimilarClubKind = 'CLUB' | 'APPLICATION'
export type SimilarClubLevel = 'HIGH' | 'MEDIUM'

/** Những gì của hồ sơ được đem ra so sánh: tên, tên lĩnh vực và `summary + objectives`. */
export interface SimilaritySubject {
  name: string
  field: string
  text: string
}

/** Một CLB đang có (text = `description`) hoặc một hồ sơ khác (text = `summary + objectives`). */
export interface SimilarityCandidate extends SimilaritySubject {
  kind: SimilarClubKind
  id: string
  state: string
}

export interface SimilarClubHint {
  kind: SimilarClubKind
  id: string
  name: string
  field: string
  state: string
  score: number
  level: SimilarClubLevel
  /** Độ tương đồng từng thành phần trong khoảng 0–1; `content` là null khi một bên không có văn bản mô tả. */
  reasons: { name: number; content: number | null; field: number; sharedWords: string[] }
}

export const SIMILAR_CLUB_STOPWORDS: ReadonlySet<string> = new Set([
  'clb',
  'cau',
  'lac',
  'bo',
  'club',
  'fpt',
  'fptu',
  'va',
  'cua',
  'cho',
  'cac',
  'la',
  'the',
  'of',
  'and',
  'nhung',
  'voi',
  'trong',
  'mot',
  'de',
  'tai',
  'duoc',
  'co',
  'khong',
  'nay',
  've',
  'tu',
  'se',
  'cung',
  'nhu',
  'theo',
  'sinh',
  'vien',
  'a',
  'an',
  'for',
  'to',
  'in',
  'on',
  'with',
])
export const HIGH_SIMILARITY = 60
export const MEDIUM_SIMILARITY = 35
export const MAX_SIMILAR_CLUBS = 5
const MAX_SHARED_WORDS = 10
const collator = new Intl.Collator('vi')

// Chuẩn hoá chuỗi về chữ thường không dấu để so sánh
/** Lowercase, strip Vietnamese diacritics (`đ → d`), keep only letters/digits as word breaks. */
function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Tách chuỗi thành các từ dùng để so sánh độ giống
export function similarityWords(value: string): string[] {
  return fold(value)
    .split(' ')
    .filter((word) => word && !SIMILAR_CLUB_STOPWORDS.has(word))
}

// Tạo tập bigram ký tự từ tên
function bigrams(name: string): Set<string> {
  const value = similarityWords(name).join(' ')
  if (value.length < 2) {
    return new Set(value ? [value] : [])
  }
  const result = new Set<string>()
  for (let index = 0; index < value.length - 1; index += 1) {
    result.add(value.slice(index, index + 2))
  }
  return result
}

// Tính hệ số Dice giữa hai tập
function dice(left: Set<string>, right: Set<string>): number {
  if (!left.size || !right.size) {
    return 0
  }
  let shared = 0
  for (const item of left) {
    if (right.has(item)) {
      shared += 1
    }
  }
  return (2 * shared) / (left.size + right.size)
}

// Làm tròn điểm giống nhau về số nguyên
function rounded(value: number): number {
  return Math.round(value * 100) / 100
}

// Tính điểm giống nhau 0-100 giữa hai CLB theo tên, nội dung và lĩnh vực
/** Điểm 0–100 = tên 40 + nội dung 40 + lĩnh vực 20; nội dung tính 0 khi một trong hai bên không có văn bản. */
export function similarityScore(
  subject: SimilaritySubject,
  candidate: SimilarityCandidate,
): Omit<SimilarClubHint, 'level'> {
  const subjectWords = new Set(similarityWords(subject.text))
  const candidateWords = new Set(similarityWords(candidate.text))
  const name = dice(bigrams(subject.name), bigrams(candidate.name))
  const subjectField = fold(subject.field)
  const field = subjectField && subjectField === fold(candidate.field) ? 1 : 0
  const content =
    subjectWords.size && candidateWords.size ? dice(subjectWords, candidateWords) : null
  // Không chia lại trọng số khi thiếu nội dung: nếu chia lại, chỉ cùng lĩnh vực đã được 33 điểm và chỉ cần
  // trùng tên lẻ tẻ là sinh ra gợi ý. Ứng viên không có văn bản tối đa chỉ đạt 60 (cùng tên + lĩnh vực).
  const score = Math.round(name * 40 + (content ?? 0) * 40 + field * 20)
  const sharedWords = [...subjectWords]
    .filter((word) => candidateWords.has(word))
    .sort(collator.compare)
    .slice(0, MAX_SHARED_WORDS)
  return {
    kind: candidate.kind,
    id: candidate.id,
    name: candidate.name,
    field: candidate.field,
    state: candidate.state,
    score,
    reasons: {
      name: rounded(name),
      content: content === null ? null : rounded(content),
      field,
      sharedWords,
    },
  }
}

// Gợi ý các CLB giống nhất từ mức MEDIUM trở lên, sắp xếp điểm cao trước
/** Các gợi ý từ mức MEDIUM trở lên, tốt nhất trước (đồng điểm xếp theo tên theo `vi`), tối đa năm. */
export function similarClubHints(
  subject: SimilaritySubject,
  candidates: readonly SimilarityCandidate[],
): SimilarClubHint[] {
  if (!bigrams(subject.name).size && !similarityWords(subject.text).length) {
    return []
  }
  return candidates
    .map((candidate) => similarityScore(subject, candidate))
    .filter((hint) => hint.score >= MEDIUM_SIMILARITY)
    .map((hint): SimilarClubHint => ({
      ...hint,
      level: hint.score >= HIGH_SIMILARITY ? 'HIGH' : 'MEDIUM',
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        collator.compare(left.name, right.name) ||
        left.id.localeCompare(right.id),
    )
    .slice(0, MAX_SIMILAR_CLUBS)
}
