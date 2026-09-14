// B25: Integration setup ensuring only authorized local test databases are accessed.

const testDbUrl = process.env.TEST_DATABASE_URL;

if (!testDbUrl) {
  const err = new Error(
    "TEST_DB_NOT_ALLOWED: TEST_DATABASE_URL environment variable is not set. Integration tests cannot run."
  );
  (err as unknown as { code: string }).code = "TEST_DB_NOT_ALLOWED";
  throw err;
}

try {
  const parsed = new URL(testDbUrl);
  const host = parsed.hostname;
  const allowedHosts = ["localhost", "127.0.0.1", "postgres"];

  if (!allowedHosts.includes(host)) {
    const err = new Error(
      `TEST_DB_NOT_ALLOWED: Host "${host}" is not permitted for integration testing. Must be one of: ${allowedHosts.join(", ")}`
    );
    (err as unknown as { code: string }).code = "TEST_DB_NOT_ALLOWED";
    throw err;
  }

  const dbName = parsed.pathname.replace(/^\//, "");
  if (!dbName.startsWith("operis_test")) {
    const err = new Error(
      `TEST_DB_NOT_ALLOWED: Database name "${dbName}" must start with "operis_test" to prevent mutation of non-test databases.`
    );
    (err as unknown as { code: string }).code = "TEST_DB_NOT_ALLOWED";
    throw err;
  }
} catch (e: unknown) {
  if (e instanceof Error && (e as { code?: string }).code === "TEST_DB_NOT_ALLOWED") {
    throw e;
  }
  const message = e instanceof Error ? e.message : String(e);
  const err = new Error(`TEST_DB_NOT_ALLOWED: Invalid TEST_DATABASE_URL: ${message}`);
  (err as unknown as { code: string }).code = "TEST_DB_NOT_ALLOWED";
  throw err;
}

// Ensure application code that reads DATABASE_URL uses the verified TEST_DATABASE_URL
process.env.DATABASE_URL = testDbUrl;
process.env.DATABASE_MIGRATION_URL = testDbUrl;

// Set deterministic test-only mock configuration in process.env for getEnv()
(process.env as Record<string, string | undefined>).NODE_ENV = "test";
process.env.APP_URL = process.env.APP_URL || "http://localhost:3000";
process.env.PRODUCT_NAME = process.env.PRODUCT_NAME || "Operis Integration Test";
process.env.AUTH_SECRET =
  process.env.AUTH_SECRET || "test_auth_secret_key_32_bytes_minimum_length_long";
process.env.PII_ENCRYPTION_KEY_CURRENT =
  process.env.PII_ENCRYPTION_KEY_CURRENT ||
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.PII_KEYRING_JSON =
  process.env.PII_KEYRING_JSON ||
  JSON.stringify({
    k1: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    k2: "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
  });
process.env.PII_CURRENT_KEY_ID = process.env.PII_CURRENT_KEY_ID || "k1";
process.env.PII_HMAC_KEY =
  process.env.PII_HMAC_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || "mock";
process.env.EMAIL_FROM = process.env.EMAIL_FROM || "noreply@operis.test";
process.env.SMS_PROVIDER = process.env.SMS_PROVIDER || "mock";

process.env.LEGAL_ENTITY_NAME = process.env.LEGAL_ENTITY_NAME || "Operis Test Entity";
process.env.LEGAL_ENTITY_TYPE = process.env.LEGAL_ENTITY_TYPE || "Test Type";
process.env.LEGAL_ADDRESS = process.env.LEGAL_ADDRESS || "Test Address 123";
process.env.LEGAL_SUPPORT_EMAIL = process.env.LEGAL_SUPPORT_EMAIL || "support@operis.test";
process.env.LEGAL_PRIVACY_EMAIL = process.env.LEGAL_PRIVACY_EMAIL || "privacy@operis.test";
process.env.LEGAL_PHONE = process.env.LEGAL_PHONE || "+902125550000";
process.env.TERMS_EFFECTIVE_DATE = process.env.TERMS_EFFECTIVE_DATE || "2026-01-01";
process.env.PRIVACY_EFFECTIVE_DATE = process.env.PRIVACY_EFFECTIVE_DATE || "2026-01-01";
process.env.LEGAL_ETBIS_CLASSIFICATION_APPROVED =
  process.env.LEGAL_ETBIS_CLASSIFICATION_APPROVED || "true";
process.env.LEGAL_PRIVACY_REVIEW_APPROVED = process.env.LEGAL_PRIVACY_REVIEW_APPROVED || "true";
