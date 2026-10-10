# interface/jobs/

Adapter kích hoạt theo lịch (thay vì theo HTTP): mỗi job một file, chỉ hẹn giờ và gọi một usecase idempotent.
Không chứa logic nghiệp vụ — mọi quyết định nằm ở usecase để test được không cần đồng hồ thật. Được khởi
động từ `main.ts`.

- `club-lifecycle-job.ts` — UC15: chạy lúc khởi động và mỗi giờ: báo ICPDP trước khi hết hạn tạm ngừng, tự
  kích hoạt lại CLB hết hạn tạm ngừng, chuyển CLB đã có quyết định giải thể sang `Dissolving`/`Dissolved`.
- `event-lifecycle-job.ts` — UC26 E2 + SCH-01: chạy lúc khởi động và mỗi giờ: đề xuất `Revision Requested` quá hạn
  sửa → `Expired`; sự kiện `Upcoming` tới giờ bắt đầu → `Ongoing`, qua giờ kết thúc → `Completed`; lời mời sự
  kiện cấp trường (UC53) còn `Pending` quá hạn phản hồi → `Expired` (BR59).
