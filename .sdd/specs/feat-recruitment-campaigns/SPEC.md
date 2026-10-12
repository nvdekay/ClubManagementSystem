# SPEC: feat-recruitment-campaigns

## Vấn đề
Sau khi CLB chuyển sang `Active`, Club Member có quyền cần tạo và công bố một đợt tuyển có
khung thời gian, chỉ tiêu, vị trí và form rõ ràng. Dữ liệu công bố phải nối với UC06 và là đầu
vào an toàn cho UC17; bản nháp chưa được hiển thị công khai.

## Hành vi
- UC16 chỉ áp dụng cho Club `Active` và actor có `club.recruitment.manage` trong đúng CLB.
- Actor có thể tạo/sửa campaign `Draft` với title, positions, criteria, window, capacity,
  selection steps, form schema và rubric; dữ liệu được kiểm tra ở cả HTTP và domain.
- `windowStart < windowEnd`, capacity dương; form/step/rubric có cấu trúc hợp lệ. Cửa sổ nhận
  đơn phải nằm trọn trong đúng một kỳ của `academicCalendar` trong policy effective tại thời
  điểm publish (đã xác nhận với người dùng ngày 2026-10-08).
- Publish chuyển `Draft → Published`, lưu người/thời điểm công bố. Chỉ campaign công khai đã
  publish và đang trong cửa sổ mới xuất hiện qua UC06.
- Nếu campaign cùng CLB có vị trí giao nhau và cửa sổ giao nhau, API trả cảnh báo kèm campaign
  liên quan; người quản lý có thể xác nhận publish campaign riêng. Không gộp campaign.
- Huỷ campaign chưa có application chuyển sang `Cancelled`; nếu đã có đơn thì đóng nhận đơn,
  giữ application và thông báo các ứng viên bị ảnh hưởng (không xoá lịch sử).
- Không thay đổi DBML: collections `recruitmentCampaigns`, `recruitmentApplications`,
  `policyVersions`, `auditLogs` đã có trong schema.
- UI quản lý campaign đặt trong club workspace; hỗ trợ draft, publish, cancellation, loading,
  lỗi, trạng thái rỗng, responsive, `en`/`vi`, light/dark.

## Tiêu chí nghiệm thu
- [ ] Actor thiếu quyền, sai CLB, hoặc CLB không `Active` không thể tạo/sửa/công bố campaign.
- [ ] Campaign draft được tạo và sửa hợp lệ, không xuất hiện trong public discovery.
- [ ] Invalid positions/window/capacity/form/steps bị từ chối; publish ngoài academic calendar bị từ chối.
- [ ] Publish lưu actor/time, xuất hiện ở UC06 đúng điều kiện, và nhận đơn chỉ trong cửa sổ.
- [ ] Vị trí + thời gian chồng lấn được phát hiện; publish cần xác nhận tường minh và không gộp campaign.
- [ ] Huỷ campaign giữ nguyên applications; campaign không còn nhận đơn; audit và notification
  được ghi khi cần.
- [ ] OpenAPI, unit/integration tests, `npm run check` và client/server builds xanh.
- [ ] UI trực quan được kiểm tra trên desktop/mobile, `en`/`vi`, light/dark.

## Ngoài phạm vi
UC17 nộp/rút đơn, UC18 sàng lọc/quyết định, UC19 đánh giá, UC20 tiếp nhận; sửa sơ đồ hoặc đổi
schema. Các UC sau sẽ được đặc tả riêng và phải dùng đúng contract/state của campaign này.

## Changelog
- v0.2.0 (2026-10-08) — chốt campaign phải nằm trọn trong một kỳ `academicCalendar`; overlap cảnh báo và cho xác nhận publish campaign riêng, không gộp.
- v0.1.0 (2026-10-08) — mở đầu implementation UC16.
