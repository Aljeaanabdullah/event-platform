import { describe, expect, it } from "vitest";

import { checkReadyForReview, eventFormSchema, slugFromTitle, type EventFormInput } from "./event-schema";

const ORG = "e2e00000-0000-4000-8000-0000000000a1";

const valid: EventFormInput = {
  organizerId: ORG,
  categorySlug: "music",
  titleAr: "أمسية موسيقية",
  titleEn: "Music Night",
  summaryAr: "",
  summaryEn: "",
  descriptionAr: "",
  descriptionEn: "",
  coverPath: `${ORG}/events/11111111-1111-4111-8111-111111111111.webp`,
  gallery: [],
  startsAtLocal: "2030-01-10T19:00",
  endsAtLocal: "2030-01-10T22:00",
  isOnline: false,
  venueNameAr: "مسرح",
  venueNameEn: "Theater",
  addressAr: "",
  addressEn: "",
  governorate: "hawalli",
  area: "",
  latitude: "",
  longitude: "",
  tickets: [{ nameAr: "عادية", nameEn: "General", price: "7.500", quantity: 100, maxPerOrder: 10 }],
};

const errorsOf = (input: EventFormInput) => {
  const r = eventFormSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}:${i.message}`);
};

describe("نموذج الفعالية", () => {
  it("يقبل نموذجًا صحيحًا", () => {
    expect(errorsOf(valid)).toEqual([]);
  });

  it("النهاية بعد البداية", () => {
    expect(errorsOf({ ...valid, endsAtLocal: "2030-01-10T18:00" })).toContain("endsAtLocal:endBeforeStart");
  });

  it("السعر بالدينار بحد أقصى 3 خانات عشرية", () => {
    const bad = { ...valid, tickets: [{ ...valid.tickets[0], price: "7.5001" }] };
    expect(errorsOf(bad)).toContain("tickets.0.price:priceInvalid");
    const neg = { ...valid, tickets: [{ ...valid.tickets[0], price: "-1" }] };
    expect(errorsOf(neg)).toContain("tickets.0.price:priceInvalid");
    const free = { ...valid, tickets: [{ ...valid.tickets[0], price: "0" }] };
    expect(errorsOf(free)).toEqual([]);
  });

  it("الحد الأقصى للطلب لا يتجاوز الكمية", () => {
    const bad = { ...valid, tickets: [{ ...valid.tickets[0], quantity: 5, maxPerOrder: 10 }] };
    expect(errorsOf(bad)).toContain("tickets.0.maxPerOrder:maxPerOrderAboveQuantity");
  });

  it("الإحداثيات كاملة وصحيحة أو فارغة", () => {
    expect(errorsOf({ ...valid, latitude: "29.3", longitude: "" })).toContain("longitude:coordinatesPair");
    expect(errorsOf({ ...valid, latitude: "95", longitude: "48" })).toContain("latitude:coordinateInvalid");
    expect(errorsOf({ ...valid, latitude: "29.389700", longitude: "48.003600" })).toEqual([]);
  });

  it("يرفض مسارات صور خارج مجلد الجهة أو بصيغة غير مسموحة", () => {
    expect(errorsOf({ ...valid, coverPath: "../secret.png" }).length).toBeGreaterThan(0);
    expect(
      errorsOf({ ...valid, gallery: [`${ORG}/events/11111111-1111-4111-8111-111111111111.svg`] }).length,
    ).toBeGreaterThan(0);
  });

  it("شروط الإرسال للمراجعة", () => {
    const v = eventFormSchema.parse(valid);
    expect(checkReadyForReview(v, new Date("2029-01-01"))).toEqual([]);
    expect(checkReadyForReview(v, new Date("2031-01-01"))).toEqual(["eventInPast"]);
    const noPlace = eventFormSchema.parse({ ...valid, governorate: "", tickets: [] });
    expect(checkReadyForReview(noPlace, new Date("2029-01-01"))).toEqual([
      "locationRequired",
      "ticketsRequired",
    ]);
    const online = eventFormSchema.parse({ ...valid, isOnline: true, governorate: "" });
    expect(checkReadyForReview(online, new Date("2029-01-01"))).toEqual([]);
  });

  it("slug من العنوان الإنجليزي", () => {
    expect(slugFromTitle("Music Night: Live! 2030", "a1b2")).toBe("music-night-live-2030-a1b2");
    expect(slugFromTitle("!!", "a1b2")).toBe("event-a1b2");
    expect(slugFromTitle("x".repeat(200), "a1b2")).toMatch(/^x{80}-a1b2$/);
  });
});
