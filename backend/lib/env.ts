import { z } from "zod";

const schema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  ADMIN_EMAIL: z.string().email(),
  EMAIL_FROM: z.string().min(3),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  BACKEND_URL: z.string().url().transform((value) => value.replace(/\/+$/, "")),
  QSTASH_TOKEN: z.string().min(1),
  QSTASH_CURRENT_SIGNING_KEY: z.string().min(1),
  QSTASH_NEXT_SIGNING_KEY: z.string().min(1),
  SWEEP_SECRET: z.string().min(16)
});

export type Env = z.infer<typeof schema>;
let cached: Env | undefined;

export function env(): Env {
  cached ??= schema.parse(process.env);
  return cached;
}
