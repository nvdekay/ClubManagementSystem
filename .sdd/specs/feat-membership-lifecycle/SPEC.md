# SPEC: feat-membership-lifecycle

## Vấn đề
Sau khi UC20 tiếp nhận thành viên, CLB cần quản lý trạng thái tư cách thành viên có lịch sử; thành viên cần có cách xin rời CLB, còn CLB thực thi việc kết thúc ở một thao tác riêng.

## Hành vi
- UC21: CMB có `club.member.manage` xem danh sách thành viên và đổi `Active` ⇄ `Inactive`, hoặc đặt `Banned` với lý do bắt buộc.
- UC21 A1: thực thi yêu cầu rời bằng cách chuyển membership sang `Left`; cập nhật ngày kết thúc, status history, audit, role assignments và trạng thái yêu cầu trong cùng transaction.
- UC22: Student có membership `Active`/`Inactive` gửi yêu cầu rời, gồm lý do và ngày đề nghị; yêu cầu không tự đổi trạng thái membership. Student theo dõi yêu cầu; CMB có quyền quản lý xem và thực thi.
- Membership đang giữ ghế ban chủ nhiệm đã xác nhận không thể bị chuyển `Inactive`, `Left` hoặc `Banned`. Yêu cầu rời vẫn được nhận và ở trạng thái `Held` cho tới khi được thay ghế.
- Khi membership thành `Left`/`Banned`, đóng hiệu lực mọi assignment role và gỡ role Members mặc định; không xoá lịch sử.
- Mọi thay đổi ghi audit và gửi thông báo in-app cho các bên liên quan.
- Không thêm collection/field; chỉ đồng bộ partial index đã được người dùng duyệt. Không sửa sơ đồ.

## Quyết định đã chốt với người dùng
- Người dùng đồng ý sửa DBML/generator/generated Mongo index thành partial unique chỉ cho membership `Active`/`Inactive`; membership `Left` có thể được tạo mới khi quay lại, còn `Banned` bị chặn theo BR46.
- Tạm chặn mọi ngày hiệu lực trước hôm nay theo múi giờ `Asia/Ho_Chi_Minh`. Yêu cầu rời có thể đề nghị ngày tương lai; nếu CLB xử lý sau ngày đề nghị, ngày thực thi sẽ là ngày hiện tại để tránh hồi tố dữ liệu đã chốt.

## Ngoài phạm vi của lát cắt này
- UC21 A2: quét tái xác nhận membership đầu học kỳ; cần cơ chế scheduler và trạng thái xác nhận thành viên riêng.
- UC23 quản lý role; UC24 các dữ liệu sự kiện/điểm danh/feedback ngoài phần đơn xin rời.

## Tiêu chí nghiệm thu
- [ ] Chỉ actor có permission đúng của chính CLB mới xem/chỉnh membership và yêu cầu.
- [ ] Student chỉ tạo/theo dõi yêu cầu cho membership của chính mình; việc tạo request không đổi membership.
- [ ] Thi hành request chuyển đúng sang `Left`, liên kết request, thu hồi hiệu lực roles, audit và notification nguyên tử.
- [ ] `Active`/`Inactive` đổi qua lại; `Banned` yêu cầu lý do; `Left`/`Banned` là trạng thái cuối; chỉ người `Left` có thể quay lại bằng membership mới.
- [ ] Ghế ban chủ nhiệm đã xác nhận chặn kết thúc membership; request leave chuyển `Held` và có thể xử lý sau khi thay ghế.
- [ ] Ngày hồi tố bị chặn; ngày thực thi rời không sớm hơn hôm nay, không làm thay đổi attendance/evaluation đã chốt.
- [ ] Unit/integration tests, OpenAPI contract, client UI và production checks pass.

## Changelog
- v1.0.0 (2026-10-09) — người dùng xác nhận sửa partial index và tạm chặn mọi ngày hồi tố; triển khai luồng UC21–UC22.
