# SPEC: feat-event-proposal-document

> Nguồn: `docs/05-implementation/EVENT_PROPOSAL_TEMPLATE_PLAN.md` (đã xoá khỏi repo; nội dung còn hiệu lực nằm trong SPEC này và `EVENT_PROPOSAL_IMPORT.md`)
> (quy tắc đã chốt ngày 2026-11-14). SPEC này là hợp đồng giữa server và client; chỗ nào plan lệch với
> code thì mục "Điều chỉnh so với plan" là bản được áp dụng.

## Vấn đề
ICPDP thẩm định đề xuất sự kiện chỉ dựa trên các trường trên form, trong khi thực tế cần một văn bản đề án
chi tiết theo mẫu. CLB cần tải được mẫu đề án của ICPDP, đính kèm file đề án khi nộp, và ICPDP cần xem
được file đó theo từng revision.

## Hành vi

### Phạm vi
- Chỉ áp dụng cho đề xuất ICPDP (`PUBLIC`, hoặc `MEMBERS_ONLY` có ngân sách).
- Sự kiện nội bộ tự túc (`DRAFT/CREATED/PUBLIC/ONGOING/FINISH/CANCELLED`) không nhận và không yêu cầu file
  đề án; luồng tạo/công bố của chúng không đổi.

### Dữ liệu
`proposalDocument` trả cho client (không bao giờ có `assetId`):
`{ id: string, fileName: string, mimeType: string, bytes: number, uploadedAt: ISO datetime, uploadedBy: userId }`.

- Bản nháp: nằm trong `after.payload` của audit mới nhất (`EVENT_PROPOSAL_DOCUMENT_UPLOADED` được thêm vào
  `EVENT_PAYLOAD_ACTIONS`). `save` giữ nguyên file đã gắn.
- `submit` đóng băng file trong `eventProposalVersions.payload.proposalDocument`; `reschedule` (UC28) kế thừa
  file của bản trước.
- Sự kiện cũ không có file: đọc bình thường (trường vắng mặt), chỉ bị chặn khi `submit`.
- Template: `auditLogs` với `entityType: "SystemTemplate"`, `action: "EVENT_PROPOSAL_TEMPLATE_UPDATED"`,
  `after` là metadata file; bản mới nhất là template hiện hành, không xoá được. Chưa có bản nào thì dùng
  `docs/Template Đề án sự kiện.docx` (đọc từ đĩa, cache trong bộ nhớ).
- Không thêm collection; 54 bảng / 28 enum giữ nguyên.

### Kiểm tra file (`validateEventProposalFile`)
- Tên sau khi trim dài 1–255, không có ký tự điều khiển, `/`, `\`; đuôi khớp `Content-Type`.
- `0 < bytes <= 10 MB`; magic bytes: `%PDF-` cho PDF; `PK\x03\x04` + `[Content_Types].xml` + `word/`
  (DOCX) hoặc `xl/` (XLSX).
- File đề án: PDF, DOCX. Template: PDF, DOCX, XLSX.
- Sai → `400` `"invalid event proposal file"`, `details: { maxBytes, mimeTypes }`.

### API (prefix `/api/v1`, mọi route cần phiên; mutation cần `X-CSRF-Token`)

Upload dạng raw body (tối đa 10 MB): `Content-Type` là MIME của file, header `X-Filename` là
`encodeURIComponent(tên file)`.

| Endpoint | Quyền | Kết quả |
|---|---|---|
| `GET /events/proposal-template` | mọi người đã đăng nhập | `200 { fileName, mimeType, bytes, updatedAt, isSystemDefault }` |
| `GET /events/proposal-template/download` | mọi người đã đăng nhập | mặc định: `200` bytes file, `Content-Disposition: attachment; filename="<ASCII>"; filename*=UTF-8''<tên gốc>`; template ICPDP: `302` tới signed URL 60 giây |
| `POST /clubs/:clubId/events/:id/proposal-document` | `club.event.manage` | `200 ClubEventDetail` (đã tăng `version`) |
| `GET /clubs/:clubId/events/:id/proposal-document/access?revisionNo=&inline=` | `club.event.manage` | `200 { fileName, mimeType, url }`; không có `revisionNo` → file của bản nháp |
| `POST /admin/event-proposals/template` | `ICPDP_OFFICER` | `201 { fileName, mimeType, bytes, updatedAt, isSystemDefault: false }` |
| `GET /admin/event-proposals/:id/document/access?revisionNo=&inline=` | `ICPDP_OFFICER` | `200 { fileName, mimeType, url }`; không có `revisionNo` → revision mới nhất |

`inline=true` cho URL xem trực tiếp; mặc định là tải về.

Lỗi:
- `submit` khi bản nháp chưa có file → `400` `"event proposal document is required before submission"`,
  `details: { field: "proposalDocument" }`.
- Upload cho sự kiện nội bộ → `400`; sự kiện không ở `Draft`/`Revision Requested` → `409`; quá hạn sửa → `409`.
- Chưa cấu hình Cloudinary → upload và lấy signed URL trả `503` `"file storage is not configured"`; tải
  template mặc định vẫn chạy.
- Không có file ở revision yêu cầu → `404`.

## Điều chỉnh so với plan
1. Gắn file là một action của `act` (`{ kind: "attach-document", document }`) thay cho
   `attachProposalDocument`, dùng chung transaction, khoá `__v` và kiểm tra trạng thái/hạn sửa với `save`.
2. `ClubEventRepository` có `proposalDocument(eventId, revision)` (`"draft"` / `"latest"` / số revision)
   dùng cho cả CLB và ICPDP, thay cho `findProposalDocument` + `findProposalDocumentForReview`. Template:
   `proposalTemplate()` (trả kèm bytes khi là mặc định, hoặc `assetId` khi là bản ICPDP) và `saveProposalTemplate()`.
3. Hai route `/admin/event-proposals/template` và `/admin/event-proposals/:id/document/access` nằm trong
   `club-event-routes.ts` / `usecase/club-event.ts` (cùng repository và file storage), không ở router thẩm định.
   Kiểm tra vai trò dùng chung `officer()` của `usecase/event-proposal-review.ts`.
4. `assertProposalDocumentPresent` chỉ chạy ở `submit`, không ở `submitVersion`: đổi lịch một sự kiện cũ đã
   duyệt mà chưa có file vẫn được phép (chỉ kế thừa nếu có).
5. `assetId` được bỏ ở tầng đọc (`clubEventFrom`, `readClubEvent`, review detail, báo cáo hậu sự kiện) qua
   `publicEventPayload`, nên mọi response dùng chung các reader đều an toàn.
6. Truy cập file của CLB chỉ cho `club.event.manage` của CLB đó; ICPDP dùng route riêng.
7. Seed demo chỉ ghi metadata `proposalDocument` (asset không có thật trên Cloudinary).

## Tiêu chí nghiệm thu
- [x] Chưa có template ICPDP → tải được `Template Đề án sự kiện.docx` với header attachment đúng.
- [x] Chỉ ICPDP thay được template; sau đó tải template → `302` tới signed URL của bản mới.
- [x] Lưu nháp không cần file; `submit` thiếu file → `400`.
- [x] Upload tăng `version`; `save` giữ file; `submit` → `Pending Approval` và revision đóng băng file (có `assetId` trong DB, không có trong response).
- [x] Sau yêu cầu sửa mục `content`, file v1 và v2 đều truy cập được theo `revisionNo`.
- [x] Đổi lịch sự kiện `Approved` → revision mới kế thừa file.
- [x] Thành viên không có `club.event.manage` → `403` khi lấy link hoặc upload.
- [x] Kiểm tra file: rỗng, > 10 MB, sai MIME, sai đuôi, giả mạo magic bytes đều bị từ chối.
- [x] Route mới có trong OpenAPI và qua `authGuard`.

## Ngoài phạm vi
- Xoá hoặc vô hiệu hoá template; xoá asset cũ trên Cloudinary khi CLB thay file.
- Quét virus, xem trước nội dung DOCX.
- Migration gắn file cho dữ liệu cũ.

## Changelog
- v1.0.0 (2026-11-14) — theo plan đã chốt cùng ngày.
