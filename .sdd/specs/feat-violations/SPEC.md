# SPEC: feat-violations

> UC40 — Quản lý hồ sơ vi phạm và tuân thủ. Người dùng duyệt các quyết định (2026-10-10).

## Vấn đề
ICPDP chưa có chỗ xử lý vi phạm của CLB một cách có vết: ai mở, căn cứ gì, CLB đã được nghe giải trình
chưa, quyết định dựa trên chứng cứ nào, biện pháp khắc phục đã xong chưa. UC40 biến mỗi vi phạm thành một
hồ sơ có trạng thái, người phụ trách và lịch sử, làm đầu vào cho D8 ở UC42.

## Quyết định
- Màn `/workspace/violations`: danh sách theo nhóm (Đang xử lý / Chờ CLB giải trình / Đang khắc phục / Đã
  đóng), form mở hồ sơ; `/workspace/violations/:id`: chi tiết và khung "Bước tiếp theo" chỉ hiện bước hợp lệ.
- **Nguồn phát hiện** (FR-01): 6 loại của DBML + `OTHER` (cán bộ tự phát hiện). Có thể gắn một sự kiện hoặc
  kinh phí của chính CLB đó (`originRefId`); gắn bản ghi của CLB khác → 400.
- **Mức độ** (BR27, hằng số): `MINOR` Nhẹ / `MODERATE` Trung bình / `SERIOUS` Nghiêm trọng.
- **Chứng cứ**: ghi chú + đường dẫn `http(s)` (không upload file), thêm được ở mọi bước trước khi đóng.
- **Luồng**: `Open → Under Investigation → Awaiting Club Response → Decision Issued → Corrective Action →
  Resolved`.
  - Yêu cầu giải trình: bắt buộc nội dung; hạn mặc định 7 ngày (`RESPONSE_DUE_DAYS`), phải ở tương lai.
  - Ghi nhận giải trình: CLB tự trả lời (hợp đồng bên dưới) **hoặc** cán bộ ghi thay phần CLB trả lời ngoài
    hệ thống; quá hạn mà chưa có → cán bộ ghi "CLB không phản hồi" (E1). Chỉ ghi một lần.
  - **Kết luận có vi phạm** chỉ khi đã qua bước giải trình và đã có câu trả lời hoặc ghi nhận không phản hồi;
    bắt buộc lý do + ≥ 1 chứng cứ (BR28) → `Decision Issued`.
  - **Kết luận không vi phạm** (A2) được ở mọi bước trước quyết định, bắt buộc lý do → `Closed`.
  - Biện pháp khắc phục: 1–10 mục, mỗi mục có hạn ở tương lai, có thể gắn "Tạm ngừng" / "Giải thể" (A1 —
    chỉ ghi liên kết và hiện đường dẫn sang màn quản lý CLB UC15, không tự tạm ngừng). Kiểm tra từng mục
    Đã hoàn thành / Không hoàn thành; mọi mục hoàn thành → tự `Resolved`. Không còn mục chờ kiểm tra (hoặc
    quyết định chỉ nhắc nhở, chưa giao mục nào) → cán bộ "Kết thúc hồ sơ".
- Mỗi bước: audit `Violation` (`VIOLATION_*`); thông báo ban điều hành CLB ở các bước yêu cầu giải trình,
  quyết định, giao/kiểm tra biện pháp, kết thúc. Mở hồ sơ và điều tra không báo CLB.
- Chỉ `ICPDP_OFFICER`. Không đổi schema.

## Hành vi
- `GET /admin/violations` · `GET /admin/violations/:id` · `GET /admin/violations/sources/:clubId`.
- `POST /admin/violations` `{ clubId, originType, originRefId?, severity, title, description?, evidence? }` → 201.
- `POST /admin/violations/:id/steps` với `type`: `investigate` · `addEvidence` · `requestResponse` ·
  `recordResponse` · `decide` · `addActions` · `verifyAction` · `resolve`. Bước không hợp lệ ở trạng thái
  hiện tại → 409; thiếu lý do/chứng cứ/hạn → 400.

## Hợp đồng dữ liệu cho phía CLB (trả lời giải trình — dev phía CLB làm)
Khi `violations.state = "Awaiting Club Response"` và `clubResponse.source` chưa có, người có quyền của CLB
ghi vào `clubResponse` (giữ nguyên `requestMessage`, `requestedBy`, `requestedAt`, `dueAt`):
`source: "CLUB"`, `text` (≤ 5 000 ký tự), `respondedBy` (userId), `respondedAt`; không đổi `state`; ghi
audit `Violation` `VIOLATION_RESPONSE_SUBMITTED`. Trả lời sau `dueAt` vẫn nhận nhưng ICPDP thấy là trễ.

## Tiêu chí nghiệm thu
- [x] Không phải ICPDP → 403.
- [x] Mở hồ sơ kiểm tra nguồn gốc, mức độ, tiêu đề, bản ghi liên quan thuộc đúng CLB.
- [x] Không kết luận vi phạm khi chưa có giải trình / ghi nhận không phản hồi; thiếu chứng cứ → 400.
- [x] "Không phản hồi" chỉ ghi được sau hạn; giải trình chỉ ghi một lần.
- [x] Kết luận không vi phạm đóng hồ sơ ở mọi bước trước quyết định.
- [x] Biện pháp: hạn tương lai; kiểm tra hết "hoàn thành" → `Resolved`; còn mục chờ thì không kết thúc được.
- [x] Mỗi bước ghi audit; ban điều hành CLB nhận thông báo ở các bước liên quan đến CLB.
- [ ] Kiểm tra trực quan (desktop/mobile, `en`/`vi`, sáng/tối).

## Ngoài phạm vi
Upload file chứng cứ, UI trả lời phía CLB, mở hồ sơ tự động từ UC37/UC47, tự tạm ngừng CLB, UC51/UC52.

## Changelog
- v1.0.0 (2026-10-10) — được người dùng duyệt.
