/**
 * مخطط نموذج الفعالية — مشترك بين المتصفح (React Hook Form) والخادم (Server Actions).
 * رسائل الخطأ مفاتيح ترجمة (EventForm.errors.*).
 *
 * مستويان من التحقق:
 *  - eventDraftSchema: يكفي لحفظ مسودة (العنوانان والتصنيف والتواريخ بشكل صحيح).
 *  - checkReadyForReview: شروط الإرسال للمراجعة (مكان، تذاكر، تاريخ مستقبلي…) — نفس شروط قاعدة البيانات.
 */
import { z } from "zod";

import { areas, categorySlugs } from "@/config/site";
import { kuwaitLocalToIso } from "@/lib/kuwait-time";
import { parseKwdToFils } from "@/lib/money";

export const MAX_GALLERY_IMAGES = 8;
export const MAX_TICKET_TYPES = 10;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

const optionalText = (max: number) => z.string().trim().max(max, "tooLong");

/** مسار في حاوية event-media يخص الجهة نفسها: {organizerId}/events/{uuid}.{ext} */
export const mediaPathRegex = /^[0-9a-f-]{36}\/events\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|avif)$/;

const kwd = z
  .string()
  .trim()
  .refine((v) => {
    try {
      const fils = parseKwdToFils(v);
      return fils <= 100_000_000;
    } catch {
      return false;
    }
  }, "priceInvalid");

export const ticketTypeInputSchema = z
  .object({
    id: z.uuid().optional(),
    nameAr: z.string().trim().min(1, "required").max(100, "tooLong"),
    nameEn: z.string().trim().min(1, "required").max(100, "tooLong"),
    price: kwd,
    quantity: z.coerce
      .number<string | number>()
      .int("quantityInvalid")
      .min(1, "quantityInvalid")
      .max(1_000_000, "quantityInvalid"),
    maxPerOrder: z.coerce
      .number<string | number>()
      .int("maxPerOrderInvalid")
      .min(1, "maxPerOrderInvalid")
      .max(50, "maxPerOrderInvalid"),
  })
  .refine((t) => t.maxPerOrder <= t.quantity, { path: ["maxPerOrder"], message: "maxPerOrderAboveQuantity" });

const coordinate = (min: number, max: number) =>
  z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (/^-?\d{1,3}(\.\d{1,6})?$/.test(v) && Number(v) >= min && Number(v) <= max),
      "coordinateInvalid",
    );

export const eventFormSchema = z
  .object({
    organizerId: z.uuid(),
    categorySlug: z.enum(categorySlugs, "required"),
    titleAr: z.string().trim().min(3, "titleTooShort").max(150, "tooLong"),
    titleEn: z.string().trim().min(3, "titleTooShort").max(150, "tooLong"),
    summaryAr: optionalText(300),
    summaryEn: optionalText(300),
    descriptionAr: optionalText(20_000),
    descriptionEn: optionalText(20_000),
    coverPath: z.string().regex(mediaPathRegex).nullable(),
    gallery: z.array(z.string().regex(mediaPathRegex)).max(MAX_GALLERY_IMAGES, "tooManyImages"),
    startsAtLocal: z.string().refine((v) => kuwaitLocalToIso(v) !== null, "dateInvalid"),
    endsAtLocal: z.string().refine((v) => kuwaitLocalToIso(v) !== null, "dateInvalid"),
    isOnline: z.boolean(),
    venueNameAr: optionalText(150),
    venueNameEn: optionalText(150),
    addressAr: optionalText(300),
    addressEn: optionalText(300),
    governorate: z.union([z.enum(areas), z.literal("")]),
    area: optionalText(80),
    latitude: coordinate(-90, 90),
    longitude: coordinate(-180, 180),
    tickets: z.array(ticketTypeInputSchema).max(MAX_TICKET_TYPES, "tooManyTickets"),
  })
  .superRefine((v, ctx) => {
    const start = kuwaitLocalToIso(v.startsAtLocal);
    const end = kuwaitLocalToIso(v.endsAtLocal);
    if (start && end && end <= start) {
      ctx.addIssue({ code: "custom", path: ["endsAtLocal"], message: "endBeforeStart" });
    }
    if ((v.latitude === "") !== (v.longitude === "")) {
      ctx.addIssue({ code: "custom", path: ["longitude"], message: "coordinatesPair" });
    }
  });

export type EventFormInput = z.input<typeof eventFormSchema>;
export type EventFormValues = z.output<typeof eventFormSchema>;

/** شروط الإرسال للمراجعة (مرآة لما تفرضه submit_event_for_review في قاعدة البيانات) */
export type ReviewIssue = "eventInPast" | "locationRequired" | "ticketsRequired";

export function checkReadyForReview(v: EventFormValues, now = new Date()): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const start = kuwaitLocalToIso(v.startsAtLocal);
  if (!start || new Date(start) <= now) issues.push("eventInPast");
  if (!v.isOnline && v.governorate === "") issues.push("locationRequired");
  if (v.tickets.length === 0) issues.push("ticketsRequired");
  return issues;
}

/** الحقول التي يتحقق منها كل خطوة في المعالج (للتنقل بين الخطوات) */
export const wizardSteps = [
  {
    key: "info",
    fields: [
      "categorySlug",
      "titleAr",
      "titleEn",
      "summaryAr",
      "summaryEn",
      "descriptionAr",
      "descriptionEn",
    ],
  },
  { key: "images", fields: ["coverPath", "gallery"] },
  { key: "schedule", fields: ["startsAtLocal", "endsAtLocal"] },
  {
    key: "location",
    fields: [
      "isOnline",
      "venueNameAr",
      "venueNameEn",
      "addressAr",
      "addressEn",
      "governorate",
      "area",
      "latitude",
      "longitude",
    ],
  },
  { key: "tickets", fields: ["tickets"] },
  { key: "preview", fields: [] },
  { key: "submit", fields: [] },
] as const satisfies ReadonlyArray<{ key: string; fields: ReadonlyArray<keyof EventFormInput> }>;

/** رابط مختصر من العنوان الإنجليزي + لاحقة عشوائية (فريد ومطابق لقيد slug) */
export function slugFromTitle(title: string, suffix: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return base.length >= 3 ? `${base}-${suffix}` : `event-${suffix}`;
}
