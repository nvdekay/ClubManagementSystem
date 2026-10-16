# SPEC: feat-club-compliance

## Vấn đề
UC40 thiếu đầu vào giải trình/khắc phục từ CLB; UC43 thiếu màn CLB đọc kết quả đã công bố.

## Hành vi
- UC40: Leader có club.complaint.respond chỉ đọc hồ sơ cùng CLB từ Awaiting Club Response trở đi; không lộ điều tra nội bộ chưa thông báo.
- Giải trình một lần, giữ nội dung yêu cầu/hạn của ICPDP; source CLUB, text tối đa 5000, nhận quá hạn nhưng ghi thời điểm thật, không tự đổi state. Audit và báo người yêu cầu cùng transaction.
- Khắc phục: khi Corrective Action, Leader nộp mô tả và minh chứng HTTP(S) cho mục Pending chưa nộp; ICPDP vẫn là bên kiểm chứng Verified/Failed. Không tự đánh dấu hoàn thành.
- UC43: Leader có club.report.submit chỉ đọc bản Published của CLB, gồm tiêu chí, điểm, lý giải, nguồn, lịch sử bản đã công bố và xu hướng; không lộ revision nháp.
- API /clubs/:clubId/violations, /:id/response, /:id/actions/:actionId/submission; /clubs/:clubId/evaluations.
- Hai màn CLB song ngữ, loading/error/empty và điều hướng theo quyền.

## Tiêu chí nghiệm thu
- [ ] Chặn Member/CLB khác và hồ sơ chưa thông báo; draft evaluation không lộ.
- [ ] Hai giải trình cạnh tranh chỉ một thành công; giữ requestMessage/dueAt và nhận giải trình muộn.
- [ ] Khắc phục thuộc đúng hồ sơ/CLB, chưa kiểm chứng; ICPDP xem được minh chứng và tự kiểm chứng.
- [ ] Published revision cũ vẫn đọc được trong lúc ICPDP soạn revision mới.
- [ ] Unit/integration, OpenAPI, mount, UI và check/build xanh.

## Ngoài phạm vi
Phản biện kết quả đánh giá và tự thay đổi quyết định ICPDP.

## Changelog
- 2026-10-15 — hoàn thiện phần CLB UC40/43 theo yêu cầu của người dùng.
