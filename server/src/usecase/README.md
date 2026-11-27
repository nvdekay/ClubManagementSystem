# usecase/

Các luồng nghiệp vụ, mỗi tài nguyên/tính năng một file. Hàm thuần chỉ phụ thuộc domain và nhận
repository (port) qua tham số — không bao giờ import từ `interface/` hay `infra/`.

`access.ts` chứa các kiểm tra dùng chung: `assertClubAccess` (permission CLB), `requireIcpdpOfficer` (người gọi là
ICPDP officer, tài khoản `Active`) và `parseObjectId`/`isObjectId` — usecase gọi các hàm này thay vì tự viết bản riêng.

`periodic-evidence-cleanup.ts` (feat-upload-orphan-cleanup): `trackEvidenceUploads` bọc kho ảnh minh chứng để mỗi
lần upload được ghi vào sổ `uploadedAssets`, và `cleanupOrphanedEvidence` (job `evidence-cleanup-job.ts` gọi) xoá theo
lô các ảnh quá hạn chờ mà không báo cáo nào tham chiếu.
