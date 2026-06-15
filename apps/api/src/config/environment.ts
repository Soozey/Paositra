import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  DATABASE_SSL: z.enum(["true", "false"]).default("false"),
  JWT_SECRET: z.string().min(32),
  JWT_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  SESSION_IDLE_TIMEOUT_SECONDS: z.coerce.number().int().min(60).default(900),
  CORS_ORIGINS: z.string().default("http://localhost:5173,http://localhost:5174"),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),
  LOGIN_LOCK_SECONDS: z.coerce.number().int().min(60).default(900),
  PASSWORD_MIN_LENGTH: z.coerce.number().int().min(10).max(64).default(12),
  MAX_UPLOAD_BYTES: z.coerce.number().int().min(1048576).default(268435456),
  UPLOAD_ROOT: z.string().default("./uploads")
});

export type Environment = z.infer<typeof schema>;

export function validateEnvironment(input: Record<string, unknown>): Environment {
  return schema.parse(input);
}
