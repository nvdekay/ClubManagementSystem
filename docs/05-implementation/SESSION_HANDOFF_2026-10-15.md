# Bàn giao session — 15/10/2026

## Cập nhật sau triển khai (chiều 15/10/2026) — đọc trước phần dưới

Mục "Phần còn thiếu" 1–7 bên dưới **đã được triển khai** trong worktree này (chưa commit):
UC12, UC14, UC21 A2, UC38, UC54, UC36/37 (nối `eventFinanceRepo`, BR25 chứng từ bắt buộc, BR58
hoàn trả 7 ngày, UC37 A2 không cấp bù), UC40/UC43 phía CLB và job hết hạn hồ sơ UC07/08.

- Kiểm chứng: `npm run check` xanh; chạy kèm `MONGO_URI` tới Mongo replica set riêng ở cổng 27028
  (`replicaSet=ucmsRemaining`): 438 test đều qua, không skip; build client qua.
- Nghiệm thu trình duyệt trên database QA riêng `ucms_qa` (cùng Mongo 27028, seed demo, phiên đăng
  nhập tạo trực tiếp, không dùng `.env`): 24 màn ở `en`/sáng/1440 px và `vi`/tối/390 px, không lỗi
  console/API, không tràn ngang; Member nhận 403 ở API và không thấy menu Leader.
- Tài liệu đã cập nhật theo code: SRS, Use Case Model/Specification, HLD, CURRENT_IMPLEMENTATION,
  UC_CODE_MAPPING, REMAINING_UC_PLAN, README thư mục, guide (MD/HTML/PDF, chưa có ảnh cho màn mới),
  sơ đồ use case/context/swimlane + PNG, ảnh và câu trạng thái trong hai DOCX.
- Còn mở: seed demo chưa tạo ngân sách sự kiện; OAuth/Cloudinary thật; mail worker; ảnh guide cho
  màn mới; chưa commit và chưa đối chiếu với bộ sơ đồ trên `origin/main` (xem mục Git).

## Đọc ngay khi mở session mới

1. `.rules/README.md`, quy tắc tầng liên quan và README của thư mục sắp sửa.
2. `git status --short` và diff; giữ nguyên mọi thay đổi hiện có.
3. [CURRENT_IMPLEMENTATION.md](../CURRENT_IMPLEMENTATION.md).
4. [UC_CODE_MAPPING.md](UC_CODE_MAPPING.md) — đủ 56 mã UC, link route/UI và trạng thái mount.
5. [REMAINING_UC_PLAN.md](REMAINING_UC_PLAN.md), rồi SPEC/TASKS của feature được giao.

File này thay handoff 09/10 cho việc nối tiếp session. Các wave, review và kế hoạch cũ giữ giá
trị lịch sử; không dùng chúng để kết luận feature hiện còn thiếu hoặc đã hoàn tất.

## Yêu cầu và công việc đã thực hiện

Người dùng yêu cầu kiểm tra remote main, rà UC phía Student/CLB/ICPDP (CLB tách Member/Leader),
làm rõ quyền sau khi bỏ RBAC động, sau đó cập nhật toàn bộ tài liệu khớp code.

Đã cập nhật SRS, Use Case Model/Specification, HLD, README, SPEC/TASKS liên quan, bảng mapping,
kế hoạch phần còn thiếu, tài liệu thuyết trình/context, sơ đồ draw.io và 26 PNG tương ứng,
hai DOCX và guide Markdown/HTML/PDF. Bản thiết kế chưa triển khai và hình lịch sử được ghi rõ;
không xoá lịch sử ADR, không sửa quy tắc `.rules/`, không triển khai thêm tính năng ứng dụng.

Các artifact đã sửa:

- `docs/Group1_SE1939-NJ_Report_Final_v2.docx`: 56 bảng UC, actor, route/quyền, schema và giới hạn implementation.
- `docs/UCMS_UseCase_ByActor.docx`: 9 hình theo actor.
- `docs/06-user-guide/GUIDE_BOOK.{md,html,pdf}`: ghi rõ hiện trạng; giữ nguồn ảnh chụp 13/10,
  không giả vờ ảnh demo tài chính là API chính đã hoạt động.
- `docs/03-diagrams/sync-current-diagrams.py`: sinh use case/context, cập nhật note workflow;
  đọc README sơ đồ trước khi chạy và xuất lại ảnh nếu đổi nguồn.

## Git — rất quan trọng

- Nhánh: `nvdekay/chore-verify-remote-main`.
- HEAD local: `3eb984d1c76b65bbedb5a182d8ee0fcd96a90777`.
- `origin/main`: `60fc2dbac0236592c2e33d771a975e9241bbe626`; đã kiểm tra trực tiếp bằng
  `git ls-remote origin refs/heads/main` trước bàn giao tài liệu.
- Hai commit **không giống nhau**. `git diff --name-status HEAD origin/main` có khác biệt
  tài liệu/sơ đồ/SPEC/ADR, không có khác biệt source ứng dụng. Vì vậy baseline code khớp
  remote main, nhưng không được nói toàn bộ nhánh local giống remote hoặc đã tích hợp tài liệu mới lên main.
- Worktree đang có nhiều thay đổi tài liệu chưa commit, cùng các file mới CURRENT_IMPLEMENTATION,
  UC_CODE_MAPPING, script sơ đồ và handoff này. Chưa commit/push/merge/rebase.
- `package-lock.json` có sẵn 12 dòng thêm `peer: true` từ trước lượt cập nhật tài liệu;
  không phải thay đổi của task, đã giữ nguyên. Không stage kèm nếu chưa được người dùng yêu cầu.
- Không reset/checkout toàn bộ, không bỏ các sửa đổi này. Nếu được yêu cầu đưa lên main,
  phải đối chiếu khác biệt sơ đồ remote trước: remote có bộ Database Schema/Main Workflow/ERD
  khác tên, còn worktree giữ Context v2.1/Screen Flow/ERD cũ theo nhánh hiện tại.

## Những kết luận không được suy diễn lại sai

- Không còn role CLB tự tạo, API roles/role-directory hoặc UI cấu hình permission; UC23 đã rút.
- Resolver thật ở `server/src/domain/access.ts`: membership Active, term Active còn hiệu lực,
  position active, assignment còn hiệu lực và có `confirmedBy`. Ghế `isLeaderRole` hoặc
  `isBoardSeat` nhận đủ 14 permission; Member nhận rỗng. Cơ cấu chuẩn là Chủ nhiệm/Phó chủ nhiệm;
  dữ liệu cũ gắn `isBoardSeat` cho ghế khác cũng được coi là Leader.
- Approved founder Pending Setup chỉ nhận profile.manage/board.nominate; nhánh tương thích này
  còn tồn tại nhưng UC08 hiện duyệt tạo Club Active và board khởi lập đã xác nhận ngay.
- Member Active/Inactive đọc member-space/roster tên, vị trí, trạng thái; không trả email.
  UI settings chỉ Leader, nhưng GET profile/departments server vẫn cho current member đọc;
  mutation yêu cầu Leader. Không khẳng định mọi API settings đều 403 với Member.
- UC58 cả menu lẫn API đọc phòng yêu cầu `club.booking.manage`: Member **không được xem**.
- UC36/37 có repo/usecase/route/UI/test nhưng main.ts không truyền `eventFinanceRepo`, nên
  **chưa mount ở app chính**. UC35 đã mount. Không đánh dấu tài chính đầy đủ vì có file source.
- UC50 đã đổi thành góp ý một chiều CLUB/ICPDP ngày 09/10, có ẩn danh; physical collection
  `complaints`, trạng thái Submitted. UC51/52 ngoài scope, không phải tính năng chờ triển khai.
- `permissionCodes` và `clubRoleStructureVersions` vẫn còn schema vì tương thích, không cấp quyền.
- API `/public/*` mở, nhưng UI `PublicLayout.tsx` chuyển về login cả home/discovery.
- Mongo dùng transaction đa document, cần replica set; compose chỉ dựng Mongo single-node replica set.
- Success envelope: statusCode/message/data/timestamp; error: statusCode/error/message/details?/timestamp/path.
- OpenAPI khai báo TypeScript và test kiểm tra route; không hoàn toàn sinh từ Zod.
- Repository ghi audit/notification theo transaction aggregate; không có ApprovalPort/AuditPort/
  NotificationPort chung được main.ts tiêm cho tất cả use case.
- main.ts nối 4 job: booking, club lifecycle, event lifecycle, accountability reminder.
  Chưa có SMTP delivery/retry worker, inbox notification tổng quát hoặc Mongo lease tổng quát.
- DBML có 51 collection nghiệp vụ, `authSessions` nằm ngoài DBML.

## Phần còn thiếu, không được coi là đã sửa trong task tài liệu

1. UC12: CLB tạo/nộp kế hoạch chuyển giao; UC13 ICPDP có.
2. UC14: CLB yêu cầu tạm ngừng; UC15 ICPDP có.
3. UC38: CLB tạo/nộp/nộp lại báo cáo định kỳ; UC39 đang xử lý dữ liệu seed phía ICPDP.
4. UC54: CLB Accept/Decline lời mời; UC53 gửi/thu hồi/publish và job hết hạn có.
5. UC21 A2: scheduler tái xác nhận đầu kỳ; job hết hạn sửa hồ sơ UC07/08 cũng chưa có.
6. UC36/37: chốt BR25/BR58 và nối dependency, rồi nghiệm thu Mongo; không tự bật trong task tài liệu.
7. UC40 thiếu API/UI riêng CLB giải trình/khắc phục; UC43 thiếu màn riêng CLB xem kết quả.
8. Nghiệm thu OAuth/Cloudinary thật, dọn asset mồ côi, visual QA en/vi/light/dark/mobile/desktop.

Danh mục gồm 56 mã UC01–55 và UC58; 4 mã UC05/23/51/52 đã rút, còn 52 trong phạm vi.
**52 trong phạm vi không có nghĩa 52 đã triển khai.**

## Kiểm chứng đã thực hiện

- `npm run check` đã chạy thành công: constitution, lint, typecheck, 296 test pass.
- 118 integration test skip vì không có MONGO_URI; chưa nghiệm thu DB/OAuth/Cloudinary thật.
- `git diff --check` sạch sau cập nhật tài liệu; cần chạy lại nếu session mới sửa tiếp.
- Ba nguồn SRS/Model/Specification đều đủ 56 mã UC duy nhất; tất cả link code trong mapping tồn tại.
- 4 draw.io sửa có XML hợp lệ, ID duy nhất và cạnh tham chiếu đúng.
- DOCX report còn đầy đủ các phần chính và 56 bảng UC; companion có 9 hình. Đã render DOCX
  để rà bố cục và sửa hình landscape bị tách caption. Guide PDF 106 trang.
- Không seed, không chỉnh dữ liệu thật, không bật API thiếu dependency, không sửa bí mật/cấu hình Auth.

## Gợi ý nối tiếp

Không tự suy ra người dùng muốn triển khai tất cả UC hoặc push tài liệu. Đợi yêu cầu mới;
nếu tiếp tục tài liệu, review diff và đối chiếu bộ sơ đồ remote trước khi chuẩn bị commit.
Nếu triển khai tính năng, đọc SPEC/TASKS, xác nhận quyết định nghiệp vụ còn mở và cập nhật tài liệu cùng code.

Các script dựng/render/QA tạm của session trước nằm trong `/tmp/ucms_*`; chúng không phải
nguồn bàn giao bền vững và có thể mất. Không chạy lại mù các script DOCX (một số không idempotent).
Không dùng trạng thái dịch vụ/fixture cũ: kiểm tra môi trường lại khi thật sự cần chạy app.
