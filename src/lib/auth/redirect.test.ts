import { describe, expect, it } from "vitest";

import { localeFromPath, safeRedirectPath } from "./redirect";

describe("safeRedirectPath — الحماية من Open Redirect", () => {
  it("يقبل المسارات الداخلية بلغة مدعومة", () => {
    expect(safeRedirectPath("/ar/account", "ar")).toBe("/ar/account");
    expect(safeRedirectPath("/en/events?category=music", "ar")).toBe("/en/events?category=music");
    expect(safeRedirectPath("/en", "ar")).toBe("/en");
  });

  it("يرفض الروابط الخارجية والملتوية", () => {
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "javascript:alert(1)",
      "/evil",
      "/ar\\..\\evil",
      "/ar/\u0000x",
      "",
      null,
      undefined,
    ]) {
      expect(safeRedirectPath(bad, "ar")).toBe("/ar");
    }
  });

  it("يستخدم لغة الصفحة في المسار الافتراضي", () => {
    expect(safeRedirectPath(null, "en")).toBe("/en");
  });
});

describe("localeFromPath", () => {
  it("يستخرج اللغة أو يعود للعربية", () => {
    expect(localeFromPath("/en/account")).toBe("en");
    expect(localeFromPath("/ar")).toBe("ar");
    expect(localeFromPath("/fr/x")).toBe("ar");
    expect(localeFromPath(null)).toBe("ar");
  });
});
