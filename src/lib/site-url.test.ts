import { describe, expect, it } from "vitest";

import { resolveSiteUrl } from "./site-url";

describe("resolveSiteUrl", () => {
  it("يفضّل NEXT_PUBLIC_SITE_URL ويحذف الشرطة الأخيرة", () => {
    expect(
      resolveSiteUrl({
        NEXT_PUBLIC_SITE_URL: "https://events.example.com/",
        NEXT_PUBLIC_VERCEL_URL: "x.vercel.app",
      }),
    ).toBe("https://events.example.com");
  });

  it("يستخدم عنوان الإنتاج على Vercel في بيئة الإنتاج", () => {
    expect(
      resolveSiteUrl({
        NEXT_PUBLIC_VERCEL_ENV: "production",
        NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: "event-platform.vercel.app",
        NEXT_PUBLIC_VERCEL_BRANCH_URL: "event-platform-git-main.vercel.app",
      }),
    ).toBe("https://event-platform.vercel.app");
  });

  it("يستخدم عنوان الفرع في نسخ المعاينة", () => {
    expect(
      resolveSiteUrl({
        NEXT_PUBLIC_VERCEL_ENV: "preview",
        NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: "event-platform.vercel.app",
        NEXT_PUBLIC_VERCEL_BRANCH_URL: "event-platform-git-feature.vercel.app",
        NEXT_PUBLIC_VERCEL_URL: "event-platform-abc123.vercel.app",
      }),
    ).toBe("https://event-platform-git-feature.vercel.app");
  });

  it("يعود إلى localhost محليًا", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
  });
});
