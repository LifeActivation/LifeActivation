export type EventRecord = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  zoom_url: string;
  zoom_passcode: string | null;
  status: "draft" | "published" | "finished";
};

export type RegistrationRecord = {
  id: string;
  event_id: string | null;
  email: string;
  name: string | null;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  amount_paid: number;
  currency: string;
  paid_at: string;
  confirmation_sent_at: string | null;
  reminder_sent_at: string | null;
  reminder_sending_at: string | null;
  qstash_message_id: string | null;
  qstash_scheduling_at: string | null;
  reminder_scheduled_at: string | null;
  reminder_scheduled_for: string | null;
  reminder_delivery_source: "qstash" | "sweep" | "immediate" | null;
  status: "paid" | "refunded" | "cancelled";
};
