import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max, "tooLong");

export const organizerApplicationSchema = z.object({
  nameAr: z.string().trim().min(2, "nameTooShort").max(120, "nameTooLong"),
  nameEn: z.string().trim().min(2, "nameTooShort").max(120, "nameTooLong"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "slugInvalid")
    .max(60, "slugInvalid")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slugInvalid"),
  contactEmail: z.string().trim().toLowerCase().pipe(z.email("emailInvalid")),
  contactPhone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\+?[0-9 ]{6,20}$/.test(v), "phoneInvalid"),
  websiteUrl: z
    .string()
    .trim()
    .max(300, "urlInvalid")
    .refine((v) => v === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), "urlInvalid"),
  commercialRegNo: optionalText(50),
  descriptionAr: optionalText(2000),
  descriptionEn: optionalText(2000),
});

export type OrganizerApplicationInput = z.infer<typeof organizerApplicationSchema>;
