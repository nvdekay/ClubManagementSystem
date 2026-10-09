# TASKS: feat-membership-lifecycle

- [x] Đối chiếu UC21/UC22, BR46/52/54, collection membership và withdrawal request hiện có.
- [x] Chốt partial unique index và chính sách ngày hồi tố với người dùng.
- [x] Implement port/use cases cho roster, chuyển state, xin rời, theo dõi và thi hành yêu cầu.
- [x] Implement Mongo transaction, board-seat guard, role revocation, audit và notifications; chỉ sửa partial index sau khi được duyệt.
- [x] Thêm HTTP auth/CSRF/validation/OpenAPI và route contract tests.
- [x] UI CMB roster/action/history + Student membership/leave request/status, i18n và responsive theme. (Student: không gian thành viên UC24; CMB: trang “Thành viên” danh sách + thi hành yêu cầu rời. Đổi trạng thái Active ⇄ Inactive và cấm có lý do, kèm lịch sử trạng thái, nằm trên trang “Thành viên”.)
- [x] Unit/integration tests cho ngày hiệu lực, transitions, held request, role revoke, notification và lịch sử.
- [x] Chạy `npm run check`, build server/client.
- [x] Nghiệm thu UI sau lượt QA song song; hoàn tất UI CMB/Student khi không còn va chạm với Claude QA.
