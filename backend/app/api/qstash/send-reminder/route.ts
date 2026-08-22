import { Receiver } from "@upstash/qstash";
import { z } from "zod";
import { env } from "@/lib/env";
import { deliverReminder } from "@/lib/reminders";

export const runtime = "nodejs";

const payloadSchema = z.object({ registrationId: z.string().uuid() });

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("upstash-signature");
  if (!signature) return Response.json({ error: "Missing signature" }, { status: 401 });

  const receiver = new Receiver({
    currentSigningKey: env().QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env().QSTASH_NEXT_SIGNING_KEY
  });
  let valid = false;
  try {
    valid = await receiver.verify({
      signature,
      body,
      url: `${env().BACKEND_URL}/api/qstash/send-reminder`
    });
  } catch {
    valid = false;
  }
  if (!valid) return Response.json({ error: "Invalid signature" }, { status: 401 });

  let json: unknown;
  try { json = JSON.parse(body); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await deliverReminder(parsed.data.registrationId, "qstash");
  return Response.json(result);
}
