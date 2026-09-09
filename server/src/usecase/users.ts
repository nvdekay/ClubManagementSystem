import { newListQuery, newUser, type User, type UserPage, type UserRepository } from "../domain/user.js";

export async function registerUser(repo: UserRepository, input: unknown): Promise<User> {
  const user = newUser(input);
  await repo.save(user); // uniqueness is the repo's contract (unique index) — a pre-check here would race
  return user;
}

export async function listUsers(repo: UserRepository, query: unknown = {}): Promise<UserPage> {
  const q = newListQuery(query); // async so a validation throw always rejects
  return repo.list(q.limit, q.offset, q.search);
}
