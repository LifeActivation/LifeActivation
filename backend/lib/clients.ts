import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import Stripe from "stripe";
import { Client as QStashClient } from "@upstash/qstash";
import { env } from "@/lib/env";

export function supabaseAdmin() {
  const e = env();
  return createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function stripeClient() {
  return new Stripe(env().STRIPE_SECRET_KEY);
}

export function resendClient() {
  return new Resend(env().RESEND_API_KEY);
}

export function qstashClient() {
  return new QStashClient({ token: env().QSTASH_TOKEN });
}
