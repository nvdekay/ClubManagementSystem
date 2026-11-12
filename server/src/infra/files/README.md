# files/

Adapter lưu và tải tệp ngoài MongoDB. Port của nghiệp vụ nằm ở `domain/`; thư mục này chỉ gọi Cloudinary bằng cấu hình đã được kiểm tra ở `infra/config/`. Không đưa credential hay URL của provider ra client.

Cũng gồm `export-file-writer.ts`: sinh file xuất dữ liệu (UC55) dạng `xlsx` (exceljs), `csv` và `pdf` (pdfkit + font DejaVu để hiển thị tiếng Việt).
Xuất nhiều loại cùng lúc (FR-UC55-12) ra một `xlsx`: sheet "Thông tin" rồi mỗi loại một sheet.
Báo cáo tổng kết năm học (UC55 A2) cũng ở đây: `pdf` sáu phần và `xlsx` ba sheet "Tổng quan", "Xếp loại", "Tiêu chí".
