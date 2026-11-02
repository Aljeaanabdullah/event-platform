/**
 * مخططات التحقق المشتركة بين المتصفح (React Hook Form) والخادم (Server Actions).
 * رسائل الخطأ مفاتيح ترجمة (Validation.*) وليست نصوصًا ثابتة.
 */
import { z } from "zod";

export const PASSWORD_MIN = 8;

const email = z.string().trim().toLowerCase().max(254, "emailInvalid").pipe(z.email("emailInvalid"));

const password = z
  .string()
  .min(PASSWORD_MIN, "passwordTooShort")
  .max(72, "passwordTooLong")
  .regex(/[A-Za-z؀-ۿ]/, "passwordNeedsLetter")
  .regex(/[0-9٠-٩]/, "passwordNeedsNumber");

const fullName = z.string().trim().min(2, "nameTooShort").max(120, "nameTooLong");

const optionalPhone = z
  .string()
  .trim()
  .max(20, "phoneInvalid")
  .refine((v) => v === "" || /^\+?[0-9 ]{6,20}$/.test(v), "phoneInvalid");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "required").max(72, "passwordTooLong"),
});

export const accountTypes = ["customer", "organizer"] as const;

export const registerSchema = z
  .object({
    fullName,
    email,
    password,
    confirmPassword: z.string(),
    accountType: z.enum(accountTypes),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "passwordMismatch",
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "passwordMismatch",
  });

export const profileSchema = z.object({
  fullName,
  phone: optionalPhone,
  preferredLocale: z.enum(["ar", "en"]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
