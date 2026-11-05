/**
 * طلب الحجز من المتصفح: المعرّفات والكميات فقط — لا أسعار.
 * الأسعار والإجمالي والرسوم والعمولة تُحسب داخل reserve_tickets في قاعدة البيانات.
 */
import { z } from "zod";

export const reserveSchema = z.object({
  eventId: z.uuid(),
  items: z
    .array(
      z.object({
        ticketTypeId: z.uuid(),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(10)
    .refine((items) => new Set(items.map((i) => i.ticketTypeId)).size === items.length, "duplicate"),
});

export type ReserveInput = z.infer<typeof reserveSchema>;

/** أخطاء reserve_tickets المعروفة → مفاتيح ترجمة */
export const reserveErrors = {
  AUTH_REQUIRED: "authRequired",
  INVALID_ITEMS: "invalidItems",
  EVENT_NOT_ON_SALE: "eventNotOnSale",
  TOO_MANY_PENDING_ORDERS: "tooManyPending",
  TICKET_NOT_ON_SALE: "ticketNotOnSale",
  INVALID_QUANTITY: "invalidQuantity",
  SOLD_OUT: "soldOut",
} as const;

export type ReserveError = (typeof reserveErrors)[keyof typeof reserveErrors] | "generic";

export function mapReserveError(message: string | undefined): ReserveError {
  return (message && reserveErrors[message as keyof typeof reserveErrors]) || "generic";
}

/** رمز QR للتذكرة: 64 خانة hex (256 بت) — نفس قيد check_in_ticket */
export const QR_TOKEN_REGEX = /^[0-9a-f]{64}$/;
/** الرمز المطبوع: T-XXXXXXXXXX */
export const TICKET_CODE_REGEX = /^T-[0-9A-F]{10}$/;

/** يصنّف ما قرأه الماسح أو أدخله الموظف */
export function classifyScan(raw: string): { kind: "token" | "code"; value: string } | null {
  const value = raw.trim();
  if (QR_TOKEN_REGEX.test(value.toLowerCase())) return { kind: "token", value: value.toLowerCase() };
  if (TICKET_CODE_REGEX.test(value.toUpperCase())) return { kind: "code", value: value.toUpperCase() };
  return null;
}
