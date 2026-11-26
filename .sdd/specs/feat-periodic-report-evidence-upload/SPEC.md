# SPEC: feat-periodic-report-evidence-upload

## Vấn đề
Ảnh minh chứng của báo cáo định kỳ (UC38) đang được lưu thành `data:` URL base64 ngay trong
document Mongo. Mỗi `evidenceUrl` được phép dài tới 5.000.000 ký tự, mảng sự kiện/thành tích/
trường tuỳ chỉnh có thể chứa hàng trăm ảnh, nên một bản nháp lớn có thể vượt giới hạn 16 MB của
một document Mongo và trả về lỗi 500 khó hiểu. Để phục vụ riêng luồng này, `server.ts` phải bật
`express.json({ limit: '15mb' })` cho **mọi** route và parse body trước cả khi xác thực. Domain còn
chấp nhận mọi `data:image/*` kể cả `svg+xml`. Người dùng đã quyết định chuyển ảnh minh chứng sang
Cloudinary, dùng lại đúng mẫu tệp đính kèm của đơn ứng tuyển (UC34).

## Hành vi
- **Upload ảnh minh chứng** — `POST /api/v1/clubs/{clubId}/periodic-reports/evidence-images`.
  - Cần phiên đăng nhập + header `X-CSRF-Token`; `authGuard` chạy **trước** `express.raw()`.
  - Body là byte thô của ảnh, `Content-Type` là loại MIME của ảnh, tối đa 5 MiB.
  - Usecase kiểm quyền CLB `club.report.submit` (cùng quyền sửa/nộp báo cáo định kỳ) qua
    `assertClubAccess` → `requireClubPermission`.
  - Chỉ nhận `image/png`, `image/jpeg`, `image/webp`; **không** nhận `image/svg+xml` hay GIF.
    Nội dung phải khớp magic bytes của loại MIME khai báo (PNG `89 50 4E 47 0D 0A 1A 0A`,
    JPEG `FF D8 FF`, WebP `RIFF....WEBP`).
  - Ảnh được upload thành raw asset có xác thực (`type: authenticated`) dưới
    `ucms/periodic-reports/{clubId}/`.
  - Trả `201` với `{ reference, url, mimeType, bytes }`: `reference` là tham chiếu để lưu vào báo
    cáo, `url` là signed URL ngắn hạn để xem trước ngay.
  - Chưa cấu hình Cloudinary → `503 unavailable` (`file storage is not configured`).
- **Hình dạng lưu trữ** — các trường minh chứng (`evidence[].url`, `events[].evidenceUrl`,
  `achievements[].evidenceUrl`, `customAnswers[].evidenceUrl`) vẫn là chuỗi; ảnh upload được lưu
  dưới dạng tham chiếu `ucms-evidence:{clubId}:{assetId}` (assetId 32 ký tự hex của Cloudinary).
  Không thêm collection hay đổi schema.
- **Ghi báo cáo** (`PUT /clubs/{clubId}/periodic-reports/{id}`) chỉ nhận:
  - link `http(s)` tối đa 2.000 ký tự, hoặc
  - tham chiếu `ucms-evidence:` thuộc **đúng CLB** trong đường dẫn (tham chiếu của CLB khác → 400).
  - `data:` URL bị từ chối (400 `invalid ... evidence image or URL`).
  - Zod: mỗi URL tối đa 2.000 ký tự; giữ giới hạn số phần tử (50 minh chứng, 500 thành viên,
    200 sự kiện, 100 thành tích, 50 câu trả lời).
- **Đọc báo cáo** (phía CLB `GET /clubs/{clubId}/periodic-reports`, phản hồi của tạo/lưu/nộp;
  phía ICPDP `GET /admin/periodic-reports/{id}` và phản hồi quyết định) trả thêm
  `evidenceUrls: { [reference]: signedUrl }` cho mọi tham chiếu `ucms-evidence:` của chính CLB đó
  (gồm cả các phiên bản cũ trong `versions`). Signed URL hết hạn sau 10 phút. Trường minh chứng
  gốc vẫn giữ tham chiếu để client gửi lại khi lưu nháp mà không biến link tạm thành dữ liệu.
- **Tương thích ngược** — document cũ có `data:` URL hoặc link `http(s)` vẫn được trả nguyên văn
  khi đọc, nên ảnh cũ vẫn hiển thị. Client cảnh báo ô minh chứng còn ở định dạng cũ trong bản
  nháp đang sửa và yêu cầu tải ảnh lên lại trước khi lưu. Seed chỉ dùng link Google Drive nên
  không cần đổi.
- **Giới hạn body JSON** — parser JSON toàn cục hạ từ `15mb` xuống `100kb`. Các route thật sự cần
  body lớn hơn tự gắn `express.json({ limit })` **sau** `authGuard` và được parser toàn cục bỏ
  qua: lưu nháp báo cáo định kỳ (`2mb` — 500 thành viên, 200 sự kiện), lưu nháp đơn ứng tuyển
  (`1mb` — tối đa 30 câu trả lời × 10.000 ký tự), ghi chú phiên bảo vệ (`256kb` — 50.000 ký tự).
  Body vượt giới hạn → 413.
- **Client** — chọn hoặc dán ảnh trong trình soạn báo cáo sẽ upload ngay lên endpoint mới, hiển
  thị trạng thái đang tải và lỗi (en/vi), rồi lưu `reference` vào bản nháp. Client chặn trước loại
  tệp không phải PNG/JPEG/WebP và tệp lớn hơn 5 MiB. Trang ICPDP hiển thị ảnh qua `evidenceUrls`.

## Tiêu chí nghiệm thu
- [ ] Upload bị từ chối khi actor không có quyền `club.report.submit` của CLB.
- [ ] Upload từ chối `image/svg+xml`, GIF, nội dung không khớp magic bytes, tệp rỗng và tệp lớn
      hơn 5 MiB.
- [ ] Upload PNG/JPEG/WebP hợp lệ trả `reference` dạng `ucms-evidence:{clubId}:{assetId}` và signed URL.
- [ ] Lưu nháp từ chối `data:` URL ở minh chứng, sự kiện, thành tích và trường tuỳ chỉnh.
- [ ] Lưu nháp nhận link `http(s)` và tham chiếu của chính CLB; từ chối tham chiếu của CLB khác.
- [ ] Đọc báo cáo (CLB và ICPDP) trả `evidenceUrls` cho tham chiếu của CLB và để nguyên `data:` URL cũ.
- [ ] Route upload có trong OpenAPI và có xác thực (test duyệt route).
- [ ] Body JSON > 100kb ở route thường bị 413; lưu nháp báo cáo định kỳ lớn hơn 100kb vẫn qua.

## Ngoài phạm vi
- Dọn asset mồ côi trên Cloudinary khi CLB upload rồi không lưu, hoặc thay ảnh khác.
- Di chuyển (migrate) `data:` URL cũ trong database sang Cloudinary.
- Upload tệp không phải ảnh (PDF, tài liệu) làm minh chứng.

## Changelog
- v1.0.0 (2026-11-26) — người dùng chọn phương án Cloudinary
