# Quy tắc dự án — đọc từ đây

Nguồn chân lý duy nhất của dự án. Mọi file cấu hình agent trong repo này
(`CLAUDE.md`, `AGENTS.md`, …) chỉ là con trỏ tới thư mục này và không chứa quy tắc nào của
riêng nó — nếu bạn được dẫn tới đây, hãy đọc trang này, rồi đọc file của tầng bạn sắp đụng vào.

Express 5 + Mongoose + React 19 (Vite) + TypeScript, npm workspaces (`server/`, `client/`).
Cách cài đặt và các lệnh: [`README.md`](../README.md) ở thư mục gốc.
Definition of Done: `npm run check` xanh.

## Đọc trước khi viết code

| Đọc file này | Trước khi |
|---|---|
| [architecture.md](architecture.md) | quyết định code đặt *ở đâu* — 4 tầng, mỗi thư mục là gì / vì sao / khi nào |
| [backend.md](backend.md) | làm bất cứ việc gì trong `server/` — bảo mật, ranh giới tầng, hợp đồng response, chuẩn TypeScript/testing/git, các cổng review, chính sách AI agent |
| [frontend.md](frontend.md) | làm bất cứ việc gì trong `client/` — stack React, cấu trúc thư mục, quy tắc component/fetch/styling, an toàn theme & ngôn ngữ, checklist trước khi code |

Cộng thêm `README.md` của chính thư mục bạn sắp ghi file vào — xem mục dưới.

## Quy tắc áp dụng ở mọi nơi

1. **Đọc `README.md` của thư mục đích trước khi ghi một file vào đó.** File đó nói rõ thứ gì
   thuộc về thư mục ấy; mọi thư mục dưới `client/src/`, `server/src/` và `server/tests/` đều có
   một file như vậy. Nếu thứ bạn đang viết không khớp với mô tả thì code đang nằm sai chỗ — hãy
   chuyển nó đi (xem `architecture.md` cho server, cây quyết định trong `frontend.md` cho
   client) thay vì nới rộng mô tả trong README cho vừa. Thư mục mới phải kèm `README.md` trong
   cùng một PR.
2. **Chỗ nào mơ hồ thì hỏi người dùng, không được đoán.** Yêu cầu nghiệp vụ, phạm vi, quy tắc
   nào được áp dụng — hỏi thẳng.
3. **Tính năng mới:** copy `.sdd/specs/_template.md` thành `.sdd/specs/feat-{name}/SPEC.md` +
   `TASKS.md` trước khi code (`feat-users/` là ví dụ mẫu đã làm đầy đủ). Cập nhật `TASKS.md`
   mỗi khi hoàn thành một task.
4. **Quyết định kiến trúc** ghi vào `.sdd/rfcs/ADR-NNN-*.md` — ghi một lần, không bao giờ sửa
   lịch sử.
5. **Ngôn ngữ.** Quy ước hai làn, cố ý tách bạch:

   | Loại nội dung | Ngôn ngữ |
   |---|---|
   | Tài liệu — `docs/`, `.rules/`, `.sdd/`, mọi `README.md` | **Tiếng Việt** |
   | Code, comment trong code, tên biến/hàm/file, commit message, config, thông báo lỗi, test | **Tiếng Anh** |
   | Chuỗi hiển thị cho người dùng trên UI | Cả hai, qua i18next (`en` / `vi`) |

   Lý do tách: tài liệu là để cả nhóm và giảng viên đọc, nên dùng tiếng mẹ đẻ đọc nhanh và
   chính xác hơn. Code thì ngược lại — nó sống cạnh thư viện, framework và thông báo lỗi tiếng
   Anh, nên trộn tiếng Việt vào định danh và comment làm codebase khó đọc và khó tìm kiếm hơn.

   **Định danh kỹ thuật giữ nguyên tiếng Anh kể cả trong tài liệu tiếng Việt**: mã UC/FR/BR,
   tên trạng thái (`Pending Approval`), tên collection và trường dữ liệu, tên module, đường dẫn
   file, endpoint, tên tầng (`domain`, `usecase`, `interface`, `infra`). Chúng xuất hiện nguyên
   văn trong code, dịch đi là mất khả năng đối chiếu tài liệu ↔ code.

Việc gì agent được tự làm và việc gì phải hỏi người trước, xem
[backend.md §Chính sách AI Agent](backend.md#chính-sách-ai-agent).

## Sửa đổi quy tắc

`backend.md` chỉ đổi qua PR có sự đồng ý của nhóm, và **mỗi quy tắc cơ học mới phải kèm phần
kiểm tra tự động của nó trong `scripts/check-constitution.sh` ngay trong cùng PR** — một quy
tắc không có máy kiểm tra chỉ là một lời khuyên (xem backend.md §Sửa đổi). Những quy tắc chỉ
con người review được thì phải ghi rõ là như vậy.
