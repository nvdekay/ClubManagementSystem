# Bàn giao Wave 2 — đặt cơ sở vật chất

Cập nhật ngày 2026-10-10. Phạm vi UC45/UC46/UC47 phía CLB và ICPDP; tái sử dụng danh mục
UC44. Hợp đồng chi tiết và AC ở [SPEC](../../.sdd/specs/feat-facility-booking/SPEC.md),
trạng thái công việc ở [TASKS](../../.sdd/specs/feat-facility-booking/TASKS.md).

## Quy tắc đã chốt

| Slot | Giờ sử dụng (UTC+7) | Hạn tạo/sửa/gửi trong ngày sử dụng |
|---|---|---|
| 1 | 07:30–09:50 | Trước 07:30 |
| 2 | 10:00–12:20 | Trước 07:30 |
| 3 | 12:50–15:10 | Trước 09:50 |
| 4 | 15:20–17:40 | Trước 12:20 |

Đúng mốc bị từ chối; chưa có Slot 5/6. Backend kiểm tra cả ở usecase và transaction khi
nộp, tránh bản nháp lưu sớm nhưng gửi quá hạn. ICPDP có thể duyệt sau hạn gửi nếu slot
chưa bắt đầu. Phương án thay thế phải là một slot hợp lệ; CLB chọn dùng rồi gửi lại
vẫn phải đáp ứng hạn gửi.

Cùng property/ngày/slot xung đột; hai slot kế tiếp được phép đặt. Policy overbooking
vẫn quyết định chặn hay cảnh báo. Lịch cũ và sự kiện ngoài slot giữ khoảng đệm policy;
blackout luôn chặn. Số người vượt sức chứa chỉ cảnh báo. Huỷ dưới 24 giờ trước giờ bắt
đầu ghi nhận huỷ muộn; đúng 24 giờ không muộn.

Không đổi schema, dependency hoặc env. Snapshot version bất biến và equipment ở auditLogs;
claim, decision, notification cùng transaction. Duyệt cạnh tranh cùng phòng được tuần tự hoá
bằng khoá ghi property. Job phút chuyển Approved → In Use → Completed. Cascade vòng đời CLB
đã nối release; chưa có thao tác trả sớm In Use. Luồng sự kiện UC25/UC28 nối thêm khi triển khai Wave 3.

## Giao diện

- CLB: `/club/:clubId/bookings`, cần `club.booking.manage`.
- ICPDP: `/workspace/bookings`, cần `ICPDP_OFFICER`.
- Lịch sử booking dùng AppTable, AppPagination, chọn 5/10/20/50 dòng; lọc trạng thái về trang đầu.
- Chọn phòng, slot, sự kiện, trạng thái và quyết định dùng AppSelect.
- Tạo/sửa trong AppDialog; thiết bị/sự kiện và chi tiết giờ được đặt nằm trong phần mở rộng.
- ICPDP nhận thẩm định, ghi lý do, duyệt/từ chối/yêu cầu chỉnh sửa và đề xuất phòng/slot thay thế.
- UC44 hiển thị yêu cầu đang chờ vướng blackout; lịch sử version/quyết định đọc trong chi tiết.

## Dữ liệu để test

Chạy từ thư mục gốc:

```sh
npm run seed:demo -- --owner=tnh.t1k30.ht@gmail.com
```

Account hiện có được cấp ICPDP và quyền Chủ nhiệm HEBE. Phòng mẫu: DE312 (Delta tầng 3),
DE222 và DE223 (Delta tầng 2), sức chứa demo 40; đây là fixture, không phải danh mục phòng
được campus xác nhận cho phép đặt. Tên phòng dùng mã campus; mã PH tự sinh giữ để tham chiếu
nội bộ UC44. Giờ mẫu 07:30–17:40 mỗi ngày.

Kết quả seed kiểm chứng ngày 2026-10-10:

| Ngày | Phòng | Slot | Trạng thái | Mục đích |
|---|---|---|---|---|
| 13/10/2026 | DE312 | 1 | Requested | Demo campus slot booking: Requested |
| 14/10/2026 | DE222 | 2 | Draft | Demo campus slot booking: Draft |
| 15/10/2026 | DE223 | 3 | Approved | Demo campus slot booking: Approved |
| 16/10/2026 | DE312 | 4 | Revision Requested | Demo campus slot booking: Revision Requested |

Bản Revision Requested có headcount 60 để thử cảnh báo và phương án đổi sang DE222.
Bốn booking mẫu khung giờ cũ chuyển Released, giữ lịch sử. Seed lại không tạo trùng hoặc
đổi booking của người dùng; ngày của fixture mới được tính tương đối từ lần tạo đầu tiên.

## Cách kiểm tra

1. Đăng nhập account trên, chọn workspace HEBE rồi mở Đặt cơ sở vật chất.
2. Mở Draft, sửa trong dialog và gửi; chuyển ICPDP để nhận, duyệt hoặc yêu cầu chỉnh sửa.
3. Dùng Revision Requested để thử chọn phương án thay thế, sửa headcount và nộp version mới.
4. Tạo yêu cầu cùng phòng/ngày/slot đã Approved để kiểm tra xung đột; thử slot kế tiếp.
5. Huỷ Requested/Approved với lý do để kiểm tra giải phóng lịch và lịch sử.
6. Kiểm tra deadline bằng test: ngay trước mốc được phép, đúng mốc/sau mốc bị từ chối.

`GET /api/v1/booking-slots` là nguồn danh mục slot cho cả UI; API chi tiết phục vụ ở `/docs`.

## Kiểm chứng

- `npm run check`: constitution, lint, typecheck; 81 file / 361 test, gồm Mongo thật.
- `npm run build -w client`: thành công; cảnh báo kích thước bundle hiện có vẫn còn.
- Chrome với API fixture: CLB/ICPDP, en/vi, sáng/tối, 390/1440 px; tạo trong dialog,
  đề xuất thay thế, đúng timestamp UTC+7, không lỗi JS hoặc tràn ngang trang.
- Fixture 25 booking kiểm tra đổi trang, trang cuối, chọn số dòng, lọc về trang đầu và
  chọn slot bằng bàn phím. Persistence kiểm tra riêng bằng integration Mongo.
- Chạy seed hai lần: 3 phòng, 4 booking mới và 4 booking cũ Released, không nhân đôi.
