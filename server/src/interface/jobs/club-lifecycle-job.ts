import type { ClubLifecycleRepository } from "../../domain/club-lifecycle.js";
import { alertClubLifecycleJobFailure, runClubLifecycleJob } from "../../usecase/club-lifecycle.js";

const HOUR_MS = 60 * 60 * 1000;

/** Runs once now, then hourly; returns a stop function. A failed run alerts ICPDP and is retried next hour. */
export function startClubLifecycleJob(repo: ClubLifecycleRepository, intervalMs = HOUR_MS): () => void {
  let running = false;
  async function tick(): Promise<void> {
    if (running) return; // a slow run never overlaps the next one
    running = true;
    try {
      const result = await runClubLifecycleJob(repo, new Date());
      if (result.reminded || result.reactivated || result.dissolving || result.dissolved || result.failed) {
        console.log(JSON.stringify({ job: "club-lifecycle", ...result }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(JSON.stringify({ job: "club-lifecycle", error: message }));
      await alertClubLifecycleJobFailure(repo, message, new Date()).catch(() => undefined);
    } finally {
      running = false;
    }
  }
  void tick();
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
