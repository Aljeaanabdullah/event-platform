/**
 * تحويل أخطاء Supabase Auth إلى رموز ثابتة نترجمها في الواجهة (AuthErrors.*).
 * لا نعرض رسالة Supabase الخام للمستخدم أبدًا.
 */
export const authErrorCodes = [
  "invalidCredentials",
  "emailNotConfirmed",
  "weakPassword",
  "samePassword",
  "rateLimited",
  "sessionExpired",
  "signupDisabled",
  "providerDisabled",
  "invalidInput",
  "generic",
] as const;

export type AuthErrorCode = (typeof authErrorCodes)[number];

export type ActionResult<T = undefined> =
  ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: AuthErrorCode };

export function mapAuthError(
  error: { code?: string; status?: number; message?: string } | null,
): AuthErrorCode {
  switch (error?.code) {
    case "invalid_credentials":
      return "invalidCredentials";
    case "email_not_confirmed":
      return "emailNotConfirmed";
    case "weak_password":
      return "weakPassword";
    case "same_password":
      return "samePassword";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
    case "over_sms_send_rate_limit":
      return "rateLimited";
    case "session_not_found":
    case "session_expired":
    case "refresh_token_not_found":
    case "bad_jwt":
      return "sessionExpired";
    case "signup_disabled":
    case "email_provider_disabled":
      return "signupDisabled";
    case "provider_disabled":
    case "oauth_provider_not_supported":
      return "providerDisabled";
    case "validation_failed":
    case "email_address_invalid":
      return "invalidInput";
  }
  if (error?.status === 429) return "rateLimited";
  return "generic";
}
