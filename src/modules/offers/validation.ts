import { z } from "zod";
import { validateContentAppropriateness } from "@/src/lib/security/content-moderator";

const EMOJI_REGEX =
  /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

export const REJECTION_CODES = [
  "BUDGET_MISMATCH",
  "TIMELINE_MISMATCH",
  "SCOPE_MISMATCH",
  "EXPERIENCE_MISMATCH",
  "OTHER",
] as const;

export type RejectionCode = (typeof REJECTION_CODES)[number];

export const submitOfferSchema = z
  .object({
    listingId: z.string().min(1, "Invalid listing ID"),
    message: z
      .string()
      .trim()
      .min(50, "Offer message must be at least 50 characters")
      .max(3000, "Offer message cannot exceed 3000 characters")
      .refine((val) => !EMOJI_REGEX.test(val), {
        message: "Emojis are strictly prohibited",
      })
      .refine((val) => validateContentAppropriateness(val).isValid, {
        message:
          "Mesajınız topluluk kurallarımıza aykırı uygunsuz ifadeler (küfür, hakaret veya saldırgan dil) içerdiği için engellendi.",
      }),
    budgetCurrency: z.enum(["TRY", "USD", "EUR", "GBP"]).optional().nullable(),
    budgetMin: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Invalid budget format")
      .optional()
      .nullable(),
    budgetMax: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Invalid budget format")
      .optional()
      .nullable(),
    estimatedDurationValue: z.number().int().positive().optional().nullable(),
    estimatedDurationUnit: z.enum(["DAYS", "WEEKS", "MONTHS"]).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.budgetMin && data.budgetMax) {
        return parseFloat(data.budgetMin) <= parseFloat(data.budgetMax);
      }
      return true;
    },
    {
      message: "Minimum budget cannot exceed maximum budget",
      path: ["budgetMax"],
    }
  );

export type SubmitOfferInput = z.infer<typeof submitOfferSchema>;

export const updateOfferSchema = z
  .object({
    offerId: z.string().min(1, "Invalid offer ID"),
    message: z
      .string()
      .trim()
      .min(50, "Offer message must be at least 50 characters")
      .max(3000, "Offer message cannot exceed 3000 characters")
      .refine((val) => !EMOJI_REGEX.test(val), {
        message: "Emojis are strictly prohibited",
      })
      .refine((val) => validateContentAppropriateness(val).isValid, {
        message:
          "Mesajınız topluluk kurallarımıza aykırı uygunsuz ifadeler (küfür, hakaret veya saldırgan dil) içerdiği için engellendi.",
      }),
    budgetCurrency: z.enum(["TRY", "USD", "EUR", "GBP"]).optional().nullable(),
    budgetMin: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Invalid budget format")
      .optional()
      .nullable(),
    budgetMax: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Invalid budget format")
      .optional()
      .nullable(),
    estimatedDurationValue: z.number().int().positive().optional().nullable(),
    estimatedDurationUnit: z.enum(["DAYS", "WEEKS", "MONTHS"]).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.budgetMin && data.budgetMax) {
        return parseFloat(data.budgetMin) <= parseFloat(data.budgetMax);
      }
      return true;
    },
    {
      message: "Minimum budget cannot exceed maximum budget",
      path: ["budgetMax"],
    }
  );

export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;

export const rejectOfferSchema = z.object({
  offerId: z.string().min(1, "Invalid offer ID"),
  rejectionCode: z.enum(REJECTION_CODES).optional().nullable(),
  rejectionNote: z
    .string()
    .max(500, "Rejection note cannot exceed 500 characters")
    .refine((val) => !EMOJI_REGEX.test(val), {
      message: "Emojis are strictly prohibited",
    })
    .optional()
    .nullable(),
});

export type RejectOfferInput = z.infer<typeof rejectOfferSchema>;

// Batch Offer Item Schema (Individual Proposal inside Batch)
export const batchOfferItemSchema = z
  .object({
    listingId: z.string().min(1, "Invalid listing ID"),
    message: z
      .string()
      .min(50, "Offer message must be at least 50 characters")
      .max(3000, "Offer message cannot exceed 3000 characters")
      .refine((val) => !EMOJI_REGEX.test(val), {
        message: "Emojis are strictly prohibited",
      })
      .refine((val) => validateContentAppropriateness(val).isValid, {
        message:
          "Mesajınız topluluk kurallarımıza aykırı uygunsuz ifadeler (küfür, hakaret veya saldırgan dil) içerdiği için engellendi.",
      }),
    budgetCurrency: z.enum(["TRY", "USD", "EUR", "GBP"]).optional().nullable(),
    budgetMin: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Invalid budget format")
      .optional()
      .nullable(),
    budgetMax: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Invalid budget format")
      .optional()
      .nullable(),
    estimatedDurationValue: z.number().int().positive().optional().nullable(),
    estimatedDurationUnit: z.enum(["DAYS", "WEEKS", "MONTHS"]).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.budgetMin && data.budgetMax) {
        return parseFloat(data.budgetMin) <= parseFloat(data.budgetMax);
      }
      return true;
    },
    {
      message: "Minimum budget cannot exceed maximum budget",
      path: ["budgetMax"],
    }
  );

export type BatchOfferItemInput = z.infer<typeof batchOfferItemSchema>;

// Batch Offer Schema (Max 5 proposals per request as anti-spam safeguard)
export const batchSubmitOffersSchema = z.object({
  items: z
    .array(batchOfferItemSchema)
    .min(1, "En az 1 ilan seçilmelidir")
    .max(5, "Tek bir toplu işlemde en fazla 5 ilana teklif verilebilir"),
  idempotencyKey: z.string().max(100).optional(),
  capacityConfirmed: z.boolean().optional(),
});

export type BatchSubmitOffersInput = z.infer<typeof batchSubmitOffersSchema>;

// Quick Offer Template Schema
export const offerTemplateSchema = z
  .object({
    id: z.string().optional(),
    name: z
      .string()
      .trim()
      .min(2, "Şablon adı en az 2 karakter olmalıdır")
      .max(50, "Şablon adı en fazla 50 karakter olabilir")
      .refine((val) => !EMOJI_REGEX.test(val), {
        message: "Emojis are strictly prohibited",
      }),
    message: z
      .string()
      .trim()
      .min(50, "Şablon mesajı en az 50 karakter olmalıdır")
      .max(3000, "Şablon mesajı 3000 karakteri geçemez")
      .refine((val) => !EMOJI_REGEX.test(val), {
        message: "Emojis are strictly prohibited",
      })
      .refine((val) => validateContentAppropriateness(val).isValid, {
        message:
          "Şablon içeriği uygunsuz ifadeler (küfür veya saldırgan dil) içerdiği için engellendi.",
      }),
    budgetCurrency: z.enum(["TRY", "USD", "EUR", "GBP"]).optional().nullable(),
    budgetMin: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Invalid budget format")
      .optional()
      .nullable(),
    budgetMax: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Invalid budget format")
      .optional()
      .nullable(),
    estimatedDurationValue: z.number().int().positive().optional().nullable(),
    estimatedDurationUnit: z.enum(["DAYS", "WEEKS", "MONTHS"]).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.budgetMin && data.budgetMax) {
        return parseFloat(data.budgetMin) <= parseFloat(data.budgetMax);
      }
      return true;
    },
    {
      message: "Minimum budget cannot exceed maximum budget",
      path: ["budgetMax"],
    }
  );

export type OfferTemplateInput = z.infer<typeof offerTemplateSchema>;
