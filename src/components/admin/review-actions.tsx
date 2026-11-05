"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { reviewEvent, setOrganizerStatus, type AdminActionResult } from "@/features/admin/actions";
import { useRouter } from "@/i18n/navigation";

/**
 * اعتماد أو رفض مع سبب إلزامي. الطلب يمر بالتحقق من الدور على الخادم وفي قاعدة البيانات.
 */
export function ReviewActions({ kind, id }: { kind: "event" | "organizer"; id: string }) {
  const t = useTranslations("AdminReview");
  const router = useRouter();
  const reasonId = useId();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  function run(approve: boolean) {
    start(async () => {
      const res: AdminActionResult =
        kind === "event"
          ? await reviewEvent({ eventId: id, approve, reason: approve ? undefined : reason })
          : await setOrganizerStatus({
              organizerId: id,
              status: approve ? "approved" : "rejected",
              reason: approve ? undefined : reason,
            });
      if (res.ok) {
        toast.success(approve ? t("approved") : t("rejected"));
        setRejecting(false);
        router.refresh();
      } else {
        toast.error(t(`errors.${res.error}`));
      }
    });
  }

  return (
    <div className="grid gap-3">
      {rejecting ? (
        <div className="grid gap-2">
          <label htmlFor={reasonId} className="text-sm font-medium">
            {t("reasonLabel")}
          </label>
          <textarea
            id={reasonId}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
            required
            className="min-h-20 rounded-xl border border-input bg-background/60 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !reason.trim()}
              onClick={() => run(false)}
            >
              <X aria-hidden />
              {t("confirmReject")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setRejecting(false)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() => run(true)}
            className="bg-success text-white hover:bg-success/90"
          >
            <Check aria-hidden />
            {t("approve")}
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={() => setRejecting(true)}>
            <X aria-hidden />
            {t("reject")}
          </Button>
        </div>
      )}
    </div>
  );
}
