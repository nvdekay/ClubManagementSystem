import { z } from "zod";

// The ONLY place allowed to read process.env (enforced by scripts/check-constitution.sh).
const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
  ALLOWED_DOMAIN: z.string().optional(),
  BOOTSTRAP_ICPDP_EMAIL: z.string().optional(),
  APP_BASE_URL: z.string().optional(),
  CLIENT_BASE_URL: z.string().optional(),
});

const authSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  ALLOWED_DOMAIN: z.string().min(1),
  BOOTSTRAP_ICPDP_EMAIL: z.string().email(),
  APP_BASE_URL: z.string().url(),
  CLIENT_BASE_URL: z.string().url(),
});

export type Config = z.infer<typeof schema>;
export type AuthConfig = z.infer<typeof authSchema>;

export function requireAuthConfig(config: Config): AuthConfig {
  const parsed = authSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Auth configuration missing or invalid: ${Object.keys(parsed.error.flatten().fieldErrors).join(", ")}`);
  }
  return parsed.data;
}

export function optionalAuthConfig(config: Config): AuthConfig | null {
  const hasAuthSetting = [
    config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, config.SESSION_SECRET,
    config.ALLOWED_DOMAIN, config.BOOTSTRAP_ICPDP_EMAIL,
  ].some((value) => Boolean(value));
  return hasAuthSetting ? requireAuthConfig(config) : null;
}

export function loadConfig(): Config {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment:", parsed.error.flatten().fieldErrors);
    process.exit(1); // fail fast — never boot with broken config
  }
  return parsed.data;
}
