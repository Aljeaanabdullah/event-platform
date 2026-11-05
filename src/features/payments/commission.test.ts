import { describe, expect, it } from "vitest";

import { breakdown, decimalToFils, filsToDecimal } from "./commission";

describe("العمولات", () => {
  it("5% من مبيعات التذاكر، والمنظّم يحصل على الباقي", () => {
    expect(breakdown({ subtotalFils: 30_000 })).toEqual({
      ticketSalesFils: 30_000,
      serviceFeeFils: 0,
      buyerTotalFils: 30_000,
      commissionFils: 1_500,
      organizerNetFils: 28_500,
      gatewayFeeFils: null,
      platformNetFils: null,
    });
  });

  it("التقريب لأقرب فلس (النصف للأعلى) مطابق لقاعدة البيانات", () => {
    // 5% من 8.250 = 0.4125 => 0.413 (413 فلسًا)
    expect(breakdown({ subtotalFils: 8_250 }).commissionFils).toBe(413);
    // 5% من 0.010 = 0.0005 => 1 فلس
    expect(breakdown({ subtotalFils: 10 }).commissionFils).toBe(1);
    // 5% من 0.009 = 0.00045 => 0
    expect(breakdown({ subtotalFils: 9 }).commissionFils).toBe(0);
  });

  it("المجموع يساوي دائمًا المبيعات (لا فلس ضائع)", () => {
    for (const subtotal of [1, 7, 999, 12_345, 45_500, 100_000_000]) {
      const b = breakdown({ subtotalFils: subtotal });
      expect(b.commissionFils + b.organizerNetFils).toBe(subtotal);
    }
  });

  it("رسوم البوابة تُخصم من حصة المنصة عند معرفتها", () => {
    const b = breakdown({ subtotalFils: 20_000, gatewayFeeFils: 250 });
    expect(b.platformNetFils).toBe(1_000 - 250);
    expect(b.organizerNetFils).toBe(19_000);
  });

  it("عمولة مخصّصة للجهة", () => {
    expect(breakdown({ subtotalFils: 10_000, commissionBps: 250 }).commissionFils).toBe(250);
  });
});

describe("تحويل المبالغ للمزوّد", () => {
  it("فلس ↔ دينار بثلاث خانات", () => {
    expect(filsToDecimal(12_500)).toBe(12.5);
    expect(filsToDecimal(1)).toBe(0.001);
    expect(decimalToFils(12.5)).toBe(12_500);
    expect(decimalToFils("45.500")).toBe(45_500);
    expect(decimalToFils(0.1 + 0.2)).toBe(300); // لا أخطاء float
  });
  it("يرفض القيم غير الصالحة", () => {
    expect(() => decimalToFils("-1")).toThrow();
    expect(() => decimalToFils("1.2345")).toThrow();
    expect(() => filsToDecimal(-5)).toThrow();
  });
});
