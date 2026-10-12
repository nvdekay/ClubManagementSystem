import type { ClubLifecycleRepository } from "../../domain/club-lifecycle.js";
import { runClubLifecycleJob } from "../../usecase/club-lifecycle.js";

const HOUR_MS = 60 * 60 * 1000;

/** Runs once now, then hourly; returns a stop function. A failed run is logged and retried next hour. */
export function startClubLifecycleJob(repo: ClubLifecycleRepository, intervalMs = HOUR_MS): () => void {
  let running = false;
  async function tick(): Promise<void> {
    if (running) return; // a slow run never overlaps the next one
    running = true;
    try {
      const result = await runClubLifecycleJob(repo, new Date());
      if (result.reminded || result.reactivated || result.dissolving || result.dissolved) {
        console.log(JSON.stringify({ job: "club-lifecycle", ...result }));
      }
    } catch (error) {
      console.error(JSON.stringify({ job: "club-lifecycle", error: error instanceof Error ? error.message : String(error) }));
    } finally {
      running = false;
    }
  }
  void tick();
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
