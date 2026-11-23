import type { ComplaintRepository } from "../../domain/complaint.js";
import { flagOverdueComplaintResponses } from "../../usecase/complaint.js";

/** UC52 E1: hourly, raises the compliance signal once for every forwarded complaint past its deadline. */
export function startComplaintResponseJob(repo: ComplaintRepository, intervalMs = 3600000): () => void {
  let running = false;
  async function tick() {
    if (running) return;
    running = true;
    try {
      const flagged = await flagOverdueComplaintResponses(repo, new Date());
      if (flagged) console.log(JSON.stringify({ job: "complaint-response", flagged }));
    } catch (e) {
      console.error(JSON.stringify({ job: "complaint-response", error: e instanceof Error ? e.message : String(e) }));
    } finally { running = false; }
  }
  void tick();
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
