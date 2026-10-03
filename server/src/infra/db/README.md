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

`authSessions` là collection vận hành cho phiên UC01, nằm ngoài 50 collection nghiệp vụ DBML;
index TTL chỉ dọn rác, việc kiểm tra hết hạn diễn ra ở mỗi request. Xem ADR-003.
