import { describe, expect, it, vi } from "vitest";
import { runE2EWorkflow, type E2EWorkflowDependencies } from "@/scripts/lib/e2e-workflow";
import { cleanupStaleEphemeralDatabases } from "@/tests/helpers/test-database";

function fixture(fail?: string) {
  const calls: string[] = [];
  const step = async (name: string) => {
    calls.push(name);
    if (fail === name) throw new Error(name);
  };
  const deps: E2EWorkflowDependencies = {
    provider: async () => {
      await step("provider");
      return { close: () => step("close-provider") };
    },
    database: async () => {
      await step("database");
      return { close: () => step("close-database") };
    },
    configure: () => {
      calls.push("configure");
    },
    seed: () => step("seed"),
    build: () => step("build"),
    test: async () => {
      await step("test");
      return 0;
    },
    report: vi.fn(),
  };
  return { calls, deps };
}

describe("actual E2E orchestration", () => {
  it.each(["provider", "database", "seed", "build", "test", "close-database", "close-provider"])(
    "%s failure never becomes success and releases acquired resources",
    async (stage) => {
      const { deps, calls } = fixture(stage);
      expect(await runE2EWorkflow(deps, new AbortController().signal)).toBe(1);
      if (stage !== "provider") expect(calls).toContain("close-provider");
      if (!["provider", "database"].includes(stage)) expect(calls).toContain("close-database");
      if (["provider", "database", "seed", "build"].includes(stage))
        expect(calls).not.toContain("test");
    }
  );
  it("builds after configuration/seed on every invocation", async () => {
    const { deps, calls } = fixture();
    for (let i = 0; i < 2; i++)
      expect(await runE2EWorkflow(deps, new AbortController().signal)).toBe(0);
    expect(calls).toEqual(
      Array(2)
        .fill([
          "provider",
          "database",
          "configure",
          "seed",
          "build",
          "test",
          "close-database",
          "close-provider",
        ])
        .flat()
    );
  });
  it("propagates nonzero test exit", async () => {
    const { deps } = fixture();
    deps.test = async () => 7;
    expect(await runE2EWorkflow(deps, new AbortController().signal)).toBe(7);
  });
  it("abort during provisioning cleans the resource once it is acquired, never starts seed", async () => {
    const { deps, calls } = fixture();
    const controller = new AbortController();
    const database = deps.database;
    deps.database = async () => {
      controller.abort();
      return database();
    };
    expect(await runE2EWorkflow(deps, controller.signal)).toBe(1);
    expect(calls).toEqual(["provider", "database", "close-database", "close-provider"]);
  });
  it("legacy stale cleanup cannot connect or delete, including force mode", async () => {
    // Unit setup forbids any pg connection: this also proves zero DB access.
    expect(await cleanupStaleEphemeralDatabases({ force: true })).toEqual([]);
  });
});
