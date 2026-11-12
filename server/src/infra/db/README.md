# infra/db/

`mongo-facility-booking-repository.ts` (UC45–47) dùng các collection có sẵn. Snapshot nộp
bất biến ở audit `BOOKING_SUBMITTED`; equipment của draft nằm trong audit snapshot.
Transaction ghi `__v` của property để tuần tự hoá các quyết định cùng phòng;
`releaseFacilityBookingsInSession` được cascade UC15 dùng trong chính transaction của CLB.
Seed demo bổ sung 30 phòng mẫu tại Alpha/Beta/Gamma/Delta/Epsilon (giữ DE312/DE222/DE223). Từ 2026-10-11
(UC58) `seed:demo` xoá hẳn booking ROOM của luồng cũ kèm task/decision/notification/audit của chúng và seed
vài đợt phân phòng của ICPDP (booking `Approved` sinh theo thứ/slot + audit `ROOM_ALLOCATED`), idempotent.

Bản cài bằng Mongoose cho các repository port của domain — mỗi port một file
`mongo-<entity>-repository.ts` — cộng các tiện ích DB (seed). Không gì ngoài `infra/` được đụng
tới Mongoose.

`ucms-schema.generated.ts` được sinh từ `docs/05-implementation/UCMS_Database_Design.dbml`
qua `python3 server/src/infra/db/generate-ucms-schema.py`. `ucms-models.ts` ánh xạ các kiểu,
enum và index DBML sang Mongoose; `init.ts` là lệnh `npm run db:init` idempotent, còn `verify.ts`
kiểm tra kết nối và schema bằng `npm run db:verify`. Cột DBML
`id objectId [pk]` tương ứng `_id: ObjectId` mặc định của MongoDB.

`pdp-demo-data.ts` là ảnh chụp dữ liệu công khai của pdp.fpt.edu.vn (cơ sở Hà Nội, 2026-10-04):
48 CLB và 21 sự kiện do CLB tổ chức, được `npm run seed` ghi vào `clubs` và `events` theo `_id`
cố định. Trang danh sách và giới thiệu CLB của PDP cần đăng nhập, nên CLB chưa có tên công khai
giữ mã PDP làm tên; PDP không công bố sức chứa nên `capacity` là 0.

`authSessions` là collection vận hành cho phiên UC01, nằm ngoài các collection nghiệp vụ DBML;
index TTL chỉ dọn rác, việc kiểm tra hết hạn diễn ra ở mỗi request. Xem ADR-003.

`seed-demo.ts` (`npm run seed:demo -- --owner=<email Google> [--owner-name="Tên"]`, chạy sau
`npm run seed`) dựng bộ dữ liệu demo sạch để thử mọi luồng đã có: policy hiệu lực; 16 sinh viên demo
email dạng sinh viên FPT (`seed-email.ts`, ví dụ `anhtmhe170001@fpt.edu.vn`); cơ cấu và thành viên cho HEBE, Mây Mưa, EHC, FDS (người dùng `--owner` là Chủ
nhiệm HEBE, thành viên Mây Mưa và được cấp `ICPDP_OFFICER`); đợt tuyển và đơn chờ xét (một đơn HEBE đã ở `Shortlisted` kèm hai bản đánh giá UC19); hồ sơ thành lập
chờ duyệt và một hồ sơ đã duyệt (CLB hoạt động ngay với ban chủ nhiệm khởi lập); sự kiện sắp tới/đang diễn ra/đã kết thúc kèm đăng ký,
điểm danh, phản hồi; khiếu nại chờ ICPDP; kế hoạch chuyển giao chờ ICPDP. Ghi qua use case/repository khi
luồng đã có; chạy lại an toàn (mỗi phần tự bỏ qua nếu đã có). Hồ sơ thành lập cần Cloudinary để
upload đề án PDF và logo PNG; thiếu cấu hình thì bỏ qua phần đó.

Báo cáo năm học (UC55 A2, 12/11/2026): `seed:demo` thêm scheme cho `Spring 2026`, `Summer 2026` (dùng lại scheme
`Fall 2026`), đánh giá `Published` của HEBE (tăng), FDS (giảm), EHC (ổn định) và Mây Mưa (thiếu kỳ Spring), cùng báo
cáo định kỳ `Accepted` có thành tích và số liệu tài chính. Ghi thẳng vào collection; bỏ qua nếu đã có đánh giá `Published`
của `Spring 2026`. Kỳ `Fall 2026` của HEBE không có báo cáo định kỳ để luồng UC38 demo vẫn chạy được.
`mongo-export-repository.ts` đọc nguồn cho báo cáo năm: bản `Published` có `revisionNo` lớn nhất theo CLB và kỳ, báo
cáo định kỳ `Accepted`, danh sách CLB; audit ghi chung `DATA_EXPORTED` với `after.type = "ANNUAL_REPORT"`.
Loại `CLUB_BUDGETS` (FR-UC55-12) cộng dồn theo CLB đúng các `eventBudgets` mà loại `FINANCE` đọc (cùng hàm truy vấn),
nên tổng hai sheet luôn khớp.

`seed-annual-hints.ts` (`npm run seed:annual-hints -- --officer=<email officer> --applicant=<email sinh viên>`, 12/11/2026) thêm dữ liệu nghiệm thu cho báo cáo năm học và gợi ý
CLB tương tự lên database demo đang có (không cần chạy lại `seed:demo`). Chỉ thêm, không sửa dữ liệu cũ, chạy lại an
toàn. Báo cáo năm: scheme cho `Spring/Summer/Fall 2025` (Fall 2025 dùng ngưỡng 88/75/55) và `Spring/Summer 2026`; đánh
giá `Published` của 9 CLB năm 2025 (đủ ba kỳ) và 6 CLB năm 2026 (tạm tính), có xu hướng tăng/giảm/ổn định, chênh đúng
±5, CLB thiếu kỳ, bản sửa sau công bố, một bản `Finalized` không được tính và một tiêu chí thiếu dữ liệu; báo cáo
định kỳ `Accepted` có tài chính, thành tích, cộng một báo cáo `Submitted` không được cộng. Không bao giờ tạo đánh giá
cho `Fall 2026`. Gợi ý CLB tương tự: năm hồ sơ thành lập `Submitted` (qua use case UC07, upload đề án và logo lên
Cloudinary) và một bản nháp của tài khoản truyền qua `--applicant`. Khi chạy lần đầu, seed xoá các bản ghi nhập tay cũ
(`evaluations` `dea…01`–`dea…06` kèm kết quả tiêu chí, `periodicReports` `deb…01`–`deb…03`). `seed-files.ts` chứa file
PDF/PNG giả dùng chung với `seed-demo.ts`.

`seed-periodic-reports.ts` (`npm run seed:periodic-reports -- --officer=<email officer> [--reserve=<email,email>]`, 12/11/2026) thêm báo cáo định kỳ `Summer 2026` cho mọi CLB
`Active` chưa có báo cáo kỳ này, để trang báo cáo định kỳ của ICPDP không còn gần như toàn bộ CLB quá hạn. Chỉ thêm, chạy
lại an toàn (CLB đã có báo cáo `Summer 2026` thì bỏ qua). Phân bổ: đa số `Accepted` (hai bản bị trả về rồi nộp lại version 2),
4 `Submitted` chờ duyệt (có task `PERIODIC_REPORT` mở), 2 `Returned for correction` có lý do, mục cần sửa và hạn nộp lại
trong tương lai, 4 bản nộp trễ; `FTTC` và `FUSW` cố ý để trống cho luồng quá hạn/ghi nhận thiếu báo cáo (UC39 A1/E1).
Phía CLB (tạo, lưu nháp, nộp) ghi đúng các thao tác của `mongo-club-periodic-report-repository.ts` vì các CLB này chưa có
Chủ nhiệm để qua kiểm tra quyền; quyết định của ICPDP đi qua use case UC39 thật. Cả hai chạy với đồng hồ lùi về
tháng 8–11/2026. Thành viên và sự kiện lấy từ dữ liệu hệ thống khi CLB có, nếu không thì nhập tay (tên giả, mã `HE19xxxx`).
`preloadedFigures.finance` là số liệu CLB khai báo vì chưa có ngân sách `Summer 2026`, nên trang duyệt tô màu dòng tài
chính là khác với hệ thống. Không gửi thông báo cho lượt nộp; lượt quyết định chỉ báo cho thành viên đã nộp (in-app).

`clubFields` là danh mục lĩnh vực CLB do ICPDP quản lý. `ensureDefaultClubFields()` (gọi lúc khởi động
server, `npm run db:init` và `seed:demo`) tạo sẵn 6 lĩnh vực trên database mới; khi ICPDP đã từng sửa danh
mục (có audit `ClubField`) thì không tạo lại. Domain email đăng nhập không còn nằm trong policy mà lấy từ
`ALLOWED_DOMAIN` của server (một domain, danh sách cách nhau bởi dấu phẩy, hoặc `*`).

Tên năm giảng đường đối chiếu [nguồn FPT](https://daihoc.fpt.edu.vn/sustainability/fpt-university-provides-affordable-housing-for-students/)
và [tour campus Hà Nội](https://viewdaihoc.fpt.edu.vn/fpt-ha-noi/). Mã AL/BE/GA/DE/EP, số phòng và sức chứa
là dữ liệu minh hoạ; location chỉ ghi tòa, không lặp tầng. Seed sửa location cũ của phòng Delta
qua usecase, giữ các cấu hình khác; không ghi đè location đã được người dùng thay đổi.

Luồng ROOM đặt ngay cũ đã bỏ. UC58 do ICPDP phân phòng; UC45 ngoài ROOM tạo task để ICPDP duyệt.

`seed-guide.ts` chạy sau seed công khai và seed demo: tạo database riêng `ucms_guide_demo`,
copy các collection nghiệp vụ một lần (không copy `authSessions`), rồi thêm dữ liệu wave 4
qua repository. Database nguồn và policy thật không bị sửa. Bản copy dùng POST_EVENT 7 ngày
và quy định chứng từ/hoàn trả mẫu; các giá trị này không phải quyết định BR25/BR58 của bản chính.
Chạy từ gốc repo: `node --env-file=.env --import tsx server/src/infra/db/seed-guide.ts`.
Chạy lại giữ các version báo cáo đã sửa và ngân sách đã được đối soát; không reset thao tác demo.
Hồ sơ Returned, Submitted, khoản thiếu chứng từ, task, điểm danh và phản hồi phục vụ
[guide book](../../../../docs/06-user-guide/README.md).

Seed đăng ký festival xử lý từng cặp event/student bằng `$setOnInsert`; đổi owner hoặc chạy lại
sau một lần seed dở không tạo trùng các sinh viên đã đăng ký. Tổng confirmed lấy từ dữ liệu thật.

Các repository phía CLB thêm ngày 15/10/2026: `mongo-club-transition-plan-repository.ts` (UC12, dùng
`club-obligations.ts` để nạp nghĩa vụ còn mở của CLB), `mongo-suspension-request-repository.ts` (UC14/UC15,
cascade sự kiện/booking trong cùng transaction), `mongo-club-periodic-report-repository.ts` (UC38, mỗi lần nộp
một snapshot), `mongo-club-invitation-repository.ts` (UC54), `mongo-club-violation-repository.ts` (UC40),
`mongo-club-evaluation-repository.ts` (UC43, chỉ đọc bản `Published`), `mongo-membership-reconfirmation-repository.ts`
(UC21 A2) và `mongo-application-expiry-repository.ts` (UC07/08).

`periodic-report-obligations.ts` (17/10/2026) gom luật BR21 "báo cáo định kỳ quá hạn" — gồm cả kỳ đã
quá hạn mà CLB chưa mở báo cáo — dùng chung cho đề xuất sự kiện, thẩm định đề xuất, booking và dashboard.

`dashboard-charts.ts` (17/10/2026) tính dữ liệu chart của dashboard ICPDP và Club Leader (UC02).
`dashboard-drilldown.ts` (19/10/2026) đọc các bản ghi đằng sau số liệu UC02: sự kiện nội bộ đã ghi nhận kèm
điểm danh, và lịch sử phiên bản cơ cấu/ban chủ nhiệm theo nhiệm kỳ (nguồn xác nhận suy từ ghế đề cử UC11 đã
xác nhận, kế hoạch UC13 đã xác nhận, hoặc nhiệm kỳ khởi lập UC08).

`mongo-notification-repository.ts` (19/10/2026, NTF-04/SCH-10): hộp thông báo in-app của người dùng (kèm `clubId`
suy ra từ payload hoặc thực thể để client dựng link) và outbox cho worker gửi email — claim nguyên tử bằng lease trên
`dueAt`, mỗi lần thử ghi `emailDeliveryLogs`. Kênh email do `notificationChannels()` của domain quyết định, được
`queueNotifications` (`club-board.ts`) và các repository hồ sơ thành lập, đề xuất sự kiện, booking dùng. Lọc theo
workspace (01/11/2026): `scope` sinh viên/ICPDP/CLB lọc ở DB theo danh sách `eventCode` của domain; `scope=club` kèm
`clubId` thì đọc các dòng CLB của người dùng, suy `clubId` từng dòng rồi lọc, nên số chưa đọc luôn khớp danh sách. Mã
mới gửi đi phải được thêm vào một danh sách audience (test `notification-audience` quét mọi chỗ enqueue).

`seed-dashboard.ts` (`npm run seed:dashboard`, 17/10/2026) — chạy sau `seed` + `seed:demo`, chỉ ghi vào DB
local: ~150 tài khoản sinh viên demo, thành viên/sự kiện/đăng ký/check-in/phản hồi/ngân sách/đề xuất chờ duyệt
trong 12 tháng cho ~12 CLB, đơn ứng tuyển đợt tuyển HEBE và lĩnh vực đoán theo tên cho CLB "Chưa phân loại".
Mọi bản ghi có id cố định theo khoá nên chạy lại không tạo trùng; thành viên đang hoạt động được ghi sẵn
tái xác nhận học kỳ hiện tại để job UC21 A2 không chuyển họ sang Inactive.

`mongo-access-denial-audit-repository.ts` ghi một dòng `auditLogs` `ACCESS_DENIED` cho mỗi lần người dùng
đã đăng nhập bị từ chối 403 (SEC-08, AC17); chỉ gồm method, mẫu route, đối tượng bị nhắm tới, CLB,
quyền còn thiếu và lý do.

`approval-routing.ts` là phần dùng chung của UC05 cho UC08/UC26/UC46: đóng băng rule khớp (`routingRuleSetId`,
`routingRuleId`) và SLA lên `approvalTasks` lúc mở task. Mọi hồ sơ được một ICPDP Officer quyết định ở một cấp
(quyết định ghi `level: 1`); `requiredLevel`/`currentLevel` cũ trên task không còn tác dụng. `mongo-approval-routing-repository.ts`
giữ `routingRuleSets` (nháp, kích hoạt có audit, mẫu mô phỏng chỉ đọc). `club-permission-holders.ts` tìm thành viên đang có một permission.
