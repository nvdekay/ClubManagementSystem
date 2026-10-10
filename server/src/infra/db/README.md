# infra/db/

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
nhiệm HEBE, thành viên Mây Mưa và được cấp `ICPDP_OFFICER`); role thường "Phụ trách Hậu cần" của HEBE đã gán cho một thành viên (UC23, cơ cấu phiên bản 2); đợt tuyển và đơn chờ xét (một đơn HEBE đã ở `Shortlisted` kèm hai bản đánh giá UC19); hồ sơ thành lập
chờ duyệt và một hồ sơ đã duyệt (CLB hoạt động ngay với ban chủ nhiệm khởi lập); sự kiện sắp tới/đang diễn ra/đã kết thúc kèm đăng ký,
điểm danh, phản hồi; góp ý một chiều; kế hoạch chuyển giao chờ ICPDP. Ghi qua use case/repository khi
luồng đã có; chạy lại an toàn (mỗi phần tự bỏ qua nếu đã có). Hồ sơ thành lập cần Cloudinary để
upload đề án PDF và logo PNG; thiếu cấu hình thì bỏ qua phần đó.

`clubFields` là danh mục lĩnh vực CLB do ICPDP quản lý. `ensureDefaultClubFields()` (gọi lúc khởi động
server, `npm run db:init` và `seed:demo`) tạo sẵn 6 lĩnh vực trên database mới; khi ICPDP đã từng sửa danh
mục (có audit `ClubField`) thì không tạo lại. Domain email đăng nhập không còn nằm trong policy mà lấy từ
`ALLOWED_DOMAIN` của server (một domain, danh sách cách nhau bởi dấu phẩy, hoặc `*`).
