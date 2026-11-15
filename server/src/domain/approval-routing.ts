import { DomainError } from "./errors.js";
import { PROPERTY_TYPES, type PropertyType } from "./property.js";

/**
 * UC05 / BR16: định tuyến duyệt có phiên bản. Mỗi rule nêu loại yêu cầu và một tập điều kiện;
 * yêu cầu khớp rule nào thì nhận SLA của rule đó. Mọi yêu cầu được ICPDP Officer quyết định ở
 * một cấp duy nhất (BR31). Các rule không chồng lấn nên tối đa chỉ một rule khớp.
 */
export const ROUTED_REQUEST_TYPES = ["CLUB_APPLICATION", "EVENT_PROPOSAL", "PROPERTY_BOOKING"] as const;
export type RoutedRequestType = (typeof ROUTED_REQUEST_TYPES)[number];
export const RISK_CATEGORIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type RiskCategory = (typeof RISK_CATEGORIES)[number];
/** Chỉ áp dụng cho yêu cầu cơ sở vật chất: phòng học do UC58 phân bổ, không đặt qua booking. */
export const ROUTED_PROPERTY_TYPES: readonly PropertyType[] = PROPERTY_TYPES.filter((type) => type !== "ROOM");
export const ROUTING_STATES = ["Draft", "Active", "Superseded"] as const;
export type RoutingState = (typeof ROUTING_STATES)[number];
export const MAX_ROUTING_RULES = 50;

export interface RoutingRule {
  id: string;
  requestType: RoutedRequestType;
  /** Ngân sách sự kiện (VND): [minAmount, maxAmount). */
  minAmount?: number;
  maxAmount?: number;
  riskCategories?: RiskCategory[];
  propertyTypes?: PropertyType[];
  /** Số hồ sơ UC40 đang mở của CLB: [minOpenViolations, maxOpenViolations). */
  minOpenViolations?: number;
  maxOpenViolations?: number;
  slaHours: number;
}

export interface RoutingRuleSet {
  id: string;
  versionNo: number;
  state: RoutingState;
  rules: RoutingRule[];
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  activatedBy?: string;
  activatedAt?: Date;
  supersededAt?: Date;
}

/** Dữ kiện của một yêu cầu khi đưa vào bộ định tuyến; trường mà loại yêu cầu không có thì để undefined. */
export interface RoutingFacts {
  requestType: RoutedRequestType;
  amount?: number;
  riskCategory?: RiskCategory;
  propertyType?: string;
  openViolations: number;
}

export interface ApprovalRoute {
  routingRuleSetId?: string;
  routingRuleId?: string;
  slaHours?: number;
}

/** Một yêu cầu đã được quyết định trước đó, dùng cho mô phỏng UC05 A1. */
export interface RoutingSample { entityType: RoutedRequestType; entityId: string; title: string; decidedAt: Date; facts: RoutingFacts }

export interface RoutingSimulation {
  total: number;
  /** Các mẫu khớp một rule của bản nháp (và do đó nhận SLA của rule đó). */
  matched: number;
  items: Array<{ entityType: RoutedRequestType; entityId: string; title: string; decidedAt: Date;
    ruleId?: string; slaHours?: number }>;
}

export interface ApprovalRoutingRepository {
  list(): Promise<RoutingRuleSet[]>;
  find(id: string): Promise<RoutingRuleSet | null>;
  createDraft(rules: RoutingRule[], actorId: string, now: Date): Promise<RoutingRuleSet>;
  /** Chỉ bản Draft mới được đổi; ngược lại báo conflict. */
  saveDraft(id: string, rules: RoutingRule[], actorId: string, now: Date): Promise<RoutingRuleSet>;
  /** Draft → Active và Active cũ → Superseded trong cùng một transaction, kèm một dòng audit. */
  activate(id: string, actorId: string, now: Date): Promise<RoutingRuleSet>;
  /** Các yêu cầu đã quyết định gần nhất (chỉ đọc), mới nhất trước. */
  recentDecided(limit: number): Promise<RoutingSample[]>;
}

// Ném lỗi validation với thông điệp và chi tiết đã cho
function invalid(message: string, details?: unknown): never {
  throw new DomainError(message, "validation", details);
}

// Kiểm tra cặp cận dưới và cận trên là số nguyên không âm và hợp lệ
function range(min: number | undefined, max: number | undefined, label: string): void {
  for (const value of [min, max]) {
    if (value !== undefined && (!Number.isInteger(value) || value < 0)) invalid(`${label} must be a non-negative whole number`);
  }
  if (min !== undefined && max !== undefined && max <= min) invalid(`${label}: the upper bound must be above the lower bound`);
}

// Kiểm tra một rule định tuyến và bỏ các điều kiện không áp dụng cho loại yêu cầu
/** Kiểm tra một rule và bỏ các điều kiện không áp dụng cho loại yêu cầu của nó. */
export function normalizeRoutingRule(rule: RoutingRule): RoutingRule {
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(rule.id)) invalid("invalid rule id");
  if (!ROUTED_REQUEST_TYPES.includes(rule.requestType)) invalid("invalid request type");
  if (!Number.isInteger(rule.slaHours) || rule.slaHours < 1 || rule.slaHours > 24 * 60) invalid("SLA must be 1–1440 hours");
  range(rule.minOpenViolations, rule.maxOpenViolations, "open violations");
  const base = { id: rule.id, requestType: rule.requestType, slaHours: rule.slaHours,
    ...(rule.minOpenViolations !== undefined ? { minOpenViolations: rule.minOpenViolations } : {}),
    ...(rule.maxOpenViolations !== undefined ? { maxOpenViolations: rule.maxOpenViolations } : {}) };
  if (rule.requestType === "EVENT_PROPOSAL") {
    range(rule.minAmount, rule.maxAmount, "budget");
    const risks = rule.riskCategories?.length ? [...new Set(rule.riskCategories)] : undefined;
    if (risks?.some((risk) => !RISK_CATEGORIES.includes(risk))) invalid("invalid risk category");
    return { ...base, ...(rule.minAmount !== undefined ? { minAmount: rule.minAmount } : {}),
      ...(rule.maxAmount !== undefined ? { maxAmount: rule.maxAmount } : {}), ...(risks ? { riskCategories: risks } : {}) };
  }
  if (rule.requestType === "PROPERTY_BOOKING") {
    const types = rule.propertyTypes?.length ? [...new Set(rule.propertyTypes)] : undefined;
    if (types?.some((type) => !ROUTED_PROPERTY_TYPES.includes(type))) invalid("invalid property type");
    return { ...base, ...(types ? { propertyTypes: types } : {}) };
  }
  return base;
}

// Kiểm tra hai khoảng giá trị có giao nhau không
function rangesMeet(aMin = 0, aMax = Infinity, bMin = 0, bMax = Infinity): boolean {
  return Math.max(aMin, bMin) < Math.min(aMax, bMax);
}

// Kiểm tra hai tập điều kiện có phần chung, tập không khai báo coi như khớp mọi giá trị
function setsMeet<T>(a: readonly T[] | undefined, b: readonly T[] | undefined): boolean {
  return !a || !b || a.some((item) => b.includes(item));
}

// Kiểm tra hai rule có thể cùng khớp một yêu cầu hay không
/** True khi có yêu cầu nào đó khớp cả hai rule (FR-UC05-02). */
export function routingRulesOverlap(a: RoutingRule, b: RoutingRule): boolean {
  return a.requestType === b.requestType
    && rangesMeet(a.minAmount, a.maxAmount, b.minAmount, b.maxAmount)
    && setsMeet(a.riskCategories, b.riskCategories)
    && setsMeet(a.propertyTypes, b.propertyTypes)
    && rangesMeet(a.minOpenViolations, a.maxOpenViolations, b.minOpenViolations, b.maxOpenViolations);
}

// Kiểm tra cả danh sách rule, từ chối khi có hai rule chồng lấn
/** Kiểm tra cả danh sách rule; E1: rule chồng lấn bị từ chối, kèm các cặp chồng lấn. */
export function validateRoutingRules(rules: readonly RoutingRule[]): RoutingRule[] {
  if (rules.length > MAX_ROUTING_RULES) invalid(`at most ${MAX_ROUTING_RULES} rules`);
  const normalized = rules.map(normalizeRoutingRule);
  if (new Set(normalized.map((rule) => rule.id)).size !== normalized.length) invalid("rule ids must be unique");
  const overlaps: Array<[string, string]> = [];
  normalized.forEach((rule, index) => normalized.slice(index + 1).forEach((other) => {
    if (routingRulesOverlap(rule, other)) overlaps.push([rule.id, other.id]);
  }));
  if (overlaps.length) invalid("routing rules overlap", { overlaps });
  return normalized;
}

// Kiểm tra giá trị nằm trong khoảng [min, max) nếu có khai báo
function within(value: number | undefined, min?: number, max?: number): boolean {
  if (min === undefined && max === undefined) return true;
  if (value === undefined) return false;
  return (min === undefined || value >= min) && (max === undefined || value < max);
}

// Kiểm tra một rule có khớp các dữ kiện của yêu cầu không
export function routingRuleMatches(rule: RoutingRule, facts: RoutingFacts): boolean {
  return rule.requestType === facts.requestType
    && within(facts.amount, rule.minAmount, rule.maxAmount)
    && (!rule.riskCategories || (facts.riskCategory !== undefined && rule.riskCategories.includes(facts.riskCategory)))
    && (!rule.propertyTypes || (facts.propertyType !== undefined && rule.propertyTypes.includes(facts.propertyType as PropertyType)))
    && within(facts.openViolations, rule.minOpenViolations, rule.maxOpenViolations);
}

// Chọn rule khớp đầu tiên để lấy SLA duyệt cho yêu cầu
/** FR-UC05-05: không có bộ rule đang hiệu lực hoặc không rule nào khớp → không có SLA theo rule. */
export function resolveApprovalRoute(ruleSet: Pick<RoutingRuleSet, "id" | "rules"> | null, facts: RoutingFacts): ApprovalRoute {
  const rule = ruleSet?.rules.find((item) => routingRuleMatches(item, facts));
  return { ...(ruleSet ? { routingRuleSetId: ruleSet.id } : {}),
    ...(rule ? { routingRuleId: rule.id, slaHours: rule.slaHours } : {}) };
}

// Mô phỏng rule nháp nào sẽ khớp từng mẫu yêu cầu và SLA tương ứng
/** UC05 A1: mỗi mẫu sẽ khớp rule nào của bản nháp và nhận SLA nào; chỉ đọc. */
export function simulateRouting(rules: readonly RoutingRule[], samples: readonly RoutingSample[]): RoutingSimulation {
  const items = samples.map((sample) => {
    const route = resolveApprovalRoute({ id: "draft", rules: [...rules] }, sample.facts);
    return { entityType: sample.entityType, entityId: sample.entityId, title: sample.title, decidedAt: sample.decidedAt,
      ...(route.routingRuleId ? { ruleId: route.routingRuleId, slaHours: route.slaHours } : {}) };
  });
  return { total: items.length, matched: items.filter((item) => item.ruleId).length, items };
}
