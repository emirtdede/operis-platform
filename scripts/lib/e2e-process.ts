import { spawn } from "node:child_process";

/** No shell interpolation; POSIX descendants share a dedicated process group. */
export async function runNodeStage(
  args: string[],
  signal: AbortSignal,
  env: NodeJS.ProcessEnv
): Promise<number> {
  signal.throwIfAborted();
  return await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      env,
      stdio: "inherit",
      detached: process.platform !== "win32",
      shell: false,
    });
    let stopping: Promise<void> | undefined;
    let killTimer: NodeJS.Timeout | undefined;
    const stop = () => {
      if (stopping || !child.pid) return stopping;
      const pid = child.pid;
      if (process.platform === "win32") {
        stopping = new Promise<void>((done) => {
          const killer = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
            windowsHide: true,
            stdio: "ignore",
          });
          killer.once("error", () => {
            child.kill();
            done();
          });
          killer.once("close", () => done());
        });
      } else {
        const send = (kind: NodeJS.Signals) => {
          try {
            process.kill(-pid, kind);
          } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== "ESRCH") throw e;
          }
        };
        stopping = new Promise<void>((done) => {
          send("SIGTERM");
          killTimer = setTimeout(() => {
            send("SIGKILL");
            done();
          }, 1000);
        });
      }
      return stopping;
    };
    const abort = () => {
      void stop();
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    child.once("error", (error) => {
      signal.removeEventListener("abort", abort);
      reject(error);
    });
    child.once("close", async (code, killedBy) => {
      signal.removeEventListener("abort", abort);
      // On POSIX also reap surviving descendants before database cleanup.
      if (process.platform !== "win32" && !stopping) stop();
      await stopping;
      if (killTimer) clearTimeout(killTimer);
      resolve(signal.aborted || killedBy ? 1 : (code ?? 1));
    });
  });
}
