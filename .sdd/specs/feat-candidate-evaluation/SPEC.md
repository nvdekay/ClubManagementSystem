# SPEC: feat-candidate-evaluation

## Vấn đề
UC19 — Ghi nhận đánh giá ứng viên. Sau khi một đơn được đưa vào danh sách rút gọn (UC18), ban
tuyển thành viên phỏng vấn/kiểm tra ứng viên nhưng chưa có chỗ ghi lại điểm rubric và nhận xét.
Quyết định `Accepted`/`Rejected`/`Waitlisted` vì thế thiếu căn cứ và không so được giữa nhiều
người đánh giá. Tính năng này cho mỗi reviewer có permission `club.application.review` (BR54)
ghi một bản đánh giá có cấu trúc gắn với đơn và với chính họ, và hiển thị điểm tổng hợp ngay
trong màn sàng lọc UC18.

## Hành vi

Dữ liệu dùng collection có sẵn `candidateEvaluations` (`applicationId`, `reviewerId`, `scores`,
`totalScore`, `comment`, `createdAt`; unique `applicationId + reviewerId`) — không đổi schema.
Rubric lấy từ `recruitmentCampaigns.rubric` (`key`, `label`, `maxScore`, không có trọng số).

### `GET /api/v1/clubs/:clubId/recruitment/campaigns/:campaignId/evaluations`
- Quyền: `club.application.review` trong CLB.
- Trả `{ rubric, applications: [{ applicationId, evaluations[], summary }] }`. Rubric đi kèm vì
  reviewer có thể không có `club.recruitment.manage` để đọc đợt tuyển.
- `evaluations[]`: `reviewerId`, `reviewerName`, `scores`, `totalScore?`, `comment?`, `createdAt`.
- `summary`: `count`, `scoredCount`, `maxTotal` (tổng `maxScore` của rubric), và khi có điểm:
  `mean` (điểm tổng hợp), `min`, `max`, `stdDev` (độ lệch chuẩn tổng thể) — độ phân tán của A1.
- Đợt tuyển không thuộc CLB → 404.

### `PUT /api/v1/clubs/:clubId/recruitment/campaigns/:campaignId/applications/:applicationId/evaluation`
- Quyền: `club.application.review`. Body `{ scores: Record<string, number>, comment?: string ≤ 2000 }`.
- Tạo hoặc cập nhật bản đánh giá **của chính người gọi** (upsert theo `applicationId + reviewerId`);
  `createdAt` giữ nguyên khi cập nhật.
- Có rubric: `scores` phải có đúng mọi `key` của rubric, mỗi điểm là số hữu hạn trong `[0, maxScore]`
  (cho phép số lẻ như 7.5); key thừa/thiếu → 400. `totalScore` = tổng điểm, tính ở server.
  `comment` tuỳ chọn.
- E1 — đợt tuyển không có rubric: `scores` phải rỗng, `comment` bắt buộc (khác rỗng sau trim);
  không có `totalScore`.
- Chỉ đơn ở `Shortlisted` được đánh giá. Đơn ở trạng thái khác → 409. Vì sau `Shortlisted` chỉ
  có các trạng thái quyết định (`Accepted`, `Rejected`, `Waitlisted`) hoặc `Withdrawn`, quy tắc
  này đồng thời là quy tắc bất biến: ngay khi có quyết định, mọi bản đánh giá của đơn bị khoá.
  Không có trạng thái trung gian "chưa quyết định" nào sau `Shortlisted` nên không cần ngoại lệ.
- Đợt tuyển `Cancelled` → 409. Đơn không thuộc đợt tuyển/CLB → 404.
- Repository kiểm tra lại `Shortlisted` trong transaction lúc ghi.

### Lỗi chung
Thiếu đăng nhập → 401; tài khoản bị khoá → 423; thiếu `club.application.review` (E2) → 403;
id không hợp lệ → 400.

### Giao diện (`RecruitmentReviewPage`)
- Dòng mỗi đơn hiển thị điểm trung bình `mean/maxTotal` và số người chấm (UC18 bước 4); đơn chỉ có
  đánh giá văn bản hiển thị số bản đánh giá.
- Mục mở rộng "Đánh giá ứng viên" (đơn `Shortlisted` hoặc đã có đánh giá): độ phân tán
  (thấp nhất/cao nhất/độ lệch chuẩn), danh sách từng bản đánh giá (người chấm, điểm từng tiêu
  chí, tổng, nhận xét) và form của chính người xem khi đơn còn `Shortlisted`; ngoài ra hiển thị
  thông báo đã khoá.

## Tiêu chí nghiệm thu
- [x] AC1 (luồng chính): reviewer chấm đủ tiêu chí cho đơn `Shortlisted` → lưu bản đánh giá gắn
  `applicationId` + `reviewerId`, `totalScore` = tổng điểm, nhận xét được trim.
- [x] AC2: điểm thiếu tiêu chí, thừa key, âm, vượt `maxScore` hoặc không hữu hạn → 400.
- [x] AC3 (E1): đợt tuyển không rubric → bắt buộc nhận xét, cấm điểm, không có `totalScore`.
- [x] AC4 (A1): mỗi reviewer đúng một bản; chấm lại thì cập nhật bản cũ; danh sách trả mean,
  min, max, stdDev qua nhiều reviewer.
- [x] AC5 (bất biến): đơn `Accepted`/`Rejected`/`Waitlisted`/`Withdrawn`/`Screening` hoặc đợt
  tuyển `Cancelled` → 409; repository Mongo từ chối khi đơn đã đổi trạng thái lúc ghi.
- [x] AC6 (E2): thiếu `club.application.review` → 403 cho cả xem và ghi; chưa đăng nhập → 401.
- [x] AC7: đơn/đợt tuyển không tồn tại trong CLB → 404.
- [x] AC8: OpenAPI khớp route đã gắn (`openapi.test.ts`).

## Ngoài phạm vi
- Trọng số tiêu chí, thang điểm khác `0..maxScore`, rubric riêng cho từng vòng tuyển.
- Lịch sử chỉnh sửa bản đánh giá (schema chỉ có `createdAt`); audit log cho đánh giá.
- Xoá bản đánh giá; reviewer xem/sửa bản đánh giá của người khác.
- Ẩn đánh giá của người khác cho tới khi mình nộp (chống thiên kiến).
- Chặn reviewer tự đánh giá đơn của chính mình (ứng viên đang là thành viên `Active` không nộp
  đơn được, nên trường hợp này không xảy ra trong luồng hiện có).

## Changelog
- v1.0.0 (2026-10-10) — bản đầu do agent viết, chờ nhóm duyệt.
