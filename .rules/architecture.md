# Kiến trúc

Express 5 + Mongoose + React 19 (Vite) + TypeScript, npm workspaces (`server/`, `client/`).

Phía server theo **clean architecture** với 4 tầng. Mọi mũi tên phụ thuộc đều hướng về `domain`:

```
interface → usecase → domain ← infra
```

Một request đi như sau:

```
HTTP request
  → interface/http   (route parse/validate dữ liệu vào, gọi một usecase)
    → usecase        (luồng nghiệp vụ, nói chuyện với *interface* của repository)
      → domain       (entity, quy tắc kiểm tra, repository port)
    ← infra          (repository Mongo *hiện thực* port của domain; được nối dây trong main.ts)
  ← interface/http   (ánh xạ kết quả hoặc DomainError thành HTTP response)
```

---

## `server/src/domain/`

**Là gì?** Lõi của ứng dụng: entity (`User`), kiểm tra nghiệp vụ (factory `newUser`), lỗi nghiệp
vụ (`DomainError`), và **port** — các interface như `UserRepository` mô tả ứng dụng cần gì từ
thế giới bên ngoài mà không nói làm bằng cách nào. Tầng này không import gì từ các tầng khác:
không Express, không Mongoose, không `process.env`, không log.

**Vì sao?** Quy tắc nghiệp vụ là phần không được âm thầm thay đổi khi bạn đổi framework hay đổi
database. Giữ nó không phụ thuộc gì nghĩa là nó đọc được, test được và tin được một cách độc
lập. Port đặt ở đây (chứ không phải ở infra) để domain sở hữu hợp đồng và infra phải tuân theo
— đó chính là thứ làm cho mũi tên hướng vào trong.

**Khi nào?** Thêm code vào đây khi một quy tắc đúng bất kể HTTP hay Mongo: "email phải có dạng
X", "tên dài 1–100 ký tự", "thao tác này cần một cách tìm user theo email". Nếu quy tắc có nhắc
tới status code, tên collection hay biến môi trường thì nó thuộc tầng khác.

## `server/src/usecase/`

**Là gì?** Các luồng nghiệp vụ — mỗi thao tác một hàm (`registerUser`, `listUsers`). Mỗi hàm
nhận phụ thuộc của nó (các repository) qua tham số và điều phối các đối tượng domain: dựng
entity, kiểm tra điều kiện nghiệp vụ, lưu xuống, trả về.

**Vì sao?** Route không được chứa logic nghiệp vụ (không test được nếu không có HTTP) và domain
không được chứa luồng (vì như vậy nó phải biết về việc lưu trữ). Usecase là đường nối ở giữa:
vì repository được truyền vào dưới dạng interface, một unit test có thể đưa vào một bản giả
in-memory và chạy trọn luồng mà không cần DB, không cần mạng.

**Khi nào?** Thêm một usecase cho mỗi thao tác mới ứng dụng thực hiện ("đăng ký user", "vô hiệu
hoá tài khoản"). Nếu logic chỉ là một quy tắc dữ liệu thuần, không có điều phối, thì đẩy xuống
domain; nếu nó chỉ là dịch qua lại HTTP thì giữ ở interface.

## `server/src/interface/http/`

**Là gì?** Biên Express: `server.ts` (lắp ráp app), `user-routes.ts` (endpoint dưới `/api/v1`),
`middleware.ts` (log request + xử lý lỗi), `openapi.ts` (tài liệu API phục vụ tại `/docs`). Nó
chỉ dịch qua lại giữa HTTP và lời gọi usecase, không làm gì hơn.

**Vì sao?** HTTP là chi tiết giao vận. Giữ tầng này mỏng thì lựa chọn Express (hay phiên bản của
nó, hay chính REST) vẫn thay thế được, và middleware xử lý lỗi cho một hợp đồng thống nhất:
`DomainError` → 400/409/404 theo kind, mọi thứ ngoài dự kiến → 500 — không phải chế biến lỗi ở
từng route. Validate dữ liệu vào ở đây (zod / domain factory) trước khi nó chạm tới một truy vấn
Mongoose cũng chính là ranh giới chống NoSQL injection.

**Khi nào?** Động vào tầng này khi *hợp đồng với bên ngoài* thay đổi: endpoint mới, status code
mới, hình dạng request/response, header, log. Thân một route nên giữ ở mức ~5 dòng: parse dữ
liệu vào, gọi usecase, gửi response. Nếu nó phình to hơn thế thì logic nghiệp vụ đang rò rỉ vào
— hãy chuyển sang usecase.

## `server/src/infra/`

**Là gì?** Phần hiện thực của thế giới bên ngoài:

- `config/` — nơi **duy nhất** được phép đọc `process.env`. Một schema zod validate biến môi
  trường lúc khởi động; env sai → `process.exit(1)`. Mọi nơi khác nhận một `Config` đã có kiểu.
- `db/` — `mongo-user-repository.ts` hiện thực port `UserRepository` của domain bằng Mongoose;
  `seed.ts` để tạo dữ liệu cục bộ.

**Vì sao?** Config: fail-fast lúc khởi động tốt hơn nhiều so với một chuỗi kết nối `undefined`
nổ lúc 3 giờ sáng, và gom env về một cửa duy nhất (được CI kiểm tra) khiến phần code còn lại
tất định và test được. Repository: vì Mongo nấp sau một interface của domain nên DB có thể thay
thế được và — quan trọng hơn trong công việc hằng ngày — giả lập được trong test.

**Khi nào?** Thêm code vào đây khi tích hợp bất cứ thứ gì bên ngoài: một collection mới, một bộ
gửi mail, một HTTP client tới dịch vụ khác, một biến môi trường mới. Mẫu làm: khai báo port ở
`domain/`, hiện thực ở đây, nối dây ở `main.ts`.

## `server/src/main.ts`

**Là gì?** Điểm lắp ráp: nạp config → kết nối Mongo → dựng các repository cụ thể → tiêm chúng
vào app → lắng nghe.

**Vì sao?** Phải có ai đó chọn hiện thực thật cho các port. Làm việc đó ở đúng một file nghĩa là
mọi file còn lại chỉ nối với nhau qua interface, và thứ tự khởi động (config trước, fail fast)
là tường minh.

**Khi nào?** Chỉ khi thêm một phụ thuộc cần nối dây (repo mới, client ngoài mới) hoặc đổi thứ tự
khởi động. File này nên giữ ở mức ~15 dòng.

## `server/tests/`

**Là gì?** `unit/` — test usecase và domain với repository in-memory; không DB, không mạng (CI
chạy chúng trong một job không có Mongo). `integration/` — test repository Mongo thật, bỏ qua
khi không có `MONGO_URI`.

**Vì sao?** Việc chia tầng tồn tại chính là để đa số logic test được mà không cần hạ tầng —
unit test nhờ đó nhanh và chạy được ở bất cứ đâu. Integration test phủ đúng thứ mà bản giả
không phủ được: rằng hiện thực Mongo thực sự tôn trọng hợp đồng của port.

**Khi nào?** Usecase hay quy tắc domain mới → unit test. Hiện thực repository mới hoặc thay đổi
→ integration test. Nếu một unit test cần tới DB thì code đang test nằm sai tầng.

## `client/`

**Là gì?** SPA React 19 + Vite. Ở môi trường dev nó chạy trên `:5173` và proxy `/api` sang
server ở `:3000`.

**Vì sao?** Một workspace riêng giữ cho phụ thuộc, bản build và type-check của frontend và
backend độc lập nhau trong khi vẫn chung một repo. Proxy dev giúp khỏi phải cấu hình CORS khi
phát triển.

**Khi nào?** Mọi việc liên quan tới giao diện. Nó chỉ nói chuyện với server qua `/api/v1/*` —
không bao giờ import code của server.

## `.rules/`

**Là gì?** Toàn bộ quy tắc của dự án, trong một thư mục: `backend.md` (bản hiến pháp — một số
quy tắc được CI kiểm tra bằng `scripts/check-constitution.sh`, một số là cổng review),
`frontend.md` (stack React + quy tắc component/fetch/styling/theme/ngôn ngữ), `architecture.md`
(chính file này).

**Vì sao?** Quy tắc chỉ nằm trong đầu người hoặc trong lịch sử chat thì không sống sót qua các
lượt thay người — hay qua các AI agent. Một thư mục nghĩa là agent (hoặc người mới) đọc một chỗ
thay vì đi lùng bốn chỗ; mọi thứ khác trong repo chỉ trỏ về đây.

**Khi nào?** Trước khi viết code ở một tầng bạn chưa đụng vào. `npm run check` chạy phần cơ học
ở mỗi lần verify.

## `.sdd/`

**Là gì?** Các hiện vật quy trình: `specs/feat-*/` (SPEC + TASKS viết trước khi code;
`feat-users/` là ví dụ mẫu), `rfcs/ADR-*.md` (quyết định kiến trúc, ghi một lần).

**Vì sao?** SPEC buộc trả lời "chúng ta xây cái gì" trước "xây thế nào"; ADR giữ lại *vì sao*
một quyết định được đưa ra, sau khi mọi người đã quên.

**Khi nào?** Tính năng mới → copy `specs/_template.md` trước. Quyết định kiến trúc → ADR mới
(không bao giờ sửa ADR cũ).

## Các file hỗ trợ

| Mục | Là gì / Vì sao / Khi nào |
|---|---|
| `docker-compose.yml` | MongoDB cục bộ. Để "clone xong là chạy" mà không cần cài Mongo. Chạy `docker compose up -d` trước khi dev. |
| `.env.example` / `.env` | Hợp đồng biến môi trường đã ghi rõ / giá trị cục bộ của bạn. Server fail-fast nếu không có `.env`; `.env` luôn bị git bỏ qua. Copy một lần cho mỗi bản clone, sửa khi cấu hình đổi. |
| `scripts/` | `check-constitution.sh` — grep tìm các vi phạm về tầng và env. Chạy trong `npm run check` và trong CI. |

---

## Quy tắc bỏ túi

- Phụ thuộc chỉ hướng vào trong: `domain` không import gì; `usecase` chỉ import `domain`;
  `interface` và `infra` không bao giờ import lẫn nhau.
- `process.env` chỉ ở `infra/config/`. Dùng `DomainError` cho lỗi nghiệp vụ (kind →
  400/409/404), mọi thứ còn lại → 500.
- Không bao giờ truyền thẳng `req.body`/`req.query` vào một truy vấn Mongoose — validate trước.
- Phân vân code đặt ở đâu? Tự hỏi: "dòng này có sống sót nếu đổi Express sang Fastify và Mongo
  sang Postgres không?" Có → `domain`/`usecase`. Không → `interface`/`infra`.
