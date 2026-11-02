import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const style = {
  valid: "bg-emerald-500/15 text-emerald-800 border-emerald-500/30 dark:text-emerald-300",
  checked_in: "bg-sky-500/15 text-sky-800 border-sky-500/30 dark:text-sky-300",
  void: "bg-red-500/15 text-red-800 border-red-500/30 dark:text-red-300",
} as const;

export function TicketStatusBadge({ status }: { status: keyof typeof style }) {
  const t = useTranslations("Tickets.status");
  return (
    <Badge variant="outline" className={cn("shrink-0", style[status])} data-testid="ticket-status">
      {t(status)}
    </Badge>
  );
}
