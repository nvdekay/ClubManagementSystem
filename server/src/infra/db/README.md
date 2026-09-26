# infra/db/

Bản cài bằng Mongoose cho các repository port của domain — mỗi port một file
`mongo-<entity>-repository.ts` — cộng các tiện ích DB (seed). Không gì ngoài `infra/` được đụng
tới Mongoose.
