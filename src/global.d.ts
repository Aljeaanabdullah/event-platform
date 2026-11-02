import type { routing } from "@/i18n/routing";

import type messages from "../messages/en.json";

// تفعيل التحقق من مفاتيح الترجمة في TypeScript: أي مفتاح غير موجود = خطأ في البناء
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
