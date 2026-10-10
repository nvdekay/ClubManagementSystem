import { DomainError } from "./errors.js";

/** The shared scorecard (BR60, SRS §9): names and measures are defined by the system, not by ICPDP. */
export const EVALUATION_DIMENSIONS = [
  { code: "D1", name: "Số người tham gia", core: true,
    measures: "Lượt đăng ký, lượt check-in đã chốt, số người tham dự không trùng lặp, tỉ lệ có mặt, số thành viên active" },
  { code: "D2", name: "Tầm ảnh hưởng", core: true,
    measures: "Tỉ lệ người tham dự ngoài CLB, số sự kiện công khai đã hoàn thành, sự kiện cấp trường đã tham gia, số đơn ứng tuyển" },
  { code: "D3", name: "Mức độ hài lòng", core: true,
    measures: "Điểm phản hồi trung bình, tỉ lệ phản hồi trên số người check-in, phân bố điểm theo sự kiện" },
  { code: "D4", name: "Thực thi hoạt động", core: false,
    measures: "Sự kiện đã duyệt, đã hoàn thành, bị huỷ; báo cáo sau sự kiện; cơ sở vật chất được cấp so với thực dùng" },
  { code: "D5", name: "Kỷ luật báo cáo", core: false,
    measures: "Mức độ hoàn thành báo cáo, số ngày trễ, số lần phải sửa" },
  { code: "D6", name: "Tuân thủ tài chính", core: false,
    measures: "Ngân sách được duyệt, đã giải ngân, khoản chi, chứng từ, kết quả đối soát" },
  { code: "D7", name: "Quản trị", core: false,
    measures: "Ban chủ nhiệm hợp lệ, nhiệm kỳ, chuyển giao, hồ sơ thành viên, tỉ lệ giữ chân thành viên" },
  { code: "D8", name: "Tuân thủ và rủi ro", core: false,
    measures: "Số lượng và mức độ vi phạm, hồ sơ chưa xử lý, biện pháp khắc phục, huỷ booking sát giờ" },
] as const;
export type DimensionCode = (typeof EVALUATION_DIMENSIONS)[number]["code"];

export type SchemeState = "Draft" | "Active" | "Superseded";

export interface SchemeDimension {
  code: DimensionCode;
  /** Whole percent; the active scheme's weights add up to exactly 100 (BR29). */
  weight: number;
  /** Whether ICPDP may score this dimension by hand when reviewing (UC43 FR-02). */
  allowsManual: boolean;
}

/** Minimum total score of each band; anything below `fair` is "needs improvement". */
export interface SchemeThresholds {
  excellent: number;
  good: number;
  fair: number;
}

export interface SchemeSettings {
  dimensions: SchemeDimension[];
  thresholds: SchemeThresholds;
}

export interface EvaluationScheme extends SchemeSettings {
  id: string;
  periodCode: string;
  version: number;
  state: SchemeState;
  totalWeight: number;
  activatedAt?: Date;
  createdAt: Date;
}

export interface EvaluationSchemeRepository {
  list(): Promise<EvaluationScheme[]>;
  find(id: string): Promise<EvaluationScheme | null>;
  /** Next version for the period is assigned by the repository. */
  createDraft(periodCode: string, settings: SchemeSettings, actorId: string, now: Date): Promise<EvaluationScheme>;
  updateDraft(id: string, settings: SchemeSettings, actorId: string, now: Date): Promise<EvaluationScheme>;
  /** Activates a draft and supersedes the period's previous active scheme, atomically. */
  activate(id: string, actorId: string, now: Date): Promise<EvaluationScheme>;
  deleteDraft(id: string, actorId: string, now: Date): Promise<void>;
}

export const DEFAULT_SCHEME_SETTINGS: SchemeSettings = {
  dimensions: [
    { code: "D1", weight: 20, allowsManual: false }, { code: "D2", weight: 15, allowsManual: false },
    { code: "D3", weight: 15, allowsManual: false }, { code: "D4", weight: 10, allowsManual: true },
    { code: "D5", weight: 10, allowsManual: true }, { code: "D6", weight: 10, allowsManual: true },
    { code: "D7", weight: 10, allowsManual: true }, { code: "D8", weight: 10, allowsManual: true },
  ],
  thresholds: { excellent: 85, good: 70, fair: 50 },
};

export type ActivationIssue = "totalWeight" | "coreWeight";

function invalid(field: string): never {
  throw new DomainError(`invalid evaluation scheme ${field}`, "validation", { field });
}

const order = new Map(EVALUATION_DIMENSIONS.map((dimension, index) => [dimension.code as string, index]));

/** Shape rules every saved draft must follow; weights may still be unbalanced until activation. */
export function validateSchemeSettings(input: SchemeSettings): SchemeSettings {
  if (!Array.isArray(input.dimensions) || !input.dimensions.length) invalid("dimensions");
  const codes = input.dimensions.map((dimension) => dimension.code);
  if (codes.some((code) => !order.has(code)) || new Set(codes).size !== codes.length
    || EVALUATION_DIMENSIONS.some((dimension) => dimension.core && !codes.includes(dimension.code))) {
    invalid("dimensions");
  }
  if (input.dimensions.some((dimension) => !Number.isInteger(dimension.weight) || dimension.weight < 0
    || dimension.weight > 100 || typeof dimension.allowsManual !== "boolean")) invalid("weights");
  const { excellent, good, fair } = input.thresholds ?? {};
  if (![excellent, good, fair].every((value) => Number.isInteger(value))
    || !(excellent! <= 100 && excellent! > good! && good! > fair! && fair! > 0)) invalid("thresholds");
  return {
    dimensions: [...input.dimensions].sort((left, right) => order.get(left.code)! - order.get(right.code)!)
      .map(({ code, weight, allowsManual }) => ({ code, weight, allowsManual })),
    thresholds: { excellent: excellent!, good: good!, fair: fair! },
  };
}

/** BR29 + BR60: what still blocks activating a draft. */
export function schemeActivationIssues(settings: SchemeSettings): ActivationIssue[] {
  const issues: ActivationIssue[] = [];
  if (settings.dimensions.reduce((sum, dimension) => sum + dimension.weight, 0) !== 100) issues.push("totalWeight");
  if (settings.dimensions.some((dimension) => order.get(dimension.code)! < 3 && dimension.weight <= 0)) {
    issues.push("coreWeight");
  }
  return issues;
}
