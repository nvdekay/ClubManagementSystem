import type { EventDefenseRepository } from "../../domain/event-defense.js";
import type { EventProposalReviewRepository } from "../../domain/event-proposal-review.js";
import type { SchoolEventRepository } from "../../domain/school-event.js";
import { runDefenseConfirmationAlertJob } from "../../usecase/event-defense.js";
import { runEventLifecycleJob } from "../../usecase/event-proposal-review.js";
import { runInvitationExpiryJob } from "../../usecase/school-event.js";

const HOUR_MS = 60 * 60 * 1000;

// Hẹn giờ chạy job vòng đời sự kiện, lời mời và cảnh báo bảo vệ đề án mỗi giờ
/** Chạy một lần ngay, rồi mỗi giờ; trả về hàm dừng. Lần chạy lỗi được log và thử lại giờ sau. */
export function startEventLifecycleJob(
  repo: EventProposalReviewRepository,
  schoolEvents?: SchoolEventRepository,
  eventDefenses?: EventDefenseRepository,
  intervalMs = HOUR_MS,
): () => void {
  let running = false;
  async function tick(): Promise<void> {
    if (running) return; // lần chạy chậm không bao giờ chồng lên lần kế tiếp
    running = true;
    try {
      const now = new Date();
      const result = {
        ...await runEventLifecycleJob(repo, now),
        expiredInvitations: schoolEvents ? await runInvitationExpiryJob(schoolEvents, now) : 0,
        overdueDefenseAlerts: eventDefenses ? await runDefenseConfirmationAlertJob(eventDefenses, now) : 0,
      };
      if (result.expired || result.started || result.completed || result.expiredInvitations || result.overdueDefenseAlerts) {
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
