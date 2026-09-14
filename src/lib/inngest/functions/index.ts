import { processOutboxJob } from "./outbox";
import { maintenanceCronJob } from "./maintenance";
import { staleOfferLifecycleJob } from "./stale-offers";
import { privacyExportRunnerJob } from "./privacy-export";

export const inngestFunctions = [
  processOutboxJob,
  maintenanceCronJob,
  staleOfferLifecycleJob,
  privacyExportRunnerJob,
];

export { processOutboxJob, maintenanceCronJob, staleOfferLifecycleJob, privacyExportRunnerJob };
