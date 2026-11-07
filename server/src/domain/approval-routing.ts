import { DomainError } from "./errors.js";
import { PROPERTY_TYPES, type PropertyType } from "./property.js";

/**
 * UC05 / BR16: versioned approval routing. A rule names the request type and a set of conditions;
 * a request that matches a rule needs `requiredLevel` approvals (level 2 is decided by ICPDP_HEAD),
 * anything else is decided at one level. Rules never overlap, so at most one rule matches.
 */
export const ROUTED_REQUEST_TYPES = ["CLUB_APPLICATION", "EVENT_PROPOSAL", "PROPERTY_BOOKING"] as const;
export type RoutedRequestType = (typeof ROUTED_REQUEST_TYPES)[number];
export const RISK_CATEGORIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type RiskCategory = (typeof RISK_CATEGORIES)[number];
/** Facility requests only: classrooms are allocated by UC58, never booked. */
export const ROUTED_PROPERTY_TYPES: readonly PropertyType[] = PROPERTY_TYPES.filter((type) => type !== "ROOM");
export const ROUTING_STATES = ["Draft", "Active", "Superseded"] as const;
export type RoutingState = (typeof ROUTING_STATES)[number];
export const MAX_ROUTING_RULES = 50;

export interface RoutingRule {
  id: string;
  requestType: RoutedRequestType;
  /** Event budget in VND: [minAmount, maxAmount). */
  minAmount?: number;
  maxAmount?: number;
  riskCategories?: RiskCategory[];
  propertyTypes?: PropertyType[];
  /** Open UC40 cases of the club: [minOpenViolations, maxOpenViolations). */
  minOpenViolations?: number;
  maxOpenViolations?: number;
  requiredLevel: 1 | 2;
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

/** What a request looks like to the router; fields a type does not have stay undefined. */
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
  requiredLevel: 1 | 2;
  slaHours?: number;
}

/** One past decided request, for the UC05 A1 simulation. */
export interface RoutingSample { entityType: RoutedRequestType; entityId: string; title: string; decidedAt: Date; facts: RoutingFacts }

export interface RoutingSimulation {
  total: number;
  secondLevel: number;
  items: Array<{ entityType: RoutedRequestType; entityId: string; title: string; decidedAt: Date; requiredLevel: 1 | 2;
    ruleId?: string }>;
}

export interface ApprovalRoutingRepository {
  list(): Promise<RoutingRuleSet[]>;
  find(id: string): Promise<RoutingRuleSet | null>;
  createDraft(rules: RoutingRule[], actorId: string, now: Date): Promise<RoutingRuleSet>;
  /** Only a Draft changes; conflict otherwise. */
  saveDraft(id: string, rules: RoutingRule[], actorId: string, now: Date): Promise<RoutingRuleSet>;
  /** Draft → Active and the previous Active → Superseded in one transaction, with an audit row. */
  activate(id: string, actorId: string, now: Date): Promise<RoutingRuleSet>;
  /** The latest decided requests (read only), newest first. */
  recentDecided(limit: number): Promise<RoutingSample[]>;
}

function invalid(message: string, details?: unknown): never {
  throw new DomainError(message, "validation", details);
}

function range(min: number | undefined, max: number | undefined, label: string): void {
  for (const value of [min, max]) {
    if (value !== undefined && (!Number.isInteger(value) || value < 0)) invalid(`${label} must be a non-negative whole number`);
  }
  if (min !== undefined && max !== undefined && max <= min) invalid(`${label}: the upper bound must be above the lower bound`);
}

/** Checks one rule and drops conditions that do not apply to its request type. */
export function normalizeRoutingRule(rule: RoutingRule): RoutingRule {
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(rule.id)) invalid("invalid rule id");
  if (!ROUTED_REQUEST_TYPES.includes(rule.requestType)) invalid("invalid request type");
  if (rule.requiredLevel !== 1 && rule.requiredLevel !== 2) invalid("required level must be 1 or 2");
  if (!Number.isInteger(rule.slaHours) || rule.slaHours < 1 || rule.slaHours > 24 * 60) invalid("SLA must be 1–1440 hours");
  range(rule.minOpenViolations, rule.maxOpenViolations, "open violations");
  const base = { id: rule.id, requestType: rule.requestType, requiredLevel: rule.requiredLevel, slaHours: rule.slaHours,
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

function rangesMeet(aMin = 0, aMax = Infinity, bMin = 0, bMax = Infinity): boolean {
  return Math.max(aMin, bMin) < Math.min(aMax, bMax);
}

function setsMeet<T>(a: readonly T[] | undefined, b: readonly T[] | undefined): boolean {
  return !a || !b || a.some((item) => b.includes(item));
}

/** True when some request would match both rules (FR-UC05-02). */
export function routingRulesOverlap(a: RoutingRule, b: RoutingRule): boolean {
  return a.requestType === b.requestType
    && rangesMeet(a.minAmount, a.maxAmount, b.minAmount, b.maxAmount)
    && setsMeet(a.riskCategories, b.riskCategories)
    && setsMeet(a.propertyTypes, b.propertyTypes)
    && rangesMeet(a.minOpenViolations, a.maxOpenViolations, b.minOpenViolations, b.maxOpenViolations);
}

/** Validates a whole rule list; E1: overlapping rules are refused with the pairs that overlap. */
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

function within(value: number | undefined, min?: number, max?: number): boolean {
  if (min === undefined && max === undefined) return true;
  if (value === undefined) return false;
  return (min === undefined || value >= min) && (max === undefined || value < max);
}

export function routingRuleMatches(rule: RoutingRule, facts: RoutingFacts): boolean {
  return rule.requestType === facts.requestType
    && within(facts.amount, rule.minAmount, rule.maxAmount)
    && (!rule.riskCategories || (facts.riskCategory !== undefined && rule.riskCategories.includes(facts.riskCategory)))
    && (!rule.propertyTypes || (facts.propertyType !== undefined && rule.propertyTypes.includes(facts.propertyType as PropertyType)))
    && within(facts.openViolations, rule.minOpenViolations, rule.maxOpenViolations);
}

/** FR-UC05-05: no active rule set or no matching rule → one level. */
export function resolveApprovalRoute(ruleSet: Pick<RoutingRuleSet, "id" | "rules"> | null, facts: RoutingFacts): ApprovalRoute {
  const rule = ruleSet?.rules.find((item) => routingRuleMatches(item, facts));
  return { ...(ruleSet ? { routingRuleSetId: ruleSet.id } : {}),
    ...(rule ? { routingRuleId: rule.id, slaHours: rule.slaHours } : {}), requiredLevel: rule?.requiredLevel ?? 1 };
}

/** UC05 A1: which of the samples the draft would send to a second level; reads only. */
export function simulateRouting(rules: readonly RoutingRule[], samples: readonly RoutingSample[]): RoutingSimulation {
  const items = samples.map((sample) => {
    const route = resolveApprovalRoute({ id: "draft", rules: [...rules] }, sample.facts);
    return { entityType: sample.entityType, entityId: sample.entityId, title: sample.title, decidedAt: sample.decidedAt,
      requiredLevel: route.requiredLevel, ...(route.routingRuleId ? { ruleId: route.routingRuleId } : {}) };
  });
  return { total: items.length, secondLevel: items.filter((item) => item.requiredLevel === 2).length, items };
}

/** Level-2 gate (D1): a level-1 approval of a two-level request only moves it up; anything else is final. */
export function approvalStep(task: { requiredLevel?: number; currentLevel?: number }, outcome: string): { level: 1 | 2; final: boolean } {
  const level = (task.currentLevel ?? 1) >= 2 ? 2 : 1;
  return { level, final: level >= (task.requiredLevel ?? 1) || outcome !== "Approve" };
}
