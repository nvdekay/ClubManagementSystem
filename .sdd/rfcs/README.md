# Quyết định kiến trúc

Các file `ADR-NNN-*.md` ghi bối cảnh, quyết định và hệ quả kiến trúc. Không sửa lịch sử;
quyết định thay thế phải có ADR mới. Quy tắc tầng nằm ở `.rules/architecture.md`.

| ADR | Quyết định |
|-----|------------|
| [ADR-001](ADR-001-clean-architecture-layers.md) | Clean architecture 4 tầng trong `server/src` |
| [ADR-002](ADR-002-client-architecture.md) | Kiến trúc client tối giản phụ thuộc |
| [ADR-003](ADR-003-auth-session.md) | Phiên đăng nhập và CSRF |
| [ADR-004](ADR-004-public-before-oauth.md) | Chạy khu công khai trước khi cấu hình Google OAuth |
| [ADR-005](ADR-005-post-event-report-versions.md) | Version bất biến cho báo cáo sau sự kiện |
| [ADR-006](ADR-006-room-allocation-by-icpdp.md) | ICPDP phân phòng học theo học kỳ, lưu bằng booking đã sinh |
| [ADR-007](ADR-007-club-leader-only-permissions.md) | Mọi việc vận hành CLB thuộc riêng Club Leader; role CLB không mang permission |
| [ADR-008](ADR-008-isolated-proposal-document-preview.md) | Bản xem toàn văn đề án trong frame riêng |
| [ADR-009](ADR-009-clickable-document-links.md) | Cho phép mở liên kết từ đề án |
