export function maskEmail(email: string | null | undefined) {
  if (!email) return "unknown";
  const [local, domain] = email.split("@");
  return `${local?.slice(0, 2) ?? "**"}***@${domain ?? "***"}`;
}
