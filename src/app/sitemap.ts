import type { MetadataRoute } from "next";

import { listPublishedEventSlugs } from "@/features/events/queries";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/site-url";

// يُعاد توليده كل ساعة
export const revalidate = 3600;

/** خريطة الموقع: الصفحات العامة + كل فعالية منشورة قادمة باللغتين */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const alternates = (path: string) => ({
    languages: Object.fromEntries(routing.locales.map((l) => [l, `${siteUrl}/${l}${path}`])),
  });

  const staticPaths = ["", "/events"];
  const events = await listPublishedEventSlugs();

  return [
    ...staticPaths.flatMap((path) =>
      routing.locales.map((locale) => ({
        url: `${siteUrl}/${locale}${path}`,
        changeFrequency: "daily" as const,
        priority: path === "" ? 1 : 0.9,
        alternates: alternates(path),
      })),
    ),
    ...events.flatMap(({ slug }) =>
      routing.locales.map((locale) => ({
        url: `${siteUrl}/${locale}/events/${slug}`,
        changeFrequency: "daily" as const,
        priority: 0.8,
        alternates: alternates(`/events/${slug}`),
      })),
    ),
  ];
}
