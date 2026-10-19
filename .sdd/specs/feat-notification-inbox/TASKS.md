# TASKS: feat-notification-inbox

- [x] Domain `notification.ts`: port inbox/outbox, `notificationChannels`, backoff, render email (unit test)
- [x] Usecase `myNotifications`, đánh dấu đọc, `deliverNotifications` (unit test: gửi, retry, hết lượt, thiếu email, batch)
- [x] `mongo-notification-repository.ts`: inbox + outbox claim/lease + `emailDeliveryLogs` (integration test)
- [x] Kênh `EMAIL` cho các sự kiện của ma trận §8.2 ở club-board, hồ sơ thành lập, đề xuất sự kiện, booking
- [x] Route `/notifications/*` + OpenAPI; job `notification-delivery-job` + `infra/mail/log-mail-transport.ts` nối ở `main.ts`
- [x] Client: service, hook, `utils/notificationLink`, `NotificationBell` trong `WorkspaceShell`, icon `bell`, i18n en/vi
- [x] Bấm thử trên trình duyệt 19/10 (desktop sáng en, mobile tối vi 390px): badge, danh sách, đánh dấu tất cả,
      không tràn ngang; log server có dòng `{"mail":"log",...}` và `notification-delivery` sent 1
- [ ] SMTP transport thật — chờ duyệt dependency
