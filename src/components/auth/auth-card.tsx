import { cn } from "@/lib/utils";

/** إطار موحّد لنماذج المصادقة */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border bg-card/85 p-6 shadow-2xl shadow-black/5 backdrop-blur-xl sm:p-8 dark:shadow-black/30",
        className,
      )}
    >
      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
      {footer ? (
        <div className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">{footer}</div>
      ) : null}
    </div>
  );
}
