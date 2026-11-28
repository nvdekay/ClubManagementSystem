# usecase/

Các luồng nghiệp vụ, mỗi tài nguyên/tính năng một file. Hàm thuần chỉ phụ thuộc domain và nhận
repository (port) qua tham số — không bao giờ import từ `interface/` hay `infra/`.

`access.ts` chứa các kiểm tra dùng chung: `requireSignedIn` (đã đăng nhập, tài khoản `Active`, id hợp lệ),
`assertClubAccess` (permission CLB), `requireIcpdpOfficer` (người gọi là ICPDP officer), `assertClubOrOfficer` (có
`clubId` thì kiểm permission CLB, không thì yêu cầu ICPDP officer) và `parseObjectId`/`isObjectId` — usecase gọi các hàm
này thay vì tự viết bản riêng.

`upload-rollback.ts`: `removeOnFailure` chạy lệnh ghi DB sau khi upload và xoá file vừa upload nếu lệnh ghi thất bại.

`periodic-evidence-cleanup.ts` (feat-upload-orphan-cleanup): `trackEvidenceUploads` bọc kho ảnh minh chứng để mỗi
lần upload được ghi vào sổ `uploadedAssets`, và `cleanupOrphanedEvidence` (job `evidence-cleanup-job.ts` gọi) xoá theo
lô các ảnh quá hạn chờ mà không báo cáo nào tham chiếu.
