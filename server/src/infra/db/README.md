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

`authSessions` là collection vận hành cho phiên UC01, nằm ngoài 49 collection nghiệp vụ DBML;
index TTL chỉ dọn rác, việc kiểm tra hết hạn diễn ra ở mỗi request. Xem ADR-003.
