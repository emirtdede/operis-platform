import type {
  ExportJobProgressEvent,
  ExportJobProgressListener,
} from "@/src/modules/privacy/export-jobs";

/**
 * Production worker daemon export state manager.
 * Tracks active export lifecycle metrics and heartbeat values for worker-daemon.
 *
 * K01-MEM: Uses a bounded ring buffer (max 100 events) instead of unbounded array.
 * Per-job counters are reset on job finish. Total counters are monotonically increasing.
 */
export class WorkerDaemonExportState implements ExportJobProgressListener {
  public activeJobId: string | null = null;
  public activeStartedAt: Date | null = null;
  public activeLastProgressAt: Date | null = null;

  // Per-job counters — reset on job finish
  public readingPageCount = 0;
  public partWrittenCount = 0;
  public readingSectionCount = 0;

  // K01-MEM: Monotonically increasing lifetime counters (never reset)
  public totalJobsCompleted = 0;
  public totalProgressCount = 0;

  // K01-MEM: Bounded ring buffer — keeps at most MAX_RECENT_EVENTS entries
  private static readonly MAX_RECENT_EVENTS = 100;
  private _recentEvents: ExportJobProgressEvent[] = [];
  private _ringStart = 0;
  private _ringCount = 0;

  /** Read-only access to the most recent events (up to 100). */
  get recentEvents(): readonly ExportJobProgressEvent[] {
    if (this._ringCount === 0) return [];
    if (this._ringCount <= this._recentEvents.length) {
      // Ring hasn't wrapped yet or is exactly full
      const start = this._ringStart;
      if (start === 0) return this._recentEvents.slice(0, this._ringCount);
      // Wrapped: return [start..end] + [0..start]
      return [
        ...this._recentEvents.slice(start, this._recentEvents.length),
        ...this._recentEvents.slice(0, start),
      ];
    }
    return this._recentEvents.slice(0, this._ringCount);
  }

  /** Number of events currently held in the ring buffer. */
  get recentEventCount(): number {
    return this._ringCount;
  }

  onJobClaimed = (job: { jobId: string; startedAt: Date; lastProgressAt: Date }) => {
    this.activeJobId = job.jobId;
    this.activeStartedAt = job.startedAt;
    this.activeLastProgressAt = job.lastProgressAt;
  };

  onJobProgress = (prog: ExportJobProgressEvent) => {
    this.activeLastProgressAt = prog.lastProgressAt;
    this.totalProgressCount++;

    // K01-MEM: Ring buffer push — overwrite oldest when full
    const max = WorkerDaemonExportState.MAX_RECENT_EVENTS;
    if (this._recentEvents.length < max) {
      this._recentEvents.push(prog);
      this._ringCount = this._recentEvents.length;
    } else {
      this._recentEvents[this._ringStart] = prog;
      this._ringStart = (this._ringStart + 1) % max;
      this._ringCount = max;
    }

    if (prog.phase === "reading_page") this.readingPageCount++;
    if (prog.phase === "part_written") this.partWrittenCount++;
    if (prog.phase === "reading_section") this.readingSectionCount++;
  };

  onJobFinished = (_jobId: string) => {
    this.activeJobId = null;
    this.activeStartedAt = null;
    this.activeLastProgressAt = null;
    // K01-MEM: Reset per-job counters; total counters preserved
    this.readingPageCount = 0;
    this.partWrittenCount = 0;
    this.readingSectionCount = 0;
    this.totalJobsCompleted++;
  };

  reset(): void {
    this.activeJobId = null;
    this.activeStartedAt = null;
    this.activeLastProgressAt = null;
    this.readingPageCount = 0;
    this.partWrittenCount = 0;
    this.readingSectionCount = 0;
    this.totalJobsCompleted = 0;
    this.totalProgressCount = 0;
    this._recentEvents = [];
    this._ringStart = 0;
    this._ringCount = 0;
  }
}
