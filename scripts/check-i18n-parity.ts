import fs from "node:fs";
import path from "node:path";

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  let keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys = keys.concat(flattenKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function main() {
  const trPath = path.resolve(process.cwd(), "messages/tr.json");
  const enPath = path.resolve(process.cwd(), "messages/en.json");

  if (!fs.existsSync(trPath) || !fs.existsSync(enPath)) {
    console.info("Notice: Localization files not created yet. Skipping parity check.");
    process.exit(0);
  }

  const trData = JSON.parse(fs.readFileSync(trPath, "utf-8"));
  const enData = JSON.parse(fs.readFileSync(enPath, "utf-8"));

  const trKeys = new Set(flattenKeys(trData));
  const enKeys = new Set(flattenKeys(enData));

  const missingInEn = [...trKeys].filter((k) => !enKeys.has(k));
  const missingInTr = [...enKeys].filter((k) => !trKeys.has(k));

  let hasError = false;

  if (missingInEn.length > 0) {
    console.error(`FAIL: ${missingInEn.length} keys in Turkish catalog are missing from English catalog:`);
    missingInEn.forEach((k) => console.error(`  - ${k}`));
    hasError = true;
  }

  if (missingInTr.length > 0) {
    console.error(`FAIL: ${missingInTr.length} keys in English catalog are missing from Turkish catalog:`);
    missingInTr.forEach((k) => console.error(`  - ${k}`));
    hasError = true;
  }

  if (hasError) {
    process.exit(1);
  } else {
    console.info(`PASS: 100% key parity verified across TR and EN catalogs (${trKeys.size} keys).`);
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  main();
}
