import { describe, expect, it } from "vitest";

import { paymentState } from "./payment-state";

const at = (minute: number) => `2026-11-06T17:${String(minute).padStart(2, "0")}:00Z`;

describe("حالة الدفع في لوحة الإدارة", () => {
  it("طلب بلا محاولة دفع = pending", () => {
    expect(paymentState("pending_payment", [])).toBe("pending");
  });

  it("محاولة جارية = awaiting_payment", () => {
    expect(paymentState("pending_payment", [{ status: "pending", created_at: at(1) }])).toBe(
      "awaiting_payment",
    );
    expect(paymentState("pending_payment", [{ status: "initiated", created_at: at(1) }])).toBe(
      "awaiting_payment",
    );
  });

  it("تعتمد على آخر محاولة: فشل ثم محاولة جديدة ليس فشلًا", () => {
    expect(
      paymentState("pending_payment", [
        { status: "failed", created_at: at(1) },
        { status: "pending", created_at: at(2) },
      ]),
    ).toBe("awaiting_payment");
    expect(
      paymentState("pending_payment", [
        { status: "cancelled", created_at: at(1) },
        { status: "failed", created_at: at(2) },
      ]),
    ).toBe("failed");
  });

  it("حالة الطلب النهائية تتقدّم على محاولات الدفع", () => {
    const failed = [{ status: "failed" as const, created_at: at(1) }];
    expect(paymentState("paid", failed)).toBe("paid");
    expect(paymentState("expired", failed)).toBe("expired");
    expect(paymentState("cancelled", failed)).toBe("cancelled");
    expect(paymentState("needs_refund", failed)).toBe("refund");
    expect(paymentState("refunded", failed)).toBe("refund");
  });
});
