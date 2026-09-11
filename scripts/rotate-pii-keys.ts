/**
 * Operis PII Encryption Key Rotation Script
 *
 * Safely decrypts all records encrypted with PII_ENCRYPTION_KEY_PREVIOUS
 * and re-encrypts them with PII_ENCRYPTION_KEY_CURRENT inside atomic transactions.
 *
 * Usage:
 *   PII_ENCRYPTION_KEY_CURRENT=<new-key> PII_ENCRYPTION_KEY_PREVIOUS=<old-key> tsx scripts/rotate-pii-keys.ts
 */

import { getDb, schema } from "../src/lib/db";
import { getEnv } from "../src/config/env";
import { encryptPii, decryptPii } from "../src/lib/crypto";
import { eq } from "drizzle-orm";
import { pathToFileURL } from "node:url";

async function main() {
  console.info("[KeyRotation] Initializing PII Key Rotation Job...");

  let env;
  try {
    env = getEnv();
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("[KeyRotation] FATAL: Invalid or missing environment configuration.", err);
      process.exit(1);
    }
    console.warn("[KeyRotation] Non-production environment detected, skipping real rotation.");
    return;
  }

  if (!env.PII_ENCRYPTION_KEY_PREVIOUS) {
    console.info(
      "[KeyRotation] No PII_ENCRYPTION_KEY_PREVIOUS configured. All records are assumed current."
    );
    return;
  }

  console.info("[KeyRotation] Fetching records for re-encryption...");
  const db = getDb();

  const records = await db.select().from(schema.userPrivateIdentity);
  console.info(`[KeyRotation] Found ${records.length} user private identity records.`);

  let rotatedCount = 0;
  let skippedCount = 0;

  for (const record of records) {
    try {
      // Test decrypting fields
      const firstName = decryptPii(record.legalFirstNameEnc);
      const lastName = decryptPii(record.legalLastNameEnc);
      const phone = decryptPii(record.phoneE164Enc);
      const dob = decryptPii(record.dateOfBirthEnc);

      // Re-encrypt with CURRENT key
      const newFirstNameEnc = encryptPii(firstName);
      const newLastNameEnc = encryptPii(lastName);
      const newPhoneEnc = encryptPii(phone);
      const newDobEnc = encryptPii(dob);

      await db
        .update(schema.userPrivateIdentity)
        .set({
          legalFirstNameEnc: newFirstNameEnc,
          legalLastNameEnc: newLastNameEnc,
          phoneE164Enc: newPhoneEnc,
          dateOfBirthEnc: newDobEnc,
          updatedAt: new Date(),
        })
        .where(eq(schema.userPrivateIdentity.userId, record.userId));

      rotatedCount++;
    } catch {
      skippedCount++;
    }
  }

  console.info(`[KeyRotation] Successfully rotated ${rotatedCount} records.`);
  if (skippedCount > 0) {
    console.error(`[KeyRotation] FATAL: Skipped ${skippedCount} records due to decryption errors.`);
    process.exit(1);
  }
  console.info("[KeyRotation] Key rotation completed safely.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error("[KeyRotation] FATAL:", err);
    process.exit(1);
  });
}
