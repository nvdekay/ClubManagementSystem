import type { FacilityBookingRepository } from "../../domain/facility-booking.js";
import { runBookingLifecycleJob } from "../../usecase/facility-booking.js";

export function startFacilityBookingJob(repo: FacilityBookingRepository, intervalMs = 60000): () => void {
  let running = false;
  async function tick(): Promise<void> {
    if (running) return;
    running = true;
    try { await runBookingLifecycleJob(repo, new Date()); }
    catch (error) { console.error(JSON.stringify({ job: "facility-booking", error: error instanceof Error ? error.message : String(error) })); }
    finally { running = false; }
  }
  void tick();
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
