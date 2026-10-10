# files/

Adapter lưu và tải tệp ngoài MongoDB. Port của nghiệp vụ nằm ở `domain/`; thư mục này chỉ gọi Cloudinary bằng cấu hình đã được kiểm tra ở `infra/config/`. Không đưa credential hay URL của provider ra client.

Cũng gồm `export-file-writer.ts`: sinh file xuất dữ liệu (UC55) dạng `xlsx` (exceljs), `csv` và `pdf` (pdfkit + font DejaVu để hiển thị tiếng Việt).
