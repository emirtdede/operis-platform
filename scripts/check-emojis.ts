import fs from "node:fs";
import path from "node:path";

// Unicode Extended Pictographic pattern according to Unicode Standard Annex #51
export const EMOJI_REGEX =
  /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

export function containsEmoji(text: string): boolean {
  return EMOJI_REGEX.test(text);
}

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
      if (
        file.name === "FREELANCE_PLATFORM_MASTER_SPEC.md" ||
        fullPath.includes("tests")
      ) {
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
    console.info("PASS: No prohibited emojis found in localized messages, legal documents, or seed data.");
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  main();
}
