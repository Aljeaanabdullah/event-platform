"use client";

import { Trash2, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { deleteDraft, withdrawSubmission } from "@/features/organizer/event-actions";
import { useRouter } from "@/i18n/navigation";

export function WithdrawButton({ eventId }: { eventId: string }) {
  const t = useTranslations("OrganizerEvents");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await withdrawSubmission(eventId);
          if (res.ok) {
            toast.success(t("withdrawn"));
            router.refresh();
          } else toast.error(t("actionFailed"));
        })
      }
    >
      <Undo2 aria-hidden />
      {t("withdraw")}
    </Button>
  );
}

export function DeleteDraftButton({ eventId }: { eventId: string }) {
  const t = useTranslations("OrganizerEvents");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      className="text-destructive"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(t("confirmDelete"))) return;
        start(async () => {
          const res = await deleteDraft(eventId);
          if (res.ok) {
            toast.success(t("deleted"));
            router.push("/organizer/events");
          } else toast.error(t("actionFailed"));
        });
      }}
    >
      <Trash2 aria-hidden />
      {t("deleteDraft")}
    </Button>
  );
}
