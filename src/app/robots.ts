import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site-url";

/** الصفحات الخاصة (الحساب، المنظّم، الإدارة، الدفع، الـ API) لا تُفهرس */
export default function robots(): MetadataRoute.Robots {
  const isProductionSite = process.env.VERCEL_ENV === "production" || !process.env.VERCEL_ENV;
  return {
    rules: isProductionSite
      ? {
          userAgent: "*",
          allow: "/",
          disallow: ["/api/", "/auth/", "/*/account", "/*/organizer", "/*/admin", "/*/checkout", "/*/dev/"],
        }
      : // نسخ المعاينة لا تُفهرس إطلاقًا
        { userAgent: "*", disallow: "/" },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
