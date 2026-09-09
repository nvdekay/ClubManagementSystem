import { randomUUID } from "node:crypto";
import { z } from "zod";
import { DomainError } from "./errors.js";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

// One page of a list — `total` counts every match so callers can compute page count.
export interface UserPage {
  items: User[];
  total: number;
}

// Port — implemented by infra, used by usecases. Lives here so domain owns the contract.
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  /** Throws DomainError("email already registered", "conflict") on duplicate email. */
  save(user: User): Promise<void>;
  /** Newest first, `offset` rows skipped, at most `limit` returned; `search` filters by case-insensitive substring on name or email. */
  list(limit: number, offset: number, search?: string): Promise<UserPage>;
}

// Single source of truth for the create-user contract — enforced here, published by openapi.ts.
export const CreateUser = z.object({
  // 254 = RFC 5321 max address length — an uncapped string would let anyone bloat storage/indexes
  email: z.string().trim().toLowerCase().max(254, "email too long").email("invalid email"),
  name: z.string().trim().min(1, "name must be 1-100 chars").max(100, "name must be 1-100 chars"),
}).strict();

// Query contract for listing — capped so a list can never return the whole collection.
export const ListUsersQuery = z.object({
  limit: z.coerce.number().int().min(1, "limit must be 1-100").max(100, "limit must be 1-100").default(20),
  // capped because Mongo's skip() walks every skipped doc — huge offsets are a perf footgun
  offset: z.coerce.number().int().min(0, "offset must be 0-10000").max(10000, "offset must be 0-10000").default(0),
  // capped so a search term can't become an unbounded regex scan
  search: z.string().trim().max(100, "search too long").optional(),
}).strict();

export function newUser(input: unknown): User {
  const parsed = CreateUser.safeParse(input);
  if (!parsed.success)
    throw new DomainError(
      parsed.error.issues[0]?.message ?? "invalid input",
      "validation",
      parsed.error.issues,
    );
  return { id: randomUUID(), ...parsed.data, createdAt: new Date() };
}

export function newListQuery(input: unknown): z.infer<typeof ListUsersQuery> {
  const parsed = ListUsersQuery.safeParse(input);
  if (!parsed.success)
    throw new DomainError(
      parsed.error.issues[0]?.message ?? "invalid query",
      "validation",
      parsed.error.issues,
    );
  return parsed.data;
}
