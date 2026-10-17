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
`id objectId [pk]` tương ứng `_id: ObjectId` mặc định của MongoDB. Collection `demoUsers` giữ
repository của template tách khỏi `users` của UCMS cho đến khi làm Auth.

`pdp-demo-data.ts` là ảnh chụp dữ liệu công khai của pdp.fpt.edu.vn (cơ sở Hà Nội, 2026-10-04):
48 CLB và 21 sự kiện do CLB tổ chức, được `npm run seed` ghi vào `clubs` và `events` theo `_id`
cố định. Trang danh sách và giới thiệu CLB của PDP cần đăng nhập, nên CLB chưa có tên công khai
giữ mã PDP làm tên; PDP không công bố sức chứa nên `capacity` là 0.

`authSessions` là collection vận hành cho phiên UC01, nằm ngoài các collection nghiệp vụ DBML;
index TTL chỉ dọn rác, việc kiểm tra hết hạn diễn ra ở mỗi request. Xem ADR-003.

`seed-demo.ts` (`npm run seed:demo -- --owner=<email Google> [--owner-name="Tên"]`, chạy sau
`npm run seed`) dựng bộ dữ liệu demo sạch để thử mọi luồng đã có: policy hiệu lực; 16 sinh viên demo
`@demo.ucms.edu.vn`; cơ cấu và thành viên cho HEBE, Mây Mưa, EHC, FDS (người dùng `--owner` là Chủ
nhiệm HEBE, thành viên Mây Mưa và được cấp `ICPDP_OFFICER`); đợt tuyển và đơn chờ xét (một đơn HEBE đã ở `Shortlisted` kèm hai bản đánh giá UC19); hồ sơ thành lập
chờ duyệt và một hồ sơ đã duyệt (CLB hoạt động ngay với ban chủ nhiệm khởi lập); sự kiện sắp tới/đang diễn ra/đã kết thúc kèm đăng ký,
điểm danh, phản hồi; góp ý một chiều; kế hoạch chuyển giao chờ ICPDP. Ghi qua use case/repository khi
luồng đã có; chạy lại an toàn (mỗi phần tự bỏ qua nếu đã có). Hồ sơ thành lập cần Cloudinary để
upload đề án PDF và logo PNG; thiếu cấu hình thì bỏ qua phần đó.

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
