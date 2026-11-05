/**
 * توقيع HMAC-SHA256 للإشعارات (المزوّد التجريبي، وأي مزوّد يوقّع جسم الطلب كاملًا).
 * المقارنة بزمن ثابت (timingSafeEqual) لمنع هجمات التوقيت.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export function signPayload(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
}

export function verifySignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  const expected = Buffer.from(signPayload(rawBody, secret));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
