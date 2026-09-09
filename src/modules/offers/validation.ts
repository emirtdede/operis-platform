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
    listingId: z.string().uuid("Invalid listing ID"),
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
    estimatedDurationUnit: z
      .enum(["DAYS", "WEEKS", "MONTHS"])
      .optional()
      .nullable(),
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
    offerId: z.string().uuid("Invalid offer ID"),
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
    estimatedDurationUnit: z
      .enum(["DAYS", "WEEKS", "MONTHS"])
      .optional()
      .nullable(),
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
  offerId: z.string().uuid("Invalid offer ID"),
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
