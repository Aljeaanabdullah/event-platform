import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getProvider, isMockAllowed } = await import("./config");

const SECRET = "x".repeat(32);

describe("اختيار مزوّد الدفع", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("المزوّد الوهمي ممنوع في Production حتى لو ضُبط بالخطأ", () => {
    vi.stubEnv("PAYMENT_PROVIDER", "mock");
    vi.stubEnv("MOCK_PAYMENT_SECRET", SECRET);
    vi.stubEnv("VERCEL_ENV", "production");
    expect(isMockAllowed()).toBe(false);
    expect(getProvider()).toBeNull();
  });

  it("مسموح محليًا وفي المعاينة عند ضبطه صراحةً بسر كافٍ", () => {
    vi.stubEnv("PAYMENT_PROVIDER", "mock");
    vi.stubEnv("MOCK_PAYMENT_SECRET", SECRET);
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(getProvider()?.name).toBe("mock");
    vi.stubEnv("MOCK_PAYMENT_SECRET", "short");
    expect(isMockAllowed()).toBe(false);
  });

  it("بدون إعداد: لا يوجد مزوّد (لا ندّعي دفعًا غير موجود)", () => {
    vi.stubEnv("PAYMENT_PROVIDER", "");
    vi.stubEnv("MYFATOORAH_API_KEY", "");
    expect(getProvider()).toBeNull();
  });

  it("MyFatoorah يُختار عند توفر مفتاحه", () => {
    vi.stubEnv("MYFATOORAH_API_KEY", "sandbox-key");
    expect(getProvider()?.name).toBe("myfatoorah");
  });
});
