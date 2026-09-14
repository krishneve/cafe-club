import { z } from "zod";

const optional = z.string().trim().optional().or(z.literal(""));

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  RESEND_API_KEY: optional,
  EMAIL_FROM: z.string().min(1),
  STRIPE_SECRET_KEY: optional,
  STRIPE_WEBHOOK_SECRET: optional,
  STRIPE_PRICE_STARTER: optional,
  STRIPE_PRICE_GROWTH: optional,
  STRIPE_PRICE_PRO: optional,
  STRIPE_CURRENCY: z.string().default("inr"),
  STRIPE_TRIAL_DAYS: z.coerce.number().int().min(0).max(365).default(14),
  CRON_SECRET: z.string().min(16),
  UPSTASH_REDIS_REST_URL: optional,
  UPSTASH_REDIS_REST_TOKEN: optional,
});

export function validateEnv(options: { production?: boolean } = {}) {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`) };
  }
  const e = parsed.data;
  const errors: string[] = [];
  if (options.production) {
    if (e.NEXT_PUBLIC_APP_URL.includes("localhost")) errors.push("NEXT_PUBLIC_APP_URL must not use localhost in production.");
    if (!e.RESEND_API_KEY) errors.push("RESEND_API_KEY is missing; transactional email is not live.");
    if (!e.UPSTASH_REDIS_REST_URL || !e.UPSTASH_REDIS_REST_TOKEN) errors.push("UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN are required for distributed production rate limiting.");
    if (!e.STRIPE_SECRET_KEY) errors.push("STRIPE_SECRET_KEY is missing; billing is not live.");
    if (!e.STRIPE_WEBHOOK_SECRET) errors.push("STRIPE_WEBHOOK_SECRET is missing; Stripe webhooks are not live.");
    for (const key of ["STRIPE_PRICE_STARTER", "STRIPE_PRICE_GROWTH", "STRIPE_PRICE_PRO"] as const) {
      if (!e[key]) errors.push(`${key} is missing; that plan cannot be purchased.`);
    }
  }
  return { ok: errors.length === 0, errors };
}
