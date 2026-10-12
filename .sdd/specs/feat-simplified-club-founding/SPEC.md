# SPEC: feat-simplified-club-founding

> Người dùng duyệt toàn bộ quyết định và thay đổi schema (2026-10-09). Mục tiêu: sinh viên chỉ điền những gì
> chỉ họ biết, hệ thống tự suy ra/làm sẵn phần còn lại; ICPDP không phải hiểu các field kỹ thuật.

## Vấn đề
Form UC07 hiện bắt sinh viên tự dựng cơ cấu tổ chức (mã role, cờ ban điều hành/một người giữ,
tick từng permission) và gõ lĩnh vực tự do; policy UC04 lộ nhiều field kỹ thuật khó hiểu với ICPDP.

## Quyết định đã chốt — phía sinh viên lập hồ sơ
Bắt buộc/không của từng field theo cấu hình policy luồng “Thành lập CLB” (xem phần policy); dưới đây
ghi giá trị mặc định.

1. **Bước 1 · Thông tin CLB:** tên (kiểm tra trùng tên ngay khi gõ); **lĩnh vực chọn ở dropdown**
   từ danh mục lĩnh vực (không gõ tự do); giới thiệu ngắn; mục tiêu hoạt động; fanpage và email
   liên hệ (không bắt buộc). Được duyệt thì các thông tin này đưa thẳng vào hồ sơ công khai của CLB.
2. **Bước 2 · Nhóm sáng lập & chức vụ:** thêm đồng sáng lập bằng email, **không cần họ xác nhận**;
   hiển thị tiến độ “cần thêm N người” theo policy. Mỗi người được gán một chức vụ của **cơ cấu mặc
   định cố định: Chủ nhiệm + Phó chủ nhiệm + Thành viên**; người nộp mặc định là Chủ nhiệm.
   **Bắt buộc đúng 1 Chủ nhiệm và 1–2 Phó chủ nhiệm.**
3. **Quyền mặc định** (hệ thống tự gắn, sinh viên không cấu hình): **Chủ nhiệm** = mọi quyền;
   **Phó chủ nhiệm** = toàn bộ `GRANTABLE_CLUB_PERMISSIONS`, trừ nhóm `LEADER_ONLY_CLUB_PERMISSIONS`
   (sửa cơ cấu/quyền, đề cử BCN, kế hoạch chuyển giao, đề nghị đình chỉ); **Thành viên** = không có
   quyền quản lý. Thêm ban/chức vụ để sau, ở UC09 khi CLB đã hoạt động.
4. **Bước 3 · Hồ sơ đính kèm** (thay cho danh sách tài liệu theo policy):
   - **Đề án thành lập CLB:** 1 file **.docx hoặc .pdf**, ≤ 10MB, mặc định bắt buộc.
   - **Bộ nhận diện CLB:** **logo dự kiến**, **PNG/JPG ≤ 2MB**, khuyến nghị ảnh vuông (vd. 512×512),
     **không nhận SVG**, mặc định bắt buộc. Được duyệt thì thành logo công khai của CLB.
   - Giấy tờ khác (nếu cần) ICPDP yêu cầu qua “Yêu cầu chỉnh sửa”.
5. **Bước 4 · Xem lại & nộp:** hệ thống tự kiểm tra đủ field bắt buộc, đủ người, đủ Chủ nhiệm/Phó
   chủ nhiệm, trùng tên, chủ nhiệm chồng nhiệm kỳ — và chỉ thẳng chỗ thiếu.
6. **Duyệt hồ sơ = duyệt luôn ban chủ nhiệm khởi lập.** Duyệt xong CLB **Active ngay**, founder nhận
   đúng chức vụ ở bước 2; không qua UC10 cho lần khởi lập (UC10 chỉ còn cho các lần đổi BCN sau).
   Ràng buộc của UC10 (vd. không làm chủ nhiệm 2 CLB chồng nhiệm kỳ) kiểm tra lúc nộp và lúc duyệt.

## Quyết định đã chốt — lĩnh vực CLB
- Khởi tạo sẵn 6 lĩnh vực: Công nghệ, Ngôn ngữ, Kỹ năng, Nghệ thuật, Thể thao, Cộng đồng.
- **ICPDP được CRUD lĩnh vực** (thêm, đổi tên, xoá). Đề xuất kỹ thuật (chờ duyệt schema):
  CLB/hồ sơ tham chiếu lĩnh vực theo id → đổi tên tự cập nhật mọi nơi; lĩnh vực **đang có CLB/hồ sơ
  dùng thì “xoá” = ẩn khỏi dropdown**, CLB cũ giữ nguyên; chưa ai dùng thì xoá hẳn.

## Quyết định đã chốt — policy phía ICPDP
- **Bỏ khỏi policy (chỉ 2 thứ):** `mandatoryApplicationDocuments` (thay bằng đề án + logo cố định)
  và `allowedEmailDomains` (domain đăng nhập lấy từ cấu hình server). Các field khác giữ nguyên.
- UI policy **chia theo luồng nghiệp vụ**. Trong mỗi luồng có form cố định, **ICPDP chọn field nào
  bắt buộc / không bắt buộc**; một số field luôn bắt buộc (khoá, không cho tắt).
- Luồng thành lập CLB:
  | Field | Mặc định | ICPDP đổi được? |
  |---|---|---|
  | Tên CLB, Lĩnh vực | Bắt buộc | Không (khoá) |
  | Giới thiệu ngắn, Mục tiêu hoạt động | Bắt buộc | Có |
  | Đề án thành lập (.docx/.pdf) | Bắt buộc | Có |
  | Logo dự kiến (PNG/JPG ≤ 2MB) | Bắt buộc | Có |
  | Fanpage, Email liên hệ | Không bắt buộc | Có |
  | Số người sáng lập tối thiểu | Giữ giá trị policy hiện tại (số) | Có |
- Cấu hình bắt buộc/không áp dụng cho **2 luồng có form cố định: Thành lập CLB và Hồ sơ CLB**
  (giới thiệu, email, SĐT, link điều lệ, kênh truyền thông, phạm vi hoạt động). Form tuyển thành
  viên / đăng ký sự kiện do CLB tự thiết kế → không áp dụng. Các field policy còn lại chỉ được
  nhóm vào tab đúng luồng (Sự kiện, Tuyển thành viên, Năm học, Báo cáo).
- Cấu hình bắt buộc/không thuộc phiên bản policy: hồ sơ được kiểm tra theo policy lúc nộp/nộp lại.

## Lệch so với SRS cần ghi nhận
- FR-UC07-12/13 (sinh viên tự định nghĩa role và permission trong hồ sơ) được thay bằng cơ cấu mặc
  định cố định; quyền tuỳ biến chuyển sang UC09.
- Policy UC04 không còn domain email và danh sách tài liệu bắt buộc.
- Lĩnh vực CLB thành danh mục do ICPDP quản lý (SRS không có).

## Thiết kế kỹ thuật
- **Danh mục lĩnh vực** — collection mới `clubFields { name, normalizedName (unique), sortOrder,
  isActive, createdAt, updatedAt }`. `clubs.field` vẫn lưu **tên** (bản sao denormalize theo DAT-06)
  để không đổi tìm kiếm CLB/dữ liệu PDP; đổi tên một lĩnh vực cập nhật `clubs.field` và
  `draftPayload.field` của hồ sơ đang sửa trong cùng giao dịch. Xoá: chưa CLB/hồ sơ nào dùng → xoá
  cứng; đang dùng → `isActive=false` (ẩn khỏi dropdown). “Chưa phân loại” không nằm trong danh mục.
- **Policy** — bỏ `allowedEmailDomains`, `mandatoryApplicationDocuments`; thêm
  `formRequirements { clubFounding: {summary, objectives, proposal, logo, fanpageUrl, contactEmail},
  clubProfile: {description, contactEmail, contactPhone, charterUrl, channels, operatingScope} }`
  (bool = bắt buộc). Bản policy cũ thiếu field này được đọc với giá trị mặc định. Đăng nhập dùng
  `ALLOWED_DOMAIN` của server (`*` = mọi domain).
- **Hồ sơ** — `draftPayload`/snapshot: `clubName, fieldId, field, summary, objectives, fanpageUrl,
  contactEmail, founders[{userId, role: LEADER|VICE_LEADER|MEMBER}], documents[]` với
  `documentType ∈ {PROPOSAL, LOGO}` (tối đa 1 file mỗi loại). Logo upload công khai (đường dẫn ngẫu
  nhiên) để xem trước và làm `clubs.logoUrl` khi duyệt; đề án vẫn lưu `authenticated`. Snapshot dạng cũ
  (`foundingUserIds`/`proposedRoles`) được đọc thành founders: người nộp = LEADER, còn lại = MEMBER.
- **Duyệt** — trong một giao dịch: tạo CLB `Active` (mô tả, email, fanpage, logo từ hồ sơ), nhiệm kỳ
  khởi lập 1 năm đã xác nhận, 3 position mặc định (`CLUB_LEADER`, `VICE_LEADER`, `MEMBERS`) + cơ cấu
  version 1, membership cho mọi founder (`defaultRole = MEMBERS`), assignment đã xác nhận cho Chủ
  nhiệm/Phó chủ nhiệm; từ chối nếu Chủ nhiệm đang giữ ghế chủ nhiệm hiệu lực ở CLB khác. Thông báo
  cho mọi founder.

## Tiêu chí nghiệm thu
- [x] Nộp hồ sơ bị từ chối khi thiếu field bắt buộc theo `formRequirements.clubFounding`, thiếu
      người, không đúng 1 Chủ nhiệm, 0 hoặc > 2 Phó chủ nhiệm, lĩnh vực không còn hoạt động, hoặc Chủ
      nhiệm đang là chủ nhiệm CLB khác.
- [x] Field không bắt buộc theo policy được bỏ trống mà vẫn nộp được.
- [x] Đề án chỉ nhận PDF/DOCX ≤ 10MB; logo chỉ nhận PNG/JPG ≤ 2MB; SVG bị từ chối.
- [x] Duyệt hồ sơ tạo CLB `Active` với đúng chức vụ, quyền mặc định và logo; Phó chủ nhiệm có mọi
      quyền trừ `LEADER_ONLY_CLUB_PERMISSIONS`.
- [x] ICPDP thêm/đổi tên/xoá lĩnh vực; đổi tên cập nhật CLB đang dùng; xoá lĩnh vực đang dùng chỉ ẩn.
- [x] Policy không còn domain email/tài liệu bắt buộc; lưu và đọc `formRequirements`.
- [x] Cập nhật hồ sơ CLB bị từ chối khi thiếu field mà `formRequirements.clubProfile` bắt buộc.

## Ngoài phạm vi
- Job tự chuyển hồ sơ quá hạn sửa sang `Expired`; kiểm tra trùng tên giữa các hồ sơ đang chờ.
- Thông báo cho đồng sáng lập khi được thêm vào hồ sơ (chỉ thông báo khi duyệt).

## Changelog
- v1.0.0 (2026-10-10) — người dùng duyệt toàn bộ quyết định và thay đổi schema; đã hiện thực server + client.
