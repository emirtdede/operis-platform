import fs from "node:fs";
import path from "node:path";
import { EMOJI_REGEX, containsEmoji } from "../src/lib/security/content-moderator";

export { EMOJI_REGEX, containsEmoji };

function scanDirectory(dir: string, errors: string[]) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      if (
        file.name === "node_modules" ||
        file.name === ".next" ||
        file.name === "dist" ||
        file.name === ".git"
      ) {
        continue;
      }
      scanDirectory(fullPath, errors);
    } else if (file.name.endsWith(".json") || file.name.endsWith(".md")) {
      // Don't scan master spec or test fixture files that explicitly test emoji detection
      if (file.name === "FREELANCE_PLATFORM_MASTER_SPEC.md" || fullPath.includes("tests")) {
        continue;
      }

      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        if (containsEmoji(line)) {
          errors.push(`${fullPath}:${index + 1}: Found prohibited emoji in text: "${line.trim()}"`);
        }
      });
    }
  }
}

function main() {
  const errors: string[] = [];
  const targetDirs = [
    path.resolve(process.cwd(), "messages"),
    path.resolve(process.cwd(), "legal"),
    path.resolve(process.cwd(), "db/seeds"),
  ];

  for (const dir of targetDirs) {
    scanDirectory(dir, errors);
  }

  if (errors.length > 0) {
    console.error("FAIL: Prohibited emojis detected:");
    errors.forEach((err) => console.error(`  ${err}`));
    process.exit(1);
  } else {
    console.info(
      "PASS: No prohibited emojis found in localized messages, legal documents, or seed data."
    );
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  main();
}
