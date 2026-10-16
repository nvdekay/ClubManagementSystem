import type { MembershipReconfirmationRepository } from "../../domain/membership-reconfirmation.js";
import type { PolicyRepository } from "../../domain/policy.js";
import { runMembershipReconfirmation } from "../../usecase/membership-reconfirmation.js";
export function startMembershipReconfirmationJob(repo: MembershipReconfirmationRepository, policy: PolicyRepository, intervalMs = 3600000): () => void {
  let running = false;
  async function tick() {
    if (running) return; running = true;
    try { const result = await runMembershipReconfirmation(repo, policy, new Date()); if (result.opened || result.expired || result.exempt) console.log(JSON.stringify({ job: "membership-reconfirmation", ...result })); }
    catch (e) { console.error(JSON.stringify({ job: "membership-reconfirmation", error: e instanceof Error ? e.message : String(e) })); }
    finally { running = false; }
  }
  void tick(); const timer = setInterval(() => void tick(), intervalMs); timer.unref(); return () => clearInterval(timer);
}
