import { DomainError } from './errors.js'
import { classify, type Classification } from './evaluation.js'
import {
  EVALUATION_DIMENSIONS,
  type DimensionCode,
  type SchemeThresholds,
} from './evaluation-scheme.js'

/** UC55 A2: một năm học gồm SPRING → SUMMER → FALL của cùng một năm dương lịch (quy ước của FPT University). */
export const SEASONS = ['SPRING', 'SUMMER', 'FALL'] as const
export type Season = (typeof SEASONS)[number]
export type Trend = 'UP' | 'DOWN' | 'STABLE'

export const ANNUAL_FORMATS = ['pdf', 'xlsx'] as const
export type AnnualFormat = (typeof ANNUAL_FORMATS)[number]
export const MAX_REMARKS = 2_000
export const MAX_ACHIEVEMENTS = 20
/** Số điểm chênh giữa kỳ đầu và kỳ cuối được đánh giá để coi xu hướng là UP hoặc DOWN. */
export const TREND_DELTA = 5
const CLASSIFICATIONS: Classification[] = ['EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_IMPROVEMENT']

// Tách mã kỳ (vd `Fall 2026`) thành mùa và năm, trả null nếu không hợp lệ
/** `Fall 2026`, `FALL 2026`, `fall2026` → FALL năm 2026; mã khác không thuộc năm học nào. */
export function parsePeriodCode(code: string): { season: Season; year: number } | null {
  const match = /^\s*(spring|summer|fall)\s*(\d{4})\s*$/i.exec(code)
  return match ? { season: match[1]!.toUpperCase() as Season, year: Number(match[2]) } : null
}

// Kiểm tra năm báo cáo là số nguyên 4 chữ số
export function validateAnnualYear(year: unknown): number {
  if (typeof year !== 'number' || !Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new DomainError('year must be a 4-digit number', 'validation', { field: 'year' })
  }
  return year
}

/** Dữ liệu từ các đánh giá Published, báo cáo định kỳ Accepted và CLB của năm (đều đã được ICPDP xác nhận). */
export interface AnnualEvaluation {
  clubId: string
  periodCode: string
  revisionNo: number
  publishedAt?: Date
  totalScore?: number
  classification?: Classification
  thresholds: SchemeThresholds
  dimensions: { code: string; score?: number; insufficientData: boolean }[]
  /** Số liệu gốc từ bằng chứng của đánh giá (EVL-02), để báo cáo khớp với bảng điểm đã gửi cho CLB. */
  metrics: {
    activeMembers?: number
    completedEvents?: number
    attendances?: number
    openViolations?: number
  }
}

export interface AnnualPeriodicReport {
  id: string
  clubId: string
  periodCode: string
  versionNo: number
  approvedTotal?: number
  disbursedTotal?: number
  achievements: { title: string; description: string }[]
}

export interface AnnualClub {
  id: string
  name: string
  field?: string
  state: string
  createdAt?: Date
}

export interface AnnualSource {
  evaluations: AnnualEvaluation[]
  reports: AnnualPeriodicReport[]
  clubs: AnnualClub[]
}

export interface AnnualYearOption {
  year: number
  terms: { season: Season; periodCodes: string[]; published: boolean }[]
}

export interface AnnualTermScore {
  score: number
  classification: Classification
}

export interface AnnualClubRow {
  clubId: string
  clubName: string
  field: string | null
  state: string
  terms: Record<Season, AnnualTermScore | null>
  /** Số kỳ có đánh giá Published (trên 3); 0 nghĩa là "chưa có đánh giá" và dòng đó nằm cuối bảng. */
  evaluatedTerms: number
  yearScore: number | null
  yearClassification: Classification | null
  trend: Trend | null
  /** Trung bình cả năm của từng tiêu chí, bỏ qua các kỳ không đủ dữ liệu. */
  dimensions: Record<DimensionCode, number | null>
}

export interface AnnualAchievement {
  key: string
  clubName: string
  title: string
  description: string
  periodCode: string
  season: Season
}

export interface AnnualReport {
  year: number
  /** Có ít hơn ba kỳ có đánh giá Published: báo cáo chỉ mang tính tạm thời. */
  provisional: boolean
  terms: AnnualYearOption['terms']
  missingTerms: Season[]
  thresholds: SchemeThresholds
  overview: {
    clubsByState: Record<string, number>
    clubsCreated: number
    activeMembers: number
    completedEvents: number
    participations: number
  }
  evaluation: {
    evaluatedClubs: number
    byClassification: Record<Classification, number>
    averageYearScore: number | null
    averageByTerm: Record<Season, number | null>
    rows: AnnualClubRow[]
    top: { clubId: string; clubName: string; yearScore: number }[]
  }
  dimensions: {
    averages: { code: DimensionCode; name: string; average: number | null }[]
    highest: DimensionCode | null
    lowest: DimensionCode | null
  }
  finance: {
    hasData: boolean
    approvedTotal: number
    disbursedTotal: number
    disbursementRate: number | null
    clubsWithoutAcceptedReport: number
  }
  compliance: {
    openViolations: number
    needsImprovement: { clubId: string; clubName: string }[]
    declining: { clubId: string; clubName: string }[]
    suspendedOrDissolving: { clubId: string; clubName: string; state: string }[]
  }
  achievements: AnnualAchievement[]
}

// Làm tròn số tới một chữ số thập phân
function round(value: number): number {
  return Math.round(value * 10) / 10
}

// Tính trung bình cộng đã làm tròn, null nếu danh sách rỗng
function mean(values: number[]): number | null {
  return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null
}

// Tạo bản ghi theo ba mùa SPRING, SUMMER, FALL từ hàm sinh giá trị
function bySeason<T>(make: (season: Season) => T): Record<Season, T> {
  return { SPRING: make('SPRING'), SUMMER: make('SUMMER'), FALL: make('FALL') }
}

// Liệt kê các năm có ít nhất một đánh giá Published cùng trạng thái ba kỳ
/** Các năm có ít nhất một đánh giá Published, mới nhất trước, kèm trạng thái ba kỳ của năm đó. */
export function annualYears(publishedPeriodCodes: string[]): AnnualYearOption[] {
  const years = new Map<number, Record<Season, string[]>>()
  for (const code of publishedPeriodCodes) {
    const parsed = parsePeriodCode(code)
    if (!parsed) {
      continue
    }
    const terms = years.get(parsed.year) ?? bySeason<string[]>(() => [])
    if (!terms[parsed.season].includes(code)) {
      terms[parsed.season].push(code)
    }
    years.set(parsed.year, terms)
  }
  return [...years.entries()]
    .sort(([left], [right]) => right - left)
    .map(([year, terms]) => ({
      year,
      terms: SEASONS.map((season) => ({
        season,
        periodCodes: terms[season].sort(),
        published: terms[season].length > 0,
      })),
    }))
}

// Tạo khoá định danh một thành tích từ báo cáo, phiên bản và vị trí
export function achievementKey(
  report: Pick<AnnualPeriodicReport, 'id' | 'versionNo'>,
  index: number,
): string {
  return `${report.id}:${report.versionNo}:${index}`
}

// Cộng các số, giá trị thiếu tính là 0
function sum(values: (number | undefined)[]): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0)
}

// Kiểm tra ngày tạo có thuộc năm đã cho theo giờ Việt Nam
/** Năm dương lịch theo giờ Việt Nam, giống các khoảng thời gian của học kỳ. */
function createdIn(date: Date | undefined, year: number): boolean {
  return date !== undefined && new Date(date.getTime() + 7 * 3_600_000).getUTCFullYear() === year
}

// Rút gọn dòng CLB thành cặp mã và tên CLB
function pick(row: AnnualClubRow): { clubId: string; clubName: string } {
  return { clubId: row.clubId, clubName: row.clubName }
}

// Xác định xu hướng tăng, giảm hoặc ổn định giữa giá trị đầu và cuối
function trendOf(first: number, last: number): Trend {
  const delta = round(last - first)
  return delta >= TREND_DELTA ? 'UP' : delta <= -TREND_DELTA ? 'DOWN' : 'STABLE'
}

// Dựng báo cáo năm sáu phần từ các nguồn đã được ICPDP xác nhận
/** Dựng sáu phần của báo cáo năm từ các nguồn đã xác nhận của một năm. Không bao giờ tính lại điểm. */
export function buildAnnualReport(year: number, source: AnnualSource): AnnualReport {
  const clubs = new Map(source.clubs.map((club) => [club.id, club]))
  function nameOf(clubId: string): string {
    return clubs.get(clubId)?.name ?? ''
  }

  // Mỗi CLB mỗi kỳ chỉ có một đánh giá: hai mã của cùng một kỳ được gộp lại, bản công bố sau thắng.
  const evaluations = new Map<string, AnnualEvaluation & { season: Season }>()
  for (const item of source.evaluations) {
    const parsed = parsePeriodCode(item.periodCode)
    if (parsed?.year !== year) {
      continue
    }
    const key = `${item.clubId}:${parsed.season}`
    const kept = evaluations.get(key)
    if (!kept || (item.publishedAt?.getTime() ?? 0) > (kept.publishedAt?.getTime() ?? 0)) {
      evaluations.set(key, { ...item, season: parsed.season })
    }
  }
  const scored = [...evaluations.values()]
  const termCodes = bySeason<string[]>(() => [])
  for (const item of scored) {
    if (!termCodes[item.season].includes(item.periodCode)) {
      termCodes[item.season].push(item.periodCode)
    }
  }
  const terms = SEASONS.map((season) => ({
    season,
    periodCodes: termCodes[season].sort(),
    published: termCodes[season].length > 0,
  }))
  const missingTerms = terms.filter((term) => !term.published).map((term) => term.season)
  const latestSeason = [...SEASONS].reverse().find((season) => termCodes[season].length > 0)
  // Cả báo cáo dùng một bộ ngưỡng: lấy scheme của kỳ mới nhất, từ lần công bố mới nhất của kỳ đó.
  const thresholds = scored
    .filter((item) => item.season === latestSeason)
    .sort(
      (left, right) => (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0),
    )[0]?.thresholds ?? { excellent: 85, good: 70, fair: 50 }

  const perClub = new Map<string, (AnnualEvaluation & { season: Season })[]>()
  for (const item of scored) {
    perClub.set(item.clubId, [...(perClub.get(item.clubId) ?? []), item])
  }

  const evaluatedRows: AnnualClubRow[] = []
  for (const [clubId, items] of perClub) {
    const ordered = items
      .filter((item) => item.totalScore !== undefined)
      .sort((left, right) => SEASONS.indexOf(left.season) - SEASONS.indexOf(right.season))
    if (!ordered.length) {
      continue
    }
    const yearScore = mean(ordered.map((item) => item.totalScore!))!
    const club = clubs.get(clubId)
    evaluatedRows.push({
      clubId,
      clubName: nameOf(clubId),
      field: club?.field ?? null,
      state: club?.state ?? '',
      terms: bySeason((season) => {
        const item = ordered.find((entry) => entry.season === season)
        return item
          ? {
              score: item.totalScore!,
              classification: item.classification ?? classify(item.totalScore!, item.thresholds),
            }
          : null
      }),
      evaluatedTerms: ordered.length,
      yearScore,
      yearClassification: classify(yearScore, thresholds),
      trend:
        ordered.length > 1 ? trendOf(ordered[0]!.totalScore!, ordered.at(-1)!.totalScore!) : null,
      dimensions: Object.fromEntries(
        EVALUATION_DIMENSIONS.map(({ code }) => [
          code,
          mean(
            items.flatMap((item) =>
              item.dimensions
                .filter(
                  (entry) =>
                    entry.code === code && !entry.insufficientData && entry.score !== undefined,
                )
                .map((entry) => entry.score!),
            ),
          ),
        ]),
      ) as Record<DimensionCode, number | null>,
    })
  }
  evaluatedRows.sort(
    (left, right) =>
      right.yearScore! - left.yearScore! || left.clubName.localeCompare(right.clubName, 'vi'),
  )
  const evaluatedIds = new Set(evaluatedRows.map((row) => row.clubId))
  const unevaluatedRows: AnnualClubRow[] = source.clubs
    .filter(
      (club) =>
        !evaluatedIds.has(club.id) && (club.state === 'Active' || club.state === 'Suspended'),
    )
    .sort((left, right) => left.name.localeCompare(right.name, 'vi'))
    .map((club) => ({
      clubId: club.id,
      clubName: club.name,
      field: club.field ?? null,
      state: club.state,
      terms: bySeason(() => null),
      evaluatedTerms: 0,
      yearScore: null,
      yearClassification: null,
      trend: null,
      dimensions: Object.fromEntries(
        EVALUATION_DIMENSIONS.map(({ code }) => [code, null]),
      ) as Record<DimensionCode, number | null>,
    }))

  const counted = scored.filter((item) => evaluatedIds.has(item.clubId))
  const latestPerClub = [...perClub.values()].map((items) =>
    items.reduce((latest, item) =>
      SEASONS.indexOf(item.season) > SEASONS.indexOf(latest.season) ? item : latest,
    ),
  )

  const dimensionAverages = EVALUATION_DIMENSIONS.map(({ code, name }) => ({
    code,
    name,
    average: mean(
      counted.flatMap((item) =>
        item.dimensions
          .filter(
            (entry) => entry.code === code && !entry.insufficientData && entry.score !== undefined,
          )
          .map((entry) => entry.score!),
      ),
    ),
  }))
  const ranked = dimensionAverages
    .filter((item) => item.average !== null)
    .sort((left, right) => right.average! - left.average!)

  const reports = source.reports.filter(
    (report) => parsePeriodCode(report.periodCode)?.year === year,
  )
  const approvedTotal = sum(reports.map((report) => report.approvedTotal))
  const disbursedTotal = sum(reports.map((report) => report.disbursedTotal))
  const accepted = new Set(
    reports.map((report) => `${report.clubId}:${parsePeriodCode(report.periodCode)!.season}`),
  )
  const clubsWithoutAcceptedReport = new Set(
    counted
      .filter((item) => !accepted.has(`${item.clubId}:${item.season}`))
      .map((item) => item.clubId),
  ).size

  const achievements = reports
    .flatMap((report) =>
      report.achievements.map((item, index) => ({
        key: achievementKey(report, index),
        clubName: nameOf(report.clubId),
        title: item.title,
        description: item.description,
        periodCode: report.periodCode,
        season: parsePeriodCode(report.periodCode)!.season,
      })),
    )
    .sort(
      (left, right) =>
        SEASONS.indexOf(left.season) - SEASONS.indexOf(right.season) ||
        left.clubName.localeCompare(right.clubName, 'vi'),
    )

  const clubsByState: Record<string, number> = {}
  for (const club of source.clubs) {
    clubsByState[club.state] = (clubsByState[club.state] ?? 0) + 1
  }

  return {
    year,
    provisional: missingTerms.length > 0,
    terms,
    missingTerms,
    thresholds,
    overview: {
      clubsByState,
      clubsCreated: source.clubs.filter((club) => createdIn(club.createdAt, year)).length,
      activeMembers: sum(
        counted
          .filter((item) => item.season === latestSeason)
          .map((item) => item.metrics.activeMembers),
      ),
      completedEvents: sum(counted.map((item) => item.metrics.completedEvents)),
      participations: sum(counted.map((item) => item.metrics.attendances)),
    },
    evaluation: {
      evaluatedClubs: evaluatedRows.length,
      byClassification: Object.fromEntries(
        CLASSIFICATIONS.map((value) => [
          value,
          evaluatedRows.filter((row) => row.yearClassification === value).length,
        ]),
      ) as Record<Classification, number>,
      averageYearScore: mean(evaluatedRows.map((row) => row.yearScore!)),
      averageByTerm: bySeason((season) =>
        mean(evaluatedRows.flatMap((row) => (row.terms[season] ? [row.terms[season].score] : []))),
      ),
      rows: [...evaluatedRows, ...unevaluatedRows],
      top: evaluatedRows.slice(0, 5).map((row) => ({ ...pick(row), yearScore: row.yearScore! })),
    },
    dimensions: {
      averages: dimensionAverages,
      highest: ranked[0]?.code ?? null,
      lowest: ranked.at(-1)?.code ?? null,
    },
    finance: {
      hasData: reports.length > 0,
      approvedTotal,
      disbursedTotal,
      disbursementRate: approvedTotal > 0 ? round((disbursedTotal / approvedTotal) * 100) : null,
      clubsWithoutAcceptedReport,
    },
    compliance: {
      openViolations: sum(
        latestPerClub
          .filter((item) => evaluatedIds.has(item.clubId))
          .map((item) => item.metrics.openViolations),
      ),
      needsImprovement: evaluatedRows
        .filter((row) => row.yearClassification === 'NEEDS_IMPROVEMENT')
        .map(pick),
      declining: evaluatedRows.filter((row) => row.trend === 'DOWN').map(pick),
      suspendedOrDissolving: source.clubs
        .filter((club) => club.state === 'Suspended' || club.state === 'Dissolving')
        .sort((left, right) => left.name.localeCompare(right.name, 'vi'))
        .map((club) => ({ clubId: club.id, clubName: club.name, state: club.state })),
    },
    achievements,
  }
}
