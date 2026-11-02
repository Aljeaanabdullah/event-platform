import { Ticket } from "lucide-react";

import { cn } from "@/lib/utils";

/** شعار مؤقت للمنصة — يُستبدل بالشعار النهائي عند اعتماد الهوية */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)} dir="ltr">
      <span className="bg-gradient-brand grid size-8 place-items-center rounded-lg text-white shadow-sm">
        <Ticket className="size-4.5 -rotate-12" aria-hidden />
      </span>
      <span className="text-base">
        Event<span className="text-gradient-brand">Platform</span>
      </span>
    </span>
  );
}
