import { AlertTriangle, CalendarX2, type LucideIcon } from "lucide-react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

type StateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
};

/** حالة فارغة موحدة (لا توجد نتائج، لا توجد بيانات بعد…) */
export function EmptyState({ title, description, icon: Icon = CalendarX2, action, className }: StateProps) {
  return (
    <Empty className={cn("rounded-2xl border border-dashed bg-card/40 py-14", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-12 rounded-xl bg-accent text-accent-foreground">
          <Icon className="size-6" aria-hidden />
        </EmptyMedia>
        <EmptyTitle className="text-lg">{title}</EmptyTitle>
        {description ? <EmptyDescription className="max-w-md">{description}</EmptyDescription> : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}

/** حالة خطأ موحدة — role="alert" ليعلن عنها قارئ الشاشة */
export function ErrorState({
  title,
  description,
  icon: Icon = AlertTriangle,
  action,
  className,
}: StateProps) {
  return (
    <Empty role="alert" className={cn("rounded-2xl border border-destructive/30 py-14", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-12 rounded-xl bg-destructive/10 text-destructive">
          <Icon className="size-6" aria-hidden />
        </EmptyMedia>
        <EmptyTitle className="text-lg">{title}</EmptyTitle>
        {description ? <EmptyDescription className="max-w-md">{description}</EmptyDescription> : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}
