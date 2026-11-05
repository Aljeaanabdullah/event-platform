import { describe, expect, it } from "vitest";

import {
  kuwaitDateString,
  kuwaitDayRange,
  kuwaitStartOfDay,
  isoToKuwaitLocal,
  kuwaitLocalToIso,
  kuwaitWeekday,
  presetRange,
} from "./kuwait-time";

// الثلاثاء 3 نوفمبر 2026، الساعة 23:30 بتوقيت الكويت (= 20:30 UTC)
const tuesdayNight = new Date("2026-11-03T20:30:00Z");

describe("توقيت الكويت", () => {
  it("بداية اليوم = 21:00 UTC من اليوم السابق", () => {
    expect(kuwaitStartOfDay(tuesdayNight).toISOString()).toBe("2026-11-02T21:00:00.000Z");
    // بعد منتصف الليل في الكويت (00:30) ينتقل لليوم التالي رغم أن UTC ما زال في نفس اليوم
    expect(kuwaitStartOfDay(new Date("2026-11-03T21:30:00Z")).toISOString()).toBe("2026-11-03T21:00:00.000Z");
  });

  it("اليوم والتاريخ المحلي", () => {
    expect(kuwaitWeekday(tuesdayNight)).toBe(2);
    expect(kuwaitDateString(new Date("2026-11-03T21:30:00Z"))).toBe("2026-11-04");
  });

  it("يوم محدد يغطي 24 ساعة بتوقيت الكويت", () => {
    expect(kuwaitDayRange("2026-12-31")).toEqual({
      from: new Date("2026-12-30T21:00:00Z"),
      to: new Date("2026-12-31T21:00:00Z"),
    });
    expect(kuwaitDayRange("2026-02-30")).toBeNull();
    expect(kuwaitDayRange("31-12-2026")).toBeNull();
  });

  it("اليوم: من الآن حتى منتصف الليل", () => {
    const r = presetRange("today", tuesdayNight);
    expect(r.from).toEqual(tuesdayNight);
    expect(r.to.toISOString()).toBe("2026-11-03T21:00:00.000Z");
  });

  it("هذا الأسبوع: حتى بداية الأحد", () => {
    expect(presetRange("this-week", tuesdayNight).to.toISOString()).toBe("2026-11-07T21:00:00.000Z");
  });

  it("نهاية الأسبوع من الثلاثاء: الخميس 00:00 حتى الأحد 00:00", () => {
    const r = presetRange("weekend", tuesdayNight);
    expect(r.from.toISOString()).toBe("2026-11-04T21:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-11-07T21:00:00.000Z");
  });

  it("نهاية الأسبوع يوم الجمعة تبدأ من الآن", () => {
    const friday = new Date("2026-11-06T10:00:00Z");
    const r = presetRange("weekend", friday);
    expect(r.from).toEqual(friday);
    expect(r.to.toISOString()).toBe("2026-11-07T21:00:00.000Z");
  });

  it("غدًا", () => {
    const r = presetRange("tomorrow", tuesdayNight);
    expect(r.from.toISOString()).toBe("2026-11-03T21:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-11-04T21:00:00.000Z");
  });
});

describe("تحويل الوقت المحلي للكويت", () => {
  it("datetime-local → ISO والعكس", () => {
    expect(kuwaitLocalToIso("2026-12-01T19:30")).toBe("2026-12-01T16:30:00.000Z");
    expect(kuwaitLocalToIso("2026-12-01T01:00")).toBe("2026-11-30T22:00:00.000Z");
    expect(isoToKuwaitLocal("2026-12-01T16:30:00.000Z")).toBe("2026-12-01T19:30");
  });
  it("يرفض القيم غير الصالحة", () => {
    expect(kuwaitLocalToIso("2026-02-30T10:00")).toBeNull();
    expect(kuwaitLocalToIso("2026-12-01 19:30")).toBeNull();
    expect(kuwaitLocalToIso("2026-12-01T25:00")).toBeNull();
  });
});
