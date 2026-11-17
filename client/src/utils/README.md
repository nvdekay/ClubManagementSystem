# utils/

Các helper thuần, nhỏ: `cn()` (gộp className theo mẫu ghi đè CSS), `formatDate`, `formatDay` và các helper ngày theo giờ Việt Nam (`vnDateInput`, `vnDayBoundary`, `vnTomorrowInput`), `formatMoney` (số tiền VND).
`roomSchedule` — nhãn thứ trong tuần và slot dùng chung cho trang phân phòng (ICPDP) và phòng được phân (CLB).
`notificationLink` — ánh xạ `eventCode` của thông báo sang trang đích thuộc đúng workspace của người nhận (sinh viên / ICPDP / CLB, khớp danh sách audience ở `server/src/domain/notification.ts`), nhóm chủ đề (tiêu đề dự phòng) và chủ thể hiển thị lấy từ payload.
`validation` — `isEmail`, `isHttpUrl`: cùng quy tắc với server, dùng cho kiểm tra trường ngay khi nhập (`useFieldValidation`).
`workspaceIcon` — icon của từng loại workspace, dùng chung cho màn chọn workspace và sidebar.
`revisionDiff` — `diffFields`: so hai phiên bản hồ sơ theo danh sách trường có nhãn, trả các trường có nội dung khác nhau.
`campusImage` — `CAMPUS_IMAGE_URL`: ảnh khuôn viên trường dùng chung cho trang đăng nhập và hero trang chủ.
`saveFile` — đưa file tải từ API (blob + tên file) cho trình duyệt lưu xuống.
`proposalFile` — `proposalFileType` (kiểm tra nhanh đuôi file + giới hạn 10 MB của file đề án/template sự kiện, trả MIME để upload) và `formatBytes` (dung lượng KB/MB).

`docxDocument` — đọc riêng `word/document.xml` trong DOCX, giới hạn giải nén 12 MB, giữ bảng/đoạn văn.
`blocks` giữ thứ tự các đoạn văn/bảng trong body, heading, xuống dòng/tab và `columnSpan`/`rowSpan`
để hồ sơ thông tin có thể hiển thị toàn bộ nội dung và ô gộp đúng chỗ.
`eventProposalImport` — ánh xạ bảng tổng quan, Agenda và đề xuất hỗ trợ PDP thành field đề án;
liệt kê thông tin thiếu/mơ hồ, không tự đoán số người hay dùng tổng dự trù thay ngân sách xin trường.
`proposalSections` nhóm toàn bộ block nguồn theo mục chính, giữ cả phần mở đầu và mọi dòng bảng;
nội dung nguồn chỉ phục vụ đọc, không thêm field vào payload lưu/nộp hoặc thay schema.

`documentLinks` — kiểm tra scheme HTTP(S)/mailto, giữ vị trí đích hyperlink và nhận diện URL thường.
`docxDocument` đọc thêm `word/_rels/document.xml.rels`; vị trí link theo UTF-16 được giữ trong paragraph,
cell và các field Overview, kể cả ô gộp/nhãn trùng khác đích. Không ghép đích theo nhãn hiển thị.

`proposalDocumentFrame.ts` là entry riêng cho `client/proposal-preview.html`: dựng toàn bộ DOCX bằng
`docx-preview`, phân trang với `pagedjs`. `proposalDocumentFrame.css` chỉ áp dụng bên trong frame tài liệu,
không phải styling của ứng dụng: giữ font/bảng/ảnh nguồn, trang giấy cố định sáng, canvas theo theme.
`pagedjs.d.ts` khai báo phần API thư viện thực sự được dùng. Không import entry frame vào app React.
