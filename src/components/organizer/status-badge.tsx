import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type EventStatus = Database["public"]["Enums"]["event_status"];

// ألوان أغمق في الوضع الفاتح وأفتح في الداكن لتحقيق تباين WCAG AA
const style: Record<EventStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_review: "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300",
  published: "bg-emerald-500/15 text-emerald-800 border-emerald-500/30 dark:text-emerald-300",
  rejected: "bg-red-500/15 text-red-800 border-red-500/30 dark:text-red-300",
  cancelled: "bg-muted text-muted-foreground line-through",
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const t = useTranslations("EventStatus");
  return (
    <Badge variant="outline" className={cn(style[status])} data-testid="event-status-badge">
      {t(status)}
    </Badge>
  );
}

/** بطاقة رقم في لوحة التحكم */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  hint?: string;
}) {
  return (
    <li className="glass rounded-2xl p-5">
      <Icon className="size-5 text-primary" aria-hidden />
      <p className="mt-4 text-2xl font-bold tracking-tight tabular-nums" dir="auto">
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </li>
  );
}
