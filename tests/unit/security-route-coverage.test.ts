import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { evaluateSecurityAccessAsync } from "@/src/lib/security/rate-limit";

function getAllRouteFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllRouteFiles(fullPath));
    } else if (entry.isFile() && (entry.name === "route.ts" || entry.name === "route.js")) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("B18 Security Route Coverage & Gateway", () => {
  it("ensures no route handler in src/app/api uses synchronous checkRateLimit()", () => {
    const apiDir = path.resolve(process.cwd(), "src/app/api");
    const routeFiles = getAllRouteFiles(apiDir);

    expect(routeFiles.length).toBeGreaterThan(15);

    const violations: { file: string; match: string }[] = [];
    const checkRateLimitRegex = /\bcheckRateLimit\s*\(/;

    for (const file of routeFiles) {
      const content = fs.readFileSync(file, "utf8");
      if (checkRateLimitRegex.test(content)) {
        violations.push({
          file: path.relative(process.cwd(), file),
          match: "calls checkRateLimit(",
        });
      }
    }

    expect(
      violations,
      `Found route handlers still using synchronous in-memory checkRateLimit():\n${JSON.stringify(violations, null, 2)}`
    ).toEqual([]);
  });

  it("evaluateSecurityAccessAsync returns DB_UNAVAILABLE (503) when DB is unreachable without cache", async () => {
    const result = await evaluateSecurityAccessAsync({
      ip: "10.99.88.77",
      purpose: "test:uncached",
      limit: 10,
      windowMs: 60000,
    });

    // In unit test environment, unit.ts stubs DB to throw UNIT_DB_ACCESS_FORBIDDEN
    // evaluateSecurityAccessAsync catches DB errors and returns 503 DB_UNAVAILABLE
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.status).toBe(503);
      expect(result.reason).toBe("DB_UNAVAILABLE");
    }
  });

  it("evaluateSecurityAccessAsync returns IP_BLOCKED (403) when IP is in blocked cache", async () => {
    const { recordBlockedIpInCache } = await import("@/src/lib/security/rate-limit");
    recordBlockedIpInCache("10.99.88.88", 60000);

    const result = await evaluateSecurityAccessAsync({
      ip: "10.99.88.88",
      purpose: "test:blocked",
      limit: 10,
      windowMs: 60000,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.status).toBe(403);
      expect(result.reason).toBe("IP_BLOCKED");
    }
  });
});
