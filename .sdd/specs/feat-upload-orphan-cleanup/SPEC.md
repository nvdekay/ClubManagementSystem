# SPEC: feat-upload-orphan-cleanup

## Vấn đề
Tệp tải lên Cloudinary được upload *trước* khi bản ghi tham chiếu tới nó được lưu. Nếu bước ghi
sau đó thất bại, hoặc người dùng tải ảnh lên rồi không bao giờ lưu báo cáo, asset nằm lại trên
Cloudinary mà không bản ghi nào trỏ tới — tốn dung lượng và giữ dữ liệu không ai quản lý. Tính
năng này dọn hai loại asset mồ côi đó.

## Hành vi

### A. Xoá ngay khi bước ghi sau upload thất bại
Giống cách tài liệu đề xuất sự kiện (UC25) và hoá đơn tài trợ đã làm:
- `uploadEventProposalTemplate` (UC26): upload mẫu đề xuất rồi `saveProposalTemplate`; nếu lưu lỗi
  thì gọi `storage.remove(assetId)` (bỏ qua lỗi xoá) rồi ném lại lỗi ban đầu.
- `uploadApplicationDocument` (UC07): upload tài liệu hồ sơ rồi `addDocument`; nếu `addDocument` lỗi
  thì xoá asset vừa upload rồi ném lại lỗi. Lỗi ở bước gỡ bản cũ (`removeDocument`) xảy ra *sau*
  khi bản mới đã được tham chiếu, nên không xoá asset mới.

### B. Job dọn ảnh minh chứng báo cáo định kỳ (UC38) không được tham chiếu
- Mỗi lần CLB tải ảnh minh chứng thành công, hệ thống ghi một dòng vào collection
  `uploadedAssets`: `assetId` (duy nhất), `kind = PERIODIC_EVIDENCE`, `clubId`, `uploadedAt`.
  Nếu ghi dòng này lỗi thì xoá asset vừa upload và trả lỗi (không để asset không được theo dõi).
- Job nền `evidence-cleanup-job` chạy lúc khởi động và mỗi 24 giờ, gọi usecase idempotent
  `cleanupOrphanedEvidence(now)`:
  1. Lấy tối đa 200 dòng `PERIODIC_EVIDENCE` có `uploadedAt` cũ hơn 24 giờ và chưa có
     `referencedAt`.
  2. Một asset **được tham chiếu** khi tham chiếu `ucms-evidence:{clubId}:{assetId}` (thực tế: chuỗi
     `assetId`) xuất hiện ở bất kỳ đâu trong một `periodicReports` của CLB đó (bản nháp, `evidence`,
     `preloadedFigures.clubData`, `preloadedFigures.systemData`), hoặc trong snapshot phiên bản đã
     nộp (audit `PERIODIC_REPORT_SUBMITTED` của báo cáo đó).
  3. Asset được tham chiếu → đặt `referencedAt = now` và không xét lại nữa.
  4. Asset không được tham chiếu → `storage.remove(assetId)` rồi xoá dòng theo dõi. Xoá trên
     Cloudinary lỗi thì giữ dòng để lần chạy sau thử lại; lỗi của một asset không chặn các asset
     khác.
  5. Trả về số asset đã xoá; job log `{ job, removed }` khi > 0.
- Không cấu hình Cloudinary → không có upload nào, job không làm gì (usecase nhận storage `null`
  và trả 0).

## Tiêu chí nghiệm thu
- [ ] Lưu mẫu đề xuất lỗi → asset vừa upload bị xoá, lỗi ban đầu được ném lại.
- [ ] `addDocument` của hồ sơ thành lập lỗi → asset vừa upload bị xoá, lỗi ban đầu được ném lại.
- [ ] Upload ảnh minh chứng ghi một dòng `uploadedAssets`; ghi dòng lỗi → asset bị xoá.
- [ ] Ảnh minh chứng upload hơn 24 giờ mà không báo cáo nào tham chiếu → bị xoá khỏi storage và
      khỏi `uploadedAssets`.
- [ ] Ảnh được tham chiếu trong bản nháp, trong `systemData` hoặc chỉ trong snapshot phiên bản đã
      nộp → không bị xoá, được đánh dấu `referencedAt`.
- [ ] Ảnh mới hơn 24 giờ → không bị xét.
- [ ] Storage xoá lỗi → dòng được giữ, các asset khác vẫn được xử lý.
- [ ] Không có storage → job trả 0, không đọc/ghi gì.

## Ngoài phạm vi
- Ảnh đã từng được tham chiếu rồi sau đó bị gỡ khỏi bản nháp: không dọn (giữ an toàn — một khi đã
  đánh dấu `referencedAt` thì không xét lại).
- Bản nháp được mở quá 24 giờ mới lưu: ảnh có thể đã bị dọn trước khi được tham chiếu; người dùng
  tải lại ảnh. Chấp nhận vì cửa sổ 24 giờ đủ rộng cho một lần soạn.
- Asset upload trước khi tính năng này có (không có dòng `uploadedAssets`): không dọn.
- Các loại tệp khác (hồ sơ, đề xuất sự kiện, hoá đơn, tuyển thành viên): chỉ có xoá-khi-ghi-lỗi ở
  mục A, không có job quét.

## Changelog
- v1.0.0 (2026-11-26) — bản đầu
