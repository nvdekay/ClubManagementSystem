# Hiến pháp dự án

Phiên bản 1.4.0 · Trạng thái: ĐANG ÁP DỤNG (có thể sửa đổi — xem §Sửa đổi)

**Nguyên tắc: một quy tắc không có máy kiểm tra chỉ là một lời khuyên.** Mỗi quy tắc dưới đây
đều nêu rõ phần kiểm tra của nó. Các kiểm tra tự động nằm ở `scripts/check-constitution.sh` và
`.github/workflows/ci.yml`; `review` nghĩa là cổng do con người gác khi review PR — được liệt kê
tường minh để người review biết CI **không** phủ những gì.

---

## Tầng 1 — Bảo mật & dữ liệu

### SEC-01 · Mật khẩu
Băm bằng bcrypt (cost ≥ 12) hoặc argon2id. Không bao giờ lưu, log hay in lại mật khẩu thô.
**Kiểm tra:** đang ngủ cho tới khi có tính năng xác thực. PR làm xác thực BẮT BUỘC phải thêm một
test khẳng định giá trị đã lưu verify được với dữ liệu vào và không bằng dữ liệu vào, cộng với
test duyệt route của SEC-02.

> **Ghi chú cho UCMS:** dự án này xác thực hoàn toàn qua Google OAuth và **không lưu mật khẩu
> nào**, nên SEC-01 sẽ ở trạng thái ngủ vĩnh viễn trừ khi phạm vi thay đổi. Nếu ai đó thêm một
> đường đăng nhập nội bộ thì đó là một thay đổi phạm vi, phải được nhóm thông qua trước.

### SEC-02 · Xác thực trên các endpoint làm thay đổi dữ liệu
Mọi route POST/PUT/PATCH/DELETE đều phải qua middleware xác thực, trừ các route nằm trong danh
sách trắng `PUBLIC_ROUTES` tường minh (chỉ các luồng xác thực: login, register, refresh).
**Quy tắc và phần kiểm tra ĐANG NGỦ cho tới khi tính năng xác thực lên** — các route demo của
template là công khai có chủ ý cho tới lúc đó. PR làm xác thực kích hoạt quy tắc này và BẮT BUỘC
phải thêm một test duyệt qua router của Express, khẳng định mọi route làm thay đổi dữ liệu đều
có middleware xác thực hoặc nằm trong `PUBLIC_ROUTES`.

### SEC-03 · Validate dữ liệu vào (NoSQL injection)
Mọi dữ liệu từ client phải đi qua một schema zod hoặc một domain factory trước khi dùng. Không
bao giờ truyền thẳng đối tượng `req.body` / `req.query` / `req.params` vào một truy vấn Mongoose
— tiêm toán tử (`{"$gt": ""}`) mới là kiểu tấn công của MERN, không phải nối chuỗi SQL.
**Kiểm tra:** grep cấm `req.*` xuất hiện trong tham số của bất kỳ lời gọi truy vấn Mongoose nào,
và mongoose chỉ import được trong `server/src/infra/` (+ `main.ts` để kết nối) — nên route và
usecase không thể chạm tới model, dù có đặt biến trung gian hay không. Phần còn lại: review.

### SEC-04 · Bí mật
Không bao giờ commit `.env`; giữ `.env.example` luôn cập nhật. Trong mã nguồn ứng dụng
(`server/src`), `process.env` chỉ được đọc ở `server/src/infra/config/`; file test được phép đọc
env để nối dây (ví dụ điều kiện bỏ qua theo `MONGO_URI`). Agent không bao giờ in, log hay commit
giá trị bí mật.
**Kiểm tra:** grep (`.gitignore` phải bỏ qua `.env`; `process.env` và các đường vòng
`process[...]` bị giới hạn) + gitleaks trong CI. Điều khoản về agent: review.

### DATA-01 · Xoá dữ liệu
Mặc định là xoá cứng. Chỉ xoá mềm với những thực thể mà tính năng của nó cần khôi phục hoặc cần
lịch sử, và khi đó phải dùng plugin `mongoose-delete` (tự động giới hạn truy vấn) — không bao
giờ tự chế một bộ lọc `deletedAt` mà mọi truy vấn phải nhớ thêm vào.
**Kiểm tra:** review.

> **Ghi chú cho UCMS:** theo DAT-08 của SRS, không bản ghi nào đã bước vào một workflow được xoá
> cứng. Trong dự án này, các trạng thái vòng đời (`Cancelled`, `Withdrawn`, `Rejected`,
> `Dissolved`) thay cho việc xoá, và `auditLogs` cùng các document version là chỉ-ghi-thêm.

### LOG-01 · Khả năng quan sát
Mỗi request được log thành một dòng JSON kèm thời lượng (middleware `requestLogger`). Stack
trace và chi tiết lỗi nội bộ chỉ đi vào log của server; client nhận phong bì lỗi theo ARCH-02
với thông điệp chung chung ở 500 và ở các lỗi 4xx do framework sinh (những lỗi này vẫn được log
phía server — `err.message` có thể in lại nguyên byte của request).
**Kiểm tra:** grep khẳng định `requestLogger` và `errorHandler` được gắn trong `server.ts`; phần
còn lại: review.

---

## Tầng 2 — Kiến trúc

### ARCH-01 · Ranh giới các tầng
`interface → usecase → domain ← infra`. Domain không import gì từ tầng khác và sở hữu các
repository port. Usecase nhận repository qua tham số — không dùng DI container.
`interface/` và `infra/` không bao giờ import lẫn nhau; mongoose chỉ sống trong `infra/`,
express chỉ trong `interface/`; domain không bao giờ log.
**Kiểm tra:** grep (import tĩnh, import qua barrel và import động; cả hai chiều; giới hạn
framework; `console.*` trong domain) trong `check-constitution.sh`.

### ARCH-02 · Hợp đồng response & xử lý lỗi
Mọi response đi qua một trong hai phong bì, dựng bởi `interface/http/response.ts` — handler
không bao giờ gọi thẳng `res.json()`:
- Thành công (`ok()`): `{ statusCode, message, data, timestamp }`.
- Lỗi (`fail()`): `{ statusCode, error, message, details?, timestamp, path }`.

Lỗi nghiệp vụ ném `DomainError(message, kind, details?)`; middleware ánh xạ kind sang status:
`validation` → 400 (mặc định), `conflict` → 409, `not_found` → 404, `error` đặt bằng kind,
`message` bằng thông điệp của domain, `details` bằng thứ domain đính kèm (ví dụ danh sách lỗi
zod). Lỗi 4xx do framework (body parser…) giữ nguyên status nhưng client chỉ nhận cụm lý do
chung, không bao giờ nhận `err.message`. Mọi thứ còn lại → 500 với thông điệp chung. Không gửi
stack trace cho client (xem LOG-01).
**Kiểm tra:** bảng ánh xạ nằm ở đúng một chỗ (`interface/http/middleware.ts`) kèm unit test;
review xác nhận code mới ném `DomainError` thay vì tự chế status code, và dùng `ok()`/`fail()`
thay vì `res.json()`.

### ARCH-03 · Hợp đồng API
Mọi thay đổi endpoint phải cập nhật hợp đồng API (`server/src/interface/http/openapi.ts`, phục
vụ tại `/docs`) **trong cùng một PR**, và được review như code.
**Kiểm tra:** một unit test duyệt các route đã gắn của Express và fail khi spec và app lệch
nhau; schema truyền tải của User được liên kết kiểu (`satisfies`) với entity của domain, nên
lệch trường sẽ fail `tsc`. Các chi tiết response ngoài phạm vi đó: review (mục trong checklist
PR).

---

## Tầng 3 — Chuẩn kỹ thuật

### STD-01 · TypeScript
Chế độ strict được ghim ở cả hai workspace. Không dùng `any` (dùng `unknown` + thu hẹp kiểu).
Hàm có tên phải khai báo bằng `function foo()`, không dùng arrow const — khai báo được hoisting
(logic chính đọc từ trên xuống) và hook/method của Mongoose cần `function` để có `this`.
Callback nội tuyến vẫn dùng arrow.
**Kiểm tra:** grep ghim `"strict": true` ở cả hai tsconfig; grep cấm `: any` / `as any`;
`tsc --noEmit` chạy trong CI cho cả hai workspace; ESLint `func-style` bắt buộc dùng khai báo.

### STD-02 · Kiểm thử
- `tests/unit/` — domain + usecase, không DB, không mạng, repository in-memory.
- `tests/integration/` — infra chạy với Mongo thật (docker compose / service của CI).
- Một script e2e cho luồng thành công chính, khi giao diện demo đã ổn định.
- Không đặt ngưỡng phần trăm coverage. Một ngưỡng coverage khiến nhóm viết test chạy theo con
  số; cổng thực sự là: mỗi tiêu chí nghiệm thu trong một SPEC đều có test.

**Kiểm tra:** CI chạy unit test trong một job KHÔNG có service Mongo và không có `MONGO_URI` —
một test "unit" mà chạm vào DB sẽ fail ở đó theo đúng thiết kế. Integration chạy ở job riêng.
Definition of Done = `npm run check` xanh.

### STD-03 · Git
Nhánh: `spec/{name}` (thảo luận spec), `agent/{name}` (agent hiện thực), `fix/{issue}`.
Conventional Commits (`feat|fix|docs|spec|chore`), **viết bằng tiếng Anh** theo quy ước ngôn ngữ
ở [`README.md`](README.md) §5. PR: tối thiểu 1 người review, không tự duyệt, CI xanh trước khi
merge.
**Kiểm tra:** branch protection của GitHub trên `main` (các check bắt buộc + 1 phê duyệt — cấu
hình một lần trong cài đặt repo; tự duyệt là bất khả thi về mặt cơ chế). Tên nhánh: review.

---

## Quy trình

### Các cổng review
| Cổng | Nội dung | Ai gác |
|------|----------|--------|
| L1 | Test + typecheck xanh | CI |
| L2 | Code khớp với tiêu chí nghiệm thu trong SPEC của nó | người review |
| L3 | Hiến pháp: các quy tắc cơ học SEC/ARCH/STD | CI (`check-constitution.sh`) |
| L4 | Các quy tắc chỉ review được (phần còn lại của SEC-03, DATA-01, ARCH-02/03) + demo ngắn | người review |

CI không kiểm tra L2 và L4 — nói ngược lại chỉ khiến người review quen tay bỏ qua chúng.

### Triển khai
Cục bộ: `docker compose up -d` + `npm run dev`. Template không kèm CD — bản demo được triển khai
thủ công (thêm workflow khi nhóm chọn được nơi host).
Đóng băng `main` trước một lần phát hành hay ngày demo; tình huống khẩn đi qua `git revert`,
không phải hotfix.

### Sẵn sàng demo
- `npm run seed` dựng lại một database demo bằng một lệnh, trên bất kỳ máy nào. Giữ cho nó luôn
  chạy được.
- **Không merge PR nào do agent viết trừ khi người bấm merge giải thích được từng dòng.**

### Sửa đổi
File này chỉ đổi qua PR được đa số nhóm phê duyệt, và **mọi quy tắc mới phải kèm phần kiểm tra
tự động của nó trong cùng PR** (hoặc được gắn nhãn `review` một cách tường minh). Trưởng nhóm
phân xử các tranh chấp hằng ngày.

---

## Chính sách AI Agent

**Được làm mà không cần hỏi:** đọc/ghi `server/src`, `client/src`, `tests`, `docs`,
`.sdd/specs`; chạy npm script, vitest, tsc; commit trên nhánh `agent/*`.

**Bắt buộc hỏi người trước:** xoá file; sửa chính file này; push lên `main`; thêm phụ thuộc
(`package.json`); thay đổi schema (`server/src/infra/db/**`); bất cứ thứ gì đụng tới `.env*`.

**Bắt buộc phải:** không bao giờ in hay commit giá trị bí mật; báo lại các trường hợp biên mà
SPEC chưa phủ thay vì tự đoán; cập nhật `TASKS.md` của tính năng mỗi khi hoàn thành một task.
