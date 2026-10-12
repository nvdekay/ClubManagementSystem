# SPEC: feat-club-applications

## Vấn đề
Sinh viên cần nộp hồ sơ thành lập CLB để ICPDP thẩm định. Mọi lần nộp phải giữ bản chụp bất biến của nội dung và cơ cấu role đã gửi, áp dụng đúng chính sách hiệu lực khi nộp.

## Hành vi
- UC07 thu thập tên, lĩnh vực, mục tiêu, thành viên sáng lập, tài liệu và cơ cấu role dự kiến. Khi nộp, lấy `minFoundingMembers` và `mandatoryApplicationDocuments` từ một `PolicyVersion` hiệu lực; không dùng con số hard-code.
- Chặn thiếu trường bắt buộc, thiếu founder, trùng founder, thiếu tài liệu bắt buộc, thiếu role Chủ nhiệm/Members, role trùng code hoặc permission ngoài danh mục cấp được. Bốn permission riêng Club Leader không nằm trong cấu hình role.
- Nộp tạo `ClubApplicationVersion` mới và review task; version đã nộp không sửa hoặc xoá. Sửa lại từ `Revision Requested` tạo version kế tiếp. Chỉ người đứng đơn thao tác hồ sơ của mình. Rút hồ sơ chưa có quyết định và đóng review task còn mở.
- Draft lưu dữ liệu đang sửa trong `clubApplications.draftPayload` (JSON); tên CLB và lĩnh vực phải có trước lần lưu đầu vì DBML yêu cầu hai cột này. `clubApplicationVersions` chỉ nhận snapshot khi nộp. Người dùng đã cho phép thêm trường này vào DBML/schema.
- Tệp đi qua backend và port Cloudinary theo B6, giới hạn loại/dung lượng; server lưu metadata và `assetId` do Cloudinary trả về trong `draftPayload`/version, không nhận URL do client tự khai. Tệp chỉ tải qua route có kiểm tra quyền, dùng Cloudinary asset `authenticated`; credentials để trống trong `.env.example` và người dùng tự điền sau.
- UI Student theo các màn thành lập trong mockup, dùng route có thể mở trực tiếp, trạng thái loading/error/empty, i18n `en`/`vi`, light/dark.

## Tiêu chí nghiệm thu
- [ ] Hồ sơ thiếu tài liệu, thiếu founder tối thiểu hoặc cơ cấu sai bị từ chối trước mọi ghi dữ liệu.
- [ ] Một lần nộp tạo đúng một version bất biến và review task; nộp lại tạo version số kế tiếp.
- [ ] Student khác không đọc/sửa/rút hồ sơ không thuộc mình.
- [ ] Rút `Submitted`/`Under Review`/`Revision Requested` được, nhưng hồ sơ đã quyết định bị từ chối.
- [ ] Form và trang trạng thái khớp SRS và mockup, có đường trở lại sau đăng nhập.

## Ngoài phạm vi
UC08 quyết định hồ sơ và tạo CLB; UC09–15 quản trị CLB sau phê duyệt.

## Changelog
- v0.2.0 (2026-10-03) — người dùng chấp thuận `draftPayload` và Cloudinary; các route draft/nộp/version/withdraw, form Student và adapter tệp đã được triển khai.
