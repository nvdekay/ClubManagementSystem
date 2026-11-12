# SPEC: feat-similar-club-hints

## Vấn đề
Khi thẩm định hồ sơ thành lập (UC08), ICPDP phải tự nhớ xem đã có CLB nào giống CLB đang xin
thành lập hay chưa. Hệ thống hiện chỉ cảnh báo khi trùng **đúng tên** với một CLB `Active`
(FR-UC07-10), nên một CLB khác tên nhưng cùng lĩnh vực và cùng mục tiêu sẽ lọt qua. Tính năng này
gợi ý các CLB có độ giống cao, kèm lý do, để officer cân nhắc và để người nộp biết trước khi nộp.

## Hành vi

### Điểm giống
Điểm là số nguyên 0–100, tính từ ba thành phần, mỗi thành phần nằm trong khoảng 0–1:

| Thành phần | Trọng số | Cách tính |
|---|---|---|
| `name` | 40 | Hệ số Dice trên tập bigram ký tự của tên đã chuẩn hoá |
| `content` | 40 | Hệ số Dice trên tập từ của `summary + objectives` so với `description` của CLB (hoặc `summary + objectives` của hồ sơ khác) |
| `field` | 20 | 1 nếu cùng lĩnh vực, ngược lại 0 |

- Chuẩn hoá: chữ thường, bỏ dấu tiếng Việt (`đ → d`), bỏ ký tự không phải chữ/số, bỏ stopword
  (`clb`, `cau`, `lac`, `bo`, `club`, `fpt`, `fptu`, `va`, `cua`, `cho`, `cac`, `la`, `the`, `of`,
  `and`, …). Danh sách stopword là hằng số trong `domain`.
- Khi một trong hai bên không có nội dung mô tả, thành phần `content` tính là 0 và lý do ghi
  `content: null`. Điểm tối đa khi đó là 60 (trùng tên và cùng lĩnh vực), vẫn đạt mức `HIGH`.
- Mức: `HIGH` khi điểm ≥ 60, `MEDIUM` khi 35–59. Dưới 35 không hiển thị.
- Trả tối đa 5 kết quả, điểm cao trước; bằng điểm thì xếp theo tên với collation `vi`.
- Mỗi kết quả mang theo lý do: điểm từng thành phần và danh sách từ trùng trong nội dung (tối đa
  10 từ), để officer thấy vì sao hệ thống cho là giống.
- Hàm tính điểm là hàm thuần trong `domain`, không gọi dịch vụ ngoài, cùng đầu vào luôn cho cùng
  kết quả.

### ICPDP (UC08)
- Chi tiết thẩm định có thêm `similarClubs`, so hồ sơ với:
  - mọi CLB ở mọi trạng thái (`Pending Setup`, `Active`, `Suspended`, `Dissolving`, `Dissolved`);
  - các hồ sơ thành lập khác đang `Submitted`, `Under Review` hoặc `Revision Requested`.
- Mỗi dòng có: loại (`CLUB` | `APPLICATION`), id, tên, lĩnh vực, trạng thái, điểm, mức, lý do.
- Gợi ý chỉ để tham khảo: không chặn và không tự chọn kết quả nào trong ba kết quả của UC08.

### Người nộp (UC07)
- Phản hồi khi xem bản nháp và khi nộp có thêm `similarClubs`, đặt cạnh `activeNameConflict`.
- Người nộp chỉ được so với CLB `Active`, `Suspended`, `Dissolving`, `Dissolved`. Không trả về hồ
  sơ của người khác và CLB `Pending Setup`, vì đó là thông tin chưa công khai.
- Cảnh báo không chặn việc lưu nháp hay nộp hồ sơ.

### Lỗi và trường hợp biên
- Hồ sơ chưa có tên và chưa có nội dung: trả `similarClubs: []`.
- Hồ sơ không so với chính nó, và không so với CLB được tạo ra từ chính nó (`createdClubId`).
- Phân quyền giữ nguyên theo endpoint hiện có: không thêm endpoint mới.

## Tiêu chí nghiệm thu
- [ ] Hai tên chỉ khác dấu, hoa thường hoặc tiền tố "CLB" cho `name` = 1.
- [ ] Cùng lĩnh vực nhưng tên và nội dung không liên quan cho điểm 20 và không được hiển thị.
- [ ] Trùng tên, cùng lĩnh vực, nội dung gần giống cho mức `HIGH`.
- [ ] CLB không có `description` trùng tên và cùng lĩnh vực đạt 60 (`HIGH`); chỉ cùng lĩnh vực và
  tên không liên quan thì không được hiển thị.
- [ ] Kết quả tối đa 5 dòng, giảm dần theo điểm, kèm lý do từng thành phần và các từ trùng.
- [ ] Officer thấy CLB `Dissolved`, `Suspended` và hồ sơ đang chờ của người khác.
- [ ] Người nộp không bao giờ nhận hồ sơ của người khác hay CLB `Pending Setup`.
- [ ] Hồ sơ có gợi ý mức `HIGH` vẫn nộp được và vẫn được duyệt được.
- [ ] `/docs` mô tả trường `similarClubs` ở cả hai phía; `tests/unit/openapi.test.ts` xanh.
- [ ] UI hiển thị bảng gợi ý ở màn thẩm định và màn hồ sơ của người nộp, có trạng thái rỗng,
  i18n `en`/`vi`, light/dark.

## Ngoài phạm vi
- So khớp ngữ nghĩa bằng embedding hoặc LLM (không bắt được từ đồng nghĩa như "lập trình" và
  "coding"); chỉ xem xét khi công thức hiện tại bỏ sót nhiều trên dữ liệu thật.
- Lưu snapshot gợi ý vào quyết định thẩm định; gợi ý được tính lại mỗi lần xem.
- Cho ICPDP cấu hình trọng số hoặc ngưỡng trên giao diện.
- Tự động từ chối hoặc chặn nộp theo điểm giống.

## Changelog
- v1.1.0 (2026-11-12) — bỏ quy tắc chia lại trọng số khi thiếu mô tả: trên dữ liệu seed, riêng việc
  cùng lĩnh vực đã cho 33 điểm nên gần như CLB nào cùng lĩnh vực cũng thành gợi ý `MEDIUM`.
- v1.0.0 (2026-11-12) — được người dùng duyệt.
- v0.1.0 (2026-11-12) — bản nháp, chưa duyệt.
