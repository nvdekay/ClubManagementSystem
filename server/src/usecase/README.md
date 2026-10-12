# usecase/

Các luồng nghiệp vụ, mỗi tài nguyên/tính năng một file. Hàm thuần chỉ phụ thuộc domain và nhận
repository (port) qua tham số — không bao giờ import từ `interface/` hay `infra/`.
