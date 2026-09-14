import pg from "pg";

// B25: Strictly isolate unit tests from any real database connections
const forbiddenError = () => {
  const err = new Error(
    "UNIT_DB_ACCESS_FORBIDDEN: Unit tests are strictly forbidden from connecting to a database."
  );
  (err as unknown as { code: string }).code = "UNIT_DB_ACCESS_FORBIDDEN";
  return Promise.reject(err);
};

// Stub pg.Pool and pg.Client connection paths
pg.Pool.prototype.connect = forbiddenError as unknown as typeof pg.Pool.prototype.connect;
pg.Pool.prototype.query = forbiddenError as unknown as typeof pg.Pool.prototype.query;
pg.Client.prototype.connect = forbiddenError as unknown as typeof pg.Client.prototype.connect;
pg.Client.prototype.query = forbiddenError as unknown as typeof pg.Client.prototype.query;

// Set deterministic test-only mock configuration in process.env (no real secrets loaded)
(process.env as Record<string, string | undefined>).NODE_ENV = "test";
process.env.APP_URL = "http://localhost:3000";
process.env.PRODUCT_NAME = "Operis Unit Test";
process.env.DATABASE_URL = "postgres://forbidden:5432/unit_forbidden";
process.env.AUTH_SECRET = "test_auth_secret_key_32_bytes_minimum_length_long";
process.env.PII_ENCRYPTION_KEY_CURRENT =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.PII_HMAC_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.EMAIL_PROVIDER = "mock";
process.env.EMAIL_FROM = "noreply@operis.test";
process.env.SMS_PROVIDER = "mock";

// Legal operator test fixtures
process.env.LEGAL_ENTITY_NAME = "Operis Test Entity";
process.env.LEGAL_ENTITY_TYPE = "Test Type";
process.env.LEGAL_ADDRESS = "Test Address 123";
process.env.LEGAL_SUPPORT_EMAIL = "support@operis.test";
process.env.LEGAL_PRIVACY_EMAIL = "privacy@operis.test";
process.env.LEGAL_PHONE = "+902125550000";
process.env.TERMS_EFFECTIVE_DATE = "2026-01-01";
process.env.PRIVACY_EFFECTIVE_DATE = "2026-01-01";
process.env.LEGAL_ETBIS_CLASSIFICATION_APPROVED = "true";
process.env.LEGAL_PRIVACY_REVIEW_APPROVED = "true";
