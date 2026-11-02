import { describe, expect, it } from "vitest";

import { parseEventSearch } from "./search-params";

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
});
