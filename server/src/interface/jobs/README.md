# interface/jobs/

Adapter kích hoạt theo lịch (thay vì theo HTTP): mỗi job một file, chỉ hẹn giờ và gọi một usecase idempotent.
Không chứa logic nghiệp vụ — mọi quyết định nằm ở usecase để test được không cần đồng hồ thật. Được khởi
động từ `main.ts`.

- `club-lifecycle-job.ts` — UC15: chạy lúc khởi động và mỗi giờ: báo ICPDP trước khi hết hạn tạm ngừng, tự
  kích hoạt lại CLB hết hạn tạm ngừng, chuyển CLB đã có quyết định giải thể sang `Dissolving`/`Dissolved`.
