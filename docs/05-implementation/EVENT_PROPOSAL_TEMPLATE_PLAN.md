# Kế hoạch Cập nhật Tài liệu, Sơ đồ & Triển khai Code — Template & Upload Đề án Sự kiện (`feat-event-proposal-document`)

> **Ngày lập:** 2026-11-14  
> **Nhánh làm việc:** `internal-event`  
> **Trạng thái:** Đã chốt toàn bộ quy tắc nghiệp vụ và phương án xử lý các trường hợp biên (Edge Cases).

---

## 1. Tổng hợp Quy tắc Nghiệp vụ & Quyết định Thiết kế Đã Chốt (Baseline)

### 1.1. Phạm vi Áp dụng
- **Chỉ áp dụng cho luồng "Đề xuất sự kiện với ICPDP"** (`/club/:clubId/events/new` và `/club/:clubId/events/:eventId/edit` — bao gồm sự kiện `PUBLIC` và sự kiện `MEMBERS_ONLY` có xin ngân sách trường).
- **Không áp dụng** cho luồng **"Tạo sự kiện nội bộ"** (`/club/:clubId/events/internal/new` — sự kiện tự túc của CLB không qua ICPDP thẩm định).

### 1.2. Quản lý File Template Đề án Sự kiện phía ICPDP
1. **File Template mặc định của hệ thống (Không bao giờ rơi vào trạng thái rỗng / Cold Start):**
   - Hệ thống sử dụng file mẫu gốc đặt tại [`docs/Template Đề án sự kiện.docx`](../Template%20Đề%20án%20sự%20kiện.docx) làm template mặc định ban đầu.
   - Khi ICPDP chưa từng upload bản template mới lên hệ thống (hoặc khi chạy ở môi trường local/test chưa cấu hình Cloudinary), API tải template sẽ phục vụ trực tiếp từ file mặc định `docs/Template Đề án sự kiện.docx`. Nhờ đó CLB **luôn tải được file template ngay từ lần đầu tiên** mà không bao giờ gặp trạng thái thiếu mẫu.
2. **Cập nhật / Thay thế Template mới (Chỉ thay thế, không xoá):**
   - Chỉ người dùng có vai trò `ICPDP_OFFICER` mới có quyền upload file template mới.
   - Vị trí đặt tính năng: trên thanh công cụ / thẻ cấu hình của trang **Hàng đợi Đề xuất Sự kiện ICPDP** ([`client/src/pages/icpdp/EventProposalQueuePage.tsx`](../../client/src/pages/icpdp/EventProposalQueuePage.tsx)).
   - **Không cho phép xoá hoặc vô hiệu hoá template:** ICPDP chỉ có thể **Tải về mẫu hiện hành** hoặc **Tải lên mẫu mới để thay thế mẫu cũ**.
   - Mỗi lần ICPDP upload mẫu mới:
     - Kiểm tra định dạng cho phép (`.docx`, `.pdf`, `.xlsx`), dung lượng tối đa `10 MB`, `bytes.length > 0` và khớp chữ ký byte (magic bytes).
     - Lưu metadata của bản mới (`id`, `fileName`, `mimeType`, `bytes`, `assetId`, `uploadedBy`, `uploadedAt`) làm template active hiện hành; giữ lịch sử cập nhật trong audit log.
     - Các đề xuất sự kiện mà CLB đã nộp trước thời điểm thay mẫu vẫn giữ nguyên file đề án cũ của CLB; các CLB bấm tải mẫu từ thời điểm này trở đi sẽ nhận bản mẫu mới nhất.

### 1.3. Tải Template & Upload Đề án Sự kiện phía CLB (`UC25`)
1. **Tải Template trên trang Điền thông tin Đề xuất ([`ClubEventProposalPage.tsx`](../../client/src/pages/club/ClubEventProposalPage.tsx)):**
   - Ngay đầu form (hoặc trong khu vực **Hồ sơ Đề án Sự kiện**), hiển thị thông tin file mẫu hiện hành của ICPDP (`fileName`, dung lượng, thời점 cập nhật) kèm nút **"Tải file mẫu đề án"**.
   - Bấm tải mẫu hoạt động độc lập (qua endpoint tải file hoặc lấy signed URL 60s tại đúng thời điểm bấm), **không làm reload trang hay mất dữ liệu đang điền dở trên form**.
2. **Trường thông tin bắt buộc `"Upload đề án sự kiện"` (`proposalDocument`):**
   - Hỗ trợ định dạng `.docx` và `.pdf` (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/pdf`), dung lượng tối đa `10 MB`, kiểm tra cả đuôi file, `Content-Type` và magic bytes ở phía server.
   - Hỗ trợ đầy đủ tên file tiếng Việt có dấu, khoảng trắng và ký tự Unicode (truyền qua header `X-Filename` được `encodeURIComponent` / `decodeURIComponent` và sanitize an toàn).
   - **Quy tắc Lưu nháp (`Draft`) vs Gửi duyệt (`Submit`):**
     - **Khi Lưu nháp (`Save`):** Cho phép lưu nháp khi chưa chọn file đề án (để CLB có thể lưu thông tin cơ bản trước trong lúc chờ hoàn thiện file Word/PDF). Nếu CLB đã chọn file trên form tạo mới hoặc sửa nháp, sau khi lưu nháp xong hệ thống tự động upload file gắn vào `eventId` đó.
     - **Khi Lưu & Gửi duyệt (`Save & Submit`):** Trường `"Upload đề án sự kiện"` là **bắt buộc (`required`)**.
       - Trên Client: nếu sự kiện chưa có `proposalDocument` đã lưu và người dùng chưa chọn file mới → báo lỗi `required` ngay tại trường `"Upload đề án sự kiện"` và chặn gửi.
       - Trên Server: khi thực thi action `submit` (`Draft` / `Revision Requested` → `Pending Approval` / `Under Review`), nếu bản nháp hiện tại chưa có `proposalDocument` → ném `DomainError("event proposal document is required", "validation")`.
   - **Xử lý Thứ tự Tạo mới + Upload & Đồng bộ `expectedVersion` (Chống lỗi `409 Conflict` & `Orphan File`):**
     - Khi đang ở trang tạo mới (`isNew === true`, chưa có `eventId` trong DB): khi người dùng chọn file, giữ đối tượng `File` trong state `pendingFile` của React (chưa đẩy lên Cloudinary ngay để tránh sinh file mồ côi nếu người dùng đóng tab).
     - Khi người dùng bấm **Lưu** hoặc **Lưu & Gửi**:
       1. Gọi API tạo/lưu thông tin form (`create` hoặc `save`) → nhận về `savedEvent` (có `id` và `version` mới).
       2. Nếu có `pendingFile`: gọi ngay API `POST /api/v1/clubs/:clubId/events/:id/proposal-document` để upload file → server lưu metadata file vào bản nháp, tăng `__v` và trả về `ClubEventDetail` mới nhất; client cập nhật `savedEvent = uploaded.event` (đồng bộ lại `activeVersion = uploaded.event.version`) và xoá `pendingFile`.
       3. Nếu người dùng bấm **Lưu & Gửi**: gọi tiếp `submit` với `expectedVersion: savedEvent.version` mới nhất.
     - Khi người dùng đang sửa một sự kiện đã có `eventId` (`Draft` hoặc `Revision Requested`): có thể thay thế file đề án mới bất kỳ lúc nào; chỉ giữ 1 `proposalDocument` active trên bản nháp hiện tại, và **không xoá** asset cũ trên Cloudinary nếu asset đó đã được đóng băng trong một `eventProposalVersions` đã nộp trước đó.
     - Trong suốt thời gian đang upload file hoặc đang gửi form, khoá (`disabled`) các nút hành động để tránh race condition.
   - **Chú thích rõ vai trò dữ liệu trên Form:**
     - Hiển thị ghi chú hướng dẫn tại khu vực upload: các trường *Thời gian, Địa điểm, Sức chứa, Hạng mục ngân sách* trên biểu mẫu là dữ liệu chính thức để hệ thống kiểm tra trùng lịch và hạn mức ngân sách; file đề án đính kèm là văn bản chi tiết trình ICPDP thẩm định.

### 1.4. Thẩm định ICPDP (`UC26`), Yêu cầu Chỉnh sửa (`Revision`) & Đổi lịch (`Reschedule` — `UC28`)
1. **Xem & Tải Đề án trên trang Thẩm định ([`EventProposalReviewPage.tsx`](../../client/src/pages/icpdp/EventProposalReviewPage.tsx)) và trang Chi tiết Sự kiện CLB ([`ClubEventsPage.tsx`](../../client/src/pages/club/ClubEventsPage.tsx)):**
   - Hiển thị tên file, dung lượng, thời điểm tải lên và nút **Tải đề án** (kèm nút **Xem trực tiếp** mở tab mới với `inline: true` nếu `mimeType === "application/pdf"`).
   - Cán bộ ICPDP có thể tải/xem file đề án của **phiên bản hiện tại (`currentRevisionNo`)** cũng như **mọi phiên bản lịch sử (`versions`)**.
2. **Yêu cầu chỉnh sửa (`Request revision`) & So sánh Phiên bản (`RevisionChanges`):**
   - Giữ nguyên danh sách `EVENT_REVIEW_SECTIONS = ["schedule", "venue", "content", "risk", "budget", "other"]`.
   - Cập nhật nhãn hiển thị của mục `"content"` trên UI thẩm định ICPDP và thông báo phía CLB thành **"Nội dung, kế hoạch & file đề án"** (`"Content, plan & proposal document"`). Khi ICPDP gắn cờ mục `"content"`, trường `"Upload đề án sự kiện"` trên `ClubEventProposalPage.tsx` cũng hiển thị badge cảnh báo `Cần sửa` (`flag("content")`).
   - Bổ sung trường `proposalDocument` vào danh sách `versionFields` trong `EventProposalReviewPage.tsx` để bảng so sánh `RevisionChanges` tự động hiển thị sự thay đổi file đề án giữa các lần nộp (`v1` ↔ `v2`).
3. **Đổi lịch sự kiện đã duyệt (`Reschedule` — `UC28`):**
   - Khi CLB đổi lịch sự kiện ở trạng thái `Approved` / `Upcoming`, bản sửa `eventProposalVersions` mới sinh ra tự động **kế thừa nguyên vẹn `proposalDocument`** của phiên bản trước đó.
4. **Tương thích dữ liệu cũ (`Backward compatibility`) & Seed Demo:**
   - Các sự kiện đã tồn tại trong DB từ trước khi có tính năng này (không có `proposalDocument`): trang chi tiết sự kiện và trang thẩm định ICPDP hiển thị *"Chưa có file đề án đính kèm"* mà không phát sinh lỗi.
   - Nếu một sự kiện cũ đang ở `Draft` hoặc `Revision Requested`, khi CLB mở sửa và bấm **Lưu & Gửi** lại thì hệ thống sẽ yêu cầu bổ sung file đề án.
   - Cập nhật dữ liệu seed (`seed-demo.ts`) để các sự kiện đề xuất mẫu có sẵn metadata `proposalDocument` hợp lệ phục vụ kiểm thử và demo.
5. **Bảo mật & Phân quyền truy cập file (`Authorization`):**
   - File đề án của CLB được lưu trên Cloudinary ở chế độ `authenticated` (`private`).
   - Endpoint lấy link truy cập file đề án của sự kiện chỉ cho phép:
     - Thành viên có quyền `club.event.manage` của chính CLB sở hữu sự kiện đó; hoặc
     - Cán bộ có vai trò `ICPDP_OFFICER`.
   - Không trả trường `assetId` của Cloudinary ra JSON response cho client (ẩn qua mapper `publicProposalDocument`).

---

## 2. Phần 1 — Kế hoạch Cập nhật Tài liệu (`docs/`) & Sơ đồ (`docs/03-diagrams/`)

### 2.1. Các Tài liệu Đặc tả cần cập nhật
1. **[`docs/SRS.md`](../SRS.md):**
   - **UC25 (`FR-UC25-01`, dữ liệu vào & quy tắc nộp đề xuất):** Bổ sung yêu cầu tải file mẫu đề án sự kiện do ICPDP cung cấp và trường bắt buộc **Upload đề án sự kiện (`proposalDocument`, PDF/DOCX, tối đa 10 MB)** khi nộp đề xuất lên ICPDP (`PUBLIC`, hoặc `MEMBERS_ONLY` có ngân sách); ghi rõ không áp dụng cho sự kiện nội bộ tự túc.
   - **UC26 (`FR-UC26-01`, `FR-UC26-02`):** Bổ sung khả năng ICPDP Officer quản lý (upload thay thế) file template đề án sự kiện (mặc định khởi tạo từ `docs/Template Đề án sự kiện.docx`, không thể xoá) và xem/tải file đề án đính kèm theo từng revision; ghi chú mục `"content"` khi yêu cầu chỉnh sửa bao gồm cả nội dung kế hoạch và file đề án đính kèm.
2. **[`docs/02-use-cases/UCMS_UseCase_Specification_v2.md`](../02-use-cases/UCMS_UseCase_Specification_v2.md):**
   - **Mục `UC25`:**
     - *Dữ liệu vào:* Bổ sung `proposalDocument` (file đề án `.docx`/`.pdf` bắt buộc khi nộp đề xuất ICPDP).
     - *Luồng chính:* Bổ sung bước CLB tải file template đề án của ICPDP về hoàn thiện và tải lên file đề án sự kiện trước khi bấm gửi duyệt.
     - *Ngoại lệ:* Thêm ngoại lệ từ chối nộp đề xuất ICPDP khi thiếu `proposalDocument` hoặc file không hợp lệ (vẫn cho lưu nháp `Draft`).
   - **Mục `UC26`:**
     - Bổ sung thao tác ICPDP Officer tải lên file template đề án mới để thay thế template hiện hành và xem/tải `proposalDocument` của từng bản sửa (`EventProposalVersion`).
3. **[`docs/01-business-analysis/UCMS_Business_System_Analysis.md`](../01-business-analysis/UCMS_Business_System_Analysis.md):**
   - Đồng bộ mô tả luồng đề xuất ICPDP (UC24/UC25/UC26 trong tài liệu BA) có bước tải template của ICPDP và đính kèm file đề án bắt buộc.
4. **[`docs/05-implementation/UC_CODE_MAPPING.md`](UC_CODE_MAPPING.md) & [`docs/CURRENT_IMPLEMENTATION.md`](../CURRENT_IMPLEMENTATION.md):**
   - Bổ sung các endpoint mới phục vụ quản lý/tải template đề án và upload/tải file đề án sự kiện.
5. **[`docs/08-defense-scripts/flow-05-club-events.md`](../08-defense-scripts/flow-05-club-events.md):**
   - Cập nhật kịch bản demo: ICPDP thay thế template đề án → CLB tải template tại trang tạo đề xuất → CLB upload file đề án và gửi duyệt → ICPDP xem/tải file đề án trên trang review.

### 2.2. Các File Sơ đồ (`.drawio`) cần cập nhật
1. **[`docs/03-diagrams/UCMS_Swimlane_Flows.drawio`](../03-diagrams/UCMS_Swimlane_Flows.drawio) (Trang `swim-04` — `04 Event Proposal`):**
   - Cập nhật bước khởi tạo đề xuất của Club Leader (`f04-9` / `f04-12`): ghi rõ *"Download ICPDP proposal template, fill form & upload required proposal document (PDF/DOCX)"* đối với nhánh đề xuất ICPDP.
   - Cập nhật bước thẩm định của ICPDP Officer (`f04-13`): ghi rõ kiểm tra nội dung, ngân sách và file đề án đính kèm (`proposalDocument`).
2. **[`docs/03-diagrams/UCMS_Main_Workflow.drawio`](../03-diagrams/UCMS_Main_Workflow.drawio) (Trang `mw-07-event-management`):**
   - Cập nhật `f7_s1` và `f7_s3`: bổ sung chi tiết đính kèm file đề án theo mẫu ICPDP cho nhánh `Propose to ICPDP`.
3. **[`docs/03-diagrams/UCMS_Sequence_Diagrams.drawio`](../03-diagrams/UCMS_Sequence_Diagrams.drawio):**
   - **Trang `seq05p1` & `seq05p2` (`05 Submit event proposal`):**
     - Bổ sung bước tải template (`GET /events/proposal-template`) và upload file đề án (`POST /clubs/:clubId/events/:id/proposal-document` → Cloudinary) trước khi gọi `submit` (`assertProposalDocument`).
   - **Trang `seq06p1` (`06 Decide event proposal (1/3)`):**
     - Ghi nhận bước ICPDP Officer lấy signed URL xem/tải `proposalDocument` (`GET /admin/event-proposals/:id/document`) và chú thích section `"content"` bao gồm cả file đề án.
4. **[`docs/03-diagrams/UCMS_Class_Diagrams.drawio`](../03-diagrams/UCMS_Class_Diagrams.drawio):**
   - Cập nhật các trang `01 Review-Event-Proposal`, `02 Request-Event-Proposal-Revision`, `03 Resubmit-Event-Proposal`, `10 Cancel-or-Reschedule-Event`:
     - Bổ sung kiểu `EventProposalDocument` và phương thức upload/access file đề án cùng template đề án trong `ClubEventRoutes`, `EventProposalReviewRoutes`, `ClubEventRepository`, `EventProposalReviewRepository`.
5. **Kiểm tra tính toàn vẹn XML của `.drawio`:**
   - Chạy script kiểm tra cấu trúc XML, tính duy nhất của `id` và tính hợp lệ của `source`/`target` trên toàn bộ các file `.drawio` sau khi sửa (`DRAWIO_TOTAL_ERRORS: 0`).

---

## 3. Phần 2 — Kế hoạch Coding Chi tiết theo Từng Tầng Kiến trúc

### Bước 0: Khởi tạo SDD Spec (`.sdd/specs/feat-event-proposal-document/`)
Theo quy tắc tại [`.rules/README.md`](../../.rules/README.md):
- Tạo `.sdd/specs/feat-event-proposal-document/README.md`, `SPEC.md` và `TASKS.md` mô tả đầy đủ các quy tắc ở Mục 1 và checklist nghiệm thu.

---

### Bước 1: Thiết kế Lưu trữ & Database (`DBML` & Payload Contract)
> **Ưu điểm thiết kế:** Không cần thêm bảng mới làm thay đổi con số 54 bảng / 28 enum của [`UCMS_Database_Design.dbml`](UCMS_Database_Design.dbml), vừa giữ nguyên cấu trúc schema vật lý vừa đảm bảo truy vết đầy đủ:

1. **Metadata `proposalDocument` của từng sự kiện đề xuất:**
   - Kiểu dữ liệu `EventProposalDocument`:
     ```ts
     export interface EventProposalDocument {
       id: string;
       fileName: string;
       mimeType: string;
       bytes: number;
       assetId: string;
       uploadedAt: Date;
       uploadedBy: string;
     }
     ```
   - Lưu trong payload bản nháp của sự kiện (`EVENT_DRAFT_CREATED` / `EVENT_DRAFT_SAVED` / `EVENT_PROPOSAL_DOCUMENT_UPLOADED` trong `auditLogs`, được đọc qua `eventDraftPayload`) **và** đóng băng trong `eventProposalVersions.payload.proposalDocument` mỗi khi `submit` hoặc `reschedule`.
   - Cập nhật ghi chú cột `payload` của bảng `eventProposalVersions` trong [`docs/05-implementation/UCMS_Database_Design.dbml`](UCMS_Database_Design.dbml) để ghi rõ `payload` chứa cả snapshot `proposalDocument` (`{ id, fileName, mimeType, bytes, assetId, uploadedAt, uploadedBy }`).
2. **Metadata Template Đề án Sự kiện của ICPDP:**
   - Lưu bản ghi cập nhật template của ICPDP trong `auditLogs` với `entityType: "SystemTemplate"`, `action: "EVENT_PROPOSAL_TEMPLATE_UPDATED"`, `after: { id, fileName, mimeType, bytes, assetId, uploadedAt, uploadedBy }` (append-only theo đúng triết lý chỉ-ghi-thêm của hệ thống, bản mới nhất theo `at: -1, _id: -1` là template active hiện hành; không thể xoá, chỉ có thể thêm bản ghi thay thế mới).
   - Khi chưa có bản ghi `EVENT_PROPOSAL_TEMPLATE_UPDATED` nào trong DB (hoặc khi bản ghi là mặc định hệ thống), tự động đọc trực tiếp file [`docs/Template Đề án sự kiện.docx`](../Template%20Đề%20án%20sự%20kiện.docx) từ đĩa.

---

### Bước 2: Tầng Domain (`server/src/domain/`)
Không import từ `usecase`, `infra` hay `interface`, không dùng `any`:

1. **[`server/src/domain/club-event.ts`](../../server/src/domain/club-event.ts):**
   - Khai báo:
     - `EventProposalDocument`: `{ id: string; fileName: string; mimeType: string; bytes: number; assetId: string; uploadedAt: Date; uploadedBy: string }`
     - `PublicEventProposalDocument = Omit<EventProposalDocument, "assetId">`
     - `EventProposalTemplateInfo`: `{ fileName: string; mimeType: string; bytes: number; updatedAt: Date; isSystemDefault: boolean }`
     - `EventProposalFileStorage`:
       ```ts
       export interface EventProposalFileStorage {
         uploadProposalDocument(input: {
           clubId: string;
           eventId: string;
           actorId: string;
           fileName: string;
           mimeType: string;
           bytes: Buffer;
           now: Date;
         }): Promise<EventProposalDocument>;
         uploadTemplateDocument(input: {
           actorId: string;
           fileName: string;
           mimeType: string;
           bytes: Buffer;
           now: Date;
         }): Promise<EventProposalDocument>;
         accessUrl(assetId: string, options?: { inline?: boolean }): Promise<string>;
       }
       ```
   - Mở rộng `ClubEvent`: thêm `proposalDocument?: EventProposalDocument`.
   - Mở rộng `ClubEventRepository`:
     - `attachProposalDocument(clubId: string, eventId: string, doc: EventProposalDocument, actorId: string, now: Date): Promise<ClubEventDetail>`
     - `findProposalDocument(clubId: string, eventId: string, revisionNo?: number): Promise<EventProposalDocument | null>`
     - `getProposalTemplate(): Promise<{ info: EventProposalTemplateInfo; assetId?: string }>`
     - `saveProposalTemplate(doc: EventProposalDocument, actorId: string, now: Date): Promise<EventProposalTemplateInfo>`
2. **[`server/src/domain/club-event-rules.ts`](../../server/src/domain/club-event-rules.ts):**
   - Khai báo hằng số kiểm tra file đề án & template:
     - `PROPOSAL_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024` (10 MB).
     - `PROPOSAL_DOCUMENT_MIME_TYPES`: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
     - `PROPOSAL_TEMPLATE_MIME_TYPES`: hỗ trợ thêm `.xlsx` (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) bên cạnh `.docx` và `.pdf`.
   - Hàm `validateEventProposalFile(fileName: string, mimeType: string, bytes: Buffer, allowedMimes: ReadonlySet<string>): void`:
     - Kiểm tra `fileName.trim()` dài `1..255` ký tự, không chứa ký tự điều khiển hoặc path separator.
     - Kiểm tra `bytes.length > 0 && bytes.length <= PROPOSAL_DOCUMENT_MAX_BYTES`.
     - Kiểm tra `allowedMimes.has(mimeType)` và khớp chữ ký magic bytes (`%PDF-` cho PDF; `PK\x03\x04` kèm `[Content_Types].xml` và `word/` cho DOCX hoặc `xl/` cho XLSX).
   - Hàm `assertProposalDocumentPresent(doc: EventProposalDocument | undefined): void`:
     - Ném `DomainError("event proposal document is required before submission", "validation")` nếu chưa có file đề án khi `submit`.
3. **[`server/src/domain/event-proposal-review.ts`](../../server/src/domain/event-proposal-review.ts):**
   - Mở rộng `EventProposalReviewRepository`:
     - `findProposalDocumentForReview(eventId: string, revisionNo?: number): Promise<EventProposalDocument | null>`

---

### Bước 3: Tầng Use Case (`server/src/usecase/`)

1. **[`server/src/usecase/club-event.ts`](../../server/src/usecase/club-event.ts):**
   - Bổ sung các use case:
     - `getEventProposalTemplateInfo(deps, actor)`: yêu cầu đã đăng nhập (`club.event.manage` hoặc `ICPDP_OFFICER` hoặc user hợp lệ trong workspace), trả về `EventProposalTemplateInfo`.
     - `downloadEventProposalTemplate(deps, actor)`:
       - Nếu đang dùng template do ICPDP upload trên Cloudinary (`assetId` tồn tại): yêu cầu `deps.files` khả dụng và trả về `{ kind: "redirect", url: await deps.files.accessUrl(assetId), fileName }`.
       - Nếu đang dùng template mặc định của hệ thống (`docs/Template Đề án sự kiện.docx`): trả về `{ kind: "buffer", fileName, mimeType, bytes }` từ `deps.defaultTemplateLoader()`.
     - `uploadEventProposalDocument(deps, actor, clubId, eventId, fileName, mimeType, bytes, now)`:
       - Kiểm tra quyền `club.event.manage` trên `clubId`.
       - Gọi `validateEventProposalFile(fileName, mimeType, bytes, PROPOSAL_DOCUMENT_MIME_TYPES)`.
       - Kiểm tra sự kiện tồn tại, không phải sự kiện nội bộ tự túc (`!isInternalClubEventState(event.state)`), và đang ở trạng thái cho phép sửa (`Draft` hoặc `Revision Requested`).
       - Upload qua `deps.files.uploadProposalDocument(...)` rồi gọi `repo.attachProposalDocument(...)`, trả về `ClubEventDetail` mới nhất (đã tăng `version`).
     - `accessClubEventProposalDocument(deps, actor, clubId, eventId, options, now)`:
       - Kiểm tra quyền `club.event.manage` trên `clubId` (hoặc `ICPDP_OFFICER`).
       - Tìm `EventProposalDocument` theo `eventId` và `revisionNo` (nếu truyền vào; mặc định lấy bản của bản nháp/phiên bản hiện tại).
       - Trả về `{ fileName, mimeType, url: await deps.files.accessUrl(doc.assetId, { inline: options?.inline }) }`.
2. **[`server/src/usecase/event-proposal-review.ts`](../../server/src/usecase/event-proposal-review.ts):**
   - Bổ sung:
     - `uploadEventProposalTemplate(deps, actor, fileName, mimeType, bytes, now)`:
       - Kiểm tra `actor` có vai trò `ICPDP_OFFICER`.
       - Validate file qua `validateEventProposalFile(fileName, mimeType, bytes, PROPOSAL_TEMPLATE_MIME_TYPES)`.
       - Upload qua `deps.files.uploadTemplateDocument(...)` và lưu qua `clubEventRepo.saveProposalTemplate(...)`.
     - `accessReviewProposalDocument(deps, actor, eventId, revisionNo, inline)`:
       - Kiểm tra `actor` có vai trò `ICPDP_OFFICER`.
       - Lấy `EventProposalDocument` của `eventId` (theo `revisionNo` hoặc bản mới nhất) và trả về `{ fileName, mimeType, url }`.

---

### Bước 4: Tầng Infrastructure (`server/src/infra/`)

1. **[`server/src/infra/files/cloudinary-application-files.ts`](../../server/src/infra/files/cloudinary-application-files.ts) & file mới [`server/src/infra/files/cloudinary-event-proposal-files.ts`](../../server/src/infra/files/cloudinary-event-proposal-files.ts):**
   - Mở rộng `extensionForMime` trong `cloudinary-application-files.ts` hỗ trợ thêm `.xlsx` (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`: `"xlsx"`).
   - Tạo adapter `cloudinaryEventProposalFiles(config: CloudinaryConfig): EventProposalFileStorage` và helper `loadDefaultEventProposalTemplate()` đọc file `docs/Template Đề án sự kiện.docx` (sử dụng đường dẫn tương đối từ thư mục gốc repo, cache buffer trong bộ nhớ sau lần đọc đầu tiên).
   - Trong môi trường test/dev không cấu hình Cloudinary: hỗ trợ fallback hoặc báo lỗi `file storage is not configured` (`503 unavailable`) rõ ràng khi gọi upload.
2. **[`server/src/infra/db/mongo-club-event-repository.ts`](../../server/src/infra/db/mongo-club-event-repository.ts) & [`server/src/infra/db/club-event-readers.ts`](../../server/src/infra/db/club-event-readers.ts):**
   - Trong `eventDraftPayload()` và `payloadInSession()`:
     - Mở rộng danh sách `action` trong truy vấn `auditLogs` thêm `"EVENT_PROPOSAL_DOCUMENT_UPLOADED"`.
     - Khi CLB gọi `save` (cập nhật các trường text của bản nháp), giữ nguyên `proposalDocument` đã đính kèm trước đó trong `payload` của bản nháp (`{ ...input, proposalDocument: existingDraftPayload.proposalDocument }`) để việc bấm **Lưu** form không làm mất file đã upload!
   - Trong `attachProposalDocument(clubId, eventId, doc, actorId, now)`:
     - Kiểm tra sự kiện thuộc `clubId`, trạng thái `Draft` hoặc `Revision Requested`.
     - Tăng `__v` trên `events` (`$inc: { __v: 1 }`), ghi `auditLogs` với `action: "EVENT_PROPOSAL_DOCUMENT_UPLOADED"` và `after.payload = { ...currentDraftPayload, proposalDocument: doc }`.
     - Trả về `readClubEvent(clubId, eventId)`.
   - Trong `submitVersion(...)`:
     - Đọc `proposalDocument` từ bản nháp hiện tại.
     - Gọi `assertProposalDocumentPresent(proposalDocument)` — chặn nộp nếu thiếu file đề án.
     - Đưa `proposalDocument` vào `eventProposalVersions.payload` (`payload: { ...input, proposalDocument }`) để đóng băng theo từng `revisionNo`.
   - Trong nhánh `reschedule` của sự kiện đề xuất (`Approved` / `Upcoming`):
     - Kế thừa `proposalDocument` từ `payloadInSession` / phiên bản gần nhất khi gọi `submitVersion`.
   - Trong `clubEventFrom()` và `readClubEvent()` (`club-event-readers.ts`):
     - Ánh xạ `proposalDocument` vào `ClubEvent` và từng phần tử của `versions` (ẩn `assetId` ở tầng HTTP).
3. **[`server/src/infra/db/mongo-event-proposal-review-repository.ts`](../../server/src/infra/db/mongo-event-proposal-review-repository.ts):**
   - Cài đặt `findProposalDocumentForReview(eventId, revisionNo?)`: tìm trong `eventProposalVersions` của `eventId` (theo `revisionNo` hoặc bản có `revisionNo` cao nhất) và trả về `payload.proposalDocument`.
4. **[`server/src/infra/db/seed-demo.ts`](../../server/src/infra/db/seed-demo.ts):**
   - Đính kèm metadata `proposalDocument` mẫu vào các đề xuất sự kiện trong bộ seed demo để trang review của ICPDP và trang chi tiết của CLB có sẵn file đề án khi chạy demo.

---

### Bước 5: Tầng Interface HTTP & OpenAPI (`server/src/interface/http/`)

1. **[`server/src/interface/http/club-event-routes.ts`](../../server/src/interface/http/club-event-routes.ts):**
   - Thêm helper `publicEventDetail(detail: ClubEventDetail)` để loại bỏ `assetId` khỏi `event.proposalDocument` và `versions[].payload.proposalDocument` trước khi trả JSON về client.
   - Bổ sung các route:
     - `GET /api/v1/events/proposal-template`: trả về metadata của file template hiện hành (`EventProposalTemplateInfo`).
     - `GET /api/v1/events/proposal-template/download`:
       - Nếu là template mặc định trên đĩa: trả file trực tiếp với `Content-Type` và `Content-Disposition: attachment; filename="Template-De-an-su-kien.docx"; filename*=UTF-8''...`.
       - Nếu là template do ICPDP upload trên Cloudinary: trả JSON `{ fileName, url }` (signed URL 60s) hoặc redirect/stream theo chuẩn của ứng dụng.
     - `POST /api/v1/clubs/:clubId/events/:id/proposal-document` (dùng middleware `raw({ type: () => true, limit: "10mb" })`, đọc `X-Filename` đã `decodeURIComponent` và `Content-Type`): upload/thay thế file đề án cho bản nháp sự kiện và trả về `ClubEventDetail` đã cập nhật `version`.
     - `GET /api/v1/clubs/:clubId/events/:id/proposal-document/access?revisionNo=&inline=`: trả về `{ fileName, mimeType, url }` (signed URL 60s) cho thành viên có quyền `club.event.manage` của CLB.
2. **[`server/src/interface/http/event-proposal-review-routes.ts`](../../server/src/interface/http/event-proposal-review-routes.ts):**
   - Bổ sung các route cho `ICPDP_OFFICER`:
     - `POST /api/v1/admin/event-proposals/template` (`raw({ type: () => true, limit: "10mb" })`): ICPDP upload file template mới thay thế template hiện hành.
     - `GET /api/v1/admin/event-proposals/:id/document/access?revisionNo=&inline=`: ICPDP lấy signed URL để xem trực tiếp (PDF) hoặc tải về file đề án của CLB theo từng `revisionNo`.
   - Trong `GET /api/v1/admin/event-proposals/:id`: đảm bảo `versions[].payload.proposalDocument` đã được lọc bỏ `assetId` (chỉ giữ `{ id, fileName, mimeType, bytes, uploadedAt, uploadedBy }`).
3. **[`server/src/interface/http/openapi-club-events.ts`](../../server/src/interface/http/openapi-club-events.ts) & [`server/src/interface/http/openapi.ts`](../../server/src/interface/http/openapi.ts):**
   - Đăng ký đầy đủ các route mới vào OpenAPI spec để vượt qua kiểm tra `server/tests/unit/openapi.test.ts` và `scripts/check-constitution.sh`.

---

### Bước 6: Tầng Frontend (`client/src/`)

1. **Services & Hooks (`client/src/services/` & `client/src/hooks/`):**
   - [`client/src/services/clubEvents.ts`](../../client/src/services/clubEvents.ts) & [`client/src/hooks/useClubEvents.ts`](../../client/src/hooks/useClubEvents.ts):
     - Thêm kiểu `EventProposalDocumentInfo`, `EventProposalTemplateInfo`.
     - Thêm API `fetchEventProposalTemplate()`, `downloadEventProposalTemplate()`, `uploadEventProposalDocument(clubId, eventId, file, csrfToken)`, `accessEventProposalDocument(clubId, eventId, options)`.
   - [`client/src/services/eventProposalReviews.ts`](../../client/src/services/eventProposalReviews.ts) & [`client/src/hooks/useEventProposalReviews.ts`](../../client/src/hooks/useEventProposalReviews.ts):
     - Thêm API `uploadProposalTemplate(file, csrfToken)` và `accessReviewProposalDocument(eventId, revisionNo, inline)`.
2. **Trang Đề xuất Sự kiện của CLB ([`client/src/pages/club/ClubEventProposalPage.tsx`](../../client/src/pages/club/ClubEventProposalPage.tsx)):**
   - Thêm khu vực **"Đề án sự kiện (Bắt buộc)"** (`sectionCardClass`):
     - **Khối 1 — Tải file mẫu của ICPDP:** Hiển thị tên file mẫu (`Template Đề án sự kiện.docx` hoặc tên mẫu mới do ICPDP cập nhật), dung lượng và nút **"Tải file mẫu đề án"** (`type="button"`, tải độc lập không ảnh hưởng dữ liệu đang nhập).
     - **Khối 2 — Trường `"Upload đề án sự kiện"` (có dấu `*` bắt buộc và badge `flag("content")` khi bị yêu cầu sửa):**
       - Input chọn file `.docx,.pdf` (kiểm tra nhanh ở client dung lượng `<= 10 MB` và định dạng hợp lệ).
       - Hiển thị trạng thái:
         - Nếu đã chọn file mới (`pendingFile`): hiển thị tên file + dung lượng + nhãn *"Sẽ được tải lên khi lưu/gửi"* + nút *"Chọn lại"*.
         - Nếu sự kiện đã có `existing?.proposalDocument` (hoặc vừa upload xong): hiển thị tên file, dung lượng, thời gian tải lên, nút **"Tải về / Xem"** và nút **"Thay đổi file"**.
       - Hiển thị thông báo lỗi `eventField.error("proposalDocument")` khi người dùng bấm **Lưu & Gửi** mà chưa có cả `existing?.proposalDocument` lẫn `pendingFile`.
       - Hiển thị chú thích rõ ràng: *"Các thông tin Thời gian, Địa điểm, Sức chứa và Ngân sách trên biểu mẫu dùng để hệ thống kiểm tra trùng lịch và hạn mức tự động; file đề án đính kèm là văn bản chi tiết trình ICPDP thẩm định."*
   - Cập nhật hàm `persist(shouldSubmit: boolean)`:
     - Khi `shouldSubmit === true`: kiểm tra bắt buộc có file đề án (`Boolean(uploadedDoc || pendingFile)`).
     - Sau khi `create` hoặc `save` thành công → nếu có `pendingFile`, gọi tiếp `uploadEventProposalDocument`, cập nhật `savedEvent` và `createdDraft` theo `version` mới trả về từ API upload → sau đó nếu `shouldSubmit === true` thì gọi `submit` với `expectedVersion: savedEvent.version`.
3. **Trang Chi tiết Sự kiện của CLB ([`client/src/pages/club/ClubEventsPage.tsx`](../../client/src/pages/club/ClubEventsPage.tsx)):**
   - Trong panel chi tiết sự kiện đề xuất: hiển thị tên file đề án đã đính kèm và nút **Tải file đề án** (ẩn đối với sự kiện nội bộ tự túc).
4. **Trang Hàng đợi Đề xuất của ICPDP ([`client/src/pages/icpdp/EventProposalQueuePage.tsx`](../../client/src/pages/icpdp/EventProposalQueuePage.tsx)):**
   - Thêm thẻ/thanh **"Mẫu đề án sự kiện (Event Proposal Template)"** ở đầu trang cho `ICPDP_OFFICER`:
     - Hiển thị tên file mẫu hiện hành, dung lượng, ngày cập nhật (hoặc nhãn *"Mẫu mặc định hệ thống"*).
     - Nút **"Tải mẫu hiện hành"** và nút **"Thay thế mẫu mới"** (chọn file `.docx`, `.pdf`, `.xlsx` tối đa `10 MB` → upload thay thế ngay, không có nút xoá).
5. **Trang Thẩm định Đề xuất của ICPDP ([`client/src/pages/icpdp/EventProposalReviewPage.tsx`](../../client/src/pages/icpdp/EventProposalReviewPage.tsx)):**
   - Hiển thị mục **"File đề án sự kiện"** nổi bật trong phần thông tin đề xuất:
     - Có nút **Tải đề án** (và nút **Xem trực tiếp** nếu là file `.pdf`).
     - Nếu đề xuất có nhiều revision (`versions.length > 1`), cho phép tải file đề án của từng revision và hiển thị dòng so sánh `proposalDocument` trong bảng `RevisionChanges`.
     - Tương thích dữ liệu cũ: nếu đề xuất cũ chưa có `proposalDocument`, hiển thị *"Chưa có file đề án đính kèm"*.
6. **Đa ngôn ngữ (`client/src/i18n/`):**
   - Bổ sung đầy đủ các khoá dịch tiếng Việt (`vi`) và tiếng Anh (`en`) trong `client/src/i18n/clubEvents.ts` và `client/src/i18n/clubOversight.ts` (bao gồm cập nhật nhãn section `"content"` thành *"Nội dung, kế hoạch & file đề án"* / *"Content, plan & proposal document"*).

---

### Bước 7: Kế hoạch Kiểm thử & Nghiệm thu (Definition of Done)

1. **Unit Tests (`server/tests/unit/`):**
   - `club-event.test.ts`:
     - Kiểm tra `validateEventProposalFile`: chấp nhận `.docx` và `.pdf` hợp lệ (`<= 10 MB`); từ chối file rỗng (`0 byte`), file quá `10 MB`, sai MIME hoặc giả mạo đuôi file (magic bytes không khớp).
     - Kiểm tra `assertProposalDocumentPresent`: chặn `submit` khi thiếu `proposalDocument`; cho phép `create`/`save` bản nháp `Draft` khi chưa có `proposalDocument`.
     - Kiểm tra template mặc định luôn đọc được từ `docs/Template Đề án sự kiện.docx` khi ICPDP chưa upload template mới.
   - `openapi.test.ts`:
     - Đảm bảo toàn bộ các endpoint mới (`/events/proposal-template`, `/events/proposal-template/download`, `/clubs/:clubId/events/:id/proposal-document`, `/admin/event-proposals/template`, `/admin/event-proposals/:id/document/access`) đều có `authGuard` và khớp OpenAPI.
2. **Integration Tests (`server/tests/integration/`):**
   - Kiểm tra luồng đầy đủ:
     1. CLB tải template mặc định thành công (`docs/Template Đề án sự kiện.docx`).
     2. ICPDP Officer upload template `.docx` mới thay thế template cũ → CLB tải lại nhận được bản mới.
     3. CLB tạo đề xuất nháp (`Draft`) chưa có file → bấm `submit` bị chặn (`400 validation`).
     4. CLB upload file đề án (`proposalDocument`) → lưu sửa thông tin text trên form không làm mất file và không bị lệch `expectedVersion` → bấm `submit` thành công sang `Pending Approval`, `eventProposalVersions[0].payload.proposalDocument` được đóng băng.
     5. ICPDP Officer yêu cầu chỉnh sửa (`Request revision` mục `"content"`) → CLB upload file đề án v2 và nộp lại → cả file v1 và v2 đều truy cập được theo `revisionNo`.
     6. Khi sự kiện `Approved` được `reschedule`, revision mới tự động kế thừa `proposalDocument`.
     7. Sinh viên không thuộc BCN CLB gọi API lấy link tải file đề án bị từ chối (`403 Forbidden`).
3. **Kiểm tra tổng thể toàn repo:**
   - Chạy `npm run check` (constitution + lint + typecheck + unit/integration tests) và `npm run build --workspaces` xanh 100%.
