import { z } from "zod";
import { EMOJI_REGEX } from "@/src/lib/security/content-moderator";

export const RESERVED_HANDLES = new Set([
  "admin",
  "root",
  "api",
  "support",
  "help",
  "legal",
  "privacy",
  "security",
  "moderator",
  "login",
  "register",
  "signup",
  "feed",
  "categories",
  "settings",
  "dashboard",
  "notifications",
  "terms",
  "about",
  "demokullanici",
  "operis",
  "system",
  "null",
  "undefined",
  "void",
  "panel",
  "profil",
  "ilanlar",
  "akis",
  "kategoriler",
  "calisma-alani",
  "iletisim",
  "yardim",
  "marka",
]);

export function calculateAge(dob: Date): number {
  const now = new Date();
  if (dob.getTime() > now.getTime()) {
    return -1;
  }
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age--;
  }
  return age;
}

function createCleanStringSchema(fieldName: string, minLength?: number, maxLength?: number) {
  let s = z.string().trim();
  if (minLength !== undefined) {
    s = s.min(minLength, `${fieldName} must be at least ${minLength} characters`);
  }
  if (maxLength !== undefined) {
    s = s.max(maxLength, `${fieldName} cannot exceed ${maxLength} characters`);
  }
  return s.refine((val) => !EMOJI_REGEX.test(val), {
    message: `${fieldName} cannot contain emojis or pictographic symbols.`,
  });
}

export const baseRegistrationSchema = z.object({
  // Step A: Credentials
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128, "Password must be at most 128 characters"),
  confirmPassword: z.string(),

  // Step B: Private Identity
  legalFirstName: createCleanStringSchema("First name", 2, 50),
  legalLastName: createCleanStringSchema("Last name", 2, 50),
  dateOfBirth: z.string().refine((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) return false;
    return calculateAge(date) >= 18;
  }, "You must be at least 18 years old to register on the platform"),
  countryCode: z.string().length(2, "Country code must be a 2-letter ISO code").toUpperCase(),
  city: createCleanStringSchema("City", 2, 50),
  phone: z
    .string()
    .regex(
      /^\+[1-9]\d{7,14}$/,
      "Phone must be in valid international E.164 format (e.g. +905551234567)"
    ),

  // Step C: Public Identity
  displayName: createCleanStringSchema("Display name", 2, 80),
  handle: z
    .string()
    .min(3, "Handle must be at least 3 characters")
    .max(30, "Handle must be at most 30 characters")
    .regex(
      /^[a-z0-9_-]+$/,
      "Handle may only contain lowercase letters, numbers, underscores and hyphens"
    )
    .refine((val) => !RESERVED_HANDLES.has(val), "This username is reserved by the platform"),
  about: z
    .string()
    .max(1000, "About section cannot exceed 1000 characters")
    .refine((val) => !EMOJI_REGEX.test(val), {
      message: "About section cannot contain emojis or pictographic symbols.",
    })
    .optional()
    .or(z.literal("")),
  focusCategoryKeys: z
    .array(z.string())
    .min(1, "Select at least 1 focus category to initialize your feed")
    .max(10, "You can select up to 10 focus categories"),
  locale: z.enum(["tr", "en"]).optional().default("tr"),

  // Step E: Required Legal Consents
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms of Use" }),
  }),
  privacyAcknowledged: z.literal(true, {
    errorMap: () => ({ message: "You must acknowledge the KVKK Privacy Notice" }),
  }),
  matchingAcknowledged: z.literal(true, {
    errorMap: () => ({ message: "You must acknowledge the Marketplace and Matching Disclaimer" }),
  }),
  ageConfirmed: z.literal(true, {
    errorMap: () => ({ message: "You must confirm that you are at least 18 years old" }),
  }),
});

export const registrationSchema = baseRegistrationSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  }
);

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
  totpCode: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
