import { describe, expect, it } from "vitest";

import { isOwnLogoPath, newLogoPath } from "./logo";

const ORG = "e2e00000-0000-4000-8000-0000000000a1";
const OTHER = "e2e00000-0000-4000-8000-0000000000a2";
const FILE = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("مسار شعار الجهة", () => {
  it("يقبل مسارًا داخل مجلد الجهة نفسها", () => {
    expect(isOwnLogoPath(ORG, newLogoPath(ORG, "png", FILE))).toBe(true);
    expect(isOwnLogoPath(ORG, `${ORG}/logo/${FILE}.webp`)).toBe(true);
  });

  it("يرفض شعار جهة أخرى أو مجلد الفعاليات أو أنواعًا غير مسموحة", () => {
    expect(isOwnLogoPath(ORG, `${OTHER}/logo/${FILE}.png`)).toBe(false);
    expect(isOwnLogoPath(ORG, `${ORG}/events/${FILE}.png`)).toBe(false);
    expect(isOwnLogoPath(ORG, `${ORG}/logo/${FILE}.svg`)).toBe(false);
  });

  it("يرفض محاولات الالتفاف على المسار", () => {
    expect(isOwnLogoPath(ORG, `${ORG}/logo/../events/${FILE}.png`)).toBe(false);
    expect(isOwnLogoPath(ORG, `/${ORG}/logo/${FILE}.png`)).toBe(false);
    expect(isOwnLogoPath(ORG, `${ORG}/logo/${FILE}.png?x=1`)).toBe(false);
  });
});
