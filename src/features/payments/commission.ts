/**
 * تقسيم المبلغ: مبيعات التذاكر، عمولة المنصة، صافي المنظّم، ورسوم بوابة الدفع (إن عُرفت).
 * نفس معادلة قاعدة البيانات (reserve_tickets): commission = round_half_up(subtotal × bps / 10000).
 * للعرض والتقارير فقط — المبالغ المعتمدة محفوظة في orders عند الحجز. لا تُنفَّذ أي Payouts.
 */
import { applyBps } from "@/lib/money";

export const DEFAULT_COMMISSION_BPS = 500; // 5%

export type Breakdown = {
  ticketSalesFils: number;
  serviceFeeFils: number;
  buyerTotalFils: number;
  commissionFils: number;
  organizerNetFils: number;
  gatewayFeeFils: number | null;
  /** ما يبقى للمنصة بعد رسوم البوابة (إن كانت معروفة) */
  platformNetFils: number | null;
};

export function breakdown(input: {
  subtotalFils: number;
  serviceFeeFils?: number;
  commissionBps?: number;
  gatewayFeeFils?: number | null;
}): Breakdown {
  const serviceFee = input.serviceFeeFils ?? 0;
  const commission = applyBps(input.subtotalFils, input.commissionBps ?? DEFAULT_COMMISSION_BPS);
  const gateway = input.gatewayFeeFils ?? null;
  return {
    ticketSalesFils: input.subtotalFils,
    serviceFeeFils: serviceFee,
    buyerTotalFils: input.subtotalFils + serviceFee,
    commissionFils: commission,
    organizerNetFils: input.subtotalFils - commission,
    gatewayFeeFils: gateway,
    platformNetFils: gateway === null ? null : commission + serviceFee - gateway,
  };
}

/** فلس ↔ قيمة عشرية بالدينار لواجهات المزوّدين (3 خانات) بدون أخطاء float */
export function filsToDecimal(fils: number): number {
  if (!Number.isSafeInteger(fils) || fils < 0) throw new RangeError("invalid fils");
  return Number((fils / 1000).toFixed(3));
}

export function decimalToFils(value: number | string): number {
  const text = typeof value === "number" ? value.toFixed(3) : value.trim();
  const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(text);
  if (!match) throw new RangeError(`invalid amount: ${value}`);
  return Number(match[1]) * 1000 + Number((match[2] ?? "").padEnd(3, "0"));
}
