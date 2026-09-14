import { spawn } from "node:child_process";

export async function runExportCapacityWorker(
  connectionString: string,
  jobId: string
): Promise<{
  result: string;
  baseline: number;
  peak: number;
  delta: number;
}> {
  return await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "tests/helpers/export-capacity-worker.ts", jobId],
      {
        env: {
          ...process.env,
          TEST_DATABASE_URL: connectionString,
          DATABASE_URL: connectionString,
        },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => child.kill(), 180000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk).slice(-4000);
    });
    child.once("error", (e) => {
      clearTimeout(timeout);
      reject(e);
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) return reject(new Error(`Capacity worker failed (${code}): ${stderr}`));
      try {
        resolve(JSON.parse(stdout.trim().split("\n").at(-1)!));
      } catch (e) {
        reject(e);
      }
    });
  });
}
