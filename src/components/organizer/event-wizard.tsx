"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, Plus, Save, Send, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useFieldArray, useForm, useWatch, type FieldPath } from "react-hook-form";
import { toast } from "sonner";

import { FormAlert } from "@/components/auth/form-alert";
import { EventCard } from "@/components/events/event-card";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { areas, categories } from "@/config/site";
import { saveEvent, type SaveEventResult } from "@/features/organizer/event-actions";
import {
  checkReadyForReview,
  eventFormSchema,
  MAX_TICKET_TYPES,
  wizardSteps,
  type EventFormInput,
  type EventFormValues,
} from "@/features/organizer/event-schema";
import { useRouter } from "@/i18n/navigation";
import { kuwaitLocalToIso } from "@/lib/kuwait-time";
import { formatMoney, parseKwdToFils } from "@/lib/money";
import { publicMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

import { ImageUploader } from "./image-uploader";

const textareaClass =
  "min-h-28 w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";
const inputClass = "h-11 rounded-xl bg-background/60";

/**
 * معالج إنشاء/تعديل فعالية من 7 خطوات:
 * المعلومات → الصور → التاريخ والوقت → الموقع → التذاكر والأسعار → المعاينة → الإرسال للمراجعة.
 * يمكن حفظ مسودة في أي وقت. كل التحقق يُعاد على الخادم وفي قاعدة البيانات.
 */
export function EventWizard({
  eventId,
  initialValues,
  lockedTicketIds = [],
  organizerName,
}: {
  eventId: string | null;
  initialValues: EventFormInput;
  lockedTicketIds?: string[];
  organizerName: string;
}) {
  const t = useTranslations("EventForm");
  const tCategories = useTranslations("Categories");
  const tAreas = useTranslations("Areas");
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SaveEventResult | null>(null);
  const [currentId, setCurrentId] = useState(eventId);

  const form = useForm<EventFormInput, unknown, EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });
  const { register, control, formState, setValue, trigger, handleSubmit } = form;
  const tickets = useFieldArray({ control, name: "tickets" });
  const values = useWatch({ control }) as EventFormInput;

  const err = (name: FieldPath<EventFormInput>) => {
    const parts = name.split(".");
    let node: unknown = formState.errors;
    for (const p of parts) node = (node as Record<string, unknown> | undefined)?.[p];
    const message = (node as { message?: string } | undefined)?.message;
    return message ? t(`errors.${message}` as "errors.required") : undefined;
  };

  async function goTo(next: number) {
    if (next > step) {
      const ok = await trigger([...wizardSteps[step].fields] as FieldPath<EventFormInput>[]);
      if (!ok) return;
    }
    setStep(next);
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function persist(submit: boolean) {
    return handleSubmit(
      (data) =>
        startTransition(async () => {
          const res = await saveEvent(currentId, data, { submit });
          setResult(res);
          if (res.eventId || (res.ok && res.eventId)) setCurrentId(res.eventId ?? currentId);
          if (res.ok) {
            toast.success(submit ? t("submitted") : t("draftSaved"));
            if (submit) router.push(`/organizer/events/${res.eventId}`);
            else if (!currentId) router.replace(`/organizer/events/${res.eventId}`);
            else router.refresh();
          }
        }),
      (errors) => {
        // انتقل لأول خطوة فيها خطأ
        const first = wizardSteps.findIndex((s) => s.fields.some((f) => f in errors));
        if (first >= 0) setStep(first);
        toast.error(t("fixErrors"));
      },
    )();
  }

  const parsedForPreview = eventFormSchema.safeParse(values);
  const readiness = parsedForPreview.success ? checkReadyForReview(parsedForPreview.data) : null;
  const totalCapacity = (values.tickets ?? []).reduce((sum, tk) => sum + (Number(tk?.quantity) || 0), 0);
  const minPrice = (() => {
    const prices = (values.tickets ?? []).flatMap((tk) => {
      try {
        return [parseKwdToFils(String(tk?.price ?? ""))];
      } catch {
        return [];
      }
    });
    return prices.length ? Math.min(...prices) : null;
  })();

  const stepKey = wizardSteps[step].key;

  return (
    <form onSubmit={(e) => e.preventDefault()} noValidate className="grid gap-6" data-testid="event-wizard">
      {/* مؤشر الخطوات */}
      <nav aria-label={t("stepsLabel")}>
        <ol className="flex gap-1.5 overflow-x-auto pb-1">
          {wizardSteps.map((s, i) => (
            <li key={s.key} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "grid w-full gap-1.5 rounded-xl px-1 py-1 text-start text-xs font-medium transition-colors",
                  i === step ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className={cn("h-1.5 rounded-full", i <= step ? "bg-gradient-neon" : "bg-muted")} />
                <span className="truncate">
                  {i + 1}. {t(`steps.${s.key}`)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <section className="glass grid gap-5 rounded-3xl p-5 sm:p-7" aria-labelledby="step-title">
        <h2 id="step-title" className="text-xl font-bold">
          {t(`steps.${stepKey}`)}
        </h2>

        {stepKey === "info" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("fields.category")} error={err("categorySlug")} className="sm:col-span-2">
              <NativeSelect
                {...register("categorySlug")}
                className="w-full [&_select]:h-11 [&_select]:rounded-xl"
              >
                {categories.map((c) => (
                  <NativeSelectOption key={c.slug} value={c.slug}>
                    {tCategories(c.slug)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label={t("fields.titleAr")} error={err("titleAr")}>
              <Input dir="rtl" className={inputClass} {...register("titleAr")} />
            </FormField>
            <FormField label={t("fields.titleEn")} error={err("titleEn")}>
              <Input dir="ltr" className={inputClass} {...register("titleEn")} />
            </FormField>
            <FormField label={t("fields.summaryAr")} error={err("summaryAr")} optionalLabel={t("optional")}>
              <Input dir="rtl" className={inputClass} {...register("summaryAr")} />
            </FormField>
            <FormField label={t("fields.summaryEn")} error={err("summaryEn")} optionalLabel={t("optional")}>
              <Input dir="ltr" className={inputClass} {...register("summaryEn")} />
            </FormField>
            <FormField
              label={t("fields.descriptionAr")}
              error={err("descriptionAr")}
              optionalLabel={t("optional")}
            >
              <textarea dir="rtl" className={textareaClass} {...register("descriptionAr")} />
            </FormField>
            <FormField
              label={t("fields.descriptionEn")}
              error={err("descriptionEn")}
              optionalLabel={t("optional")}
            >
              <textarea dir="ltr" className={textareaClass} {...register("descriptionEn")} />
            </FormField>
          </div>
        ) : null}

        {stepKey === "images" ? (
          <ImageUploader
            organizerId={initialValues.organizerId}
            cover={values.coverPath ?? null}
            gallery={(values.gallery ?? []) as string[]}
            onChange={({ cover, gallery }) => {
              setValue("coverPath", cover, { shouldDirty: true });
              setValue("gallery", gallery, { shouldDirty: true });
            }}
          />
        ) : null}

        {stepKey === "schedule" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={t("fields.startsAt")}
              error={err("startsAtLocal")}
              description={t("kuwaitTimeHint")}
            >
              <Input type="datetime-local" className={inputClass} {...register("startsAtLocal")} />
            </FormField>
            <FormField label={t("fields.endsAt")} error={err("endsAtLocal")}>
              <Input type="datetime-local" className={inputClass} {...register("endsAtLocal")} />
            </FormField>
          </div>
        ) : null}

        {stepKey === "location" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2.5 text-sm font-medium sm:col-span-2">
              <input
                type="checkbox"
                className="size-4 accent-[var(--brand-violet)]"
                {...register("isOnline")}
              />
              {t("fields.isOnline")}
            </label>
            {values.isOnline ? null : (
              <>
                <FormField label={t("fields.governorate")} error={err("governorate")}>
                  <NativeSelect
                    {...register("governorate")}
                    className="w-full [&_select]:h-11 [&_select]:rounded-xl"
                  >
                    <NativeSelectOption value="">{t("chooseGovernorate")}</NativeSelectOption>
                    {areas.map((a) => (
                      <NativeSelectOption key={a} value={a}>
                        {tAreas(a)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </FormField>
                <FormField label={t("fields.area")} error={err("area")} optionalLabel={t("optional")}>
                  <Input className={inputClass} {...register("area")} />
                </FormField>
                <FormField
                  label={t("fields.venueAr")}
                  error={err("venueNameAr")}
                  optionalLabel={t("optional")}
                >
                  <Input dir="rtl" className={inputClass} {...register("venueNameAr")} />
                </FormField>
                <FormField
                  label={t("fields.venueEn")}
                  error={err("venueNameEn")}
                  optionalLabel={t("optional")}
                >
                  <Input dir="ltr" className={inputClass} {...register("venueNameEn")} />
                </FormField>
                <FormField
                  label={t("fields.addressAr")}
                  error={err("addressAr")}
                  optionalLabel={t("optional")}
                >
                  <Input dir="rtl" className={inputClass} {...register("addressAr")} />
                </FormField>
                <FormField
                  label={t("fields.addressEn")}
                  error={err("addressEn")}
                  optionalLabel={t("optional")}
                >
                  <Input dir="ltr" className={inputClass} {...register("addressEn")} />
                </FormField>
                <FormField
                  label={t("fields.latitude")}
                  error={err("latitude")}
                  optionalLabel={t("optional")}
                  description={t("coordinatesHint")}
                >
                  <Input dir="ltr" inputMode="decimal" className={inputClass} {...register("latitude")} />
                </FormField>
                <FormField
                  label={t("fields.longitude")}
                  error={err("longitude")}
                  optionalLabel={t("optional")}
                >
                  <Input dir="ltr" inputMode="decimal" className={inputClass} {...register("longitude")} />
                </FormField>
              </>
            )}
          </div>
        ) : null}

        {stepKey === "tickets" ? (
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">{t("ticketsHint")}</p>
            <ul className="grid gap-4" data-testid="ticket-editor">
              {tickets.fields.map((field, i) => {
                const locked =
                  !!field.id && lockedTicketIds.includes((values.tickets?.[i]?.id as string) ?? "");
                return (
                  <li
                    key={field.id}
                    className="grid gap-3 rounded-2xl border bg-background/40 p-4 sm:grid-cols-2"
                  >
                    <FormField label={t("fields.ticketNameAr")} error={err(`tickets.${i}.nameAr`)}>
                      <Input dir="rtl" className={inputClass} {...register(`tickets.${i}.nameAr`)} />
                    </FormField>
                    <FormField label={t("fields.ticketNameEn")} error={err(`tickets.${i}.nameEn`)}>
                      <Input dir="ltr" className={inputClass} {...register(`tickets.${i}.nameEn`)} />
                    </FormField>
                    <FormField
                      label={t("fields.price")}
                      error={err(`tickets.${i}.price`)}
                      description={t("priceHint")}
                    >
                      <Input
                        dir="ltr"
                        inputMode="decimal"
                        className={inputClass}
                        {...register(`tickets.${i}.price`)}
                      />
                    </FormField>
                    <FormField label={t("fields.quantity")} error={err(`tickets.${i}.quantity`)}>
                      <Input
                        type="number"
                        min={1}
                        dir="ltr"
                        className={inputClass}
                        {...register(`tickets.${i}.quantity`)}
                      />
                    </FormField>
                    <FormField label={t("fields.maxPerOrder")} error={err(`tickets.${i}.maxPerOrder`)}>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        dir="ltr"
                        className={inputClass}
                        {...register(`tickets.${i}.maxPerOrder`)}
                      />
                    </FormField>
                    <div className="flex items-end justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => tickets.remove(i)}
                        disabled={locked}
                        title={locked ? t("ticketLockedHint") : undefined}
                      >
                        <Trash2 aria-hidden />
                        {t("removeTicket")}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {err("tickets") ? <p className="text-sm text-destructive">{err("tickets")}</p> : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="glass rounded-xl"
                disabled={tickets.fields.length >= MAX_TICKET_TYPES}
                onClick={() =>
                  tickets.append({ nameAr: "", nameEn: "", price: "0", quantity: 100, maxPerOrder: 10 })
                }
              >
                <Plus aria-hidden />
                {t("addTicket")}
              </Button>
              <p className="text-sm font-medium" data-testid="total-capacity">
                {t("totalCapacity", { count: totalCapacity })}
              </p>
            </div>
          </div>
        ) : null}

        {stepKey === "preview" ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
            <div className="pointer-events-none">
              <EventCard
                event={{
                  id: currentId ?? "preview",
                  slug: "preview",
                  title: (locale === "ar" ? values.titleAr : values.titleEn) || t("untitled"),
                  coverUrl: publicMediaUrl(values.coverPath),
                  startsAt: kuwaitLocalToIso(values.startsAtLocal ?? "") ?? new Date().toISOString(),
                  venueName: (locale === "ar" ? values.venueNameAr : values.venueNameEn) || "",
                  area: values.governorate || null,
                  category: values.categorySlug ?? "conferences",
                  organizerName,
                  minPriceFils: minPrice,
                  availability: "available",
                }}
              />
            </div>
            <dl className="grid content-start gap-3 text-sm">
              {[
                [t("fields.titleAr"), values.titleAr],
                [t("fields.titleEn"), values.titleEn],
                [t("fields.category"), values.categorySlug ? tCategories(values.categorySlug) : "—"],
                [t("fields.startsAt"), values.startsAtLocal?.replace("T", " ")],
                [t("fields.endsAt"), values.endsAtLocal?.replace("T", " ")],
                [
                  t("fields.governorate"),
                  values.isOnline
                    ? t("fields.isOnline")
                    : values.governorate
                      ? tAreas(values.governorate)
                      : "—",
                ],
                [
                  t("steps.tickets"),
                  (values.tickets ?? [])
                    .map((tk) => {
                      let price = tk?.price ?? "";
                      try {
                        price = formatMoney(parseKwdToFils(String(tk?.price)), locale);
                      } catch {}
                      return `${(locale === "ar" ? tk?.nameAr : tk?.nameEn) || "—"} · ${price} × ${tk?.quantity}`;
                    })
                    .join("، ") || "—",
                ],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[9rem_1fr] gap-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium break-words">{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {stepKey === "submit" ? (
          <div className="grid gap-4">
            <p className="text-muted-foreground">{t("submitIntro")}</p>
            <ul className="grid gap-2" data-testid="readiness">
              {(["eventInPast", "locationRequired", "ticketsRequired"] as const).map((issue) => {
                const ok = readiness !== null && !readiness.includes(issue);
                return (
                  <li
                    key={issue}
                    className={cn(
                      "flex items-center gap-2 text-sm",
                      ok ? "text-success" : "text-muted-foreground",
                    )}
                  >
                    <Check className={cn("size-4", !ok && "opacity-30")} aria-hidden />
                    {t(`ready.${issue}`)}
                    <span className="sr-only">{ok ? t("readyOk") : t("readyMissing")}</span>
                  </li>
                );
              })}
            </ul>
            <Button
              type="button"
              onClick={() => persist(true)}
              disabled={pending || !readiness || readiness.length > 0}
              className="h-12 w-fit rounded-xl bg-gradient-neon px-6 font-bold text-white glow-primary"
            >
              <Send aria-hidden />
              {t("submitForReview")}
            </Button>
          </div>
        ) : null}

        {result && !result.ok ? (
          <FormAlert>
            {t(`saveErrors.${result.error}`)}
            {result.issues?.length ? (
              <ul className="mt-1 list-disc ps-5">
                {result.issues.map((i) => (
                  <li key={i}>{t(`ready.${i}`)}</li>
                ))}
              </ul>
            ) : null}
          </FormAlert>
        ) : null}
      </section>

      {/* التنقل */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={() => goTo(step - 1)} disabled={step === 0}>
          <ArrowRight className="ltr:hidden" aria-hidden />
          <ArrowLeft className="rtl:hidden" aria-hidden />
          {t("back")}
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="glass rounded-xl"
            onClick={() => persist(false)}
            disabled={pending}
          >
            <Save aria-hidden />
            {pending ? t("saving") : t("saveDraft")}
          </Button>
          {step < wizardSteps.length - 1 ? (
            <Button
              type="button"
              className="rounded-xl bg-gradient-neon font-semibold text-white"
              onClick={() => goTo(step + 1)}
            >
              {t("next")}
              <ArrowLeft className="ltr:hidden" aria-hidden />
              <ArrowRight className="rtl:hidden" aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
