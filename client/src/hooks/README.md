# hooks/

Các React hook tái sử dụng được, mỗi hook một file `use<Name>.ts` — lấy dữ liệu, logic có state
dùng chung. Chỉ dùng state gốc của React (không thư viện state); gọi `services/` để truy cập
API, không bao giờ gọi `fetch` trực tiếp trong component.
