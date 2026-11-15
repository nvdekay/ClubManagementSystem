import type { ClubLifecycleRepository } from "../../domain/club-lifecycle.js";
import { alertClubLifecycleJobFailure, runClubLifecycleJob } from "../../usecase/club-lifecycle.js";

const HOUR_MS = 60 * 60 * 1000;

// Hẹn giờ chạy job vòng đời CLB (tạm ngừng, giải thể) mỗi giờ
/** Chạy một lần ngay, rồi mỗi giờ; trả về hàm dừng. Lần chạy lỗi sẽ báo ICPDP và thử lại giờ sau. */
export function startClubLifecycleJob(repo: ClubLifecycleRepository, intervalMs = HOUR_MS): () => void {
  let running = false;
  async function tick(): Promise<void> {
    if (running) return; // lần chạy chậm không bao giờ chồng lên lần kế tiếp
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
