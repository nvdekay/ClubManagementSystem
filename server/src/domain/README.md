# domain/

Lõi nghiệp vụ thuần: entity + factory kiểm tra, interface của repository (port), và
`DomainError`. Mỗi entity/khái niệm một file. Không import gì từ tầng khác; không bao giờ log,
không bao giờ đụng tới env/DB/HTTP.
