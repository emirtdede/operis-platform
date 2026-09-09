import fs from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";
import { sha256 } from "@/src/lib/crypto";
import { Locale } from "@/src/lib/i18n/config";

export interface LegalDocumentContent {
  key: string;
  locale: Locale;
  version: string;
  content: string;
  hash: string;
}

const SLUG_ALIASES: Record<string, string> = {
  "kullanim-kosullari": "terms",
  "gizlilik-ve-kvkk": "privacy",
  "eslestirme-ve-sorumluluk-reddi": "matching-disclaimer",
  "kabul-edilebilir-kullanim": "acceptable-use",
  "cerez-politikasi": "cookies",
  iletisim: "contact",
};

export class LegalService {
  /**
   * Reads a legal document from source-controlled markdown and computes its SHA-256 hash.
   */
  static getDocument(rawKey: string, locale: Locale, version = "v1"): LegalDocumentContent {
    const key = SLUG_ALIASES[rawKey] ?? rawKey;
    const filePath = path.resolve(process.cwd(), `legal/${key}/${locale}/${version}.md`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Legal document not found: ${rawKey} (${locale}/${version})`);
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const hash = sha256(content);

    return {
      key,
      locale,
      version,
      content,
      hash,
    };
  }

  /**
   * Records user consent to an immutable legal document version.
   */
  static async recordAcceptance(
    userId: string,
    documentKey: string,
    version: string,
    contentHash: string
  ): Promise<void> {
    const db = getDb();
    await db.insert(schema.legalAcceptances).values({
      userId,
      documentKey,
      documentVersion: version,
      contentHash,
      acceptedAt: new Date(),
    });
  }

  /**
   * Verifies if a user has accepted a specific version of a document.
   */
  static async hasAccepted(
    userId: string,
    documentKey: string,
    version: string
  ): Promise<boolean> {
    const db = getDb();
    const rows = await db
      .select({ id: schema.legalAcceptances.id })
      .from(schema.legalAcceptances)
      .where(
        and(
          eq(schema.legalAcceptances.userId, userId),
          eq(schema.legalAcceptances.documentKey, documentKey),
          eq(schema.legalAcceptances.documentVersion, version)
        )
      )
      .limit(1);

    return rows.length > 0;
  }
}
