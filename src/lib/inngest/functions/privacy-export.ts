import { inngest } from "../client";
import { PrivacyService } from "@/src/modules/privacy/service";

/**
 * Inngest durable background runner for user data exports (GDPR / KVKK compliance).
 * Offloads heavy JSON generation and packaging to a dedicated serverless background step
 * so that serverless HTTP responses return immediately without risk of timeout or freeze.
 */
export const privacyExportRunnerJob = inngest.createFunction(
  {
    id: "operis-privacy-export-runner",
    name: "Operis: Run Privacy Data Export",
    triggers: [{ event: "operis/privacy.export-requested" }],
    retries: 2,
  },
  async ({ event, step }) => {
    const rawData = event.data as Record<string, unknown> | undefined;
    const jobId = typeof rawData?.jobId === "string" ? rawData.jobId : "";
    const userId = typeof rawData?.userId === "string" ? rawData.userId : "";

    if (!jobId || !userId) {
      return { success: false, reason: "MISSING_JOB_OR_USER_ID" };
    }

    await step.run("execute-export-job", async () => {
      await PrivacyService.processExportJob(jobId, userId);
    });

    return {
      success: true,
      jobId,
      userId,
      processedAt: new Date().toISOString(),
    };
  }
);
