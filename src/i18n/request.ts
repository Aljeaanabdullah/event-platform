import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";

import { routing } from "./routing";

/** كل التواريخ والأوقات تُعرض بتوقيت الكويت بغض النظر عن موقع الخادم أو الزائر. */
export const TIME_ZONE = "Asia/Kuwait";

export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    const paramValue = await rootParams.locale();
    if (hasLocale(routing.locales, paramValue)) {
      locale = paramValue;
    } else {
      notFound();
    }
  }

  return {
    locale,
    timeZone: TIME_ZONE,
    messages: (await import(`../../messages/${locale}.json`)).default,
    formats: {
      dateTime: {
        eventDate: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
        eventDateTime: {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        },
        full: { dateStyle: "full" },
      },
    },
  };
});
