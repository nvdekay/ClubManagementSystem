import type { EventProposalReviewRepository } from "../../domain/event-proposal-review.js";
import type { SchoolEventRepository } from "../../domain/school-event.js";
import { runEventLifecycleJob } from "../../usecase/event-proposal-review.js";
import { runInvitationExpiryJob } from "../../usecase/school-event.js";

const HOUR_MS = 60 * 60 * 1000;

/** Runs once now, then hourly; returns a stop function. A failed run is logged and retried next hour. */
export function startEventLifecycleJob(repo: EventProposalReviewRepository, schoolEvents?: SchoolEventRepository,
  intervalMs = HOUR_MS): () => void {
  let running = false;
  async function tick(): Promise<void> {
    if (running) return; // a slow run never overlaps the next one
    running = true;
    try {
      const now = new Date();
      const result = { ...await runEventLifecycleJob(repo, now),
        expiredInvitations: schoolEvents ? await runInvitationExpiryJob(schoolEvents, now) : 0 };
      if (result.expired || result.started || result.completed || result.expiredInvitations) {
        console.log(JSON.stringify({ job: "event-lifecycle", ...result }));
      }
    } catch (error) {
      console.error(JSON.stringify({ job: "event-lifecycle", error: error instanceof Error ? error.message : String(error) }));
    } finally {
      running = false;
    }
  }
  void tick();
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
