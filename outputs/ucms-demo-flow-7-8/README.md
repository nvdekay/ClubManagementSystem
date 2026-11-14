# Video tập demo flow 7, 8

Thư mục chứa video quay giao diện UCMS và hướng dẫn tập trình bày cho Người 5 trong buổi bảo vệ.
Các đoạn có gợi ý lời nói ngay dưới màn hình, dấu trỏ ở chỗ thao tác và thẻ chuyển vai rõ ràng.

## Xem video

**[Bản đầy đủ — 5 phút 19 giây](UCMS-demo-flow-7-8.mp4)**, MP4 H.264, 1920 × 1080, 30 fps.
Video có chữ gợi ý trình bày, không có thuyết minh âm thanh. File đã gắn chapter cho từng flow.

| Mốc trong bản đầy đủ | Nội dung | Video riêng |
|---|---|---|
| 00:00 | Kinh phí và quyết toán | [Flow 7 — 2 phút 34 giây](07-kinh-phi-quyet-toan.mp4) |
| 02:34 | Báo cáo định kỳ và đánh giá CLB | [Flow 8 — 2 phút 45 giây](08-bao-cao-danh-gia.mp4) |

Mục tiêu trong `docs/08-defense-scripts/README.md` là 150 + 90 giây; bản quay dài hơn vì giữ
màn hình đủ lâu để đọc trạng thái, nhưng vẫn trong khoảng 3–5,5 phút. Khi trình bày trực tiếp
có thể nói nhanh hơn ở các đoạn chỉ xem dữ liệu.

## Phạm vi bản quay

Tám cảnh, mỗi cảnh là một vai ngồi một lượt (thẻ đầu cảnh ghi vai):

- **Flow 7** (UC35–UC37): ICPDP xem ngân sách đã duyệt ở UC26 với quyết định tài trợ từng hạng
  mục → Club Leader nhập tổng hóa đơn hạng mục in ấn và nộp bộ chứng từ → ICPDP duyệt đối soát,
  số được thanh toán bị giới hạn ở trần → Club Leader xác nhận đã nhận tiền, ngân sách `Closed`.
- **Flow 8** (UC38, UC39, UC41–UC43): Club Leader điền mục bổ sung và nộp báo cáo kỳ Fall 2026 →
  ICPDP chấp nhận → ICPDP xem scheme đang áp dụng, sinh bản nháp đánh giá, xem dữ liệu nguồn
  (D6 tài chính từ flow 7, D3 thiếu dữ liệu, D8 tuân thủ từ UC40), chốt và công bố cả kỳ →
  Club Leader xem kết quả `Published`.

Ứng dụng chạy trên stack riêng của Người 5 (server `:3105`, client `:5185`, database
`ucms_video_p5`, nhân bản từ trạng thái cuối của video flow 1–3). Không thay đổi mã nguồn ứng dụng.
Phiên đăng nhập được cấp bằng session service cho tài khoản mẫu; video không đi qua Google OAuth.

## Dữ liệu chuẩn bị bằng seed và thao tác trên giao diện

Seed: `server/src/infra/db/seed-defense-p5.ts` (`npm run seed:defense:p5`), chạy lại an toàn.

| Seed chuẩn bị | Làm trực tiếp trên giao diện |
|---|---|
| Sự kiện `Ngày hội Lập trình Sáng tạo FPTU 2026` của CLB, `Completed`, kết thúc 2 ngày trước; 10 lượt đăng ký, 8 lượt check-in (5 người ngoài CLB) | — |
| Ngân sách đã duyệt 6,5 triệu với 3 hạng mục: âm thanh (trả trước, trần 4 triệu) đã `Paid`; in ấn (trả sau, trần 2,5 triệu) `Draft` có sẵn 2 ảnh hóa đơn; tiệc liên hoan `NOT_SPONSORED` | Leader nhập 2.800.000 và nội dung chi, lưu, nộp; ICPDP ghi lý do và duyệt đối soát; Leader xác nhận đã nhận tiền |
| Đợt nộp báo cáo Fall 2026 đang mở, hạn 10 ngày sau, có trường bắt buộc “Kế hoạch hoạt động kỳ tới”; bản nháp báo cáo của CLB đã điền thành viên, sự kiện, minh chứng, thành tích | Leader điền kế hoạch kỳ tới và nộp; ICPDP ghi nhận xét và chấp nhận |
| Scheme Fall 2026 phiên bản 1 `Active` (trọng số mặc định); đánh giá của 48 CLB khác đã `Finalized` | ICPDP sinh bản nháp cho CLB demo, chốt, công bố cả kỳ; Leader xem kết quả |

Các bước của hạng mục âm thanh và của 48 CLB khác đi qua repository thật của ứng dụng
(`mongoSponsoredItemRepository`, `mongoEvaluationRepository`), nên có expense, audit và thông báo
như khi thao tác tay.

## Trạng thái cuối đã kiểm tra trong database

Truy vấn `ucms_video_p5` sau lần quay đầy đủ (reset → seed → quay):

- Ngân sách sự kiện: `Closed`, đã duyệt 6.500.000, đã chuyển (`disbursedTotal`) 6.500.000.
  - Thuê âm thanh, ánh sáng: `Paid`, hóa đơn 4.000.000, được thanh toán 4.000.000.
  - In ấn banner, standee: `Paid`, hóa đơn 2.800.000, giá trị hợp lệ 2.800.000, được thanh toán 2.500.000 (trần).
  - Tiệc liên hoan ban tổ chức: `NOT_SPONSORED`, giữ `Draft`, không tính vào việc tất toán.
  - 2 bản ghi `expenses` tương ứng hai hạng mục được tài trợ.
- Báo cáo định kỳ Fall 2026 của CLB: `Accepted`, lần nộp 1, không trễ hạn.
- Đánh giá Fall 2026 của CLB: `Published`, 85.8 điểm, `EXCELLENT` (Xuất sắc), bản sửa 1;
  cả 49 CLB trong kỳ ở `Published`; scheme Fall 2026 phiên bản 1 `Active`.

## Chỗ bản quay khác kịch bản trong `docs/08-defense-scripts`

1. **Flow 7 theo luồng tài trợ từng hạng mục, không theo tạm ứng/đối soát toàn ngân sách.**
   Kịch bản `flow-07-event-finance.md` viết trước commit `2664685` (sponsored item payments).
   Theo code hiện tại, mọi ngân sách duyệt ở UC26 đều có quyết định `NOT_SPONSORED` /
   `BEFORE_EVENT` / `AFTER_EVENT` cho từng dòng và đi luồng ảnh hóa đơn → duyệt đối soát →
   CLB xác nhận nhận tiền (`Paid`). Luồng `Advance` / `TopUp` / `Refund`, `Settlement Submitted`,
   `Recovery Pending` chỉ còn cho ngân sách cũ không có `sponsoredItems`; ví dụ 10 triệu / 8 triệu
   / hoàn 1 triệu trong kịch bản không còn tái hiện được với ngân sách mới. Kịch bản flow 7 cần
   viết lại theo code (công thức: số được thanh toán = min(giá trị hợp lệ, trần hạng mục)).
2. **Không thao tác tải ảnh hóa đơn.** Stack quay không có Cloudinary nên endpoint upload và lấy
   ảnh không hoạt động. Seed chỉ lưu metadata ảnh (id cố định), còn trình quay tự trả ảnh xem trước
   (hóa đơn vẽ bằng SVG) cho request lấy ảnh. Trên môi trường thật có Cloudinary, ảnh được tải
   lên bằng nút “Thêm ảnh” và xem trước qua link riêng tư.
3. **Đánh giá 48 CLB khác được chốt sẵn** để có thể công bố cả kỳ trong video (UC43 chỉ cho công bố
   khi mọi CLB trong phạm vi đã `Finalized`).
4. **Không demo chấm tay** (UC43 FR-02) và nhánh trả sửa báo cáo để giữ thời lượng; để dành Q&A.
5. **D5 “Kỷ luật báo cáo” hiện “Thiếu dữ liệu”** dù báo cáo vừa được chấp nhận: code chỉ tính báo
   cáo có hạn nộp đã qua (`dueAt <= now`), mà để Leader nộp được trên UI thì hạn phải còn hiệu lực.
   D3 thiếu dữ liệu vì sự kiện chưa có phản hồi — được dùng làm ví dụ “thiếu dữ liệu không bị tính 0”.
6. Ô “Đã tạm ứng” ở trang thẩm định báo cáo là nhãn của ứng dụng cho `disbursedTotal`; với luồng
   mới, đây là tổng tiền đã chuyển cho các hạng mục `Paid`.

## Cách tập

Đọc dòng gợi ý dưới video rồi tập nói bằng lời của bạn. Dừng ở trạng thái đã hiển thị thành công
mới mô tả kết quả. Các điểm cần nhấn mạnh:

1. Được duyệt ngân sách chưa có nghĩa CLB đã nhận tiền; mỗi hạng mục được thanh toán một lần,
   tối đa bằng trần, sau khi ICPDP đối soát chứng từ. App ghi nhận, việc chuyển tiền do kế toán.
2. Báo cáo định kỳ khác báo cáo sau sự kiện; nộp giữ snapshot số liệu, ICPDP chấp nhận hoặc trả sửa.
3. Một scheme chung cho cả kỳ; thiếu dữ liệu được đánh dấu, không tính 0; Leader chỉ thấy `Published`.

Dựng lại để tập trên máy:

```bash
T=outputs/ucms-demo-tools
$T/stack.sh 5 reset && $T/stack.sh 5 up && eval "$($T/stack.sh 5 env)"
(cd server && MONGO_URI="$MONGO_URI" npm run seed:defense:p5)
node $T/record-p5.mjs            # quay lại toàn bộ; thêm id cảnh để quay riêng một cảnh
```

Quay hoặc thao tác làm thay đổi dữ liệu, nên mỗi lần tập lại bắt đầu từ `reset` + seed.
Để demo trực tiếp bằng tài khoản Google thật, seed nhận
`-- --leader=<email> --officer=<email> --member=<email>` (tài khoản phải đã đăng nhập một lần);
vai cần đăng nhập: Club Leader (nộp chứng từ, xác nhận nhận tiền, nộp báo cáo, xem kết quả) và
ICPDP Officer (duyệt đối soát, thẩm định báo cáo, sinh/chốt/công bố đánh giá).
Lưu ý khi demo trực tiếp: ảnh hóa đơn do seed tạo chỉ là metadata, nên trên môi trường thật sẽ hiện
“Không tải được ảnh”; hãy “Bỏ ảnh” rồi “Thêm ảnh” bằng tệp JPG/PNG thật trước khi nộp. Seed cũng
chốt sẵn (`Finalized`) đánh giá Fall 2026 cho mọi CLB khác chưa có đánh giá kỳ này.
