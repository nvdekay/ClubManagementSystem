# 03 — Sơ đồ và bản xuất

Baseline ngày 15/10/2026: [`../CURRENT_IMPLEMENTATION.md`](../CURRENT_IMPLEMENTATION.md) và
[`../05-implementation/UC_CODE_MAPPING.md`](../05-implementation/UC_CODE_MAPPING.md).

| Nguồn | Nội dung |
|---|---|
| `UCMS_UseCase_ByActor.drawio` | 9 trang: All users, Student, Club Member, Club Leader, Leader hồ sơ/tuyển, Leader sự kiện/CSVC, ICPDP access/lifecycle, ICPDP event/finance/facilities, ICPDP compliance/evaluation. Oval là thao tác đã có route/UI và mount; UC thiếu ghi chú dưới hình |
| `UCMS_Context_Diagram_v2.1.drawio` | 4 actor, 12 luồng gom nhóm, 2 tích hợp đã nối (Google OAuth, Cloudinary); Google SMTP chưa có worker trong main.ts, ghi ở note |
| `UCMS_Organization_and_Flows.drawio` | Cơ cấu hai role cố định và các luồng đích; không coi sơ đồ là chứng nhận đã triển khai hết |
| `UCMS_Swimlane_Flows.drawio` | 14 luồng; trang 9 là Student Feedback một chiều. Các luồng có note trạng thái code ngày 15/10/2026 |
| `UCMS_State_Diagrams.drawio` | Máy trạng thái dữ liệu; Pending Setup vẫn được giữ vì tương thích, UC08 hiện tạo Active ngay |
| `UCMS_ERD.drawio` | ERD vật lý theo DBML, 51 collection; field role cũ không cấp quyền runtime, complaints lưu góp ý một chiều |
| `UCMS_Package_Diagrams.drawio` | Package server/client và hướng phụ thuộc |
| `UCMS_Screen_Flow.drawio` | Luồng màn hình thiết kế lịch sử, không phải bản xuất router hiện tại. Route thực xem `client/src/main.tsx` và ma trận UC; UI danh bạ yêu cầu đăng nhập, khác API public |
| `UCMS_System_Architecture.drawio` | Thiết kế kiến trúc gốc; trạng thái worker phải đối chiếu main.ts |
| `UCMS_Context_Diagram.drawio`, `UCMS_Context_Diagram_v2.drawio` | Nguồn lịch sử; không dùng làm baseline runtime |

## Quyền và phạm vi

Club Leader là Chủ nhiệm hoặc Phó chủ nhiệm có membership Active và assignment đã xác nhận trong
nhiệm kỳ còn hiệu lực; cả hai nhận cùng 14 permission. Club Member không có permission quản lý.
UC23 và role tự tạo đã rút. UC50 là góp ý một chiều; UC51/UC52 ngoài phạm vi. API xem phòng UC58
chỉ cho Leader.

Từ 15/10/2026, UC12/UC14/UC38/UC40/UC43/UC54 có API/UI phía CLB và UC36/UC37 đã nối vào app chính;
note trạng thái trên workflow và use case đã cập nhật theo.

## Tái sinh và xuất

```sh
python3 docs/03-diagrams/sync-current-diagrams.py
```

Script sinh lại nguồn use case/context và cập nhật note workflow. Mở draw.io để xuất trang đã
đổi thành PNG trong `img/`, rồi cập nhật ảnh nhúng vào `../UCMS_UseCase_ByActor.docx` và report v2.
Bản nguồn và PNG ngày 15/10/2026 đã đồng bộ, nền trắng.

Tên PNG cũ được giữ cho link tương thích; `09_Complaint-Handling.png` hiện là Student Feedback,
và tên trang Club Member cũ không biểu thị quyền booking. Oval chỉ ghi chức năng; mã UC và trạng
thái nằm ở note. Association nét liền, include nét đứt hướng tới chức năng con, kế thừa actor
dùng tam giác rỗng hướng tới cha trực tiếp. Sửa source và PNG trong cùng commit.

ERD dùng Crow's Foot, PK/FK/UQ/NN, kiểu dữ liệu và unique index ghép. ObjectId là tham chiếu Mongo,
không phải khoá ngoại được cưỡng chế. Nguồn schema: `../05-implementation/UCMS_Database_Design.dbml`.
