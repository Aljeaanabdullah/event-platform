"use client";

import { XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cancelPendingOrder } from "@/features/booking/actions";
import { useRouter } from "@/i18n/navigation";

/** إلغاء الحجز المؤقت — يحرر التذاكر فورًا لغيرك */
export function CancelOrderButton({ orderId }: { orderId: string }) {
  const t = useTranslations("Checkout");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await cancelPendingOrder(orderId);
          if (res.ok) {
            toast.success(t("cancelled"));
            router.refresh();
          } else toast.error(t("cancelFailed"));
        })
      }
    >
      <XCircle aria-hidden />
      {t("cancel")}
    </Button>
  );
}
