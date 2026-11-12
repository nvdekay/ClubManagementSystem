/**
 * Advisory "similar club" hints for founding applications (UC07/UC08). Pure and deterministic:
 * no external service, the same input always gives the same ranking. Never blocks anything.
 */

export type SimilarClubKind = "CLUB" | "APPLICATION";
export type SimilarClubLevel = "HIGH" | "MEDIUM";

/** What an application is compared on: its name, field name and `summary + objectives`. */
export interface SimilaritySubject {
  name: string;
  field: string;
  text: string;
}

/** An existing club (text = `description`) or another application (text = `summary + objectives`). */
export interface SimilarityCandidate extends SimilaritySubject {
  kind: SimilarClubKind;
  id: string;
  state: string;
}

export interface SimilarClubHint {
  kind: SimilarClubKind;
  id: string;
  name: string;
  field: string;
  state: string;
  score: number;
  level: SimilarClubLevel;
  /** Component similarities in 0–1; `content` is null when one side has no descriptive text. */
  reasons: { name: number; content: number | null; field: number; sharedWords: string[] };
}

export const SIMILAR_CLUB_STOPWORDS: ReadonlySet<string> = new Set([
  "clb", "cau", "lac", "bo", "club", "fpt", "fptu", "va", "cua", "cho", "cac", "la", "the", "of",
  "and", "nhung", "voi", "trong", "mot", "de", "tai", "duoc", "co", "khong", "nay", "ve", "tu",
  "se", "cung", "nhu", "theo", "sinh", "vien", "a", "an", "for", "to", "in", "on", "with",
]);
export const HIGH_SIMILARITY = 60;
export const MEDIUM_SIMILARITY = 35;
export const MAX_SIMILAR_CLUBS = 5;
const MAX_SHARED_WORDS = 10;
const collator = new Intl.Collator("vi");

/** Lowercase, strip Vietnamese diacritics (`đ → d`), keep only letters/digits as word breaks. */
function fold(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

export function similarityWords(value: string): string[] {
  return fold(value).split(" ").filter((word) => word && !SIMILAR_CLUB_STOPWORDS.has(word));
}

function bigrams(name: string): Set<string> {
  const value = similarityWords(name).join(" ");
  if (value.length < 2) return new Set(value ? [value] : []);
  const result = new Set<string>();
  for (let index = 0; index < value.length - 1; index += 1) result.add(value.slice(index, index + 2));
  return result;
}

function dice(left: Set<string>, right: Set<string>): number {
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const item of left) if (right.has(item)) shared += 1;
  return (2 * shared) / (left.size + right.size);
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Score 0–100 = name 40 + content 40 + field 20; content counts as 0 when either side has no text. */
export function similarityScore(subject: SimilaritySubject,
  candidate: SimilarityCandidate): Omit<SimilarClubHint, "level"> {
  const subjectWords = new Set(similarityWords(subject.text));
  const candidateWords = new Set(similarityWords(candidate.text));
  const name = dice(bigrams(subject.name), bigrams(candidate.name));
  const subjectField = fold(subject.field);
  const field = subjectField && subjectField === fold(candidate.field) ? 1 : 0;
  const content = subjectWords.size && candidateWords.size ? dice(subjectWords, candidateWords) : null;
  // No redistribution when content is missing: with it, a shared field alone scored 33 and any
  // stray name overlap produced a hint. A text-less candidate tops out at 60 (same name + field).
  const score = Math.round(name * 40 + (content ?? 0) * 40 + field * 20);
  const sharedWords = [...subjectWords].filter((word) => candidateWords.has(word))
    .sort(collator.compare).slice(0, MAX_SHARED_WORDS);
  return { kind: candidate.kind, id: candidate.id, name: candidate.name, field: candidate.field,
    state: candidate.state, score, reasons: { name: rounded(name),
      content: content === null ? null : rounded(content), field, sharedWords } };
}

/** Hints at or above MEDIUM, best first (ties by `vi` name order), at most five. */
export function similarClubHints(subject: SimilaritySubject,
  candidates: readonly SimilarityCandidate[]): SimilarClubHint[] {
  if (!bigrams(subject.name).size && !similarityWords(subject.text).length) return [];
  return candidates.map((candidate) => similarityScore(subject, candidate))
    .filter((hint) => hint.score >= MEDIUM_SIMILARITY)
    .map((hint): SimilarClubHint => ({ ...hint,
      level: hint.score >= HIGH_SIMILARITY ? "HIGH" : "MEDIUM" }))
    .sort((left, right) => right.score - left.score
      || collator.compare(left.name, right.name) || left.id.localeCompare(right.id))
    .slice(0, MAX_SIMILAR_CLUBS);
}
