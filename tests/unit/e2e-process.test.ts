import { expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runNodeStage } from "@/scripts/lib/e2e-process";

it("preserves a real child failure exit code", async () => {
  expect(
    await runNodeStage(["-e", "process.exit(7)"], new AbortController().signal, process.env)
  ).toBe(7);
});

it("abort stops the child and its grandchild before returning", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "operis-process-test-"));
  const pidFile = path.join(directory, "pid");
  const controller = new AbortController();
  const code = `const {spawn}=require('node:child_process');const fs=require('node:fs');const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});fs.writeFileSync(process.argv[1],String(c.pid));setInterval(()=>{},1000);`;
  const running = runNodeStage(["-e", code, pidFile], controller.signal, process.env);
  try {
    const deadline = Date.now() + 5000;
    while (!(await fs.stat(pidFile).catch(() => null))) {
      if (Date.now() > deadline) throw new Error("Child did not initialize");
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const grandchildPid = Number(await fs.readFile(pidFile, "utf8"));
    controller.abort();
    expect(await running).toBe(1);
    expect(() => process.kill(grandchildPid, 0)).toThrow();
  } finally {
    controller.abort();
    await running;
    await fs.unlink(pidFile).catch(() => {});
    await fs.rmdir(directory);
  }
}, 10000);
