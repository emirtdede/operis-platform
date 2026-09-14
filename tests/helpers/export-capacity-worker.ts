import "@/tests/setup/integration";
import { claimAndProcessExportJob } from "@/src/modules/privacy/export-jobs";
import { getDbPool } from "@/src/lib/db";
import crypto from "node:crypto";

// Fixture creation and output verification deliberately run in the parent process.
const baseline = process.memoryUsage().rss;
let peak = baseline;
const sample = () => {
  peak = Math.max(peak, process.memoryUsage().rss);
};
const timer = setInterval(sample, 10);
try {
  const result = await claimAndProcessExportJob(process.argv[2]!, crypto.randomUUID(), {
    maxDurationMs: 180000,
    onProgress: sample,
  });
  sample();
  peak = Math.max(peak, process.resourceUsage().maxRSS * 1024);
  process.stdout.write(JSON.stringify({ result, baseline, peak, delta: peak - baseline }) + "\n");
} finally {
  clearInterval(timer);
  await getDbPool().end();
}
