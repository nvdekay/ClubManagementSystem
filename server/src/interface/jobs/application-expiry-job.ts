import type { ApplicationExpiryRepository } from "../../domain/application-expiry.js";
import { expireClubApplications } from "../../usecase/application-expiry.js";
export function startApplicationExpiryJob(repo: ApplicationExpiryRepository, intervalMs = 3600000): () => void {
  let running = false;
  async function tick() { if (running) return; running = true;
    try { const expired = await expireClubApplications(repo, new Date()); if (expired) console.log(JSON.stringify({ job: "application-expiry", expired })); }
    catch (e) { console.error(JSON.stringify({ job: "application-expiry", error: e instanceof Error ? e.message : String(e) })); }
    finally { running = false; }
  }
  void tick(); const timer = setInterval(() => void tick(), intervalMs); timer.unref(); return () => clearInterval(timer);
}
