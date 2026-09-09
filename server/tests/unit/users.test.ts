import { describe, expect, it } from "vitest";
import { DomainError } from "../../src/domain/errors.js";
import type { User, UserRepository } from "../../src/domain/user.js";
import { listUsers, registerUser } from "../../src/usecase/users.js";

// Mirrors the Mongo adapter's contract: unique email, newest first, returns copies.
function inMemoryRepo(): UserRepository {
  const users: User[] = [];
  return {
    async findByEmail(email) {
      const found = users.find((u) => u.email === email);
      return found ? { ...found } : null;
    },
    async save(user) {
      if (users.some((u) => u.email === user.email)) {
        throw new DomainError("email already registered", "conflict");
      }
      users.push({ ...user });
    },
    async list(limit, offset, search) {
      const q = search?.toLowerCase() ?? "";
      const matches = users
        .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
        .map((u) => ({ ...u }))
        .sort((a, b) => +b.createdAt - +a.createdAt);
      return { items: matches.slice(offset, offset + limit), total: matches.length };
    },
  };
}

describe("registerUser", () => {
  it("creates a user with normalized email", async () => {
    const repo = inMemoryRepo();
    const user = await registerUser(repo, { email: "  Ana@Example.COM ", name: "Ana" });
    expect(user.email).toBe("ana@example.com");
    expect(user.id).toBeTruthy();
    expect((await listUsers(repo)).items).toHaveLength(1);
  });

  it("rejects invalid email", async () => {
    await expect(registerUser(inMemoryRepo(), { email: "nope", name: "Ana" })).rejects.toThrow(
      DomainError,
    );
  });

  it("rejects non-string body fields", async () => {
    await expect(
      registerUser(inMemoryRepo(), { email: ["a@b.co"], name: { x: 1 } }),
    ).rejects.toThrow(DomainError);
  });

  it("rejects duplicate email as a conflict", async () => {
    const repo = inMemoryRepo();
    await registerUser(repo, { email: "a@b.co", name: "Ana" });
    await expect(registerUser(repo, { email: "a@b.co", name: "Bob" })).rejects.toMatchObject({
      message: "email already registered",
      kind: "conflict",
    });
  });

  it("rejects an oversized email", async () => {
    const email = `${"a".repeat(300)}@example.com`;
    await expect(registerUser(inMemoryRepo(), { email, name: "Ana" })).rejects.toThrow(
      "email too long",
    );
  });
});

describe("listUsers", () => {
  it("applies the validated limit/offset and rejects bad ones", async () => {
    const repo = inMemoryRepo();
    for (let i = 0; i < 3; i++) {
      await registerUser(repo, { email: `u${i}@example.com`, name: `U${i}` });
    }
    const page = await listUsers(repo); // defaults: limit 20, offset 0
    expect(page.items).toHaveLength(3);
    expect(page.total).toBe(3);
    expect((await listUsers(repo, { limit: "2" })).items).toHaveLength(2); // query strings coerce
    const offsetPage = await listUsers(repo, { limit: "2", offset: "2" });
    expect(offsetPage.items).toHaveLength(1); // last page
    expect(offsetPage.total).toBe(3); // total ignores paging
    await expect(listUsers(repo, { limit: "0" })).rejects.toThrow(DomainError);
    await expect(listUsers(repo, { limit: "101" })).rejects.toThrow("limit must be 1-100");
    await expect(listUsers(repo, { offset: "-1" })).rejects.toThrow("offset must be 0-10000");
  });

  it("filters by case-insensitive substring on name or email", async () => {
    const repo = inMemoryRepo();
    await registerUser(repo, { email: "ana@example.com", name: "Ana" });
    await registerUser(repo, { email: "bob@test.dev", name: "Bob" });
    expect((await listUsers(repo, { search: "ANA" })).items).toHaveLength(1);
    expect((await listUsers(repo, { search: "test.dev" })).items).toHaveLength(1);
    expect((await listUsers(repo, { search: "  " })).items).toHaveLength(2); // trims to empty → no filter
    await expect(listUsers(repo, { search: "x".repeat(101) })).rejects.toThrow("search too long");
  });
});
