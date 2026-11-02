import { describe, expect, it } from "vitest";

import { applyBps, filsToKwdString, formatMoney, parseKwdToFils } from "./money";

describe("parseKwdToFils", () => {
  it("يحوّل الدينار إلى فلس بدقة", () => {
    expect(parseKwdToFils("12")).toBe(12_000);
    expect(parseKwdToFils("12.5")).toBe(12_500);
    expect(parseKwdToFils("0.250")).toBe(250);
    expect(parseKwdToFils(" 1.005 ")).toBe(1_005);
  });

  it("يتفادى أخطاء float المعروفة", () => {
    // 1.005 * 1000 في float = 1004.9999999999999
    expect(parseKwdToFils("1.005")).toBe(1005);
    expect(parseKwdToFils("0.1")).toBe(100);
  });

  it("يرفض المدخلات غير الصالحة", () => {
    expect(() => parseKwdToFils("1.2345")).toThrow(RangeError);
    expect(() => parseKwdToFils("-1")).toThrow(RangeError);
    expect(() => parseKwdToFils("abc")).toThrow(RangeError);
    expect(() => parseKwdToFils("")).toThrow(RangeError);
  });
});

describe("filsToKwdString", () => {
  it("يعرض ثلاث خانات عشرية دائمًا", () => {
    expect(filsToKwdString(12_500)).toBe("12.500");
    expect(filsToKwdString(5)).toBe("0.005");
    expect(filsToKwdString(0)).toBe("0.000");
    expect(filsToKwdString(-250)).toBe("-0.250");
  });

  it("يرفض الأعداد غير الصحيحة", () => {
    expect(() => filsToKwdString(1.5)).toThrow(RangeError);
  });
});

describe("applyBps", () => {
  it("يحسب النسب بالتقريب لأقرب فلس", () => {
    expect(applyBps(10_000, 500)).toBe(500); // 5%
    expect(applyBps(1_000, 250)).toBe(25); // 2.5%
    expect(applyBps(3, 5_000)).toBe(2); // 1.5 → 2
    expect(applyBps(0, 1_000)).toBe(0);
  });

  it("يرفض القيم السالبة", () => {
    expect(() => applyBps(-1, 100)).toThrow(RangeError);
  });
});

describe("formatMoney", () => {
  it("ينسّق بالإنجليزية مع رمز العملة", () => {
    const out = formatMoney(12_500, "en");
    expect(out).toContain("12.500");
    expect(out).toContain("KWD");
  });

  it("ينسّق بالعربية", () => {
    const out = formatMoney(12_500, "ar");
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toContain("NaN");
  });
});

describe("formatMoney — الأرقام", () => {
  it("يستخدم أرقامًا لاتينية في العربية لتطابق التواريخ", () => {
    expect(formatMoney(15_000, "ar")).toMatch(/15[.,٫]000/);
    expect(formatMoney(15_000, "ar")).not.toMatch(/[٠-٩]/);
  });
});
