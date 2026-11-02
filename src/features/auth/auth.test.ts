import { describe, expect, it } from "vitest";

import { mapAuthError } from "./errors";
import { loginSchema, profileSchema, registerSchema, resetPasswordSchema } from "./schemas";

const firstIssue = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.error?.issues[0]?.message;

describe("registerSchema", () => {
  const valid = {
    fullName: "عبدالله",
    email: "  User@Example.COM ",
    password: "secret123",
    confirmPassword: "secret123",
    accountType: "customer" as const,
  };

  it("يقبل بيانات صحيحة ويوحّد البريد", () => {
    const r = registerSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data?.email).toBe("user@example.com");
  });

  it("يقبل كلمة مرور بحروف عربية وأرقام", () => {
    expect(
      registerSchema.safeParse({ ...valid, password: "كلمةسر12", confirmPassword: "كلمةسر12" }).success,
    ).toBe(true);
  });

  it("يرفض كلمة مرور ضعيفة أو غير متطابقة", () => {
    expect(
      firstIssue(registerSchema.safeParse({ ...valid, password: "short1", confirmPassword: "short1" })),
    ).toBe("passwordTooShort");
    expect(
      firstIssue(
        registerSchema.safeParse({ ...valid, password: "onlyletters", confirmPassword: "onlyletters" }),
      ),
    ).toBe("passwordNeedsNumber");
    expect(firstIssue(registerSchema.safeParse({ ...valid, confirmPassword: "different1" }))).toBe(
      "passwordMismatch",
    );
  });

  it("يرفض بريدًا غير صالح ونوع حساب غير معروف (مثل admin)", () => {
    expect(firstIssue(registerSchema.safeParse({ ...valid, email: "not-an-email" }))).toBe("emailInvalid");
    expect(registerSchema.safeParse({ ...valid, accountType: "admin" }).success).toBe(false);
  });
});

describe("loginSchema / resetPasswordSchema / profileSchema", () => {
  it("يتطلب كلمة المرور عند الدخول", () => {
    expect(firstIssue(loginSchema.safeParse({ email: "a@b.co", password: "" }))).toBe("required");
  });

  it("يتحقق من تطابق كلمتي المرور عند إعادة التعيين", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "newpass12", confirmPassword: "newpass12" }).success,
    ).toBe(true);
    expect(firstIssue(resetPasswordSchema.safeParse({ password: "newpass12", confirmPassword: "x" }))).toBe(
      "passwordMismatch",
    );
  });

  it("يقبل هاتفًا فارغًا ويرفض الهاتف غير الصالح", () => {
    expect(profileSchema.safeParse({ fullName: "Ali", phone: "", preferredLocale: "ar" }).success).toBe(true);
    expect(
      profileSchema.safeParse({ fullName: "Ali", phone: "+965 5000 0000", preferredLocale: "en" }).success,
    ).toBe(true);
    expect(
      firstIssue(profileSchema.safeParse({ fullName: "Ali", phone: "abc", preferredLocale: "ar" })),
    ).toBe("phoneInvalid");
  });
});

describe("mapAuthError", () => {
  it("يحوّل رموز Supabase إلى رموز الواجهة", () => {
    expect(mapAuthError({ code: "invalid_credentials" })).toBe("invalidCredentials");
    expect(mapAuthError({ code: "over_email_send_rate_limit" })).toBe("rateLimited");
    expect(mapAuthError({ status: 429 })).toBe("rateLimited");
    expect(mapAuthError({ code: "something_new" })).toBe("generic");
    expect(mapAuthError(null)).toBe("generic");
  });
});
