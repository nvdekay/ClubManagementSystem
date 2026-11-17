# ADR-009: Cho phép mở liên kết từ đề án

Ngày: 2026-11-17. Trạng thái: áp dụng theo yêu cầu người dùng.
Thay riêng quyết định vô hiệu hoá mọi liên kết điều hướng của ADR-008; các phần cách ly renderer còn giữ nguyên.

## Bối cảnh và quyết định

Người dùng yêu cầu liên kết trong file Word cũng bấm mở được trên hệ thống.
Đọc quan hệ hyperlink từ DOCX và giữ offset của từng lần xuất hiện; không suy đích từ nhãn hiển thị.
Cho HTTP(S)/mailto mở tab mới với noopener/noreferrer; nhận diện cả URL viết trực tiếp.
Khung xem bật popup do người dùng bấm và cho tab mới hoạt động độc lập; script/altChunk trong tài liệu
vẫn bị chặn, URL javascript/data/file không được kích hoạt.

## Kiểm chứng và hệ quả

Kiểm thử trình duyệt với các đích local có kiểm soát: click từ hồ sơ và frame đều mở tab mới,
không có opener/referrer và không đổi trang đang soạn. Đối chiếu 110 hyperlink trong file thật:
giữ đúng nhãn, đích và số lần xuất hiện. Không mở website ngoài trong lượt kiểm thử tự động.
