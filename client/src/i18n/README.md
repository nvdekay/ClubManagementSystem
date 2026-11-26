# i18n/

Chuỗi ngôn ngữ (`en`/`vi`), tách theo ngôn ngữ rồi theo miền nghiệp vụ:

```
i18n/
  index.ts        # khởi tạo i18next, kiểu Locale, i18nReady
  messages.ts     # Messages<T>: kiểu mà bản dịch phải khớp
  i18next.d.ts    # kiểu key cho t(), lấy từ locales/en
  locales/
    en/<module>.ts  # nguồn kiểu
    en/index.ts     # ghép mọi module tiếng Anh thành { translation }
    vi/<module>.ts  # `satisfies Messages<typeof en>`: thiếu hay thừa key đều làm tsc fail
    vi/index.ts
```

- **Nạp lười.** Mỗi ngôn ngữ là một chunk riêng, nạp qua `import()` trong backend nhỏ ở `index.ts`.
  Lần tải đầu chỉ lấy ngôn ngữ đã lưu trong `localStorage` (mặc định `en`); `main.tsx` chờ
  `i18nReady` rồi mới render. `i18n.changeLanguage()` tải chunk còn lại xong mới đổi ngôn ngữ, nên
  giao diện không bao giờ lộ key thô.
- **Không có `fallbackLng`**, để khách `vi` không phải tải luôn bản `en`. Vì vậy mọi key phải có ở
  cả hai ngôn ngữ; với số nhiều, bản `vi` cũng khai đủ `_one` và `_other` (cùng một chuỗi).
- **Chỉ `import type` từ `locales/`** khi ở ngoài `i18n/` (ví dụ `keyof typeof clubEvents.errors`).
  Import giá trị sẽ kéo chuỗi vào chunk chính. Ngoại lệ duy nhất: `services/apiError.ts` import
  `locales/en/apiErrors` vì văn bản tiếng Anh chính là thông điệp chẩn đoán của API, dùng để tra
  ngược ra key.
- **Tính năng mới** → thêm `locales/en/<module>.ts` và `locales/vi/<module>.ts`, rồi đăng ký ở cả
  hai `locales/<locale>/index.ts`. Key ghép động kiểu `` `x.day${n}` `` không qua được `tsc`.

Bố cục phải sống được với bản dựng dài hơn trong hai ngôn ngữ en/vi.
