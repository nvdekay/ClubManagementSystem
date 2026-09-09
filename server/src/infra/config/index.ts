import { z } from "zod";

// The ONLY place allowed to read process.env (enforced by scripts/check-constitution.sh).
const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(): Config {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment:", parsed.error.flatten().fieldErrors);
    process.exit(1); // fail fast — never boot with broken config
  }
  return parsed.data;
}
