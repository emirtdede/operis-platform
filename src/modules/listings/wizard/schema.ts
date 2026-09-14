import { z } from "zod";
import { EMOJI_REGEX, validateContentAppropriateness } from "@/src/lib/security/content-moderator";

export const BUDGET_MODES = [
  "FIXED_EXACT",
  "FIXED_RANGE",
  "HOURLY_EXACT",
  "HOURLY_RANGE",
  "NEGOTIABLE",
  "REQUEST_GUIDANCE",
] as const;

export type BudgetMode = (typeof BUDGET_MODES)[number];

export const TIMELINE_MODES = ["SPECIFIC_DATE", "DURATION_ESTIMATE", "FLEXIBLE"] as const;

export type TimelineMode = (typeof TIMELINE_MODES)[number];

export const TIMELINE_UNITS = ["DAYS", "WEEKS", "MONTHS"] as const;
export type TimelineUnit = (typeof TIMELINE_UNITS)[number];

export const PROJECT_TYPES = [
  "new_build",
  "improvement",
  "bug_fix",
  "migration",
  "integration",
  "consulting",
  "audit",
  "maintenance",
] as const;

export const PROJECT_STAGES = [
  "idea",
  "requirements_ready",
  "design_ready",
  "existing_code",
  "production_system",
] as const;

export const WORK_PREFERENCES = ["REMOTE", "ONSITE", "HYBRID"] as const;

function validateNoCapsSpam(text: string): boolean {
  if (text.length < 15) return true;
  const upperCount = (text.match(/[A-ZĞÜŞİÖÇ]/g) || []).length;
  return upperCount / text.length < 0.7; // Max 70% uppercase
}

export const listingWizardSchema = z
  .object({
    // Step 1: Category & Tags
    categoryId: z.string().uuid("Please select a valid category"),
    tags: z
      .array(
        z
          .string()
          .max(32, "Tag cannot exceed 32 characters")
          .trim()
          .refine((val) => !EMOJI_REGEX.test(val), "Tag cannot contain emojis")
      )
      .max(8, "You can select at most 8 technology tags")
      .default([]),

    // Step 2: Core Outcomes
    title: z
      .string()
      .trim()
      .min(20, "Title must be at least 20 characters")
      .max(120, "Title cannot exceed 120 characters")
      .refine((val) => !EMOJI_REGEX.test(val), "Title cannot contain emojis")
      .refine(validateNoCapsSpam, "Title cannot be all uppercase letters")
      .refine(
        (val) => validateContentAppropriateness(val).isValid,
        "Başlık topluluk kurallarına aykırı veya uygunsuz ifadeler içeremez"
      ),
    summary: z
      .string()
      .trim()
      .min(80, "Summary must be at least 80 characters")
      .max(280, "Summary cannot exceed 280 characters")
      .refine((val) => !EMOJI_REGEX.test(val), "Summary cannot contain emojis")
      .refine(
        (val) => validateContentAppropriateness(val).isValid,
        "Özet topluluk kurallarına aykırı veya uygunsuz ifadeler içeremez"
      ),
    scope: z
      .string()
      .trim()
      .min(200, "Scope must be at least 200 characters to provide sufficient project detail")
      .max(6000, "Scope cannot exceed 6000 characters")
      .refine((val) => !EMOJI_REGEX.test(val), "Scope cannot contain emojis")
      .refine(
        (val) => validateContentAppropriateness(val).isValid,
        "Kapsam metni topluluk kurallarına aykırı veya uygunsuz ifadeler içeremez"
      ),

    // Step 3: Context
    projectType: z.enum(PROJECT_TYPES),
    projectStage: z.enum(PROJECT_STAGES),
    answers: z.record(z.unknown()).default({}),

    // Step 6: Timeline
    timelineMode: z.enum(TIMELINE_MODES),
    targetDate: z.string().optional().nullable(),
    timelineValue: z.number().int().positive().optional().nullable(),
    timelineUnit: z.enum(TIMELINE_UNITS).optional().nullable(),

    // Step 7: Budget
    budgetMode: z.enum(BUDGET_MODES),
    budgetCurrency: z.string().length(3).default("TRY"),
    budgetMin: z.number().positive().optional().nullable(),
    budgetMax: z.number().positive().optional().nullable(),

    // Step 8: Working Preferences
    workPreference: z.enum(WORK_PREFERENCES).default("REMOTE"),
    preferredLanguage: z.enum(["tr", "en", "any"]).default("any"),

    // Step 9: Required Review Confirmations
    noSecretsConfirmed: z.literal(true, {
      errorMap: () => ({
        message: "You must confirm the listing contains no confidential secrets or contact info",
      }),
    }),
    acceptableUseConfirmed: z.literal(true, {
      errorMap: () => ({ message: "You must confirm compliance with the Acceptable Use Policy" }),
    }),
    expiryAcknowledged: z.literal(true, {
      errorMap: () => ({ message: "You must acknowledge the 7-day publication expiration rule" }),
    }),
    matchingRoleAcknowledged: z.literal(true, {
      errorMap: () => ({ message: "You must acknowledge the platform matching-only role" }),
    }),
  })
  .refine(
    (data) => {
      if (data.budgetMode === "FIXED_RANGE" || data.budgetMode === "HOURLY_RANGE") {
        if (!data.budgetMin || !data.budgetMax) return false;
        return data.budgetMin <= data.budgetMax;
      }
      if (data.budgetMode === "FIXED_EXACT" || data.budgetMode === "HOURLY_EXACT") {
        return !!data.budgetMin;
      }
      return true;
    },
    {
      message:
        "Please specify a valid budget amount or range where minimum is less than or equal to maximum",
      path: ["budgetMin"],
    }
  )
  .refine(
    (data) => {
      if (data.timelineMode === "SPECIFIC_DATE") {
        if (!data.targetDate) return false;
        const selected = new Date(data.targetDate).getTime();
        return selected > Date.now();
      }
      if (data.timelineMode === "DURATION_ESTIMATE") {
        return !!data.timelineValue && !!data.timelineUnit;
      }
      return true;
    },
    {
      message: "Please specify a valid future target date or duration estimate",
      path: ["targetDate"],
    }
  );

export type ListingWizardInput = z.infer<typeof listingWizardSchema>;

export const updateListingInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(20, "Title must be at least 20 characters")
      .max(120, "Title cannot exceed 120 characters")
      .refine((val) => !EMOJI_REGEX.test(val), "Title cannot contain emojis")
      .refine(validateNoCapsSpam, "Title cannot be all uppercase letters")
      .refine(
        (val) => validateContentAppropriateness(val).isValid,
        "Başlık topluluk kurallarına aykırı veya uygunsuz ifadeler içeremez"
      )
      .optional(),
    summary: z
      .string()
      .trim()
      .min(80, "Summary must be at least 80 characters")
      .max(280, "Summary cannot exceed 280 characters")
      .refine((val) => !EMOJI_REGEX.test(val), "Summary cannot contain emojis")
      .refine(
        (val) => validateContentAppropriateness(val).isValid,
        "Özet topluluk kurallarına aykırı veya uygunsuz ifadeler içeremez"
      )
      .optional(),
    scope: z
      .string()
      .trim()
      .min(200, "Scope must be at least 200 characters to provide sufficient project detail")
      .max(6000, "Scope cannot exceed 6000 characters")
      .refine((val) => !EMOJI_REGEX.test(val), "Scope cannot contain emojis")
      .refine(
        (val) => validateContentAppropriateness(val).isValid,
        "Kapsam metni topluluk kurallarına aykırı veya uygunsuz ifadeler içeremez"
      )
      .optional(),
    tags: z
      .array(
        z
          .string()
          .max(32, "Tag cannot exceed 32 characters")
          .trim()
          .refine((val) => !EMOJI_REGEX.test(val), "Tag cannot contain emojis")
      )
      .max(8, "You can select at most 8 technology tags")
      .optional(),
    budgetMin: z
      .union([z.string(), z.number()])
      .optional()
      .nullable()
      .refine(
        (val) => {
          if (val === undefined || val === null || val === "") return true;
          if (typeof val === "number") return !isNaN(val) && isFinite(val) && val > 0;
          if (typeof val === "string") {
            const trimmed = val.trim();
            if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return false;
            const num = Number(trimmed);
            return !isNaN(num) && isFinite(num) && num > 0;
          }
          return false;
        },
        { message: "Minimum budget must be a positive valid number" }
      ),
    budgetMax: z
      .union([z.string(), z.number()])
      .optional()
      .nullable()
      .refine(
        (val) => {
          if (val === undefined || val === null || val === "") return true;
          if (typeof val === "number") return !isNaN(val) && isFinite(val) && val > 0;
          if (typeof val === "string") {
            const trimmed = val.trim();
            if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return false;
            const num = Number(trimmed);
            return !isNaN(num) && isFinite(num) && num > 0;
          }
          return false;
        },
        { message: "Maximum budget must be a positive valid number" }
      ),
    budgetMode: z.enum(BUDGET_MODES).optional(),
  })
  .refine(
    (data) => {
      if (
        data.budgetMin !== undefined &&
        data.budgetMin !== null &&
        data.budgetMin !== "" &&
        data.budgetMax !== undefined &&
        data.budgetMax !== null &&
        data.budgetMax !== ""
      ) {
        const min =
          typeof data.budgetMin === "string" ? parseFloat(data.budgetMin) : Number(data.budgetMin);
        const max =
          typeof data.budgetMax === "string" ? parseFloat(data.budgetMax) : Number(data.budgetMax);
        if (!isNaN(min) && !isNaN(max) && min > max) {
          return false;
        }
      }
      return true;
    },
    {
      message: "Minimum budget cannot exceed maximum budget",
      path: ["budgetMin"],
    }
  )
  .refine(
    (data) => {
      if (data.budgetMode === "FIXED_RANGE" || data.budgetMode === "HOURLY_RANGE") {
        if (data.budgetMin === null || data.budgetMax === null) {
          return false;
        }
      }
      if (data.budgetMode === "FIXED_EXACT" || data.budgetMode === "HOURLY_EXACT") {
        if (data.budgetMin === null && data.budgetMax === null) {
          return false;
        }
      }
      return true;
    },
    {
      message: "Budget amounts cannot be null for exact or range budget modes",
      path: ["budgetMode"],
    }
  );

export type UpdateListingInput = z.infer<typeof updateListingInputSchema>;
