import type { Database } from "@/types/database";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export type PaymentState =
  "pending" | "awaiting_payment" | "paid" | "failed" | "expired" | "cancelled" | "refund";

/** حالة الدفع المعروضة للمدير: حالة الطلب هي الأساس، وآخر محاولة دفع توضّح الطلب المعلّق */
export function paymentState(
  order: OrderStatus,
  payments: readonly { status: PaymentStatus; created_at: string }[],
): PaymentState {
  if (order === "paid") return "paid";
  if (order === "expired") return "expired";
  if (order === "cancelled") return "cancelled";
  if (order !== "pending_payment") return "refund";

  const latest = [...payments].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (!latest) return "pending";
  if (latest.status === "failed") return "failed";
  return latest.status === "initiated" || latest.status === "pending" ? "awaiting_payment" : "pending";
}
