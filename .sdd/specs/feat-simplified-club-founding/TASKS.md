# TASKS: feat-simplified-club-founding

- [x] Chốt quyết định với người dùng và ghi SPEC (2026-10-09).
- [x] DBML + schema sinh lại: `clubFields`, `policyVersions.formRequirements`, bỏ 2 field policy, cập nhật note hồ sơ.
- [x] Domain + use case danh mục lĩnh vực (CRUD ICPDP), Mongo repository, route, OpenAPI, test.
- [x] Policy: bỏ domain email/tài liệu bắt buộc, thêm `formRequirements`; auth dùng `ALLOWED_DOMAIN`; test.
- [x] Hồ sơ: draft mới (lĩnh vực theo id, founders + chức vụ, đề án, logo), validator, upload theo loại, test.
- [x] Duyệt: tạo CLB Active + cơ cấu mặc định + gán chức vụ; kiểm tra chủ nhiệm chồng nhiệm kỳ; test.
- [x] Hồ sơ CLB: áp `formRequirements.clubProfile` khi cập nhật; test.
- [x] Seed/seed-demo theo dữ liệu mới.
- [x] Client: form hồ sơ 4 bước, trang duyệt, trang policy chia tab theo luồng, trang lĩnh vực; i18n en/vi.
- [x] `npm run check` xanh: 198/198 test (gồm integration với Mongo thật), lint, typecheck, build client (2026-10-10).
- [ ] Kiểm tra trực quan bằng trình duyệt (sáng/tối, vi/en) và upload đề án/logo với Cloudinary thật.
- [ ] Job tự chuyển hồ sơ quá hạn sửa sang `Expired` (ngoài phạm vi, chưa làm).
