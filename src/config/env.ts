import { z } from "zod";

const hexKeySchema = z
  .string()
  .length(64, "Key must be exactly 64 hex characters (32 bytes)")
  .regex(/^[0-9a-fA-F]{64}$/, "Key must be valid 64-character hexadecimal");

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url(),
  PRODUCT_NAME: z.string().min(1).default("Operis"),

  DATABASE_URL: z.string().min(1),
  DATABASE_MIGRATION_URL: z.string().optional(),

  AUTH_SECRET: z.string().min(32, "Auth secret must be at least 32 characters"),
  AUTH_URL: z.string().url().optional(),

  PII_ENCRYPTION_KEY_CURRENT: hexKeySchema,
  PII_ENCRYPTION_KEY_PREVIOUS: hexKeySchema.optional().or(z.literal("")),
  PII_HMAC_KEY: hexKeySchema,

  EMAIL_PROVIDER: z.enum(["mock", "resend", "smtp"]).default("mock"),
  EMAIL_FROM: z.string().email().default("noreply@operis.pro"),
  EMAIL_API_KEY: z.string().optional(),

  SMS_PROVIDER: z.enum(["mock", "twilio", "netgsm"]).default("mock"),
  SMS_API_KEY: z.string().optional(),

  OBSERVABILITY_PII_REDACTION: z
    .string()
    .transform((val) => val === "true" || val === "1")
    .default("true"),

  FEATURE_IDENTITY_VERIFICATION: z
    .string()
    .transform((val) => val === "true")
    .default("false"),
  FEATURE_MARKETING_EMAIL: z
    .string()
    .transform((val) => val === "true")
    .default("false"),
  FEATURE_PUBLIC_OFFER_COUNT: z
    .string()
    .transform((val) => val === "true")
    .default("false"),

  // Legal operator fields
  LEGAL_ENTITY_NAME: z.string().min(1),
  LEGAL_ENTITY_TYPE: z.string().min(1),
  LEGAL_ADDRESS: z.string().min(1),
  LEGAL_SUPPORT_EMAIL: z.string().email(),
  LEGAL_PRIVACY_EMAIL: z.string().email(),
  LEGAL_PHONE: z.string().min(1),
  MERSIS_NO: z.string().optional(),
  TAX_NO: z.string().optional(),
  KEP_ADDRESS: z.string().optional(),
  TERMS_EFFECTIVE_DATE: z.string().min(1),
  PRIVACY_EFFECTIVE_DATE: z.string().min(1),
  LEGAL_ETBIS_CLASSIFICATION_APPROVED: z
    .string()
    .transform((val) => val === "true")
    .refine((val) => process.env.NODE_ENV !== "production" || val === true, {
      message: "LEGAL_ETBIS_CLASSIFICATION_APPROVED must be true before production launch",
    }),
  LEGAL_PRIVACY_REVIEW_APPROVED: z
    .string()
    .transform((val) => val === "true")
    .refine((val) => process.env.NODE_ENV !== "production" || val === true, {
      message: "LEGAL_PRIVACY_REVIEW_APPROVED must be true before production launch",
    }),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env | null = null;

export function getEnv(): Env {
  if (parsedEnv) return parsedEnv;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formattedErrors = result.error.format();
    console.error(
      "Critical: Invalid environment configuration:",
      JSON.stringify(formattedErrors, null, 2)
    );
    throw new Error(
      `Invalid environment configuration: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`
    );
  }

  parsedEnv = result.data;
  return parsedEnv;
}
