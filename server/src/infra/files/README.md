# files/

Adapter lưu và tải tệp ngoài MongoDB. Port của nghiệp vụ nằm ở `domain/`; thư mục này chỉ gọi Cloudinary bằng cấu hình đã được kiểm tra ở `infra/config/`. Không đưa credential hay URL của provider ra client.

- `cloudinary-application-files.ts`: hàm upload/xoá/signed URL dùng chung với Cloudinary và kho tệp hồ sơ thành lập CLB (UC07: đề án, logo).
- `cloudinary-recruitment-files.ts`: tệp đính kèm đơn ứng tuyển (UC17), luôn private.
- `event-proposal-files.ts`: tài liệu đề xuất sự kiện và template của ICPDP, raw asset có xác thực, đọc qua signed URL 60 giây.
- `cloudinary-periodic-evidence-files.ts`: ảnh minh chứng báo cáo định kỳ (UC38), raw asset có xác thực dưới `ucms/periodic-reports/{clubId}`, đọc qua signed URL 10 phút để hiển thị ngay trên trang; `remove` cho job dọn ảnh không được tham chiếu (feat-upload-orphan-cleanup).

Cũng gồm `export-file-writer.ts`: sinh file xuất dữ liệu (UC55) dạng `xlsx` (exceljs), `csv` và `pdf` (pdfkit + font DejaVu để hiển thị tiếng Việt).
Xuất nhiều loại cùng lúc (FR-UC55-12) ra một `xlsx`: sheet "Thông tin" rồi mỗi loại một sheet.
Báo cáo tổng kết năm học (UC55 A2) cũng ở đây: `pdf` sáu phần và `xlsx` ba sheet "Tổng quan", "Xếp loại", "Tiêu chí".
