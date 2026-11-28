# domain/

Lõi nghiệp vụ thuần: entity + factory kiểm tra, interface của repository (port), và
`DomainError`. Mỗi entity/khái niệm một file. Không import gì từ tầng khác; không bao giờ log,
không bao giờ đụng tới env/DB/HTTP.

`paging.ts` là kiểu dùng chung cho danh sách phân trang phía server: `PageRequest`, `Page<T>`
(`{ items, total, page, pageSize }`), `DEFAULT_PAGE_SIZE` (20) và `MAX_PAGE_SIZE` (100).

`errors.ts` có thêm `orNotFound(value, label)`: trả giá trị, hoặc ném `DomainError('<label> not found', 'not_found')`.
`file-signature.ts` kiểm magic bytes của file tải lên (`fileSignatureMatches`, `isOoxmlZip`).
