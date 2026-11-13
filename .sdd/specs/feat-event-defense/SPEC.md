# SPEC: feat-event-defense

## Vấn đề
Đối với các sự kiện đề xuất có quy mô lớn, phức tạp hoặc kinh phí cao, ICPDP cần có cơ chế hẹn gặp trực tiếp Ban chủ nhiệm CLB để CLB thuyết trình, bảo vệ đề án và giải trình ngân sách/kế hoạch trước hội đồng thẩm định. Cần hỗ trợ quy trình đặt lịch phòng học (chống trùng lịch phòng), CLB xác nhận hoặc xin dời lịch, màn hình bảo vệ trực tiếp (Live Defense Room) cho nhiều cán bộ cùng tham gia ghi chú Markdown cá nhân, và 4 nhánh quyết định sau bảo vệ (Phê duyệt kèm chốt ngân sách, Từ chối, Yêu cầu sửa đổi, Bảo vệ lại).

## Hành vi
- **UC25 Phía CLB**:
  - `GET /clubs/:clubId/events/:id/defense`: Xem thông tin chi tiết lịch hẹn bảo vệ (thời gian bắt đầu, thời lượng dự kiến, địa điểm phòng học `ROOM`, ghi chú của ICPDP).
  - `POST /clubs/:clubId/events/:id/defense/confirm`: Club Leader (`club.event.manage`) xác nhận tham gia buổi bảo vệ trước giờ diễn ra ít nhất 24 giờ. Quá hạn 24 giờ mà chưa xác nhận, hệ thống gửi cảnh báo quá hạn cho ICPDP Officer. Trạng thái chuyển `SCHEDULED → CONFIRMED`.
  - `POST /clubs/:clubId/events/:id/defense/reschedule-request`: Club Leader gửi đề xuất xin dời lịch kèm lý do chi tiết (bận thi, học tập bất khả kháng). Trạng thái chuyển `RESCHEDULE_REQUESTED` chờ ICPDP phản hồi.
  - Ngoại lệ: Nếu CLB vắng mặt (`NO_SHOW`) $\rightarrow$ Sự kiện tự động chuyển sang `Rejected` và ghi nhận điểm trừ uy tín (BR63).
  - Ngoại lệ: Nếu sự kiện được ICPDP yêu cầu sửa đổi trong thời gian có lịch bảo vệ, hạn chót sửa (`revisionDeadlineAt`) bắt buộc phải trước giờ bảo vệ ít nhất 12 giờ. Quá hạn 12h này mà không nộp $\rightarrow$ sự kiện chuyển `Expired`, lịch bảo vệ tự động bị hủy (`CANCELLED`), phòng học được giải phóng.

- **UC26 Phía ICPDP**:
  - `POST /admin/event-proposals/:id/defense/schedule`: Officer phụ trách task (`assigneeId`) tạo lịch bảo vệ: chọn phòng học `ROOM` đang `Active`, thời lượng dự kiến (phút, tính ra `endAt`), ghi chú. Lịch phải được tạo trước giờ diễn ra ít nhất 48 giờ.
    - Hệ thống kiểm tra xung đột phòng học: Lịch phân phòng học kỳ UC58, các buổi bảo vệ khác, lịch bảo trì phòng. Nếu trùng $\rightarrow$ 409 Conflict.
    - Hệ thống tự động **khóa phòng học (đánh dấu BẬN)** trong khung giờ bảo vệ.
    - Hệ thống **khóa tạm thời 2 nút Phê duyệt và Từ chối** của sự kiện (chỉ cho phép Yêu cầu sửa đổi với hạn nộp trước bảo vệ $\ge 12$ giờ).
  - `POST /admin/event-proposals/:id/defense/cancel`: Officer chủ động hủy lịch bảo vệ kèm lý do $\rightarrow$ giải phóng phòng học, mở lại quyền Phê duyệt / Từ chối thông thường.
  - `POST /admin/event-proposals/:id/defense/respond-reschedule`: Officer phản hồi đề xuất xin dời lịch của CLB: chấp thuận (chọn phòng/giờ mới, giải phóng phòng cũ) hoặc bác bỏ (giữ nguyên lịch).
  - `POST /admin/event-proposals/:id/defense/start`: Đến giờ hẹn (hoặc trước tối đa 30 phút), Officer bấm "Bắt đầu bảo vệ" $\rightarrow$ trạng thái chuyển `IN_PROGRESS`, mở Màn hình bảo vệ trực tiếp (Live Defense Room).
  - `PUT /admin/event-proposals/:id/defense/notes`: Auto-save định kỳ (mỗi 2 giây) nội dung ghi chú Markdown cá nhân của từng cán bộ tham gia phòng bảo vệ.
  - `GET /admin/event-proposals/:id/defense/session`: API polling nhẹ (mỗi 3 giây) đồng bộ trạng thái buổi bảo vệ và danh sách cán bộ đang tham gia.
  - `POST /admin/event-proposals/:id/defense/no-show`: Đánh dấu CLB vắng mặt $\rightarrow$ Buổi bảo vệ chuyển `NO_SHOW`, sự kiện tự động chuyển `Rejected`.
  - `POST /admin/event-proposals/:id/defense/end`: Cán bộ chủ trì (Assignee) bấm "Kết thúc bảo vệ" $\rightarrow$ chuyển sang `DEFENDED`, lưu toàn bộ ghi chú của mọi người vào biên bản.
  - `POST /admin/event-proposals/:id/defense/decision`: Ra 1 trong 4 quyết định:
    1. `Reject`: Từ chối sự kiện kèm lý do $\rightarrow$ Sự kiện chuyển `Rejected`.
    2. `Approve`: Phê duyệt sự kiện. Nếu sự kiện có ngân sách $\rightarrow$ bắt buộc chốt `approvedAmount` từng dòng (kèm lý do nếu giảm) $\rightarrow$ tạo `eventBudgets` ở `Approved` và sự kiện chuyển `Approved`.
    3. `Request revision`: Nhập nội dung cần sửa và hạn nộp mới $\rightarrow$ sự kiện chuyển `Revision Requested`.
    4. `Re-defense`: Cho phép bảo vệ lại $\rightarrow$ sự kiện chuyển sang trạng thái `Re-defense Pending` để chờ xếp lịch lần tiếp theo. Không giới hạn số lần bảo vệ lại (do ICPDP toàn quyền quyết định).

## Hợp đồng dữ liệu
- Document `eventDefenseSessions`:
  ```typescript
  interface EventDefenseSessionDoc {
    _id: Types.ObjectId;
    eventId: Types.ObjectId;
    revisionNo: number;
    title: string;
    startAt: Date;
    endAt: Date;
    durationMinutes: number;
    propertyId: Types.ObjectId;
    propertyName: string;
    note?: string;
    state: "SCHEDULED" | "CONFIRMED" | "RESCHEDULE_REQUESTED" | "IN_PROGRESS" | "DEFENDED" | "CANCELLED" | "NO_SHOW";
    rescheduleReason?: string;
    confirmedAt?: Date;
    confirmedBy?: Types.ObjectId;
    startedAt?: Date;
    endedAt?: Date;
    leadOfficerId: Types.ObjectId;
    notes: { officerId: Types.ObjectId; officerName: string; content: string; updatedAt: Date }[];
    outcome?: "PASSED" | "FAILED" | "REVISION_REQUIRED" | "RE_DEFENSE";
    outcomeReason?: string;
    createdAt: Date;
    updatedAt: Date;
  }
  ```

## Tiêu chí nghiệm thu
- [ ] Kiểm tra xung đột phòng học: Từ chối tạo lịch nếu phòng trùng lịch UC58 hoặc buổi bảo vệ khác.
- [ ] Khóa phòng: Phòng học đã chọn được đánh dấu BẬN trong khung giờ và từ chối các booking khác.
- [ ] Khóa quyền quyết định: Khi có lịch bảo vệ hiệu lực, API chặn không cho Approve / Reject sự kiện.
- [ ] CLB confirm / xin dời lịch: Bắt buộc confirm trước 24h; dời lịch gửi lý do và chờ ICPDP duyệt.
- [ ] Xử lý No-show: Bấm No-show tự động chuyển sự kiện sang `Rejected`.
- [ ] Live Defense Room: Hiển thị 2 cột, hỗ trợ nhiều cán bộ ghi chú Markdown riêng, auto-save 2s, polling đồng bộ 3s.
- [ ] Chỉ Assignee có quyền bấm Bắt đầu, Kết thúc và Quyết định.
- [ ] Quyết định Phê duyệt sau bảo vệ bắt buộc chốt số tiền duyệt từng dòng nếu sự kiện có ngân sách.
- [ ] Hạn sửa trước bảo vệ ít nhất 12h: Quá hạn sửa tự động chuyển sự kiện `Expired` và hủy lịch bảo vệ.
- [ ] Trạng thái `Re-defense Pending` cho phép xếp lịch bảo vệ lần sau không giới hạn số lần.

## Ngoài phạm vi
- Tích hợp gọi video trực tuyến (Google Meet/Zoom) - buổi bảo vệ diễn ra trực tiếp tại phòng học cơ sở.
- Thuật toán biên tập văn bản đồng thời (OT/CRDT) - mỗi cán bộ có tab ghi chú Markdown độc lập.

## Changelog
- 2026-11-13 — Khởi tạo đặc tả tính năng theo yêu cầu hoàn thiện luồng thẩm định sự kiện phức tạp.
