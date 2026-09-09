import { Router } from "express";
import type { UserRepository } from "../../domain/user.js";
import { listUsers, registerUser } from "../../usecase/users.js";
import { ok } from "./response.js";

export function userRoutes(repo: UserRepository): Router {
  const router = Router();

  router.get("/users", async (req, res) => {
    ok(res, await listUsers(repo, req.query)); // limit validated against ListUsersQuery in the domain
  });

  router.post("/users", async (req, res) => {
    const user = await registerUser(repo, req.body); // validated against CreateUser in the domain
    ok(res, user, 201);
  });

  return router;
}
