import type { NextConfig } from "next";

/**
 * ترويسات أمان أساسية لكل الصفحات.
 * سياسة CSP الكاملة تُضاف في Phase 10 بعد معرفة كل النطاقات الخارجية (Supabase، الدفع، الخرائط).
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // الكاميرا مسموحة لنفس الموقع فقط (ماسح QR للمنظّمين)
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
