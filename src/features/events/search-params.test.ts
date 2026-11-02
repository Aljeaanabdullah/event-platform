import { describe, expect, it } from "vitest";

import { eventSearchHref, parseEventSearch } from "./search-params";

describe("parseEventSearch", () => {
  it("يقبل القيم الصالحة", () => {
    expect(
      parseEventSearch({ q: " jazz ", area: "hawalli", category: "music", date: "weekend", price: "free" }),
    ).toEqual({ q: "jazz", area: "hawalli", category: "music", date: "weekend", price: "free" });
  });

  it("يتجاهل القيم غير الصالحة بدل الفشل", () => {
    expect(
      parseEventSearch({ area: "mars", category: "<script>", date: "yesterday", price: "cheap" }),
    ).toEqual({
      q: undefined,
      area: undefined,
      category: undefined,
      date: undefined,
      price: undefined,
    });
  });

  it("يعامل 'any' والنص الفارغ كعدم وجود فلتر", () => {
    const r = parseEventSearch({ q: "   ", date: "any" });
    expect(r.q).toBeUndefined();
    expect(r.date).toBeUndefined();
  });

  it("يأخذ أول قيمة عند تكرار المعامل ويرفض النص الطويل", () => {
    expect(parseEventSearch({ area: ["ahmadi", "jahra"] }).area).toBe("ahmadi");
    expect(parseEventSearch({ q: "x".repeat(101) }).q).toBeUndefined();
  });

  it("الترتيب والصفحة واليوم المحدد", () => {
    expect(parseEventSearch({ sort: "price-asc", page: "3", day: "2026-12-01" })).toMatchObject({
      sort: "price-asc",
      page: 3,
      day: "2026-12-01",
    });
    // الترتيب الافتراضي لا يُكتب في الرابط، والصفحات خارج الحدود تُتجاهل
    expect(parseEventSearch({ sort: "date", page: "0" })).toMatchObject({ sort: undefined, page: undefined });
    expect(parseEventSearch({ page: "999", day: "tomorrow" })).toMatchObject({
      page: undefined,
      day: undefined,
    });
  });
});

describe("eventSearchHref", () => {
  it("يبني روابط نظيفة ويحذف القيم الافتراضية", () => {
    const search = parseEventSearch({ q: "jazz", category: "music", page: "2" });
    expect(eventSearchHref(search)).toBe("/events?q=jazz&category=music&page=2");
    expect(eventSearchHref(search, { page: 1 })).toBe("/events?q=jazz&category=music");
    expect(eventSearchHref(parseEventSearch({}))).toBe("/events");
  });
});
