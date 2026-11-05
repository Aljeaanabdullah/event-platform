import { describe, expect, it } from "vitest";

import { classifyScan, mapReserveError, reserveSchema } from "./schema";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("طلب الحجز", () => {
  it("يقبل المعرّفات والكميات فقط", () => {
    const r = reserveSchema.safeParse({ eventId: id(1), items: [{ ticketTypeId: id(2), quantity: 2 }] });
    expect(r.success).toBe(true);
  });

  it("يتجاهل أي سعر قادم من المتصفح", () => {
    const r = reserveSchema.parse({
      eventId: id(1),
      items: [{ ticketTypeId: id(2), quantity: 1, price_fils: 1 }],
      total: 1,
    } as never);
    expect(r).toEqual({ eventId: id(1), items: [{ ticketTypeId: id(2), quantity: 1 }] });
  });

  it("يرفض الكميات غير الصالحة والتكرار والقائمة الفارغة", () => {
    expect(reserveSchema.safeParse({ eventId: id(1), items: [] }).success).toBe(false);
    expect(
      reserveSchema.safeParse({ eventId: id(1), items: [{ ticketTypeId: id(2), quantity: 0 }] }).success,
    ).toBe(false);
    expect(
      reserveSchema.safeParse({ eventId: id(1), items: [{ ticketTypeId: id(2), quantity: 1.5 }] }).success,
    ).toBe(false);
    expect(
      reserveSchema.safeParse({
        eventId: id(1),
        items: [
          { ticketTypeId: id(2), quantity: 1 },
          { ticketTypeId: id(2), quantity: 1 },
        ],
      }).success,
    ).toBe(false);
  });

  it("ترجمة أخطاء قاعدة البيانات", () => {
    expect(mapReserveError("SOLD_OUT")).toBe("soldOut");
    expect(mapReserveError("TOO_MANY_PENDING_ORDERS")).toBe("tooManyPending");
    expect(mapReserveError("something else")).toBe("generic");
    expect(mapReserveError(undefined)).toBe("generic");
  });
});

describe("تصنيف المسح", () => {
  it("رمز QR (64 hex) أو الرمز المطبوع", () => {
    expect(classifyScan("a".repeat(64))).toEqual({ kind: "token", value: "a".repeat(64) });
    expect(classifyScan(" t-0123456789 ")).toEqual({ kind: "code", value: "T-0123456789" });
    expect(classifyScan("https://evil.example/?t=1")).toBeNull();
    expect(classifyScan("a".repeat(63))).toBeNull();
  });
});
