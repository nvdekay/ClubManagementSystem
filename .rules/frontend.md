# Quy tắc frontend — client/

## Stack

- **React 19** + TypeScript, build bằng **Vite** (`client/`, một trong hai npm workspace bên cạnh `server/`).
- Không router — ứng dụng hiện là một trang duy nhất (`App.tsx`).
- Không thư viện state — state cục bộ của component (`useState`/`useReducer`) là đủ ở quy mô này.
- Không thư viện HTTP client — dùng `fetch` gốc, gọi tới `/api/v1/...` (Vite proxy `/api` sang server ở môi trường dev). **TanStack React Query** (`@tanstack/react-query`) quản lý server state: `useQuery`/`useMutation` bọc quanh các hàm fetch đó, `QueryClientProvider` đặt trong `main.tsx`. Truyền `signal` của queryFn vào `fetch`; sau một mutation, cập nhật cache theo quy tắc 4 của mục Fetch/Service (`setQueryData` khi response đã quyết định được giá trị mới, `invalidateQueries` khi danh sách được lọc ở phía server). Truy vấn có phân trang/tìm kiếm dùng `placeholderData: keepPreviousData` để khi key đổi (trang mới, từ khoá mới) các dòng cũ vẫn nằm trên màn hình thay vì chớp trắng (xem `useUsers`).
- **Tailwind v4**, CSS-first (plugin `@tailwindcss/vite`, không có `tailwind.config.*`). Token màu khai báo trong `client/src/index.css` bên trong `@theme` dưới dạng `--color-<name>-app`, sinh ra các utility `<name>-app` (`bg-danger-app`, `text-danger-app`, …).
- Dark mode là thủ công (không chỉ dựa vào `prefers-color-scheme`): một class `.dark` bật/tắt trên `<html>` (xem state `theme` trong `App.tsx`) ghi đè chính các token đó dưới `:root.dark` trong `index.css`. Không dùng variant `dark:` của Tailwind — chỉ riêng lớp gián tiếp token đã đủ để mọi utility `*-app` đổi màu.
- Ngôn ngữ: **i18next** + `react-i18next`, khởi tạo ở `client/src/i18n/index.ts` (`en`/`vi`, `fallbackLng: "en"`, ngôn ngữ được lưu vào `localStorage`). Chuỗi được tách mỗi miền nghiệp vụ một file (`i18n/common.ts`, `i18n/users.ts`, `i18n/demo.ts`), mỗi file export `{ en, vi }`, rồi ghép thành `resources` trong `index.ts`. Component đọc chuỗi bằng `const { t } = useTranslation()` và key có namespace (`t("users.title")`); đổi ngôn ngữ bằng `i18n.changeLanguage("vi")`. Tính năng mới → thêm `i18n/<module>.ts`, rồi đăng ký nó ở cả hai ngôn ngữ trong `index.ts`.
- `cn()` ở `client/src/utils/cn.ts` — `twMerge(clsx(inputs))` — dùng cho mọi class có điều kiện.
- **TanStack Table v9** (`@tanstack/react-table`) cho bảng — headless: người gọi sở hữu instance `useTable` và truyền nó vào bộ kit `ui/table/` (`AppTable`, `AppTableColumnToggle`, `AppTableLimitSelect`). Bộ điều khiển phân trang không phụ thuộc bảng — `ui/pagination/AppPagination` nhận props thuần `pageIndex`/`pageCount`/`onPageChange`, không cần instance bảng. v9 ≠ v8: `useTable({ features, columns, data })` với `tableFeatures({...})` (không còn `useReactTable`/`getCoreRowModel`), `createColumnHelper<typeof features, T>()`, `table.state` thay cho `table.getState()`. Tập feature dùng chung nằm trong `AppTable.tsx` (`appTableFeatures`); mở rộng ở đó khi một bảng cần sắp xếp/chọn dòng/…. Tài liệu dành cho agent nằm trong `node_modules/@tanstack/react-table/skills/`. Giữ `data`/`columns` ổn định về tham chiếu (mảng rỗng khai báo ở phạm vi module, `useMemo` cho columns).
- Alias `@/` đã cấu hình (`client/tsconfig.json` mục `paths`, `client/vite.config.ts` mục `resolve.alias`) → `client/src/*`.

Không thêm react-router, Redux/Zustand/Valtio hay axios theo kiểu phòng xa. Mỗi thứ đều có một điều kiện kích hoạt cụ thể nêu bên dưới; chỉ thêm — và cập nhật tài liệu này — khi điều kiện đó thực sự xảy ra, không phải trước đó.

## Cấu trúc thư mục

Hiện tại (bố cục đầy đủ của template — mọi thư mục đều tồn tại; thư mục rỗng có một README nói rõ thứ gì thuộc về nó):

```
client/src/
  main.tsx     # điểm vào, gắn App bên trong QueryClientProvider
  App.tsx      # trang duy nhất của ứng dụng (chưa có router)
  index.css    # import Tailwind + token màu @theme (nơi duy nhất được phép có mã màu) + ghi đè :root.dark
  i18n/
    index.ts   # khởi tạo i18next + kiểu Locale + resources (đăng ký mọi module ở en/vi)
    common.ts  # mỗi miền nghiệp vụ một file, mỗi file export { en, vi }
    users.ts
    demo.ts
  services/
    users.ts   # tầng HTTP: mỗi endpoint một hàm async có kiểu. Biết endpoint, không bao giờ import React.
  hooks/
    useUsers.ts # tầng React Query: useUsers()/useCreateUser(), sở hữu usersKey. Biết cache, không tự gọi fetch.
  utils/
    cn.ts      # twMerge(clsx(inputs)) — dùng cho mọi className có điều kiện
  pages/       # mỗi trang một thư mục khi đã có router (hiện là README giữ chỗ)
  components/
    ui/
      button/AppButton.tsx
      card/AppCard.tsx
      input/AppInput.tsx
      empty-state/AppEmptyState.tsx
      pagination/AppPagination.tsx     # bộ phân trang không phụ thuộc bảng: props pageIndex/pageCount/onPageChange
      search-input/AppSearchInput.tsx  # ô tìm kiếm có debounce (trả giá trị đã trim qua onSearch)
      skeleton/AppSkeleton.tsx         # khối giữ chỗ nhấp nháy — định cỡ bằng className, ghép tại nơi dùng
      switch/AppSwitch.tsx
      table/AppTable.tsx               # kit TanStack Table v9 headless: AppTable + AppTableColumnToggle + AppTableLimitSelect + appTableFeatures dùng chung
      table/AppTableColumnToggle.tsx
      table/AppTableLimitSelect.tsx
      toast/AppToast.tsx
    custom/    # component dùng nhiều trang, có hiểu biết nghiệp vụ (README giữ chỗ)
    layout/    # khung Navbar/Sidebar/AuthLayout (README giữ chỗ)
```

Bảng quyết định thư mục:

| Thư mục | Thứ gì thuộc về đây |
|---|---|
| `src/components/ui/<group>/App<Name>.tsx` | Primitive giao diện nguyên tử, dùng chung. Không chứa logic nghiệp vụ. Gom theo nhóm chức năng (`ui/button/AppButton.tsx`, `ui/input/AppInput.tsx`, …). |
| `src/components/custom/` | Component dùng ở nhiều trang. Không nguyên tử, có hiểu biết nghiệp vụ. |
| `src/components/layout/` | Khung bố cục cấu trúc (Navbar, BottomNav, AuthLayout). |
| `src/pages/<name>/` | Component con chỉ dùng bởi đúng một trang (khi đã có router). |
| `src/services/<domain>.ts` | Tầng HTTP — mỗi endpoint một hàm async có kiểu, khớp với phong bì response của server. Không import React. |
| `src/hooks/use<Domain>.ts` | Hook React Query bọc quanh các hàm của một service — sở hữu `queryKey` của miền đó. Ngoài ra: mọi logic có state cần dùng ở 2 component trở lên. |

Cây quyết định cho một component mới:

1. Chỉ 1 trang dùng → để nội tuyến ngay trong trang/nơi gọi đó (hoặc `src/pages/<name>/PascalCase.tsx` khi đã có router và cấu trúc nhiều trang).
2. Từ 2 nơi gọi trở lên + nguyên tử/primitive → `src/components/ui/<group>/App<Name>.tsx`.
3. Từ 2 nơi gọi trở lên + không nguyên tử/có hiểu biết nghiệp vụ → `src/components/custom/`.
4. Khung bố cục/điều hướng → `src/components/layout/`.

## Quy tắc về component

1. Mỗi file một component, `PascalCase.tsx`, chỉ dùng named export (không default export).
2. Primitive dưới `components/ui/` có tiền tố `App` (`AppButton`, `AppInput`, `AppCard`, `AppEmptyState`, …); component trong `components/custom/` và `components/layout/` không có tiền tố.
3. Interface props nằm cùng file, ngay phía trên component (`interface` cho hình dạng đối tượng; `type` cho union/primitive/utility type). Kiểu đặt cạnh file sở hữu nó — không có thư mục `src/types/`.
4. Trước khi thêm component mới, kiểm tra `src/components/ui/`, `src/components/custom/` và `src/components/layout/` xem có cái nào mở rộng được không.
5. Giao diện chỉ dùng một lần thì để nội tuyến tại nơi gọi — đừng tách sẵn vào `components/` khi mới có một chỗ dùng.
6. Không dùng barrel file (không có `index.ts` re-export) — import thẳng theo đường dẫn file: `import { AppButton } from "@/components/ui/button/AppButton"`.

## Quy tắc Fetch / Service

Có hai tầng giữa một component và mạng — component không bao giờ gọi `fetch` và không bao giờ import trực tiếp từ `services/`:

```
component → hooks/use<Domain>.ts (React Query, sở hữu queryKey) → services/<domain>.ts (fetch, sở hữu endpoint)
```

1. `services/<domain>.ts` — mỗi endpoint một hàm async được export, request/response có kiểu, kiểu thực thể (`User`, …) khai báo tại đây. Không bao giờ import React; test được mà không cần render. Dùng `fetch` gốc — không dùng axios (ở đây không có gì cần interceptor hay refresh token; nếu sau này xuất hiện một header xác thực dùng chung thì thêm đúng một helper `apiFetch` trong `services/`, không phải một class client).
2. `hooks/use<Domain>.ts` — các lớp bọc `useQuery`/`useMutation` quanh hàm service (`useUsers()`, `useCreateUser()`). `queryKey` của miền được khai báo đúng một lần ở đây — một gốc để thao tác cache theo tiền tố, cộng một factory nhúng mọi input của queryFn (`usersKeyRoot` / `usersKey(search)` trong `useUsers.ts`); không bao giờ viết chuỗi `["users"]` rải rác nơi khác. Mọi biến mà queryFn dùng đều phải xuất hiện trong key (nó chính là mảng phụ thuộc). Chuyển tiếp `signal` của queryFn vào `fetch`.
3. Các component chia sẻ server state qua cache của React Query, không qua props/context: hai component bất kỳ cùng gọi `useUsers()` đọc cùng một mục cache, và mutation cập nhật nó cho tất cả. Server state sống trong React Query; client state (theme, ngôn ngữ, ô nhập liệu) ở lại trong `useState`.
4. Sau một mutation: nếu riêng response đã quyết định được giá trị cache mới (danh sách không lọc, response chứa thực thể), dùng `cancelQueries` + `setQueryData` để khỏi phải gọi lại; nếu danh sách được lọc/sắp xếp/phân trang ở phía server nên response không cho biết thực thể rơi vào đâu (hay có rơi vào không), thì `invalidateQueries` trên key gốc của miền (xem `useCreateUser`).
5. Phong bì của server (`server/src/interface/http/response.ts`) — hãy khai kiểu theo nó, đừng tự chế hình dạng riêng:
   - thành công: `{ statusCode, message, data, timestamp }`
   - lỗi: `{ statusCode, error, message, details?, timestamp, path }`
6. Luôn kiểm tra `res.ok` trước khi đọc body. Body lỗi không chắc chắn là JSON (lỗi proxy, trang 404 dạng HTML) — dùng `res.json().catch(() => null)` ở nhánh lỗi.

## Quy tắc về lỗi & trạng thái tải

1. Mọi lời gọi bất đồng bộ đều phải có trạng thái lỗi/đang tải tường minh — không thất bại im lặng.
2. Dùng `try`/`catch` hoặc `.catch()` thuần. Dự án không cài thư viện xử lý lỗi nào; đừng thêm (`neverthrow`, …) cho nhu cầu ở quy mô này.
3. Hiển thị lỗi ngay trong component như `App.tsx` đang làm; dùng `appToast` (`@/components/ui/toast/AppToast`, chạy trên sonner) cho các thông báo thoáng qua mang tính xuyên suốt.
4. Giao diện lúc tải: chỉ dùng skeleton cho lần tải *đầu tiên* của dữ liệu bất đồng bộ (`isPending`), ghép từ `AppSkeleton` với kích thước khớp bố cục thật (xem prop `loading` của `AppTable` và thẻ demo AppSkeleton trong `App.tsx`) — không tạo file `*Skeleton` cho từng component, và không đặt skeleton ở nơi nội dung thật vốn tĩnh hoặc nơi `keepPreviousData` đã giữ dữ liệu cũ trên màn hình. Không bao giờ hiển thị thông điệp trạng thái rỗng khi lần tải đầu còn đang chạy.

## Quy tắc về styling

1. Dùng utility class của Tailwind trên phần tử — đây là cách tạo kiểu mặc định. Chỉ lùi về `style` nội tuyến khi Tailwind thật sự không diễn đạt được giá trị đó (xem `max-w-[480px]` trong `App.tsx`, tức một giá trị tuỳ ý không phải màu và không có utility sẵn).
2. Không có mã màu hex/tên màu cứng ở bất kỳ đâu trong `.ts`/`.tsx` — ESLint cưỡng chế (`eslint.config.mjs`), và quy tắc này cũng bắt cả màu dạng giá trị tuỳ ý của Tailwind như `text-[#dc143c]`. Hãy thêm token vào khối `@theme` trong `client/src/index.css` dưới dạng `--color-<name>-app`, rồi dùng utility được sinh ra (`bg-<name>-app`, `text-<name>-app`, `border-<name>-app`, …), kèm một ghi đè `:root.dark` ngay cạnh đó. Các class bảng màu sẵn của Tailwind (`bg-gray-800`, `text-white`, …) không tính là màu cứng và ESLint không chặn, nhưng hãy dành chúng cho những màu cố ý giống hệt nhau ở cả hai theme (ví dụ chữ trắng trên nền primary màu cố định) — còn bất cứ thứ gì nằm trên một bề mặt có theme (chữ nội dung, viền, chữ phụ/mờ) đều phải đi qua token để đổi màu theo `.dark`. `border-app` (viền) và `muted-app` (chữ phụ/bị vô hiệu) đã có sẵn — tái sử dụng trước khi thêm token mới.
3. Không dùng template literal trong `className` — ESLint cưỡng chế. Class mặc định là chuỗi nền; một điều kiện chỉ được *thêm* class ghi đè cho trường hợp ngoại lệ, không bao giờ bật/tắt hai class đối nhau — luôn đi qua `cn()`:
   ```tsx
   className={cn("rounded bg-gray-800 px-3 py-1 text-white", { "opacity-50": pending })}
   ```
4. `cn()` nằm ở `client/src/utils/cn.ts` (`twMerge(clsx(inputs))`) — import nó, đừng viết lại. `tailwind-merge` quan trọng ở đây: nó giải quyết xung đột giữa utility nền và utility ghi đè (ví dụ nền `px-2` và ghi đè `px-4`) theo hướng cái sau thắng, việc mà nối chuỗi thuần không làm được.
5. Không CSS-in-JS, không CSS Modules — utility của Tailwind là đủ ở quy mô này. Token toàn cục và lệnh `@import` của Tailwind nằm trong `index.css`; không có gì khác được đặt vào đó.
6. Phần tử bấm được nhận `cursor: pointer` từ một quy tắc toàn cục duy nhất trong `index.css` (`button`, `a[href]`, `[role="button"]`; `:disabled` → `not-allowed`) — không bao giờ thêm `cursor-pointer` ở từng component. Một phần tử bấm được nhưng không phải thẻ gốc (một `div` có `onClick`) bắt buộc phải mang `role="button"` để nhận quy tắc đó — mà nó cũng cần điều này để đảm bảo khả năng tiếp cận.

## An toàn theme & ngôn ngữ

Cả `theme` lẫn `locale` đều là công tắc người dùng bật được ngay trên trang — giao diện mới phải sống được với cả hai mà không cần sửa code.

1. **Theme.** Đừng bao giờ giả định độ tương phản của chế độ sáng hôm nay (kiểu "chữ đang tối nên viền sáng lúc nào cũng thấy") — cùng class đó cũng chạy dưới `.dark`. Kiểm tra markup mới với công tắc theme đã lật, không chỉ ở trạng thái mặc định.
2. **Ngôn ngữ.** Chuỗi `vi` trong `client/src/i18n/` dài hơn bản `en` tương ứng 30–60% (`"Users"` → `"Người dùng"`, `"Disabled"` → `"Vô hiệu hoá"`). Bất kỳ phần tử nào được căn kích thước vừa khít chuỗi tiếng Anh hôm nay sẽ tràn hoặc bị cắt khi chọn `vi`.
   - Không đặt `whitespace-nowrap` lên phần tử đang hiển thị một giá trị `t()`.
   - Không đặt chiều rộng cố định theo pixel bao quanh một nhãn dịch được — hãy để nó tự co theo nội dung, hoặc cho xuống dòng.
   - Mọi hàng flex chứa nút/pill/nhãn có chuỗi dịch được đều cần `flex-wrap` (xem các nút điều khiển ở header và các hàng demo `AppButton`/`AppInput` trong `App.tsx`), để nó xếp chồng thay vì tràn ra ngoài cột hẹp `max-w-[480px]` của ứng dụng.
   - Khi thêm một key mới vào `i18n/<module>.ts`, hãy thử bố cục với ngôn ngữ dài hơn trong hai ngôn ngữ, không chỉ `en`.
3. Ưu tiên để Flexbox/Grid tự sắp lại hơn là dùng `truncate` cho chữ dịch được — ứng dụng chưa có primitive tooltip, nên một nhãn bị cắt mà không có cách nào đọc đủ chuỗi là kết cục tệ hơn một hàng cao thêm một chút.

## Quy ước import

- Dùng alias `@/` cho mọi thứ dưới `client/src/` (`@/components/...`, `@/utils/cn`, …). Import tương đối (`./`, `../`) chỉ dùng cho file trong cùng thư mục.
- Không barrel file — luôn import đúng file, không bao giờ import một `index.ts` re-export của thư mục.
- Nhóm import theo thứ tự: React → thư viện bên thứ ba → alias `@/`.

## Routing & State — chưa có trong dự án này

- Router: thêm `react-router` (nhỏ, chuẩn mực) khi thực sự cần trang thứ hai. Đừng với tay tới thứ nặng hơn nếu không có lý do cụ thể.
- State: `useState`/`useReducer`/`Context` là đủ cho template này. Chỉ thêm thư viện state khi việc truyền props qua nhiều tầng đã thực sự gây khó chịu và chứng minh được trong chính codebase này — không phải phòng xa.

## Checklist trước khi code

- [ ] Đã đọc `README.md` của thư mục đích — thứ bạn sắp viết khớp với mục đích của thư mục đó
- [ ] Đã kiểm tra `src/components/ui/`, `src/components/custom/`, `src/components/layout/` xem có component tái dùng được không trước khi viết mới
- [ ] Đặt file theo cây quyết định (chỉ một trang dùng thì nội tuyến, `ui/` cho nguyên tử dùng 2+ nơi, `custom/` cho loại có nghiệp vụ dùng 2+ nơi, `layout/` cho khung)
- [ ] Tiền tố `App` chỉ dành cho primitive trong `ui/`; không barrel file; chỉ named export
- [ ] Giao diện dùng một lần vẫn để nội tuyến, không tách sẵn ra file riêng
- [ ] Lời gọi mạng đã phân tầng: hàm endpoint ở `services/<domain>.ts`, hook React Query ở `hooks/use<Domain>.ts`, component chỉ import hook; `queryKey` khai báo đúng một lần trong file hook
- [ ] Lời gọi fetch có kiểm tra `res.ok` và xử lý được body lỗi không phải JSON
- [ ] Trạng thái đang tải và trạng thái lỗi đều được xử lý tường minh
- [ ] Không có màu cứng — token khai báo trong khối `@theme` của `index.css` dưới dạng `--color-<name>-app` kèm ghi đè `:root.dark`, dùng qua utility Tailwind được sinh ra (class bảng màu tĩnh của Tailwind chỉ dành cho màu cố định ở cả hai theme)
- [ ] Không có template literal trong `className` — mọi class có điều kiện đều qua `cn()`
- [ ] Không có `cursor-pointer` ở từng component; mọi phần tử bấm được không phải thẻ gốc đều có `role="button"`
- [ ] Đã kiểm tra với công tắc theme lật sang `.dark` — chữ/viền/nội dung mờ vẫn đọc được
- [ ] Đã kiểm tra với `locale` đặt thành `vi` (chuỗi dài hơn) — không tràn/không bị cắt; các hàng có chuỗi dịch được đều có `flex-wrap`, không có `whitespace-nowrap`, không có chiều rộng pixel cố định
- [ ] Không thêm phụ thuộc mới (router, thư viện state, HTTP client) nếu chưa có nhu cầu thật sự ngay lúc này
