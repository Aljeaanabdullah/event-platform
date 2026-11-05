import { useTranslations } from "next-intl";

import { EventGridSkeleton } from "@/components/events/event-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  const t = useTranslations("Common");
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" role="status" aria-live="polite">
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="mb-3 h-9 w-64" />
      <Skeleton className="mb-10 h-5 w-96 max-w-full" />
      <EventGridSkeleton count={8} />
    </div>
  );
}
