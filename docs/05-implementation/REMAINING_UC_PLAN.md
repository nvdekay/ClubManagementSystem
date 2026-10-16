# Kế hoạch hoàn thiện use case còn lại

> Cập nhật ngày 15/10/2026 theo `origin/main` commit `60fc2db`. Ánh xạ đầy đủ nằm ở
> [`../CURRENT_IMPLEMENTATION.md`](../CURRENT_IMPLEMENTATION.md).

## Baseline truy cập

Phía CLB chỉ có Club Leader và Club Member cố định. Club Leader là Chủ nhiệm hoặc Phó chủ nhiệm
đã xác nhận và có toàn bộ permission quản lý; Club Member không có permission quản lý. UC23
không triển khai; API/UI role tự tạo và việc cấp permission lẻ đã gỡ.

## P0 — Luồng nghiệp vụ đã hoàn thành ngày 15/10/2026

| UC | Đã làm | Kiểm chứng |
|---|---|---|
| UC12 | Club Leader lập, sửa, nộp và nộp lại transition plan; quyền chỉ đổi khi ICPDP xác nhận UC13 | Integration Mongo, UI |
| UC14 | Club Leader gửi suspension request kèm xác nhận ảnh hưởng; ICPDP duyệt ở `/workspace/suspension-requests` | Integration (một quyết định khi cạnh tranh), UI |
| UC21 A2 | Job tái xác nhận đầu kỳ, hạn 14 ngày, quá hạn chuyển `Inactive`, Leader được miễn | Integration đúng mốc 14 ngày |
| UC38 | Bản nháp, nộp snapshot không sửa được, nộp lại sau khi UC39 trả về | Integration ba lần nộp qua hai vòng trả |
| UC54 | CLB nhận hoặc từ chối (kèm lý do) lời mời UC53 trước hạn | Unit, integration cạnh tranh |
| UC36/UC37 | Nối `eventFinanceRepo` vào `main.ts`: chứng từ bắt buộc (BR25), hoàn trả trong 7 ngày (BR58), A2 không cấp bù | Unit, integration Mongo |
| UC40/UC43 | CLB gửi giải trình, nộp minh chứng khắc phục; xem kết quả đánh giá `Published` | Integration, UI |
| UC07/08 | Job chuyển hồ sơ quá hạn sửa sang `Expired`, chặn nộp lại quá hạn | Integration đúng deadline |

UC50 đã chốt thành góp ý một chiều ngày 09/10/2026 (`feat-student-feedback`). UC51/UC52 chưa
triển khai; SRS trên `main` vẫn giữ đặc tả, nhóm cần chốt bỏ hẳn hay làm sau. API xem phòng UC58 hiện chỉ cho Leader,
dù sơ đồ cũ từng đặt ở Club Member.

## P1 — Đóng tiêu chí đã có code

1. Thêm ngân sách sự kiện vào seed demo để thử trọn UC35–UC37 trên giao diện với nhiều dòng
   tiền, chứng từ, cấp bù và hoàn trả.
2. Chạy Google OAuth callback thật và Cloudinary upload/download thật; bổ sung dọn asset mồ côi.
3. Visual QA `en`/`vi`, light/dark, 390/1440 px cho các SPEC cũ còn checklist mở.

## P2 — Đồng bộ artifact

- Xuất lại PNG/DOCX/PDF sau khi nguồn diagram hoặc guide thay đổi.
- Sơ đồ use case không được chứa UC23 hay khung permission động.
- Mọi UC vận hành CLB phải nối với Club Leader; Club Member chỉ giữ UC22, UC24 và các phần chỉ
  đọc/tham gia.
- Cập nhật [`../CURRENT_IMPLEMENTATION.md`](../CURRENT_IMPLEMENTATION.md) trong cùng PR với mọi
  thay đổi trạng thái UC.

## Cổng hoàn thành

- `npm run check` xanh.
- Integration Mongo không skip.
- Route/OpenAPI/UI/test cùng tồn tại cho mọi nhánh được tuyên bố hoàn thành.
- Không còn checklist mở trong SPEC/TASKS của feature, trừ mục được ghi rõ là ngoài phạm vi.

## Hạ tầng còn thiếu so với thiết kế đích

- [x] Job Expired hồ sơ thành lập quá hạn sửa UC07/08 (`application-expiry-job`).
- [ ] SMTP delivery/retry, inbox notification tổng quát và lease Mongo dùng chung.
- [ ] Kiểm chứng các phát hiện W4-02/W4-03 của review 11/10 trước khi đóng nghiệm thu tài chính/báo cáo.
