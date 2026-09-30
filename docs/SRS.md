# Đặc tả yêu cầu phần mềm (SRS) — UCMS

**Sản phẩm:** University Club Management System (UCMS) — Trường Đại học FPT
**Tài liệu:** Software Requirements Specification (SRS), phiên bản 1.0
**Trạng thái:** Baseline để triển khai · **Ngày:** 2026-09-24
**Chủ sở hữu:** Nhóm đồ án WDP301 · **Repository:** `ClubManagementSystem`

> **Tài liệu này là gì.** Baseline yêu cầu hợp nhất duy nhất của UCMS. Nó gộp phần phân tích
> nghiệp vụ, use case model v2, use case specification v2, context diagram / use case diagram /
> state diagram, high-level design và design guidelines thành một bản đặc tả duy nhất để cả
> nhóm thiết kế, code, test và review dựa vào.
>
> **Thẩm quyền.** Khi SRS này và một tài liệu nguồn nói khác nhau về một *yêu cầu*, **lấy theo
> SRS**, vì SRS đã áp dụng đầy đủ các sửa lỗi ghi trong
> [`02-use-cases/UCMS_Review_Issues.md`](02-use-cases/UCMS_Review_Issues.md). Chi tiết nào
> không được nhắc lại ở đây thì vẫn lấy theo tài liệu nguồn được dẫn trong mục tương ứng. Toàn
> bộ tài liệu v1 (57 use case, đánh số `UC01–UC57`) là lịch sử: mọi mã số trong tài liệu này là
> **v2** (`UC01–UC52`).
>
> **Ngôn ngữ.** Tài liệu này viết bằng tiếng Việt theo yêu cầu của chủ nhiệm đồ án. Đây là
> **ngoại lệ có chủ đích** so với quy tắc "English only" của
> [`../.rules/README.md`](../.rules/README.md) (rule 5); mọi tài liệu khác và toàn bộ code, comment,
> commit, config, thông báo lỗi, test vẫn bắt buộc dùng tiếng Anh. Các **định danh kỹ thuật**
> (mã UC/FR/BR, tên trạng thái, tên thực thể và trường dữ liệu, đường dẫn file, endpoint, tên
> module) được giữ nguyên tiếng Anh vì chúng xuất hiện trực tiếp trong code.

---

## Mục lục

| § | Nội dung |
|---|---|
| 1 | [Giới thiệu](#1-giới-thiệu) |
| 2 | [Mô tả tổng quan](#2-mô-tả-tổng-quan) |
| 3 | [Yêu cầu giao diện ngoài](#3-yêu-cầu-giao-diện-ngoài) |
| 4 | [Yêu cầu chức năng](#4-yêu-cầu-chức-năng) |
| 5 | [Quy tắc nghiệp vụ](#5-quy-tắc-nghiệp-vụ) |
| 6 | [Vòng đời thực thể (máy trạng thái)](#6-vòng-đời-thực-thể-máy-trạng-thái) |
| 7 | [Yêu cầu dữ liệu](#7-yêu-cầu-dữ-liệu) |
| 8 | [Yêu cầu xuyên suốt — workflow, thông báo, audit, scheduler](#8-yêu-cầu-xuyên-suốt--workflow-thông-báo-audit-scheduler) |
| 9 | [Mô hình đánh giá hiệu quả CLB](#9-mô-hình-đánh-giá-hiệu-quả-clb) |
| 10 | [Yêu cầu dashboard](#10-yêu-cầu-dashboard) |
| 11 | [Yêu cầu phi chức năng](#11-yêu-cầu-phi-chức-năng) |
| 12 | [Yêu cầu bảo mật và quyền riêng tư](#12-yêu-cầu-bảo-mật-và-quyền-riêng-tư) |
| 13 | [Tiêu chí nghiệm thu](#13-tiêu-chí-nghiệm-thu) |
| 14 | [Truy vết yêu cầu](#14-truy-vết-yêu-cầu) |
| 15 | [Phạm vi phát hành và thứ tự triển khai](#15-phạm-vi-phát-hành-và-thứ-tự-triển-khai) |
| 16 | [Quyết định còn mở và vấn đề đã biết](#16-quyết-định-còn-mở-và-vấn-đề-đã-biết) |
| 17 | [Thuật ngữ](#17-thuật-ngữ) |
| A | [Phụ lục A — User story](#phụ-lục-a--user-story) |
| B | [Phụ lục B — Chỉ mục sơ đồ](#phụ-lục-b--chỉ-mục-sơ-đồ) |
| C | [Phụ lục C — Bản đồ REST endpoint dự kiến](#phụ-lục-c--bản-đồ-rest-endpoint-dự-kiến) |

---

# 1. Giới thiệu

## 1.1 Mục đích

UCMS số hoá và quản trị **toàn bộ vòng đời câu lạc bộ sinh viên** trong trường: thành lập, quản
trị và nhiệm kỳ, tuyển thành viên, sự kiện, đăng ký và điểm danh, mượn cơ sở vật chất, tài
chính, báo cáo, tuân thủ, phản hồi và khiếu nại, và đánh giá hiệu quả định kỳ.

Hệ thống **không phải** một website danh bạ CLB. Lý do nó tồn tại là: mọi hồ sơ quan trọng đều
có trạng thái, có người chịu trách nhiệm, có vết phê duyệt, và dữ liệu của nó là đầu vào cho
nghiệp vụ kế tiếp:

```text
Event Proposal → Approval → Event → Registration → Attendance → Post-event Report → Evaluation
Event Proposal (+ ngân sách) → Approval → Advance → Expense → Evidence → Settlement → Reconciliation → Top-up | Recovery → Evaluation
Recruitment → Application → Screening → Decision → Membership → Participation → Evaluation
Property Booking → Kiểm tra xung đột → ICPDP quyết định → Thực thi sự kiện → Utilization → Evaluation
Event Feedback → Tổng hợp → Post-event Report → Evaluation
Complaint → Triage → Violation case → Lịch sử tuân thủ → Evaluation
```

SRS này là đầu vào cho: ERD và thiết kế cơ sở dữ liệu, thiết kế API, activity diagram và
sequence diagram, UI/UX, test case, product backlog và sprint backlog.

## 1.2 Phạm vi sản phẩm

**Trong phạm vi** — xác thực bằng Google OAuth; phân quyền RBAC; thành lập CLB; vòng đời CLB;
ban chủ nhiệm và nhiệm kỳ; tuyển thành viên; quản lý thành viên; đề xuất, phê duyệt, công bố,
huỷ và đổi lịch sự kiện; đăng ký tham gia; điểm danh và check-in; mượn cơ sở vật chất cho hoạt
động CLB; ngân sách sự kiện (nằm trong đề xuất sự kiện), giải ngân, khoản chi, chứng từ tài chính và đối soát; báo cáo định
kỳ; phản hồi sự kiện; tiếp nhận và phân loại khiếu nại của sinh viên; hồ sơ tuân thủ và vi phạm;
đánh giá hiệu quả CLB; thông báo in-app và email; nhắc hạn và leo thang; nhật ký audit; dashboard
theo vai trò.

**Ngoài phạm vi** — xem [§2.9](#29-ngoài-phạm-vi).

**Quy mô của baseline**

| Hạng mục | Số lượng |
|---|---|
| Actor là người | 4 (Student, Club Member, Club Leader, ICPDP Officer); Student ◁ Club Member ◁ Club Leader |
| Hệ thống ngoài | 3 (Google OAuth, Google SMTP, Cloudinary) |
| Module nghiệp vụ | 12 (M01–M12) |
| Use case | 52 (UC01–UC52) |
| Quy tắc nghiệp vụ | 57 quy tắc còn hiệu lực (BR01–BR58, BR43 đã rút) |
| Vấn đề nghiệp vụ (pain point) | 19 (BP01–BP19) |
| Vòng đời thực thể | 11 |
| User story | 41 (US01–US41) |
| Tiêu chí nghiệm thu | 20 (AC01–AC20) + 2 bổ sung |
| Luồng dữ liệu trên context diagram | 40 |
| Quyết định còn mở của nhóm | 5 (D1–D5) |

## 1.3 Định nghĩa, từ viết tắt

| Thuật ngữ | Ý nghĩa |
|---|---|
| **UCMS** | University Club Management System — sản phẩm này |
| **ICPDP** | Đơn vị của nhà trường quản lý hoạt động CLB sinh viên. Là **cấp phê duyệt duy nhất** cho mọi yêu cầu CLB hoặc sinh viên gửi lên nhà trường, và là actor duy nhất đại diện nhà trường |
| **CMB** | Club Management Board — **tên gọi chung của phía CLB**: Club Leader cùng các Club Member có role phù hợp. Không còn là một actor (I58); trường actor của mỗi use case ghi `Club Leader` hoặc `Club Member` kèm permission. Trên context diagram đầu tiên phía CLB tên `Club's Admin` |
| **Club Member** | Actor: sinh viên có tư cách thành viên ở một CLB. Làm các việc vận hành CLB khi role của mình có permission tương ứng (BR54) |
| **Club Leader** | Actor: Chủ nhiệm CLB — người giữ ghế Chủ nhiệm đã được ICPDP xác nhận (UC11 / UC13). Kế thừa Club Member, có mọi permission CLB và 4 quyền giữ riêng (BR55) |
| **Role CLB** | Vai trò trong cơ cấu tổ chức của CLB, mang một tập permission lấy từ danh mục cố định. Cơ cấu ban đầu được khai báo trong hồ sơ thành lập (UC07) và ICPDP thẩm định ở UC08; sau đó Club Leader sửa ở UC23, mỗi lần sửa là một phiên bản cơ cấu mới (BR47, BR55, BR56) |
| **Role ban điều hành** | Role được chủ nhiệm đánh dấu là thuộc ban điều hành (ví dụ Phó chủ nhiệm, Trưởng ban). Người giữ được đề xuất ở UC10, ICPDP xác nhận ở UC11 và thay qua chuyển giao UC12 / UC13, tạo nên lịch sử ban điều hành theo nhiệm kỳ (BR55) |
| **Phiên bản cơ cấu** | Bản chụp bất biến của toàn bộ role và permission của một CLB tại một thời điểm; phiên bản 1 đến từ UC08, các phiên bản sau từ UC23 hoặc UC13 (BR56) |
| **Club** | Một CLB được công nhận, có vòng đời (`Pending Setup → Active → Suspended → Dissolving → Dissolved`) |
| **Term** (nhiệm kỳ) | Khoảng thời gian có giới hạn mà một ban chủ nhiệm nắm quyền (`ClubTerm`) |
| **Campaign** | Một đợt tuyển thành viên (`RecruitmentCampaign`) |
| **Property** | Phòng, hội trường hoặc thiết bị mà nhà trường mở cho hoạt động CLB |
| **Booking** | Lượt đặt/mượn một property trong một khoảng thời gian (`PropertyBooking`) |
| **Approval task** | Việc cần xử lý sinh ra ở phía người duyệt khi một hồ sơ được nộp |
| **Assess-and-decide** | Một phiên thẩm định duy nhất, kết thúc bằng đúng một trong ba kết quả: *yêu cầu chỉnh sửa*, *phê duyệt*, *từ chối* |
| **Revision** / **Version** | Bản chụp chỉ-ghi-thêm của một hồ sơ đã nộp; nộp lại sẽ tạo bản mới chứ không ghi đè bản cũ |
| **Scheduler** | Chức năng hệ thống chạy theo thời gian (nhắc hạn, leo thang, chuyển trạng thái theo mốc thời gian, rút hàng đợi outbox). **Không phải** actor |
| **Outbox** | Hàng đợi thông báo được lưu xuống DB rồi gửi bất đồng bộ ra in-app và email |
| **Feedback window** | Khoảng thời gian một người tham dự được gửi phản hồi sự kiện — mở tại thời điểm người đó check-in, đóng sau khi sự kiện kết thúc một khoảng cấu hình được |
| **Blocking conflict / Warning** | Hai kết quả khác rỗng của quy tắc xung đột BR15 |
| **Data lineage** | Chuỗi `Kết quả dimension → chỉ số → thực thể nguồn → kỳ dữ liệu nguồn`, giúp giải thích được điểm đánh giá |

## 1.4 Tài liệu tham chiếu

| # | Tài liệu | Vai trò với SRS |
|---|---|---|
| R1 | [`01-business-analysis/UCMS_Business_System_Analysis.md`](01-business-analysis/UCMS_Business_System_Analysis.md) | Phân tích nghiệp vụ. Nguồn của §1–§7, §12–§13, §16–§20, §23–§24: vấn đề, actor, phạm vi, module, luồng nghiệp vụ, user story, tiêu chí nghiệm thu, domain model, mô hình đánh giá, dashboard, thông báo, audit, feature nổi bật |
| R2 | [`02-use-cases/UCMS_UseCase_Model_v2.md`](02-use-cases/UCMS_UseCase_Model_v2.md) | **Use case model hiện hành.** 52 use case, ánh xạ v1→v2, bản đồ quan hệ, ma trận actor, vòng đời, sửa đổi quy tắc, phạm vi phát hành, truy vết, quyết định còn mở, ánh xạ luồng context |
| R3 | [`02-use-cases/UCMS_UseCase_Specification_v2.md`](02-use-cases/UCMS_UseCase_Specification_v2.md) | **Đặc tả chi tiết hiện hành** của cả 52 use case |
| R4 | [`02-use-cases/UCMS_Review_Issues.md`](02-use-cases/UCMS_Review_Issues.md) | Nhật ký review chéo I01–I30; mọi issue đã xử lý đều đã được đưa vào SRS này |
| R5 | [`03-diagrams/UCMS_Context_Diagram_v2.1.drawio`](03-diagrams/UCMS_Context_Diagram_v2.1.drawio) | Biên hệ thống, 40 luồng dữ liệu, 7 thực thể ngoài (v2.1, gộp theo nhóm dữ liệu — I56, I58) |
| R6 | [`03-diagrams/UCMS_UseCase_ByActor.drawio`](03-diagrams/UCMS_UseCase_ByActor.drawio) | Use case diagram: trang All users (quan hệ kế thừa actor) và mỗi trang một nhóm actor |
| R7 | [`03-diagrams/UCMS_State_Diagrams.drawio`](03-diagrams/UCMS_State_Diagrams.drawio) | Máy trạng thái của 8 thực thể lõi |
| R8 | [`04-design/UCMS_High_Level_Design.md`](04-design/UCMS_High_Level_Design.md) | Container, bản đồ module → code, thiết kế approval/notification/audit, định danh, thiết kế dữ liệu, bề mặt API, client, triển khai |
| R9 | [`04-design/design-guidelines.md`](04-design/design-guidelines.md) | Quy tắc giao diện (màu, typography, spacing, công thức component, checklist accessibility) |
| R10 | [`../.rules/README.md`](../.rules/README.md), [`architecture.md`](../.rules/architecture.md), [`backend.md`](../.rules/backend.md), [`frontend.md`](../.rules/frontend.md) | Quy tắc kỹ thuật ràng buộc phần triển khai |
| R11 | [`../.sdd/rfcs/ADR-001-clean-architecture-layers.md`](../.sdd/rfcs/ADR-001-clean-architecture-layers.md), [`ADR-002`](../.sdd/rfcs/ADR-002-client-architecture.md) | Các quyết định kiến trúc đã chốt |

## 1.5 Quy ước tài liệu — hệ thống mã định danh

| Tiền tố | Ý nghĩa | Ví dụ |
|---|---|---|
| `BP` | Vấn đề nghiệp vụ / pain point | BP06 — không phát hiện được trùng lịch |
| `UC` | Use case (đánh số v2) | UC26 — Thẩm định và quyết định đề xuất sự kiện |
| `FR-UCnn-xx` | Yêu cầu chức năng nguyên tử thuộc use case *nn* | FR-UC26-04 |
| `BR` | Quy tắc nghiệp vụ | BR15 — quy tắc xung đột |
| `NFR-<nhóm>-xx` | Yêu cầu phi chức năng | NFR-SEC-03 |
| `CON-xx` | Ràng buộc thiết kế / triển khai | CON-02 |
| `ASM-xx` | Giả định hoặc phụ thuộc | ASM-01 |
| `EXT-xx` | Giao diện hệ thống ngoài | EXT-01 — Google OAuth |
| `AC` | Tiêu chí nghiệm thu | AC16 — xung đột đặt cơ sở vật chất |
| `US` | User story | US12 |
| `D1–D5` | Quyết định còn mở của nhóm | D4 — có duyệt lại khi đổi lịch không |
| `Dn` (đánh giá) | Dimension đánh giá D1–D6 — **không cùng dãy** với quyết định còn mở; luôn đọc theo ngữ cảnh |

Cách dùng từ theo tinh thần RFC 2119: **phải** = bắt buộc, **nên** = khuyến nghị, **có thể** =
tuỳ chọn. Mọi `FR` trong §4 đều bắt buộc trừ khi ghi rõ khác.

## 1.6 Cách dùng SRS này khi code

1. Chọn use case bạn đang làm. §4 cho biết actor, tiền điều kiện, luồng, ngoại lệ và hậu điều
   kiện dưới dạng các `FR` được đánh số — thông thường một `FR` tương ứng một nhánh code hoặc
   một test.
2. Tra §5 cho mọi `BR` mà use case đó viện dẫn; quy tắc nghiệp vụ được thực thi ở **tầng
   usecase**, không bao giờ chỉ nằm ở UI.
3. Tra §6 cho máy trạng thái của thực thể; một chuyển trạng thái không có trong đó là không tồn tại.
4. Tra §7 cho aggregate bạn ghi, và §8 cho approval task, thông báo và bản ghi audit mà luồng
   đó phải tạo ra.
5. Tra §11 và §12 cho khung phi chức năng, và R9 cho giao diện.
6. Bản đồ module → code ở R8 §3 nói file đặt ở đâu; `.rules/` nói code phải trông như thế nào.
   Definition of Done là `npm run check` xanh.

---

# 2. Mô tả tổng quan

## 2.1 Bối cảnh sản phẩm

UCMS là một ứng dụng web mới, khép kín. Nó thay thế quy trình đang bị phân mảnh trên Word,
Google Forms, Excel, Drive và email. Hệ thống chỉ có ba phụ thuộc ngoài và không tích hợp gì
khác.

```text
            Student ─┐
        Club Member ─┤
        Club Leader ─┼──HTTPS──► UCMS SPA ──/api/v1──► UCMS API ──► MongoDB
      ICPDP Officer ─┘                                    │
                                                          ├──► Google OAuth   (đăng nhập)
                                                          ├──► Google SMTP    (gửi email thông báo)
                                                          └──► Cloudinary     (lưu ảnh tải lên)
```

Biên hệ thống và toàn bộ 40 luồng dữ liệu được vẽ ở R5
([`img/UCMS_Context_Diagram_v2.1_01_Context-diagram-v2.1.png`](03-diagrams/img/UCMS_Context_Diagram_v2.1_01_Context-diagram-v2.1.png)).
Mỗi luồng là một **nhóm dữ liệu**, không phải một use case; một hồ sơ gửi lên ICPDP chỉ vẽ một
lần (`Submissions for review`) thay vì lặp lại ở cả chiều CMB → hệ thống và hệ thống → ICPDP.
Mọi luồng đều được tạo ra hoặc tiêu thụ bởi ít nhất một use case; bảng ánh xạ luồng → use case
nằm ở [§14.4](#144-luồng-dữ-liệu-context--use-case).

## 2.2 Chức năng sản phẩm — bản đồ module

Một module là một **năng lực nghiệp vụ**, được triển khai thành một lát cắt dọc xuyên bốn tầng
phía server cộng với màn hình phía client (R8 §3). Module **không bao giờ** là một thư mục cấp
cao mới.

| Module | Năng lực | Actor chính | Aggregate sở hữu | Use case |
|---|---|---|---|---|
| **M01** Identity, Access & Configuration | Đăng nhập Google OAuth, RBAC, chính sách nhà trường, định tuyến phê duyệt, dashboard theo vai trò | Tất cả, ICPDP | User, StudentProfile, Role, Permission, PolicyVersion, RoutingRuleSet | UC01–UC05 |
| **M02** Club Lifecycle & Governance | Hồ sơ thành lập, hồ sơ CLB, tạm ngừng / kích hoạt lại / giải thể | Student, Club Member, Club Leader, ICPDP | Club, ClubApplication(+Version) | UC06–UC09, UC14, UC15 |
| **M03** Leadership & Term | Đề xuất và xác nhận ban chủ nhiệm, chuyển giao nhiệm kỳ, role CLB và phân quyền | Club Leader, ICPDP | ClubTerm, ClubPosition, ClubPositionAssignment, TransitionPlan | UC10–UC13, UC23 |
| **M04** Recruitment & Membership | Đợt tuyển, đơn ứng tuyển, sàng lọc, tiếp nhận, danh sách thành viên, không gian thành viên | Student, Club Member | RecruitmentCampaign, RecruitmentApplication, CandidateEvaluation, ClubMembership | UC16–UC22, UC24 |
| **M05** Event & Activity | Đề xuất (kèm ngân sách), phê duyệt, công bố, huỷ / đổi lịch | Club Member, ICPDP | Event, EventProposalVersion | UC25–UC28 |
| **M06** Registration & Attendance | Đăng ký, danh sách chờ, check-in, chốt điểm danh | Student, Club Member | EventRegistration, Attendance | UC29–UC32 |
| **M07** Finance & Budget | Tạm ứng, khoản chi, chứng từ, quyết toán, đối soát, cấp bù và thu hồi cho ngân sách sự kiện (ngân sách được xin và duyệt trong đề xuất sự kiện, M05) | Club Member, ICPDP | EventBudget, BudgetDisbursement, Expense, FinancialEvidence, FinancialReconciliation | UC35–UC37 |
| **M08** Reporting, Accountability & Compliance | Báo cáo sau sự kiện, báo cáo định kỳ, hồ sơ vi phạm | Club Member, ICPDP | PostEventReport, PeriodicReport, Violation, CorrectiveAction | UC33, UC34, UC38–UC40 |
| **M09** Performance Evaluation | Cấu hình scheme, sinh bản nháp, công bố | ICPDP | EvaluationScheme, EvaluationDimension, Evaluation, EvaluationDimensionResult | UC41–UC43 |
| **M10** Workflow, Notification & Audit | Approval task, hàng đợi thông báo, gửi email, nhật ký audit, scheduler | Xuyên suốt | ApprovalTask, ApprovalDecision, Notification, EmailDeliveryLog, AuditLog | không có use case riêng — xem §8 |
| **M11** Property & Facility Booking | Danh mục, yêu cầu đặt, quyết định, trả/giải phóng | Club Member, ICPDP | Property, PropertyBooking | UC44–UC47 |
| **M12** Feedback & Complaint | Phản hồi sự kiện, tiếp nhận khiếu nại, phân loại, phản hồi của CLB | Student, Club Member, ICPDP | EventFeedback, Complaint | UC48–UC52 |

**Quy tắc sở hữu dữ liệu theo module (CON-05).** Một use case chỉ được ghi vào aggregate của
module mình, và đọc module khác qua repository port của module đó. Ghi xuyên module phải đi qua
use case của module sở hữu, không bao giờ gọi thẳng repository của nó.

## 2.3 Actor và nhóm người dùng

UCMS có **bốn actor là người**: Student, Club Member, Club Leader và ICPDP Officer, với chuỗi
generalization **Student ◁ Club Member ◁ Club Leader** (một Club Member là một Student; một Club
Leader là một Club Member). Các vai trò con bên trong CLB (thủ quỹ, trưởng ban…) là **role CLB**
có permission (UC23, BR54, BR55), không tạo thành actor mới; phân cấp trong ICPDP là RBAC.

"CMB" trong tài liệu này là **tên gọi chung của phía CLB** — Club Leader cùng các Club Member có
role phù hợp — chứ không phải một actor.

**Guest không phải actor.** Guest là khách chưa đăng nhập, chỉ được **đọc** khu công khai của
UC06 (danh bạ CLB, trang CLB, đợt tuyển đang mở, sự kiện công khai sắp tới). Guest không sở hữu
use case nào và không tạo dữ liệu; mọi hành động (ứng tuyển, đăng ký, nộp hồ sơ…) đều đòi UC01,
và lúc đó người dùng là Student. Nguyên tắc: *khám phá công khai, hành động phải đăng nhập*.

### A1 — Student (Sinh viên)

Mọi sinh viên đã đăng nhập: người chưa tham gia CLB, ứng viên, thành viên CLB, hoặc người đứng
đơn thành lập CLB.

- **Trách nhiệm:** tìm CLB; nộp hồ sơ thành lập CLB; ứng tuyển vào một đợt tuyển; theo dõi đơn;
  đăng ký sự kiện; check-in; gửi phản hồi sự kiện; gửi khiếu nại.
- **Tạo ra dữ liệu:** ClubApplication (khi là người sáng lập), RecruitmentApplication,
  EventRegistration, Attendance, EventFeedback, Complaint.
- **Đọc dữ liệu:** Club, RecruitmentCampaign, Event, trạng thái đơn và tư cách thành viên của
  chính mình, StudentProfile (đồng bộ từ Google OAuth).
- **Use case:** UC01, UC02, UC06, UC07, UC17, UC29, UC31, UC48, UC50.

### A2 — Club Member (Thành viên CLB)

Một Student có tư cách thành viên `Active` ở một CLB (UC24 cho phép cả `Inactive`). Kế thừa mọi
use case của Student. Mọi thành viên dùng được không gian thành viên và xin rời CLB; các việc
**vận hành CLB** chỉ làm được khi role của người đó trong CLB có permission tương ứng (BR54) —
xem danh mục permission ở mục Mô hình RBAC. Một thành viên có thể giữ nhiều role; quyền là hợp
các permission của các role đó. Quyền gắn với **nhiệm kỳ** đang hoạt động (BR47).

- **Trách nhiệm (theo permission):** vận hành hồ sơ và ban/bộ phận CLB; tuyển thành viên và quản
  lý danh sách; đề xuất, công bố, huỷ và đổi lịch sự kiện; quản lý danh sách chờ; chốt điểm danh;
  nộp báo cáo sau sự kiện và báo cáo định kỳ; xin ngân sách trong đề xuất sự kiện, ghi nhận khoản chi kèm chứng từ và nộp quyết toán;
  xin và trả cơ sở vật chất; xem phản hồi sự kiện; trả lời khiếu nại được chuyển xuống.
- **Use case không cần permission:** UC22, UC24.
- **Use case cần permission:** UC09, UC16, UC18, UC19, UC20, UC21, UC25, UC27, UC28, UC30,
  UC32, UC33, UC36, UC38, UC45, UC47, UC49, UC52 (cùng UC01, UC02).

### A3 — Club Leader (Chủ nhiệm CLB)

Người giữ ghế **Chủ nhiệm** đã được ICPDP xác nhận ở UC11 hoặc UC13; khi CLB còn `Pending Setup`,
người đứng đơn giữ ghế tạm từ UC08 và chỉ dùng được UC09, UC10, UC23 (BR47). Kế thừa Club Member,
có **mọi permission CLB**, và giữ riêng bốn quyền không cấp được cho role nào (BR55). Club Leader
không uỷ quyền quản lý role cho người khác.

- **Trách nhiệm:** tạo role CLB, cấu hình permission của từng role và gán thành viên vào role;
  đề xuất ban chủ nhiệm; lập kế hoạch chuyển giao; xin tạm ngừng hoạt động.
- **Use case riêng:** UC10, UC12, UC14, UC23 (cộng mọi use case của Club Member).

### A4 — ICPDP Officer

Là **actor duy nhất phía nhà trường** và là **cấp phê duyệt duy nhất** cho mọi yêu cầu gửi lên
nhà trường (BR31); quyết định nội bộ CLB do CMB đưa ra. Mọi quyết định
quản trị đều kết thúc ở đây: thành lập, trạng thái CLB, xác nhận ban chủ nhiệm, chuyển giao
nhiệm kỳ, duyệt sự kiện (kèm ngân sách) và giải ngân, đối soát, cấp cơ sở vật chất, phân loại
khiếu nại, hồ sơ vi phạm, đánh giá, và toàn bộ cấu hình.

- **Vì sao không có actor thứ tư:** Phòng Tài chính, Quản lý cơ sở vật chất, An ninh hay cố vấn
  khoa **không tương tác trực tiếp** với UCMS. Khi cần ý kiến chuyên môn của họ, ICPDP lấy ý
  kiến **ngoài hệ thống** và ghi vào review note của chính quyết định mình. Hệ quả: hệ thống chỉ
  có một cấp phê duyệt; duyệt đa cấp là **nội bộ ICPDP** (theo rule định tuyến của UC05, BR16);
  phân cấp trong ICPDP (officer, senior officer, head) là RBAC — xem quyết định còn mở D1.
- **Use case:** UC01, UC02, UC03, UC04, UC05, UC08, UC11, UC13, UC15, UC26, UC34, UC35,
  UC37, UC39, UC40, UC41, UC42, UC43, UC44, UC46, UC51.

### Dùng chung và actor phụ

- UC01 và UC02 thuộc mọi actor, nội dung khác nhau theo vai trò và theo permission.
- UC31 là use case duy nhất có actor phụ: **Student** là actor chính, **Club Member** có
  `club.attendance.manage` hỗ trợ qua chức năng check-in thủ công.
- **Không use case nào có hai actor chính.**

### Hệ thống ngoài (không phải actor — không ra quyết định, không sở hữu business outcome)

| ID | Hệ thống | Chiều | Dữ liệu |
|---|---|---|---|
| **ES1** | Google OAuth | UCMS → Google | `Authentication request` |
| | | Google → UCMS | `Identity data` — email, họ tên, ảnh đại diện |
| **ES2** | Google SMTP Service | UCMS → Google | `Email message` cho mọi thông báo có kênh email |
| **ES3** | Cloudinary | UCMS → Cloudinary | `Image file` — ảnh người dùng tải lên |
| | | Cloudinary → UCMS | `Image URL` — hệ thống lưu URL thay cho file |

### Mô hình RBAC

| Cấp | Nguồn cấp quyền | Ví dụ |
|---|---|---|
| Vai trò hệ thống | Cấp trong UC03 | `ICPDP_OFFICER`, `ICPDP_HEAD` (cấp duyệt thứ hai, D1), `ATTENDANCE_UNLOCK` (BR19) |
| Club Leader (ghế Chủ nhiệm) | Xác nhận ở UC11 / UC13, gắn nhiệm kỳ; mọi permission CLB + 4 quyền giữ riêng | Chủ nhiệm |
| Role ban điều hành | Chủ nhiệm đánh dấu trong cơ cấu (UC07, đổi qua UC13); người giữ đến từ UC10 / UC11 / UC13; permission do Club Leader cấu hình ở UC23 (A4) | Phó chủ nhiệm, Trưởng ban A, Trưởng ban B |
| Role CLB thường | Khai báo trong cơ cấu (UC07) hoặc Club Leader thêm ở UC23; gán thành viên ở UC23, hiệu lực ngay, không cần ICPDP (BR55) | Thủ quỹ, Event coordinator |
| Role Members (mặc định) | Có sẵn trong mọi cơ cấu, không xoá được; tự gán cho mọi thành viên được tiếp nhận ở UC20; permission do Club Leader chọn, mặc định không có (BR56) | Members |
| Quyền sáng lập tạm thời | Cấp bởi UC08 khi phê duyệt, quyền leader chỉ cho UC09, UC10 và UC23 khi CLB còn `Pending Setup`, bị thu hồi ở UC11 | Người đứng đơn thành lập |

Quyền luôn được suy ra từ `ClubPositionAssignment ∩ ClubTerm đang hoạt động` — không bao giờ từ
một cờ gắn trên user (R8 §5). Role CLB được lưu ở `clubPositions` (tên bảng giữ nguyên).

**Cơ cấu tổ chức và phiên bản (BR56).** Cơ cấu role của CLB — danh sách role, role nào thuộc ban
điều hành, permission của từng role — được khai báo ngay trong hồ sơ thành lập (UC07) và ICPDP
thẩm định cùng hồ sơ (UC08). Khi duyệt, cơ cấu thành **phiên bản 1**. Mỗi thay đổi sau đó ở UC23
hoặc qua chuyển giao UC13 tạo một phiên bản mới có ngày hiệu lực, không ghi đè phiên bản trước.
Nhờ vậy ICPDP theo dõi được CLB có những role nào, các lần chuyển giao và lịch sử ban điều hành
(UC02). Mọi cơ cấu luôn có role **Chủ nhiệm** (cố định, người giữ là Club Leader) và role
**Members** (mặc định).

**Danh mục permission CLB (BR54, BR55).** Cố định, do hệ thống định nghĩa; Club Leader chỉ chọn
từ danh mục này khi cấu hình role ở UC23.

| Permission | Use case | Cấp được cho role |
|---|---|---|
| `club.profile.manage` | UC09 | có |
| `club.recruitment.manage` | UC16 | có |
| `club.application.review` | UC18, UC19, UC20 | có |
| `club.member.manage` | UC21 | có |
| `club.event.manage` | UC25 (gồm phần ngân sách của đề xuất), UC27, UC28 | có |
| `club.attendance.manage` | UC30, UC32, check-in thủ công ở UC31 | có |
| `club.report.submit` | UC33, UC38 | có |
| `club.expense.record` | UC36 | có |
| `club.booking.manage` | UC45, UC47 | có |
| `club.feedback.view` | UC49 | có |
| `club.complaint.respond` | UC52 | có |
| `club.role.manage` | UC23 | không — giữ riêng Club Leader |
| `club.board.nominate` | UC10 | không — giữ riêng Club Leader |
| `club.transition.plan` | UC12 | không — giữ riêng Club Leader |
| `club.suspension.request` | UC14 | không — giữ riêng Club Leader |

## 2.4 Cơ cấu tổ chức

Mục này mô tả **bộ máy thật** mà UCMS phục vụ: ai đứng ở đâu, ai quyết định gì, và mỗi vị trí
ánh xạ sang actor / role nào trong hệ thống. Sơ đồ: trang *Organization structure* của
[`03-diagrams/UCMS_Organization_and_Flows.drawio`](03-diagrams/UCMS_Organization_and_Flows.drawio)
([PNG](03-diagrams/img/UCMS_Organization_and_Flows_01_Organization-structure.png)).

```text
Nhà trường
├── ICPDP ─────────────────────────────── cấp phê duyệt duy nhất phía nhà trường (BR31)
│   ├── ICPDP Head          vai trò ICPDP_HEAD — cấp duyệt thứ hai theo rule UC05 (BR16, D1)
│   └── ICPDP Officer       vai trò ICPDP_OFFICER — thẩm định, quyết định, giải ngân, đối soát
│
├── Đơn vị tham vấn (ngoài hệ thống): Tài chính, Cơ sở vật chất, An ninh, cố vấn khoa
│       ý kiến do ICPDP lấy ngoài hệ thống và ghi vào review note — không phải actor
│
└── Câu lạc bộ (N CLB; mỗi CLB có đúng một nhiệm kỳ đang hoạt động — ClubTerm)
    ├── Chủ nhiệm            Club Leader — ghế cố định, ICPDP xác nhận (UC11 / UC13)
    ├── Ban điều hành        role ban điều hành: Phó chủ nhiệm, Trưởng ban… — ICPDP xác nhận
    │                        người giữ (UC10 / UC11 / UC13)
    ├── Các ban / bộ phận    khai báo ở UC09; role CLB thường gắn với ban: Thủ quỹ, Event
    │                        coordinator… — Club Leader gán ở UC23, không cần ICPDP (BR55)
    └── Thành viên           Club Member — role Members mặc định, tự gán khi tiếp nhận (UC20)

Sinh viên (Student) — mọi sinh viên đã đăng nhập: người tìm CLB, ứng viên, người tham dự sự
kiện, người gửi phản hồi / khiếu nại, người đứng đơn thành lập CLB
```

| Vị trí trong tổ chức | Actor / quyền trong UCMS | Ai cấp, ở đâu | Quyết định thuộc về vị trí này |
|---|---|---|---|
| ICPDP Officer | ICPDP Officer, vai trò `ICPDP_OFFICER` | UC03 | Thành lập CLB, xác nhận ban chủ nhiệm và chuyển giao, duyệt sự kiện kèm ngân sách, giải ngân và đối soát, duyệt cơ sở vật chất, phân loại khiếu nại, hồ sơ vi phạm, đánh giá, cấu hình |
| ICPDP Head | ICPDP Officer, vai trò `ICPDP_HEAD` | UC03 | Cấp duyệt thứ hai cho hồ sơ khớp rule định tuyến của UC05 (rủi ro cao, quy mô lớn, ngân sách vượt ngưỡng) |
| Đơn vị tham vấn | — (không dùng hệ thống) | — | Không quyết định trong hệ thống; ý kiến nằm trong review note của ICPDP |
| Chủ nhiệm CLB | Club Leader | UC11 / UC13 (ghế Chủ nhiệm) | Cơ cấu role và phân quyền (UC23), đề cử ban chủ nhiệm, kế hoạch chuyển giao, xin tạm ngừng; có mọi permission CLB |
| Người đứng đơn thành lập | Student, sau UC08 có quyền sáng lập tạm thời | UC08 | Chỉ UC09, UC10, UC23 khi CLB còn `Pending Setup` (BR47) |
| Ban điều hành, trưởng ban, thủ quỹ… | Club Member giữ role tương ứng | UC10 / UC11 / UC13 (role ban điều hành) hoặc UC23 (role thường) | Việc vận hành CLB theo đúng permission của role (BR54) |
| Thành viên | Club Member, role Members | UC20 | Không gian thành viên, xin rời CLB; thêm việc khác nếu role Members được cấp permission |
| Sinh viên | Student | UC01 | Không quyết định việc của CLB; tạo hồ sơ, đơn, đăng ký, phản hồi, khiếu nại |

**Nguyên tắc của bộ máy.**

1. **Một cửa phía nhà trường.** Mọi yêu cầu gửi lên nhà trường chỉ đi tới ICPDP (BR31). Duyệt
   nhiều cấp là chuyện nội bộ ICPDP (UC05, BR16), không phải chuyền qua phòng ban khác.
2. **Quyền theo vị trí, không theo người.** Quyền CLB chỉ đến từ một vị trí trong nhiệm kỳ đang
   hoạt động (BR47); hết nhiệm kỳ hoặc rời vị trí thì mất quyền, không cần ai thu hồi tay.
3. **ICPDP chỉ kiểm soát chỗ nhạy cảm.** Ghế Chủ nhiệm và ban điều hành cần ICPDP xác nhận; các
   role thường do Chủ nhiệm tự quản (BR55). Mỗi thay đổi cơ cấu là một phiên bản mới (BR56), nên
   ICPDP luôn xem lại được CLB được tổ chức thế nào tại mọi thời điểm.
4. **Nghĩa vụ thuộc về CLB, không thuộc về cá nhân.** Báo cáo, quyết toán, khoản phải hoàn, hồ
   sơ vi phạm đi theo CLB qua các nhiệm kỳ (UC12 / UC13).

## 2.5 Luồng nghiệp vụ chính

Mười luồng end-to-end dưới đây là xương sống của hệ thống; mọi use case thuộc ít nhất một luồng.
Mỗi bước ghi use case (hoặc scheduler) điều khiển nó và trạng thái mà nó để lại. Sơ đồ: trang
*Main business flows* của
[`03-diagrams/UCMS_Organization_and_Flows.drawio`](03-diagrams/UCMS_Organization_and_Flows.drawio)
([PNG](03-diagrams/img/UCMS_Organization_and_Flows_02_Main-business-flows.png)). Đăng nhập (UC01)
và dashboard (UC02) là điểm vào chung của mọi luồng nên không lặp lại.

| # | Luồng | Actor tham gia | Use case |
|---|---|---|---|
| F1 | Thành lập CLB | Student, ICPDP | UC06, UC07, UC08, UC09, UC10, UC11 |
| F2 | Cơ cấu, nhiệm kỳ và chuyển giao | Club Leader, ICPDP | UC23, UC10–UC13 |
| F3 | Tuyển và quản lý thành viên | Student, Club Member | UC16–UC22, UC24 |
| F4 | Vòng đời sự kiện | Club Member, ICPDP, Student | UC25–UC34 |
| F5 | Tài chính sự kiện | Club Member, ICPDP | UC25, UC26, UC35–UC37 |
| F6 | Mượn cơ sở vật chất | Club Member, ICPDP | UC44–UC47 |
| F7 | Phản hồi và khiếu nại | Student, Club Member, ICPDP | UC48–UC52 |
| F8 | Báo cáo định kỳ và tuân thủ | Club Member, ICPDP | UC38–UC40 |
| F9 | Đánh giá hiệu quả CLB | ICPDP | UC41–UC43 |
| F10 | Tạm ngừng, kích hoạt lại, giải thể | Club Leader, ICPDP | UC14, UC15 |

### F1 — Thành lập CLB

```text
Student tìm hiểu (UC06) → nộp hồ sơ kèm thành viên sáng lập, tài liệu và cơ cấu role dự kiến (UC07) → Submitted
→ ICPDP thẩm định (UC08) → Under Review
    ├─ yêu cầu chỉnh sửa → Revision Requested → Student nộp version mới → Submitted   (quá hạn → Expired)
    ├─ từ chối → Rejected
    └─ phê duyệt → Approved; Club ở Pending Setup; cơ cấu role thành phiên bản 1 (BR56);
                   người đứng đơn nhận quyền sáng lập tạm thời (BR47)
→ cấu hình hồ sơ và các ban (UC09) → đề cử ban chủ nhiệm (UC10)
→ ICPDP xác nhận (UC11) → Club Active, nhiệm kỳ đầu mở, quyền sáng lập tạm thời bị thay bằng ghế thật
```

### F2 — Cơ cấu, nhiệm kỳ và chuyển giao

```text
Club Leader tạo / sửa role và permission, gán thành viên vào role thường (UC23) → phiên bản cơ cấu mới
Cuối nhiệm kỳ: Club Leader lập kế hoạch chuyển giao — nhiệm kỳ mới, người giữ từng role ban điều hành,
  thay đổi danh sách role ban điều hành, các nghĩa vụ còn treo (UC12)
→ ICPDP xác nhận (UC13) → đóng nhiệm kỳ cũ, mở nhiệm kỳ mới, thu hồi quyền cũ, cấp quyền mới,
  ghi lịch sử ban điều hành và (nếu có) phiên bản cơ cấu mới
Thay người giữa nhiệm kỳ: đề cử lại (UC10) → xác nhận (UC11)
```

### F3 — Tuyển và quản lý thành viên

```text
Club Member tạo và công bố đợt tuyển (UC16) → Published
→ Scheduler mở khung thời gian → Accepting Applications
→ Student nộp đơn (UC17) → Submitted
→ Scheduler đóng khung thời gian → đợt tuyển ở Screening
→ sàng lọc, phỏng vấn, chấm rubric (UC18, UC19) → Accepted | Rejected | Waitlisted
→ tiếp nhận (UC20) → Onboarded; ClubMembership Active, tự gán role Members
→ quản lý trạng thái Active ⇄ Inactive, Left, Banned (UC21); thành viên xin rời (UC22);
  thành viên dùng không gian của mình (UC24)
```

### F4 — Vòng đời sự kiện

```text
Club Member nộp đề xuất: phạm vi, kế hoạch, rủi ro, phần ngân sách, yêu cầu booking (UC25, UC45)
    ├─ sự kiện Internal không có ngân sách → ghi nhận thẳng Approved (BR53)
    └─ còn lại → Pending Approval
→ ICPDP thẩm định (UC26), cấp thứ hai nếu khớp rule UC05 → Revision Requested | Approved | Rejected
→ công bố và mở đăng ký (UC27) → Upcoming
→ Student đăng ký (UC29), danh sách chờ (UC30)
→ Scheduler giờ bắt đầu → Ongoing → check-in (UC31) → Scheduler giờ kết thúc → Completed
→ chốt điểm danh (UC32); Student gửi phản hồi (UC48)
→ nộp báo cáo sau sự kiện (UC33) → Report Submitted
→ ICPDP thẩm định (UC34) → Closed | trả về sửa | phát hiện → hồ sơ vi phạm (UC40)
Huỷ / đổi lịch bất kỳ lúc nào trước khi kết thúc (UC28) → Cancelled, giải phóng booking (UC47)
```

### F5 — Tài chính sự kiện

```text
Club Member đưa phần ngân sách vào đề xuất sự kiện: các dòng và tổng số xin (UC25, BR22)
→ ICPDP duyệt cùng đề xuất, chốt số duyệt từng dòng (UC26) → EventBudget Approved
→ ICPDP tạm ứng một phần hoặc toàn bộ trước sự kiện (UC35) → Disbursed
→ Club Member ghi từng khoản chi kèm chứng từ (UC36)
→ sau khi sự kiện kết thúc hoặc bị huỷ, nộp quyết toán trước hạn (UC36, BR57) → Settlement Submitted
→ ICPDP đối soát, chấp nhận / loại từng khoản chi (UC37)
    ├─ thiếu chứng từ → Reconciliation Pending → CLB nộp lại (UC36)
    ├─ chi hợp lệ = số đã tạm ứng → Reconciled → Closed
    ├─ chi hợp lệ > số đã tạm ứng → Reconciled → ICPDP cấp bù, trần là số duyệt (UC35) → Closed
    └─ chi hợp lệ < số đã tạm ứng → Recovery Pending → CLB hoàn, ICPDP ghi nhận (UC35) → Closed
Quá hạn quyết toán → ICPDP chốt trên chứng từ đã có → Recovery Pending (BR57, BR58)
Quá hạn hoàn trả → nghĩa vụ quá hạn (BR21) và hồ sơ vi phạm (UC40)
```

### F6 — Mượn cơ sở vật chất

```text
ICPDP quản lý danh mục cơ sở vật chất (UC44)
→ Club Member gửi yêu cầu đặt, kiểm tra xung đột BR15 (UC45) → Requested
→ ICPDP quyết định (UC46) → Revision Requested | Approved | Rejected   (duyệt sự kiện không phải duyệt booking)
→ Scheduler → In Use → Completed
→ Club Member huỷ hoặc trả sớm (UC47) → Cancelled | Released; huỷ sự kiện tự giải phóng booking (BR35)
```

### F7 — Phản hồi và khiếu nại

```text
Người tham dự đã check-in gửi phản hồi trong feedback window (UC48, BR36)
→ Club Member xem bản tổng hợp khi đủ số người phản hồi (UC49, BR40) → đầu vào báo cáo UC33 và đánh giá
Student gửi khiếu nại về một CLB (UC50) → Submitted
→ ICPDP phân loại (UC51) → Dismissed | Forwarded | Escalated
    ├─ Forwarded → CLB trả lời trong hạn (UC52) → Closed | Escalated
    └─ Escalated → mở hồ sơ vi phạm (UC40)
```

### F8 — Báo cáo định kỳ và tuân thủ

```text
Club Member nộp báo cáo hoạt động định kỳ (UC38) → ICPDP thẩm định (UC39)
Các tín hiệu tuân thủ: báo cáo trễ / thiếu (UC33, UC34, UC38, UC39), quyết toán hoặc hoàn trả quá hạn
  (UC37), khiếu nại leo thang (UC51), huỷ muộn (UC28, UC47)
→ ICPDP mở hồ sơ vi phạm (UC40) → Open → Under Investigation → Awaiting Club Response
→ CLB trả lời (UC40 hoặc UC52) → Decision Issued → Corrective Action → Resolved
Nghĩa vụ quá hạn khi công tắc cưỡng chế bật → chặn đề xuất sự kiện mới (BR21)
```

### F9 — Đánh giá hiệu quả CLB

```text
ICPDP cấu hình scheme đánh giá, tổng trọng số hợp lệ (UC41, BR29)
→ cuối kỳ, sinh bản nháp từ dữ liệu vận hành: thành viên, sự kiện, điểm danh, báo cáo, tài chính,
  phản hồi, tuân thủ (UC42) → Data Ready
→ ICPDP xem lại dữ liệu nguồn, xử lý bất thường, chấm các dimension chấm tay (UC43) → Under Review
→ chốt → Finalized → công bố → Published (không sửa tại chỗ, BR30)
```

### F10 — Tạm ngừng, kích hoạt lại, giải thể

```text
Club Leader xin tạm ngừng kèm lý do, thời lượng, nghĩa vụ, kế hoạch phục hồi (UC14)
→ ICPDP quyết định (UC15) → Suspended: huỷ đề xuất chưa quyết định, huỷ sự kiện và booking tương lai
  (UC28 A1, UC47); ICPDP cũng tạm ngừng khi CLB không hoạt động hoặc theo kết quả hồ sơ UC40
→ kích hoạt lại (UC15) → Active
ICPDP quyết định giải thể (UC15): huỷ ngay mọi thứ kết thúc sau học kỳ Dissolving (BR45); học kỳ
  hiện tại vẫn chạy bình thường
→ Scheduler đầu học kỳ sau → Dissolving (không tạo gì mới, CLB chỉ đóng nốt nghĩa vụ)
→ Scheduler cuối học kỳ đó → Dissolved: huỷ đề xuất và booking chưa quyết định, ghi nghĩa vụ tồn
  đọng (báo cáo chưa nộp, ngân sách chưa tất toán) vào hồ sơ lưu trữ, thu hồi quyền quản lý
```

## 2.6 Môi trường vận hành và công nghệ

| Tầng | Công nghệ | Ghi chú |
|---|---|---|
| Client | React 19 + Vite, TypeScript, Tailwind v4 (theming theo token), TanStack React Query, TanStack Table, i18next (`en` / `vi`), toast Sonner | SPA build tĩnh, chỉ gọi `/api/v1/*` |
| Routing | `react-router` | Điều kiện kích hoạt router của ADR-002 ("thêm router khi có màn hình thứ hai") **đã xảy ra**: UCMS có ba workspace theo vai trò |
| Server | Node ≥ 22.9, Express 5, Mongoose 8, zod (+ `zod-openapi`), clean architecture 4 tầng | Một tiến trình triển khai duy nhất, OpenAPI phục vụ tại `/docs` |
| Cơ sở dữ liệu | MongoDB (một instance có khả năng replica set) | Lưu dữ liệu nghiệp vụ, hàng đợi thông báo và nhật ký audit |
| Scheduler | Interval trong tiến trình, bảo vệ bằng một lease document trong Mongo | Không dùng hệ thống queue; chỉ tách ra worker riêng khi API chạy nhiều instance |
| Xác thực | Google OAuth Authorization Code flow; cookie phiên được ký, `httpOnly`, `SameSite=Lax` | Không lưu bất kỳ mật khẩu nào |
| Email | Google SMTP | Gửi từ outbox, không bao giờ gửi đồng bộ trong transaction |
| Triển khai | `docker compose`: `mongo` + `server` + host tĩnh cho client đã build | Biến môi trường được validate lúc khởi động bởi `infra/config/` |
| Công cụ | npm workspaces, ESLint, vitest, `npm run check` là Definition of Done | |
| Trình duyệt | Chrome, Edge, Firefox, Safari bản hiện hành; bề rộng 375 / 768 / 1024 / 1440 px | Không làm app mobile native |

## 2.7 Ràng buộc thiết kế và triển khai

| ID | Ràng buộc | Nguồn |
|---|---|---|
| CON-01 | Một khối triển khai duy nhất, không microservices. Module là thư mục bên trong một ứng dụng Express và một database MongoDB | R8 D1 |
| CON-02 | Code server chia thành `domain / usecase / interface / infra`; mũi tên phụ thuộc hướng về `domain`; repository port nằm ở `domain`, bản cài Mongo nằm ở `infra` | ADR-001, R10 |
| CON-03 | Client theo chuỗi `services/<domain>.ts` → `hooks/use<Domain>.ts` (React Query sở hữu query key) → component; không dùng thư viện HTTP, dùng `fetch` gốc | ADR-002, R10 |
| CON-04 | REST dưới `/api/v1`, bọc response bằng `{ data }`, `DomainError` kind → 400/409/404, lỗi khác → 500, validate bằng zod ở biên trước mọi truy vấn Mongoose, mỗi module một file route | R8 §7 |
| CON-05 | Sở hữu dữ liệu theo module: use case chỉ ghi aggregate của module mình (xem §2.2) | R8 §3 |
| CON-06 | Quy tắc nghiệp vụ và **kiểm tra phạm vi (scope check)** nằm ở tầng usecase để unit-test được mà không cần HTTP; middleware ở route chỉ chặn sớm theo quyền thô | R8 §5 |
| CON-07 | Không dùng transaction đa document trong bản phát hành đầu. Sức chứa đăng ký và xung đột booking được bảo vệ bằng unique index cộng `findOneAndUpdate` có điều kiện | R8 §6 |
| CON-08 | Bản sửa là document version chỉ-ghi-thêm; bản đã nộp không bao giờ bị sửa đổi | BR04, R8 §4.1 |
| CON-09 | Email được gửi từ outbox bởi scheduler. Gửi email thất bại không bao giờ được làm hỏng một transaction nghiệp vụ đã commit | R1 §19, R8 §4.2 |
| CON-10 | Audit được ghi **trong usecase**, không ghi ở middleware của route và không ghi ở repository | R8 §4.3 |
| CON-11 | Không có mã hex màu nào nằm ngoài `client/src/index.css`; không dùng biến thể `dark:`; màu chỉ đi qua token `*-app` | R9 |
| CON-12 | Code, comment, commit, config, thông báo lỗi và test chỉ dùng tiếng Anh. Chuỗi hiển thị được dịch qua i18next (`en`, `vi`). SRS này là ngoại lệ ngôn ngữ đã được chủ nhiệm đồ án quyết định | R10 rule 5 |
| CON-13 | Mỗi thư mục có một `README.md` mô tả thứ gì thuộc về nó; thư mục mới phải kèm `README.md` trong cùng PR | R10 rule 1 |
| CON-14 | Feature mới bắt đầu từ `.sdd/specs/feat-{name}/SPEC.md` + `TASKS.md`; quyết định kiến trúc thành `.sdd/rfcs/ADR-NNN-*.md` | R10 rule 3–4 |
| CON-15 | Chứng từ tài chính lưu dưới dạng liên kết ngoài trong bản phát hành đầu; chỉ thêm object storage khi thực sự cần upload | R8 §11 |

## 2.8 Giả định và phụ thuộc

| ID | Giả định / phụ thuộc |
|---|---|
| ASM-01 | Nhà trường chưa có nền tảng tập trung cho vòng đời CLB; UCMS trở thành hệ thống ghi nhận chính thức (system of record) |
| ASM-02 | Mọi người dùng có tài khoản Google thuộc domain nhà trường do ICPDP cấu hình ở UC04; không có đường đăng nhập nội bộ |
| ASM-03 | ICPDP là bên duy nhất phía nhà trường tham gia hệ thống. Ý kiến của Tài chính, Cơ sở vật chất và An ninh đến từ bên ngoài hệ thống |
| ASM-04 | Quy mô là vài trăm sinh viên, vài chục CLB, một cơ sở đào tạo — không có yêu cầu multi-tenant |
| ASM-05 | Lịch học kỳ (ngày bắt đầu và kết thúc) được duy trì ở UC04 và là cơ sở của BR44, BR45, đợt đăng ký lại thành viên theo kỳ (UC21 A2) và lịch giải thể của UC15 |
| ASM-06 | Dòng tiền thực tế xảy ra ngoài UCMS; hệ thống ghi nhận số tiền đã duyệt, đã giải ngân, đã chi và đã có chứng từ, nhưng không phải hệ thống kế toán |
| ASM-07 | UCMS chỉ quản lý những property nhà trường mở cho hoạt động CLB; nó không thay thế hệ thống đặt phòng chung của trường |
| ASM-08 | Khả dụng của Google OAuth và Google SMTP nằm ngoài tầm kiểm soát của nhóm; hệ thống suy giảm dịch vụ (từ chối đăng nhập, retry email) chứ không làm hỏng dữ liệu |
| ASM-09 | Trọng số và ngưỡng đánh giá chính xác đến từ chính sách thật của ICPDP; hệ thống cung cấp một scheme cấu hình được, không hard-code công thức |

## 2.9 Ngoài phạm vi

ERP kế toán đầy đủ · trả lương · học phí hoặc xử lý thanh toán · cổng thanh toán · mạng xã hội
hay chat nội bộ · LMS · hệ thống đặt phòng toàn trường · ERP kho · sàn tài trợ · app mobile
native · điểm danh bằng nhận diện khuôn mặt · chatbot AI bắt buộc · mọi cơ chế đăng nhập
username/password tự xây · mail server tự vận hành · phê duyệt đa phòng ban (Tài chính / Cơ sở
vật chất / An ninh duyệt trực tiếp trên hệ thống) · nhắn tin và chia sẻ file nội bộ CLB.

## 2.10 Các vấn đề nghiệp vụ sản phẩm phải giải quyết

Mọi pain point dưới đây đều phải truy vết được tới ít nhất một use case
([§14.1](#141-pain-point--use-case--yêu-cầu)).

| ID | Vấn đề |
|---|---|
| BP01 | ICPDP không có nguồn dữ liệu tập trung để biết CLB nào đang Active, Suspended hay đã ngừng hoạt động |
| BP02 | Không xác định được số thành viên active thực tế của từng CLB tại từng thời điểm |
| BP03 | Lịch sử ban chủ nhiệm và nhiệm kỳ không được quản lý có cấu trúc |
| BP04 | Hồ sơ thành lập CLB và lịch sử bổ sung nằm rải rác qua nhiều file và email |
| BP05 | Quy trình đăng ký và xét duyệt sự kiện thiếu workflow thống nhất |
| BP06 | Không có cơ chế tập trung để phát hiện trùng thời gian hoặc địa điểm |
| BP07 | Đăng ký và điểm danh tách rời khỏi hồ sơ sự kiện |
| BP08 | Khó xác định một sự kiện đã duyệt có thực sự diễn ra và đã báo cáo hay chưa |
| BP09 | Budget request, expense và chứng từ tài chính không được liên kết end-to-end |
| BP10 | Khó phát hiện chi vượt ngân sách hoặc khoản chi thiếu chứng từ |
| BP11 | Tuyển thành viên chạy trên form rời, không liên kết với membership |
| BP12 | Vi phạm và cảnh báo CLB không có lịch sử tuân thủ có cấu trúc |
| BP13 | Đánh giá cuối kỳ phụ thuộc tổng hợp thủ công |
| BP14 | Deadline báo cáo, đối soát và chuyển giao nhiệm kỳ phụ thuộc nhắc việc thủ công |
| BP15 | Thiếu audit trail để biết ai đã duyệt, từ chối hay thay đổi một quyết định quan trọng |
| BP16 | Mượn phòng và thiết bị đi qua email, không gắn với hồ sơ sự kiện và không phát hiện trùng lịch |
| BP17 | Phản hồi của người tham gia không được thu thập có cấu trúc nên không dùng được để đánh giá chất lượng |
| BP18 | Sinh viên không có kênh khiếu nại chính thức vượt qua chính CLB bị khiếu nại |
| BP19 | Mỗi hệ thống nội bộ tự quản lý tài khoản riêng, sinh viên phải nhớ thêm một mật khẩu |

**Nguyên nhân gốc** (R1 §2.3): RC01 dữ liệu phân mảnh · RC02 không có workflow / state machine
chuẩn · RC03 khả năng truy vết yếu · RC04 không có mô hình dữ liệu xuyên module · RC05 đánh giá
thủ công · RC06 quản lý deadline phân tán.

---

# 3. Yêu cầu giao diện ngoài

## 3.1 Giao diện người dùng

UCMS là ứng dụng web một trang (SPA), responsive, với **khu công khai chỉ đọc** (UC06, cho cả
Guest) và **ba workspace theo vai trò** sau một lần đăng nhập. Lớp vỏ giao diện quyết định *cái gì được hiển thị*; server quyết định *cái gì được
phép* — client không bao giờ giữ quyền kiểm tra có thẩm quyền.

```text
client/src/pages/
  auth/          đăng nhập, callback OAuth, chọn workspace
  student/       khám phá CLB, CLB của tôi, tuyển thành viên, sự kiện, đăng ký, phản hồi, khiếu nại
  club/          workspace CMB: hồ sơ, ban chủ nhiệm, thành viên, sự kiện, booking, tài chính, báo cáo
  icpdp/         hộp thư phê duyệt, CLB, hồ sơ vi phạm, danh mục, đánh giá, cấu hình, dashboard
```

### 3.1.1 Danh mục màn hình (dự kiến, gộp theo nhóm use case)

| Workspace | Màn hình | Use case |
|---|---|---|
| Public | Trang chủ · danh bạ CLB & trang CLB · đợt tuyển đang mở · danh sách và trang sự kiện công khai (chỉ đọc, không cần đăng nhập) | UC06 |
| Auth | Đăng nhập với Google, callback OAuth, chọn workspace, trang từ chối truy cập | UC01 |
| Student | Dashboard · danh bạ CLB & trang CLB · form hồ sơ thành lập (+ các version) · form ứng tuyển · đơn của tôi · danh sách và trang sự kiện · đăng ký của tôi · check-in (mã/QR) · form phản hồi · form khiếu nại & khiếu nại của tôi | UC02, UC06, UC07, UC17, UC29, UC31, UC48, UC50 |
| Club Member | Không gian thành viên theo CLB · xin rời CLB (mọi thành viên); các màn hình sau chỉ hiện khi có permission tương ứng (BR54): dashboard CLB · hồ sơ & cơ cấu CLB · đợt tuyển · bảng sàng lọc đơn · đánh giá ứng viên · danh sách thành viên · đề xuất sự kiện (+ bản sửa) · công bố sự kiện · huỷ/đổi lịch · đăng ký & danh sách chờ · chốt điểm danh · báo cáo sau sự kiện · khoản chi & chứng từ · báo cáo định kỳ · yêu cầu booking · booking của CLB · xem phản hồi · khiếu nại được chuyển | UC02, UC09, UC16, UC18–UC22, UC24, UC25, UC27, UC28, UC30, UC32, UC33, UC36, UC38, UC45, UC47, UC49, UC52 |
| Club Leader | Mọi màn hình của Club Member · vai trò CLB & phân quyền (tạo role, chọn permission, gán thành viên) · đề xuất ban chủ nhiệm · kế hoạch chuyển giao · xin tạm ngừng | UC10, UC12, UC14, UC23 |
| ICPDP | Dashboard · hộp thư phê duyệt hợp nhất · thẩm định hồ sơ thành lập · danh sách CLB & hành động vòng đời · xác nhận ban chủ nhiệm & chuyển giao · thẩm định đề xuất sự kiện (kèm ngân sách) · thẩm định báo cáo sự kiện · ghi nhận giải ngân · đối soát · thẩm định báo cáo định kỳ · hồ sơ vi phạm · phân loại khiếu nại · danh mục cơ sở vật chất · thẩm định booking · scheme đánh giá · bản nháp & công bố đánh giá · tài khoản & vai trò · chính sách & deadline · định tuyến phê duyệt | UC03–UC05, UC08, UC11, UC13, UC15, UC26, UC34, UC35, UC37, UC39–UC44, UC46, UC51 |

### 3.1.2 Yêu cầu giao diện

| ID | Yêu cầu |
|---|---|
| UI-01 | Màu, chữ, khoảng cách, bo góc, đổ bóng, công thức component và chuyển động tuân theo R9. Màu cam thương hiệu `#F37021` không bao giờ dùng cho chữ, link hay viền 1 px (độ tương phản 2.94:1, trượt WCAG AA); màu tương tác lấy từ `primary-app` / `accent-app` |
| UI-02 | Mọi trạng thái nghiệp vụ phải hiển thị bằng **chữ hoặc icon kèm màu**, không bao giờ chỉ bằng màu. Quy ước: approved/active/confirmed → `success-app`; pending → `warning-app`; rejected/cancelled/suspended → `danger-app`; draft/archived/inactive → `muted-app`; ongoing/current → `primary-app` |
| UI-03 | Cả hai theme (sáng và `.dark`) và cả hai ngôn ngữ (`en`, `vi`) đều phải hiển thị đúng. Chuỗi tiếng Việt dài hơn 30–60%: không đặt chiều rộng cố định quanh giá trị đã dịch, không `whitespace-nowrap` trên nhãn |
| UI-04 | Mọi phần tử tương tác có vòng focus nhìn thấy được; vùng chạm ≥ 44×44 px; không cuộn ngang ở 375 / 768 / 1024 / 1440 px |
| UI-05 | Trạng thái tải dùng skeleton khớp bố cục thật, chỉ ở lần tải đầu; nút đang gửi thì bị vô hiệu và hiện spinner nhưng không biến mất; empty state có một câu giải thích và một hành động chính, và không bao giờ hiển thị khi lần tải đầu còn đang chạy |
| UI-06 | Mọi trường form hiển thị lỗi ngay dưới trường kèm `aria-invalid` và `aria-describedby`; chỉ tô viền đỏ thì không tính là báo lỗi |
| UI-07 | Một panel dashboard có module nguồn hỏng phải tự báo lỗi mà không làm hỏng phần còn lại của trang (FR-UC02-06) |
| UI-08 | Tôn trọng `prefers-reduced-motion: reduce`; chuyển động giới hạn ở `transition-colors` / `transition-opacity`, 150–300 ms |

## 3.2 Giao diện phần mềm (hệ thống ngoài)

### EXT-01 — Google OAuth (ES1)

| Khía cạnh | Yêu cầu |
|---|---|
| Luồng | Authorization Code. `interface/http/auth-routes.ts` sở hữu redirect và callback |
| Yêu cầu gửi đi | `Authentication request` với client ID và scope đã cấu hình (profile, email) |
| Dữ liệu nhận về | `Authentication data`: email, họ tên, ảnh đại diện |
| Kiểm tra domain | Domain email được đối chiếu với giá trị cấu hình ở UC04 (BR32) **trước khi** tạo bất kỳ bản ghi nào |
| Ánh xạ tài khoản | Khoá định danh là địa chỉ email; lần đăng nhập thành công đầu tiên tạo đúng một `User` và một `StudentProfile` |
| Phiên | Cookie được ký, `httpOnly`, `SameSite=Lax`. Không tồn tại mật khẩu, hash mật khẩu hay luồng đặt lại mật khẩu ở bất kỳ đâu |
| Lỗi | Không kết nối được hoặc trả lỗi → hiển thị lỗi cho người dùng, **không tạo phiên và không tạo `User` dở dang** |
| Bí mật | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET` được validate lúc khởi động; `ALLOWED_DOMAIN` và `BOOTSTRAP_ICPDP_EMAIL` seed policy version đầu tiên và tài khoản ICPDP đầu tiên khi database còn trống, để lần đăng nhập đầu không bị chặn bởi `infra/config/` và liệt kê trong `.env.example` |

### EXT-02 — Google SMTP Service (ES2)

| Khía cạnh | Yêu cầu |
|---|---|
| Dùng cho | Mọi thông báo có kênh email |
| Kích hoạt | Scheduler rút hàng đợi outbox — không bao giờ gọi đồng bộ bên trong transaction nghiệp vụ (CON-09) |
| Nhật ký | Mỗi lần gửi ghi một dòng `EmailDeliveryLog` với trạng thái, số lần thử và lỗi |
| Retry | Gửi thất bại được thử lại với backoff; số lần thử và mốc thử tiếp theo nằm trên document outbox |
| Cô lập lỗi | Lỗi SMTP không bao giờ rollback hay chặn thay đổi nghiệp vụ đã commit |
| Bí mật | `SMTP_*` được validate lúc khởi động bởi `infra/config/` |

## 3.3 Giao diện API

| ID | Yêu cầu |
|---|---|
| API-01 | Mọi endpoint nằm dưới `/api/v1`; response bọc trong `{ data }` |
| API-02 | Lỗi ánh xạ `DomainError` kind → HTTP 400 / 404 / 409; lỗi ngoài dự kiến → 500. Chưa xác thực → 401, thiếu quyền hoặc sai phạm vi → 403, tài khoản bị khoá → 423 |
| API-03 | Mọi body, tham số đường dẫn và query đều được validate bằng zod **trước** mọi truy vấn Mongoose |
| API-04 | Tên tài nguyên theo aggregate: `/clubs`, `/clubs/:id/members`, `/events`, `/events/:id/registrations`, `/budget-requests`, `/property-bookings`, `/complaints`, `/approvals` (hộp thư phê duyệt dùng chung), `/notifications` — xem Phụ lục C |
| API-05 | OpenAPI sinh từ schema zod và phục vụ tại `/docs` |
| API-06 | Endpoint dạng danh sách hỗ trợ phân trang và lọc theo các trạng thái nêu ở §6 |
| API-07 | Mọi endpoint làm đổi trạng thái phải idempotent với việc gửi trùng cùng một quyết định — quyết định giống hệt lần hai không tạo thêm `ApprovalDecision` |

## 3.4 Giao diện truyền thông và phần cứng

Môi trường đã triển khai chỉ dùng HTTPS; cookie phiên có cờ `Secure` ngoài môi trường dev.
MongoDB chỉ truy cập qua mạng nội bộ và không bao giờ mở ra ngoài (file compose bind vào
`127.0.0.1`). Không cần giao diện phần cứng nào: check-in dùng mã hoặc QR hiển thị trên trình
duyệt, không cần máy quét chuyên dụng (nhận diện khuôn mặt nằm ngoài phạm vi).

---

# 4. Yêu cầu chức năng

## 4.0 Hướng dẫn đọc

Mỗi use case dưới đây được đặc tả theo cùng một khối:

- một bảng đầu mục — module, độ ưu tiên phát hành, actor chính và actor phụ, điều kiện kích
  hoạt, tiền điều kiện, dữ liệu vào, thực thể và các chuyển trạng thái mà nó tạo ra, quy tắc
  nghiệp vụ nó thực thi, use case liên quan và pain point nó giải quyết;
- một bảng **yêu cầu chức năng** được đánh số (`FR-UCnn-xx`) phủ luồng chính, các luồng thay thế
  (`A*`) và các ngoại lệ (`E*`) — mỗi yêu cầu kiểm thử được độc lập;
- hậu điều kiện và dữ liệu được ghi xuống.

**Độ ưu tiên phát hành** (cả 52 use case ra trong **một** bản phát hành; độ ưu tiên ở đây là
*thứ tự build và demo* theo R2 §12 — build trọn một vòng lặp, không bao giờ làm nửa vòng, và
không cắt use case nào):

| Ưu tiên | Ý nghĩa | Use case |
|---|---|---|
| **P1** | Lõi — lý do tồn tại của hệ thống, build trước | UC01–UC34 |
| **P2** | Mượn cơ sở vật chất | UC44–UC47 |
| **P3** | Tài chính | UC35–UC37 |
| **P4** | Báo cáo định kỳ | UC38, UC39 |
| **P5** | Governance intelligence và phản hồi & khiếu nại — build sau cùng | UC40–UC43, UC48–UC52 |

Hai hành vi trông như use case nhưng **cố tình không phải** use case (R2 §7): **phát hiện xung
đột** là quy tắc nghiệp vụ BR15 được đánh giá bên trong UC25 và UC45, còn mọi **chuyển trạng thái
theo thời gian** là chức năng scheduler, đặc tả ở [§8.4](#84-scheduler--chức-năng-hệ-thống).

---

## 4.1 M01 — Định danh, truy cập và cấu hình

### UC01 — Xác thực qua Google OAuth và vào workspace theo vai trò

| | |
|---|---|
| **Module · Ưu tiên** | M01 · P1 |
| **Actor chính** | Tất cả (Student, Club Member, Club Leader, ICPDP Officer) · **Hỗ trợ:** Google OAuth (ES1) |
| **Mục tiêu nghiệp vụ** | Cho mỗi người dùng đúng phần truy cập mà vai trò của họ cho phép, không lưu mật khẩu nào trong hệ thống |
| **Kích hoạt** | Người dùng chọn đăng nhập |
| **Tiền điều kiện** | Người dùng có tài khoản Google thuộc domain được chính sách UC04 cho phép |
| **Dữ liệu vào** | Authorization code do Google trả về |
| **Thực thể / trạng thái** | `User`, `StudentProfile`, phiên đăng nhập; không có vòng đời nghiệp vụ |
| **Quy tắc** | BR32 |
| **Liên quan · Pain point** | UC02, UC03, UC04 · BP19 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC01-01 | Gửi `Authentication request` tới Google OAuth khi người dùng bắt đầu đăng nhập, và không chấp nhận bất kỳ đường đăng nhập nào khác |
| FR-UC01-02 | Nhận `Authentication data` (email, họ tên, ảnh đại diện) từ Google OAuth sau khi người dùng xác thực |
| FR-UC01-03 | Đối chiếu email trả về với chính sách domain cấu hình ở UC04 **trước khi** tạo hoặc đọc bất kỳ bản ghi nào (BR32) |
| FR-UC01-04 | Ánh xạ email tới `User` đã có, và ở lần đăng nhập đầu tiên tạo đúng một `User` và một `StudentProfile` |
| FR-UC01-05 | Nạp tập vai trò và quyền hiện tại của người gọi, gồm mọi ngữ cảnh CLB, suy ra từ `ClubPositionAssignment ∩ ClubTerm đang hoạt động` |
| FR-UC01-06 | Tạo phiên được ký, `httpOnly`, `SameSite=Lax` và điều hướng người dùng tới workspace của vai trò đã xác định |
| FR-UC01-07 | *(A1)* Hiển thị màn hình chọn workspace cho người dùng có nhiều ngữ cảnh (vừa là Student vừa là CMB của một hoặc nhiều CLB), ghi nhớ lựa chọn và cho phép đổi bất cứ lúc nào |
| FR-UC01-08 | *(A2)* Đồng bộ lại `StudentProfile` từ dữ liệu OAuth ở mỗi lần đăng nhập, cập nhật tên hiển thị hay ảnh đại diện đã đổi mà không đụng tới tập vai trò |
| FR-UC01-09 | *(E1)* Từ chối truy cập, không tạo `User` hay phiên nào, và ghi audit lần thử khi email nằm ngoài domain được phép |
| FR-UC01-10 | *(E2)* Từ chối truy cập khi tài khoản đã bị khoá ở UC03, hiển thị lý do khoá và ghi audit lần thử đó |
| FR-UC01-11 | *(E3)* Hiển thị lỗi và không tạo phiên cũng không tạo `User` dở dang khi Google OAuth không truy cập được hoặc trả lỗi |
| FR-UC01-12 | Không lưu mật khẩu, hash mật khẩu hay đường đặt lại mật khẩu ở bất kỳ đâu trong hệ thống |
| FR-UC01-13 | Ghi audit mọi lần đăng nhập và mọi lần đăng nhập bị từ chối |

**Hậu điều kiện** — tồn tại một phiên hợp lệ; `StudentProfile` đã đồng bộ; lần đăng nhập đã được audit.
**Đầu ra** — `Session`, `User`, `StudentProfile`, bản ghi audit.

### UC02 — Mở dashboard theo vai trò của tôi

| | |
|---|---|
| **Module · Ưu tiên** | M01 (đọc M02–M12) · P1 |
| **Actor chính** | Tất cả |
| **Mục tiêu nghiệp vụ** | Một màn hình cho mỗi vai trò, trả lời hai câu: việc gì đang chờ tôi, và hồ sơ tôi đã nộp giờ ra sao |
| **Kích hoạt** | Người dùng vào workspace sau UC01, hoặc quay lại nó |
| **Tiền điều kiện** | Có phiên hợp lệ (UC01) |
| **Thực thể / trạng thái** | Không — chỉ đọc |
| **Quy tắc** | BR49, BR56; chỉ đọc; mọi con số là truy vấn trực tiếp vào module sở hữu, không bao giờ là bản sao thứ hai của dữ liệu |
| **Liên quan · Pain point** | Mọi use case đều mở từ đây · BP01, BP14 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC02-01 | Xác định vai trò và ngữ cảnh CLB của người gọi, và chỉ hiển thị những CLB và bản ghi mà vai trò đó cho phép |
| FR-UC02-02 | Hiển thị dashboard **ICPDP**: các hồ sơ chờ duyệt theo loại và theo độ trễ, CLB theo trạng thái, báo cáo quá hạn, ngân sách chưa đối soát, quyết toán quá hạn và khoản phải hoàn, hồ sơ vi phạm đang mở, booking sắp tới, và **sự kiện nội bộ đã ghi nhận** của mọi CLB (BR53) — lọc theo CLB và học kỳ, mở ra xem chi tiết và điểm danh ở chế độ chỉ đọc; và, trên trang từng CLB, **phiên bản cơ cấu hiện hành, lịch sử các phiên bản cơ cấu, và lịch sử ban điều hành theo nhiệm kỳ** — ai giữ role ban điều hành nào, từ khi nào tới khi nào, được xác nhận ở UC11 / UC13 nào (BR56) |
| FR-UC02-03 | Hiển thị dashboard phía CLB: với **Club Member**, chỉ các mục thuộc permission của họ (BR54) trong số hồ sơ CLB đã nộp và trạng thái, deadline sắp tới, lịch sự kiện và booking, số lượng thành viên, tình hình ngân sách, phản hồi chờ xem; với **Club Leader**, toàn bộ các mục đó cùng danh sách role và người giữ role (UC23), lịch sử phiên bản cơ cấu và lịch sử ban điều hành của CLB mình (BR56) |
| FR-UC02-04 | Hiển thị dashboard **Student**: đơn của tôi và trạng thái, đăng ký của tôi, lịch sử check-in, các CLB tôi thuộc về, khiếu nại của tôi |
| FR-UC02-05 | Mở bất kỳ mục nào sang use case sở hữu nó, không nhân bản logic của use case đó |
| FR-UC02-06 | *(E1)* Vẫn hiển thị các panel còn lại khi một module nguồn không khả dụng, và chỉ báo lỗi trong panel bị ảnh hưởng |
| FR-UC02-07 | *(A1)* Hiển thị điểm bắt đầu của vai trò (UC06 với sinh viên, UC25 / UC45 với CMB) thay vì danh sách rỗng khi không có gì đang chờ |
| FR-UC02-08 | *(A2)* Cho người dùng nhiều ngữ cảnh CLB chuyển CLB mà không phải đăng nhập lại |
| FR-UC02-09 | **Không** thực hiện chuyển trạng thái và không ghi gì xuống trong use case này |

**Hậu điều kiện** — không có. **Đầu ra** — dashboard được render; không ghi dữ liệu.

### UC03 — Quản lý tài khoản và gán vai trò

| | |
|---|---|
| **Module · Ưu tiên** | M01 · P1 |
| **Actor chính** | ICPDP Officer |
| **Mục tiêu nghiệp vụ** | Kiểm soát ai được phép hành động, tách biệt với ai được phép đăng nhập |
| **Kích hoạt** | Có officer mới, cần thu hồi một vai trò, hoặc cần khoá một tài khoản |
| **Tiền điều kiện** | Người gọi có quyền quản trị tài khoản |
| **Dữ liệu vào** | Người dùng đích; vai trò cần cấp hoặc thu hồi (vai trò ICPDP hoặc vai trò đặc biệt của BR19); lý do khoá, mở khoá hoặc thu hồi |
| **Thực thể / trạng thái** | Trạng thái tài khoản `User`: `Active ⇄ Locked`; các bản gán vai trò |
| **Quy tắc** | BR19 (vai trò mở khoá điểm danh được cấp tại đây); BR47 (UC03 không bao giờ cấp quyền CMB) |
| **Liên quan** | UC01, UC11, UC13, UC40 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC03-01 | Cho officer tìm người dùng theo email hoặc tên và hiển thị vai trò hiện tại, ngữ cảnh CLB và trạng thái tài khoản |
| FR-UC03-02 | Cho officer cấp hoặc thu hồi một vai trò ICPDP hoặc vai trò đặc biệt của BR19; không cho cấp quyền CMB (BR47) |
| FR-UC03-03 | Cho officer khoá hoặc mở khoá tài khoản, và bắt buộc nhập lý do khi khoá, mở khoá hoặc thu hồi |
| FR-UC03-04 | Áp dụng thay đổi, vô hiệu hoá ngay các phiên bị ảnh hưởng và ghi bản ghi audit |
| FR-UC03-05 | *(E1)* Từ chối khi officer tự thu hồi vai trò quản trị cuối cùng của chính mình |
| FR-UC03-06 | *(E2)* Từ chối khi officer cố cấp quyền CLB cho một người dùng, và chỉ sang UC10 / UC11 hoặc UC23 (BR47) |
| FR-UC03-07 | *(A1)* Hỗ trợ khoá khẩn cấp không kèm thay đổi vai trò khi một hồ sơ vi phạm (UC40) yêu cầu, và liên kết lệnh khoá với hồ sơ đó |
| FR-UC03-08 | Biểu diễn phân cấp bên trong ICPDP bằng quyền, không bao giờ bằng một actor mới |
| FR-UC03-09 | Không lưu quyền CMB trên bản gán vai trò của UC03; quyền CMB luôn suy ra từ `ClubPositionAssignment ∩ ClubTerm đang hoạt động` (FR-UC01-05) nên tự hết khi nhiệm kỳ đóng |

**Hậu điều kiện** — tập vai trò hoặc trạng thái tài khoản đã đổi và được audit; tài khoản bị khoá sẽ bị từ chối ở UC01.
**Đầu ra** — bản gán vai trò, trạng thái tài khoản, bản ghi audit.

### UC04 — Cấu hình chính sách và deadline của nhà trường

| | |
|---|---|
| **Module · Ưu tiên** | M01 · P1 |
| **Actor chính** | ICPDP Officer |
| **Mục tiêu nghiệp vụ** | Thay đổi một quy tắc nghiệp vụ mà không cần release code |
| **Kích hoạt** | Quy định của trường thay đổi, hoặc bắt đầu một kỳ học mới |
| **Tiền điều kiện** | Người gọi có quyền cấu hình chính sách |
| **Thực thể / trạng thái** | `PolicyVersion` — đánh phiên bản, có ngày hiệu lực |
| **Quy tắc** | BR42 — màn hình cấu hình chỉ phơi ra đúng danh sách dưới đây; mọi giá trị chính sách khác là hằng số định nghĩa trong tài liệu chính sách (danh sách ở mục BR42 của catalogue quy tắc nghiệp vụ) |
| **Liên quan · Pain point** | UC01, UC07, UC15, UC25, UC33, UC38, UC45, UC48 · BP14 |

**Danh sách giá trị cấu hình được (đầy đủ — BR42)**

| Giá trị | Quy tắc nó chi phối |
|---|---|
| Domain email được phép | BR32, UC01 |
| Số thành viên sáng lập tối thiểu | BR03, UC07 |
| Danh mục tài liệu bắt buộc khi thành lập | BR02, UC07 |
| Deadline báo cáo và các mốc nhắc (`T−X`, `T`, `T+Y`, `T+Z`) | BR20, §8.2 |
| Ngưỡng xung đột | BR15, UC25, UC45 |
| Độ dài feedback window và số người phản hồi tối thiểu | BR36, BR40, UC48, UC49 |
| Chính sách overbooking | BR33, UC45, UC46 |
| Công tắc cưỡng chế (chặn đề xuất mới khi còn nghĩa vụ quá hạn: báo cáo, quyết toán, hoàn trả) | BR21, UC25 |
| Lịch học kỳ — ngày bắt đầu và kết thúc | BR44, BR45, UC15, UC21 A2 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC04-01 | Hiển thị bộ chính sách của kỳ hiện tại và cho officer sửa một hoặc nhiều giá trị trong danh sách trên |
| FR-UC04-02 | Validate từng giá trị và từ chối tổ hợp mâu thuẫn nội tại |
| FR-UC04-03 | Lưu mỗi lần xác nhận thành một **phiên bản chính sách mới** kèm ngày hiệu lực, và ghi audit |
| FR-UC04-04 | Giữ nguyên mọi quyết định đã ra theo đúng giá trị tại thời điểm ra quyết định — thay đổi chính sách không bao giờ viết lại lịch sử |
| FR-UC04-05 | *(A1)* Chấp nhận ngày hiệu lực trong tương lai và chỉ áp dụng giá trị từ ngày đó |
| FR-UC04-06 | *(E1)* Từ chối giá trị làm vô hiệu một quyết định đã ra, và liệt kê các bản ghi bị ảnh hưởng |
| FR-UC04-07 | Không phơi ra bất kỳ giá trị cấu hình nào ngoài danh sách trên (BR42) |

**Hậu điều kiện** — một phiên bản chính sách mới có hiệu lực. **Đầu ra** — `PolicyVersion`, bản ghi audit.

### UC05 — Cấu hình quy tắc định tuyến phê duyệt

| | |
|---|---|
| **Module · Ưu tiên** | M01 · P1 |
| **Actor chính** | ICPDP Officer |
| **Mục tiêu nghiệp vụ** | Quyết định hồ sơ nào cần cấp duyệt thứ hai trong nội bộ ICPDP, không hard-code ngưỡng |
| **Kích hoạt** | ICPDP thay đổi phân cấp thẩm quyền nội bộ |
| **Tiền điều kiện** | Người gọi có quyền cấu hình định tuyến |
| **Dữ liệu vào** | Loại hồ sơ, ngưỡng số tiền, mức rủi ro sự kiện, hạng property, lịch sử tuân thủ của CLB → cấp duyệt yêu cầu và SLA |
| **Thực thể / trạng thái** | `RoutingRuleSet` — đánh phiên bản, `Draft → Active` |
| **Quy tắc** | BR16 (đã sửa đổi), BR31 |
| **Liên quan** | UC08, UC26, UC46 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC05-01 | Cho officer thêm hoặc sửa một rule định tuyến gồm điều kiện và cấp duyệt mà điều kiện đó đòi hỏi, kèm SLA |
| FR-UC05-02 | Validate rằng không có hai rule nào chồng nhau; hồ sơ không khớp rule nào được quyết định ở một cấp (BR16) |
| FR-UC05-03 | *(E1)* Từ chối kích hoạt khi hai rule chồng nhau |
| FR-UC05-04 | Đánh phiên bản và audit bộ rule đã kích hoạt, và chỉ áp dụng cho hồ sơ mới |
| FR-UC05-05 | Quyết định ở một cấp duy nhất với mọi hồ sơ không khớp rule nào (BR16) |
| FR-UC05-06 | Giữ cho mọi cấp duyệt đều do một ICPDP Officer thực hiện, để BR31 (một cấp phê duyệt duy nhất) vẫn đúng |
| FR-UC05-07 | *(A1)* Cho officer mô phỏng bộ rule nháp trên *N* hồ sơ đã quyết định gần nhất và xem hồ sơ nào lẽ ra cần cấp duyệt thứ hai |

**Hậu điều kiện** — tồn tại một bộ rule định tuyến đang hoạt động; UC08, UC26 và UC46 tra cứu nó.
**Đầu ra** — `RoutingRuleSet` version, bản ghi audit.

---

## 4.2 M02 / M03 — Vòng đời CLB, quản trị và nhiệm kỳ

### UC06 — Khám phá CLB và hoạt động đang mở

| | |
|---|---|
| **Module · Ưu tiên** | M02 · P1 |
| **Actor chính** | Student |
| **Mục tiêu nghiệp vụ** | Giúp sinh viên tìm được CLB, đợt tuyển hoặc sự kiện đáng tham gia — cửa vào của cả sản phẩm |
| **Kích hoạt** | Sinh viên muốn tham gia một CLB hoặc một hoạt động |
| **Tiền điều kiện** | Không có — Guest xem được (chỉ đọc); đi tiếp sang UC17 / UC29 đòi UC01 |
| **Dữ liệu vào** | Từ khoá tìm kiếm, lĩnh vực, loại hoạt động |
| **Thực thể / trạng thái** | Không — chỉ đọc |
| **Quy tắc** | BR09, BR14 |
| **Liên quan** | UC16, UC17, UC27, UC29 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC06-01 | Cho sinh viên duyệt hoặc tìm CLB theo lĩnh vực hoặc từ khoá và liệt kê từng CLB khớp kèm trạng thái và mô tả ngắn |
| FR-UC06-02 | Hiển thị trang CLB gồm hồ sơ, ban chủ nhiệm, lịch sử hoạt động, các đợt tuyển đang mở và các sự kiện công khai sắp tới |
| FR-UC06-03 | Liệt kê CLB `Active`, và liệt kê CLB `Suspended` có đánh dấu rõ và **không** hiện đợt tuyển nào (BR09); không liệt kê CLB `Dissolved` |
| FR-UC06-04 | Không bao giờ liệt kê CLB `Dissolved` |
| FR-UC06-05 | Cho đi tiếp sang UC17 (ứng tuyển) hoặc UC29 (đăng ký sự kiện) ngay từ trang CLB |
| FR-UC06-06 | *(A1)* Cho sinh viên duyệt các sự kiện công khai sắp tới của mọi CLB và đi ngược từ sự kiện về CLB |
| FR-UC06-07 | Phục vụ toàn bộ UC06 cho cả khách chưa đăng nhập (Guest), chỉ đọc; khi Guest chọn đi tiếp sang UC17 / UC29, chuyển sang UC01 rồi quay lại đúng trang đó |
| FR-UC06-07 | *(E1)* Gợi ý bỏ bớt bộ lọc và hiển thị các CLB active mới nhất khi không có kết quả nào |

**Hậu điều kiện** — không có. **Đầu ra** — không ghi dữ liệu.

### UC07 — Nộp hồ sơ đề nghị thành lập CLB

| | |
|---|---|
| **Module · Ưu tiên** | M02 · P1 |
| **Actor chính** | Student |
| **Mục tiêu nghiệp vụ** | Đề xuất một CLB mới qua một quy trình chuẩn, truy vết được |
| **Kích hoạt** | Một nhóm sinh viên muốn lập CLB |
| **Tiền điều kiện** | Đã đăng nhập và đủ điều kiện lập CLB định nghĩa trong tài liệu chính sách |
| **Dữ liệu vào** | Tên CLB, lĩnh vực, mục tiêu; danh sách thành viên sáng lập; các tài liệu bắt buộc; **cơ cấu tổ chức dự kiến** — danh sách role (tên, ban/bộ phận, một hay nhiều người giữ, có thuộc ban điều hành không) và permission của từng role |
| **Thực thể / trạng thái** | `ClubApplication`: `Draft → Submitted`; `Revision Requested → Submitted` (version mới); `… → Withdrawn` |
| **Quy tắc** | BR02, BR03, BR04, BR55, BR56 |
| **Liên quan · Pain point** | UC02, UC08 · BP04 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC07-01 | Thu thập tên CLB, lĩnh vực và mục tiêu, danh sách thành viên sáng lập và các tài liệu bắt buộc cấu hình ở UC04 (BR02) |
| FR-UC07-02 | Validate tính đầy đủ và số lượng thành viên sáng lập tối thiểu trước khi chấp nhận nộp (BR03) |
| FR-UC07-03 | Tạo **version 1** của hồ sơ khi nộp và đặt trạng thái `Submitted` |
| FR-UC07-04 | Tạo một review task cho ICPDP, hiển thị trong UC02, với mọi hồ sơ đã nộp |
| FR-UC07-05 | *(A1)* Cho sinh viên lưu hồ sơ ở trạng thái `Draft` và làm tiếp sau |
| FR-UC07-06 | *(A2)* Từ `Revision Requested`, cho người nộp sửa các phần bị đánh dấu và nộp lại; tạo **version mới**, đưa hồ sơ về `Submitted`, và giữ mọi version trước đọc được (BR04, CON-08) |
| FR-UC07-07 | *(A3)* Cho người nộp rút hồ sơ chưa có quyết định (`Submitted`, `Under Review` hoặc `Revision Requested`) → `Withdrawn`, đồng thời đóng review task đang mở |
| FR-UC07-08 | *(E1)* Từ chối nộp và giữ hồ sơ ở `Draft` khi thiếu một tài liệu bắt buộc |
| FR-UC07-09 | *(E2)* Từ chối nộp khi số thành viên sáng lập ít hơn mức BR03 cho phép |
| FR-UC07-10 | *(E3)* Cảnh báo khi đã có một CLB đang hoạt động trùng tên, và để quyết định cho UC08 |
| FR-UC07-11 | Không bao giờ ghi đè một version đã nộp (BR04); một version hồ sơ bao gồm cả cơ cấu tổ chức dự kiến |
| FR-UC07-12 | Thu thập **cơ cấu tổ chức dự kiến**: có sẵn role Chủ nhiệm (cố định, thuộc ban điều hành) và role Members (mặc định); cho người nộp thêm các role khác (ví dụ Phó chủ nhiệm, Trưởng ban A, Trưởng ban B), đánh dấu role nào thuộc ban điều hành, và chọn permission cho từng role từ danh mục cố định (BR55, BR56) |
| FR-UC07-13 | *(E4)* Từ chối nộp khi cơ cấu không có role Chủ nhiệm, hoặc có role được cấp một trong bốn quyền giữ riêng của Club Leader (BR55) |

**Hậu điều kiện** — hồ sơ ở `Submitted` với một version bất biến và một review task.
**Đầu ra** — `ClubApplication`, `ClubApplicationVersion`, `ApprovalTask`, thông báo.

### UC08 — Thẩm định và quyết định hồ sơ thành lập CLB

| | |
|---|---|
| **Module · Ưu tiên** | M02 · P1 |
| **Actor chính** | ICPDP Officer |
| **Mục tiêu nghiệp vụ** | Một phiên thẩm định duy nhất kết thúc bằng đúng một trong ba kết quả, kèm lý do được lưu lại |
| **Kích hoạt** | Một review task từ UC07 |
| **Tiền điều kiện** | Hồ sơ đang `Submitted`; người gọi có quyền thẩm định |
| **Dữ liệu vào** | Ghi chú thẩm định, các phần bị đánh dấu, quyết định và lý do, deadline chỉnh sửa |
| **Thực thể / trạng thái** | `ClubApplication`: `Submitted → Under Review → {Revision Requested, Approved, Rejected}`; tạo `Club` ở `Pending Setup` và `ClubRoleStructureVersion` số 1 khi duyệt |
| **Quy tắc** | BR05, BR31, BR55, BR56 |
| **Liên quan · Pain point** | UC05, UC07, UC09, UC10 · BP04, BP15 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC08-01 | Chuyển hồ sơ sang `Under Review` khi officer mở nó |
| FR-UC08-02 | Hiển thị thông tin CLB, thành viên sáng lập, tài liệu, **cơ cấu tổ chức dự kiến** (role, role ban điều hành, permission) và toàn bộ lịch sử version trên cùng một màn hình |
| FR-UC08-03 | Ghi lại ghi chú thẩm định của officer, gồm cả ý kiến lấy từ ngoài hệ thống |
| FR-UC08-04 | Cung cấp đúng ba kết quả: **yêu cầu chỉnh sửa**, **phê duyệt**, **từ chối** |
| FR-UC08-05 | Khi **yêu cầu chỉnh sửa**: bắt buộc đánh dấu phần chưa đạt (kể cả cơ cấu tổ chức) và nhập nhận xét có cấu trúc, cho phép đặt deadline, chuyển `Revision Requested` và thông báo người nộp |
| FR-UC08-06 | Khi **phê duyệt**: chuyển `Approved`, tạo đúng một `Club` ở `Pending Setup`, tạo các role theo cơ cấu đã duyệt thành **phiên bản cơ cấu 1** có hiệu lực từ ngày duyệt (BR56), và cấp cho người nộp **quyền CMB sáng lập tạm thời**, chỉ dùng được cho UC09, UC10 và UC23 khi CLB còn `Pending Setup` (BR47) |
| FR-UC08-07 | Khi **từ chối**: bắt buộc nhập lý do, chuyển `Rejected` và không tạo `Club` nào |
| FR-UC08-08 | Lưu actor, thời điểm và lý do (nếu có) cho mọi kết quả (BR05), và thông báo người nộp |
| FR-UC08-09 | *(A1)* Leo thang quyết định lên cấp ICPDP thứ hai trước khi có hiệu lực, khi rule định tuyến của UC05 yêu cầu |
| FR-UC08-10 | *(E1)* Đóng phiên thẩm định và đánh dấu hồ sơ `Withdrawn` khi người nộp rút trong lúc đang thẩm định |
| FR-UC08-11 | *(E2)* Để scheduler chuyển `Expired` khi hết deadline chỉnh sửa mà không có bản nộp lại; người nộp phải làm hồ sơ mới |
| FR-UC08-12 | Không bao giờ cho ICPDP sửa dữ liệu thay cho người nộp |
| FR-UC08-13 | Gắn lịch sử quyết định vào hồ sơ và cho đọc ngay tại đây (đây chính là cách BP15 được giải quyết mà không cần một use case audit riêng) |

**Hậu điều kiện** — hồ sơ ở `Revision Requested`, `Approved` hoặc `Rejected`; khi duyệt thì tồn tại một `Club` ở `Pending Setup` kèm quyền sáng lập tạm thời.
**Đầu ra** — `ApprovalDecision`, `Club` và phiên bản cơ cấu 1 (khi duyệt), bản ghi audit, thông báo.

### UC09 — Cấu hình hồ sơ và cơ cấu tổ chức CLB

| | |
|---|---|
| **Module · Ưu tiên** | M02 / M03 · P1 |
| **Actor chính** | Club Member có permission `club.profile.manage` |
| **Mục tiêu nghiệp vụ** | Hoàn thiện thông tin vận hành của một CLB đã được công nhận và mô hình hoá các ban, bộ phận bên trong |
| **Kích hoạt** | CLB vừa được tạo ở `Pending Setup`, hoặc cơ cấu thay đổi |
| **Tiền điều kiện** | CLB tồn tại; người gọi có `club.profile.manage` (Club Leader luôn có), hoặc giữ ghế tạm từ UC08 khi CLB còn `Pending Setup` |
| **Dữ liệu vào** | Mô tả, liên hệ, điều lệ, kênh truyền thông, phạm vi hoạt động; các ban và bộ phận |
| **Thực thể / trạng thái** | Hồ sơ `Club`, ban / bộ phận (role CLB được định nghĩa ở UC23) |
| **Quy tắc** | BR54; Trường thuộc thẩm quyền nhà trường chỉ ICPDP sửa được; cơ cấu có thể bị ràng buộc bởi template của trường |
| **Liên quan** | UC10, UC11, UC23 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC09-01 | Cho CMB hoàn thiện hoặc sửa thông tin vận hành của CLB |
| FR-UC09-02 | Cho CMB định nghĩa cơ cấu nội bộ — các ban và bộ phận; role và permission của role được Club Leader định nghĩa ở UC23 |
| FR-UC09-03 | Validate cơ cấu theo template của trường ở những nơi template được áp dụng |
| FR-UC09-04 | Ghi audit mọi thay đổi hồ sơ và cơ cấu |
| FR-UC09-05 | *(A1)* Cung cấp cơ cấu mặc định của trường làm điểm khởi đầu |
| FR-UC09-06 | *(E1)* Từ chối sửa một trường thuộc thẩm quyền nhà trường |
| FR-UC09-07 | *(E2)* Từ chối xoá một ban/bộ phận còn role đang dùng gắn với nó; việc ngừng dùng một role còn người giữ do UC23 E4 xử lý |
| FR-UC09-08 | Chỉ cho CLB rời `Pending Setup` sau khi UC11 xác nhận ban chủ nhiệm |
| FR-UC09-09 | *(E)* Từ chối khi người gọi thiếu permission `club.profile.manage` trong CLB đó (BR54) |

**Hậu điều kiện** — hồ sơ và cơ cấu CLB là hiện hành. **Đầu ra** — hồ sơ `Club`, bản ghi ban và bộ phận, bản ghi audit.

### UC10 — Đề xuất ban chủ nhiệm CLB

| | |
|---|---|
| **Module · Ưu tiên** | M03 · P1 |
| **Actor chính** | Club Leader |
| **Mục tiêu nghiệp vụ** | Đề xuất bộ máy lãnh đạo của một nhiệm kỳ để được xác nhận |
| **Kích hoạt** | CLB vừa được duyệt, một nhiệm kỳ bắt đầu, hoặc một ghế bị trống |
| **Tiền điều kiện** | CLB tồn tại; người gọi là CMB hoặc có quyền sáng lập tạm thời từ UC08; người được đề xuất là thành viên (hoặc thành viên sáng lập với ban đầu tiên) |
| **Dữ liệu vào** | Thành viên, chức vụ, ngày bắt đầu và kết thúc nhiệm kỳ |
| **Thực thể / trạng thái** | Bản đề xuất ban chủ nhiệm → `Pending Confirmation` |
| **Quy tắc** | BR06, BR07, BR47, BR55 |
| **Liên quan · Pain point** | UC09, UC11 · BP03 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC10-01 | Cho Club Leader mở một bản đề xuất ban chủ nhiệm cho một nhiệm kỳ; các ghế cần đề xuất là các **role ban điều hành** trong phiên bản cơ cấu đang hiệu lực (BR56), và với mỗi ghế chọn một thành viên |
| FR-UC10-02 | Kiểm tra điều kiện của người được đề xuất theo các điều kiện định nghĩa trong tài liệu chính sách (BR07) |
| FR-UC10-03 | Kiểm tra trùng lặp nhiệm kỳ Chủ nhiệm và từ chối trừ khi tài liệu chính sách cho phép (BR06) |
| FR-UC10-04 | Đặt bản đề xuất ở `Pending Confirmation` khi nộp và tạo task cho ICPDP |
| FR-UC10-05 | *(A1)* Chấp nhận đề xuất một phần — chỉ đề xuất các ghế còn trống, các ghế đã xác nhận giữ nguyên |
| FR-UC10-06 | *(E1)* Từ chối ghế mà người được đề xuất không đủ điều kiện theo BR07 |
| FR-UC10-07 | Dùng chính use case này cho ban chủ nhiệm đầu tiên của CLB vừa được duyệt ở UC08 |
| FR-UC10-08 | *(E)* Từ chối khi người gọi không phải Club Leader của CLB; `club.board.nominate` là quyền giữ riêng, không cấp được cho role nào (BR47, BR55) |

**Hậu điều kiện** — bản đề xuất ở `Pending Confirmation`. **Đầu ra** — đề xuất ban chủ nhiệm, `ApprovalTask`, thông báo.

### UC11 — Xác nhận ban chủ nhiệm

| | |
|---|---|
| **Module · Ưu tiên** | M03 · P1 |
| **Actor chính** | ICPDP Officer |
| **Mục tiêu nghiệp vụ** | Trao quyền quản lý cho một ban chủ nhiệm cụ thể trong một nhiệm kỳ cụ thể |
| **Kích hoạt** | Một task đề xuất từ UC10 |
| **Tiền điều kiện** | Bản đề xuất đang `Pending Confirmation` |
| **Dữ liệu vào** | Quyết định và lý do |
| **Thực thể / trạng thái** | Kích hoạt `ClubTerm`; `Club`: `Pending Setup → Active` với ban sáng lập |
| **Quy tắc** | BR05, BR07 |
| **Liên quan · Pain point** | UC03, UC10, UC13 · BP03 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC11-01 | Hiển thị bản đề xuất kèm kết quả kiểm tra điều kiện, xung đột lợi ích và mốc thời gian nhiệm kỳ |
| FR-UC11-02 | Cho officer phê duyệt hoặc từ chối, bắt buộc lý do ở nơi chính sách yêu cầu |
| FR-UC11-03 | Khi phê duyệt, kích hoạt ban chủ nhiệm, tạo hoặc kích hoạt `ClubTerm` và cấp các quyền tương ứng |
| FR-UC11-04 | Chuyển CLB từ `Pending Setup` sang `Active` khi ban chủ nhiệm sáng lập được xác nhận |
| FR-UC11-05 | Thu hồi quyền CMB sáng lập tạm thời đã cấp ở UC08 ngay khi xác nhận, để quyền CMB chỉ còn thuộc ban đã xác nhận |
| FR-UC11-06 | Ghi audit quyết định và thông báo cho CLB |
| FR-UC11-07 | *(A1)* Xác nhận từng ghế riêng lẻ và trả các ghế khác về để đề xuất lại |
| FR-UC11-08 | *(E1)* Trả ghế về UC10 khi tư cách thành viên của người được đề xuất kết thúc giữa lúc đề xuất và xác nhận |
| FR-UC11-09 | Suy ra quyền CMB từ lần xác nhận này, không bao giờ từ UC03 |
| FR-UC11-10 | Ghi mỗi ghế được xác nhận thành một bản gán role ban điều hành gắn với nhiệm kỳ (`termId`, ngày bắt đầu, quyết định UC11), để lịch sử ban điều hành đọc được ở UC02 (BR56) |

**Hậu điều kiện** — ban chủ nhiệm hoạt động trong nhiệm kỳ; các quyền có hiệu lực.
**Đầu ra** — `ClubTerm`, các bản gán chức vụ, quyền, bản ghi audit.

### UC12 — Lập kế hoạch chuyển giao nhiệm kỳ

| | |
|---|---|
| **Module · Ưu tiên** | M03 · P1 |
| **Actor chính** | Club Leader |
| **Mục tiêu nghiệp vụ** | Chuẩn bị một cuộc bàn giao mang theo cả nghĩa vụ, thay vì đánh rơi chúng |
| **Kích hoạt** | Nhiệm kỳ sắp kết thúc |
| **Tiền điều kiện** | Có một nhiệm kỳ đang hoạt động |
| **Dữ liệu vào** | Nhiệm kỳ mới; ứng viên; sự kiện còn dở; ngân sách còn treo; báo cáo chưa xong; tài sản và trách nhiệm cần bàn giao |
| **Thực thể / trạng thái** | `TransitionPlan` → `Pending Confirmation` |
| **Quy tắc** | BR08, BR47, BR55, BR56; Nghĩa vụ luôn gắn với CLB, không bao giờ gắn với cá nhân sắp rời đi |
| **Liên quan · Pain point** | UC10, UC13 · BP03 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC12-01 | Nạp sẵn các nghĩa vụ còn tồn đọng từ M05, M07 và M08 vào kế hoạch chuyển giao |
| FR-UC12-02 | Cho ban chủ nhiệm sắp mãn nhiệm nêu người giữ mới cho từng role ban điều hành của nhiệm kỳ mới và hoàn thiện danh mục bàn giao |
| FR-UC12-03 | Đặt kế hoạch ở `Pending Confirmation` khi nộp và tạo task cho ICPDP |
| FR-UC12-04 | *(A1)* Chấp nhận chuyển giao sớm nộp trước khi nhiệm kỳ kết thúc, kèm lý do |
| FR-UC12-05 | *(E1)* Từ chối nộp khi còn một nghĩa vụ chưa có người nhận trong ban mới |
| FR-UC12-06 | *(E)* Từ chối khi người gọi không phải Club Leader của CLB; `club.transition.plan` là quyền giữ riêng, không cấp được cho role nào (BR47, BR55) |
| FR-UC12-07 | *(A2)* Cho kế hoạch kèm thay đổi danh sách role ban điều hành (thêm, bỏ, hoặc đánh dấu lại một role); thay đổi đó chỉ có hiệu lực khi UC13 xác nhận (BR55, BR56) |

**Hậu điều kiện** — kế hoạch ở `Pending Confirmation`. **Đầu ra** — kế hoạch chuyển giao, `ApprovalTask`.

### UC13 — Xác nhận chuyển giao nhiệm kỳ

| | |
|---|---|
| **Module · Ưu tiên** | M03 · P1 |
| **Actor chính** | ICPDP Officer |
| **Mục tiêu nghiệp vụ** | Chuyển giao quyền mà không đánh mất trách nhiệm giải trình |
| **Kích hoạt** | Một task chuyển giao từ UC12 |
| **Tiền điều kiện** | Kế hoạch đang `Pending Confirmation` |
| **Thực thể / trạng thái** | `ClubTerm` cũ đóng lại, `ClubTerm` mới được kích hoạt; có thể tạo `ClubRoleStructureVersion` mới |
| **Quy tắc** | BR08, BR55, BR56 |
| **Liên quan · Pain point** | UC03, UC11, UC12 · BP03 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC13-01 | Hiển thị kế hoạch cùng các nghĩa vụ mà nó mang theo |
| FR-UC13-02 | Cho officer phê duyệt hoặc trả lại kế hoạch |
| FR-UC13-03 | Khi phê duyệt, đóng nhiệm kỳ cũ, kích hoạt nhiệm kỳ mới, thu hồi quyền cũ, cấp quyền mới và lưu lịch sử |
| FR-UC13-04 | **Chỉ** cấp quyền mới sau khi chuyển giao được xác nhận (BR08) |
| FR-UC13-05 | Ghi audit lần chuyển giao và thông báo cho cả ban cũ lẫn ban mới |
| FR-UC13-06 | *(A1)* Hỗ trợ phê duyệt có điều kiện — các nghĩa vụ được đánh dấu để theo dõi tiếp và xuất hiện trên UC02 của ban mới |
| FR-UC13-07 | *(E1)* Giữ chuyển giao lại khi CLB đang `Suspended`, cho tới khi UC15 kích hoạt lại CLB |
| FR-UC13-08 | Khi phê duyệt: đóng các bản gán role ban điều hành của nhiệm kỳ cũ, tạo bản gán mới gắn nhiệm kỳ mới, và nếu kế hoạch có thay đổi danh sách role ban điều hành (UC12 A2) thì tạo một **phiên bản cơ cấu mới** có hiệu lực từ ngày xác nhận (BR56) |

**Hậu điều kiện** — nhiệm kỳ mới hoạt động; nhiệm kỳ cũ đã đóng và đọc được.
**Đầu ra** — lịch sử `ClubTerm`, quyền, bản ghi audit.

### UC14 — Yêu cầu tạm ngừng hoạt động CLB

| | |
|---|---|
| **Module · Ưu tiên** | M02 · P1 |
| **Actor chính** | Club Leader |
| **Mục tiêu nghiệp vụ** | Cho CLB tạm dừng một cách hợp thức thay vì lặng lẽ biến mất |
| **Kích hoạt** | CLB không thể hoạt động trong một giai đoạn |
| **Tiền điều kiện** | CLB đang `Active` |
| **Dữ liệu vào** | Lý do, thời lượng dự kiến, các nghĩa vụ còn tồn đọng, kế hoạch phục hồi |
| **Thực thể / trạng thái** | Yêu cầu tạm ngừng chờ UC15 |
| **Quy tắc** | BR47, BR55 |
| **Liên quan** | UC15 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC14-01 | Cho ban chủ nhiệm nêu lý do, giai đoạn và cách xử lý các nghĩa vụ còn tồn đọng |
| FR-UC14-02 | Tạo task cho ICPDP khi nộp |
| FR-UC14-03 | *(E1)* Khi nộp, cảnh báo và liệt kê các sự kiện và booking tương lai đã duyệt sẽ bị huỷ tự động (UC28 A1, UC47 A1) nếu UC15 chấp thuận tạm ngừng; yêu cầu ban chủ nhiệm xác nhận trước khi nộp |
| FR-UC14-04 | *(E)* Từ chối khi người gọi không phải Club Leader của CLB; `club.suspension.request` là quyền giữ riêng, không cấp được cho role nào (BR47, BR55) |

**Hậu điều kiện** — yêu cầu chờ quyết định ở UC15. **Đầu ra** — yêu cầu tạm ngừng, `ApprovalTask`.

### UC15 — Tạm ngừng, kích hoạt lại hoặc giải thể CLB

| | |
|---|---|
| **Module · Ưu tiên** | M02 · P1 |
| **Actor chính** | ICPDP Officer |
| **Mục tiêu nghiệp vụ** | Kiểm soát vòng đời CLB từ một chỗ duy nhất, với lý do được lưu lại |
| **Kích hoạt** | Một yêu cầu (UC14), tình trạng không hoạt động, kết quả một hồ sơ vi phạm (UC40), hoặc chính sách |
| **Tiền điều kiện** | CLB tồn tại; người gọi có quyền vòng đời |
| **Dữ liệu vào** | Trạng thái đích, lý do, ngày hiệu lực, thời hạn nếu tạm ngừng |
| **Thực thể / trạng thái** | `Club`: `Active → Suspended`, `Suspended → Active`, lên lịch giải thể → `Dissolving` → `Dissolved` |
| **Quy tắc** | BR09, BR10, BR34, BR44, BR45 |
| **Liên quan · Pain point** | UC02, UC14, UC28, UC40, UC47 · BP01 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC15-01 | Hiển thị trạng thái, nghĩa vụ và lịch sử của CLB trước khi ra quyết định |
| FR-UC15-02 | Cung cấp đúng ba hành động — `Tạm ngừng`, `Kích hoạt lại`, `Giải thể` — mỗi hành động bắt buộc lý do |
| FR-UC15-03 | Khi **tạm ngừng**: chuyển `Suspended`, chặn đợt tuyển mới (BR09), đề xuất sự kiện mới (BR10) và booking mới (BR34) |
| FR-UC15-04 | Khi **tạm ngừng**: huỷ các đề xuất sự kiện chưa có quyết định, và huỷ các sự kiện và booking tương lai đã duyệt thông qua cascade UC28 A1 và UC47 A1 |
| FR-UC15-05 | Khi **kích hoạt lại**: đưa CLB về `Active` với lịch sử giữ nguyên |
| FR-UC15-06 | Khi **giải thể**: ghi nhận quyết định kèm học kỳ hiệu lực — học kỳ kế tiếp theo lịch học kỳ cấu hình ở UC04 — và **không** đổi trạng thái ngay |
| FR-UC15-07 | Khi **giải thể**: huỷ ngay mọi sự kiện, đề xuất và booking kết thúc sau học kỳ đó (BR45), thông qua UC28 A1 và UC47 A1 |
| FR-UC15-08 | Khi **giải thể**: để CLB hoạt động bình thường, kể cả tạo việc mới, cho tới đầu học kỳ kế tiếp |
| FR-UC15-09 | *(Scheduler)* Chuyển CLB đã có quyết định giải thể sang `Dissolving` vào đầu học kỳ kế tiếp: không mở đợt tuyển mới, không nộp đề xuất sự kiện mới, không nhận booking mới; việc đã tạo vẫn chạy đến hết, CMB chỉ giữ quyền truy cập để đóng chúng lại |
| FR-UC15-10 | *(Scheduler)* Vào cuối học kỳ `Dissolving`, trước khi học kỳ kế tiếp bắt đầu: huỷ các đề xuất và yêu cầu booking chưa quyết định, ghi các nghĩa vụ chưa hoàn thành vào hồ sơ lưu trữ, lưu trữ lịch sử quản trị, thu hồi quyền quản lý và chuyển `Dissolved` |
| FR-UC15-11 | *(Scheduler)* Giữ CLB ở `Dissolving` và cảnh báo ICPDP nếu bất kỳ phần nào của bước đóng lại thất bại |
| FR-UC15-12 | *(A1)* Liên kết quyết định với hồ sơ vi phạm (UC40) khi nó được ra như một biện pháp khắc phục |
| FR-UC15-13 | *(E1)* Cảnh báo officer khi giải thể được quyết định lúc còn ngân sách chưa đối soát; việc đối soát phải xong trước khi kết thúc học kỳ `Dissolving` |
| FR-UC15-14 | Ghi audit quyết định kèm actor, thời điểm, lý do và thông báo cho CLB |

**Hậu điều kiện** — CLB ở `Suspended` hoặc `Active`, hoặc mang một quyết định giải thể có hiệu lực từ học kỳ sau và kết thúc ở `Dissolved`; các sự kiện và booking bị huỷ được giải phóng chỗ như một **cascade hệ thống**, không phải một thao tác officer làm trong UC28 hay UC47.
**Đầu ra** — trạng thái CLB hoặc lịch giải thể, sự kiện và booking đã huỷ, hồ sơ lưu trữ kèm nghĩa vụ tồn đọng, bản ghi audit, thông báo.

---

## 4.3 M04 — Tuyển thành viên và quản lý thành viên

### UC16 — Tạo và công bố đợt tuyển thành viên

| | |
|---|---|
| **Module · Ưu tiên** | M04 · P1 |
| **Actor chính** | Club Member có permission `club.recruitment.manage` |
| **Mục tiêu nghiệp vụ** | Tuyển thành viên qua một quy trình có liên kết, thay vì một form rời rạc |
| **Kích hoạt** | CLB cần thành viên cho một nhiệm kỳ hoặc một bộ phận |
| **Tiền điều kiện** | CLB đang `Active` (BR01); người gọi có quyền tuyển thành viên |
| **Dữ liệu vào** | Vị trí cần tuyển, tiêu chí, khung thời gian nhận đơn, chỉ tiêu, các vòng tuyển, các trường của form ứng tuyển |
| **Thực thể / trạng thái** | `RecruitmentCampaign`: `Draft → Published → Accepting Applications → Screening → Completed`, hoặc `→ Cancelled` |
| **Quy tắc** | BR01, BR09, BR11, BR54 |
| **Liên quan · Pain point** | UC06, UC17, UC18 · BP11 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC16-01 | Thu thập vị trí cần tuyển, tiêu chí, khung thời gian nhận đơn, chỉ tiêu, các vòng tuyển và form ứng tuyển |
| FR-UC16-02 | Validate khung thời gian nhận đơn theo chính sách lịch học kỳ ở UC04 |
| FR-UC16-03 | Chuyển `Published` khi công bố và hiển thị đợt tuyển trong UC06 |
| FR-UC16-04 | *(A1)* Cho lưu đợt tuyển ở `Draft` và công bố sau |
| FR-UC16-05 | *(A2)* Cho huỷ một đợt tuyển đã công bố mà chưa có đơn nào; nếu đã có đơn thì đóng lại và thông báo cho người nộp |
| FR-UC16-06 | *(E1)* Từ chối tạo hoặc công bố khi CLB đang `Suspended` (BR09) hoặc `Dissolving` |
| FR-UC16-07 | *(E2)* Cảnh báo khi đã tồn tại một đợt tuyển chồng lấn cho cùng vị trí, và cho phép xác nhận hoặc gộp |
| FR-UC16-08 | Chỉ nhận đơn trong khung thời gian đã công bố (BR11) |
| FR-UC16-09 | *(E)* Từ chối khi người gọi thiếu permission `club.recruitment.manage` trong CLB đó (BR54) |

**Hậu điều kiện** — đợt tuyển ở `Published` và nhận đơn trong khung thời gian của nó.
**Đầu ra** — `RecruitmentCampaign`, thông báo.

### UC17 — Nộp đơn ứng tuyển vào CLB

| | |
|---|---|
| **Module · Ưu tiên** | M04 · P1 |
| **Actor chính** | Student |
| **Mục tiêu nghiệp vụ** | Ứng tuyển qua một kênh liên kết trực tiếp với tư cách thành viên mà nó dẫn tới |
| **Kích hoạt** | Sinh viên tìm thấy một đợt tuyển đang mở ở UC06 |
| **Tiền điều kiện** | Đợt tuyển đang trong khung thời gian nhận đơn; sinh viên đủ điều kiện |
| **Dữ liệu vào** | Đợt tuyển, vị trí ứng tuyển, câu trả lời trong form, tệp đính kèm |
| **Thực thể / trạng thái** | `RecruitmentApplication`: `Draft → Submitted`; `… → Withdrawn` |
| **Quy tắc** | BR11, BR12, BR13, BR46 |
| **Liên quan · Pain point** | UC02, UC06, UC18 · BP11 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC17-01 | Cho sinh viên chọn đợt tuyển, điền form và đính kèm những gì đợt tuyển yêu cầu |
| FR-UC17-02 | Validate điều kiện, khung thời gian (BR11) và trùng lặp (BR12) trước khi chấp nhận nộp |
| FR-UC17-03 | Chuyển `Submitted`, hiển thị đơn cho CLB và cho sinh viên theo dõi trong UC02 |
| FR-UC17-04 | *(A1)* Cho lưu đơn ở `Draft` và hoàn thiện trước khi hết hạn |
| FR-UC17-05 | *(A2)* Cho sinh viên rút đơn chưa có quyết định (`Submitted`, `Screening`, `Shortlisted`) → `Withdrawn` |
| FR-UC17-06 | *(E1)* Từ chối nộp sau khi khung thời gian đã đóng |
| FR-UC17-07 | *(E2)* Từ chối đơn thứ hai của cùng một sinh viên vào cùng một đợt tuyển (BR12) |
| FR-UC17-08 | *(E3)* Từ chối đơn của sinh viên đang là thành viên active của CLB đó (BR13) |
| FR-UC17-09 | *(E4)* Từ chối đơn của sinh viên có tư cách thành viên `Banned` ở CLB đó (BR46) |

**Hậu điều kiện** — đơn ở `Submitted` và CLB nhìn thấy. **Đầu ra** — `RecruitmentApplication`, thông báo.

### UC18 — Sàng lọc và quyết định đơn ứng tuyển

| | |
|---|---|
| **Module · Ưu tiên** | M04 · P1 |
| **Actor chính** | Club Member có permission `club.application.review` |
| **Mục tiêu nghiệp vụ** | Đưa toàn bộ đơn của một đợt tuyển từ `Submitted` tới quyết định trong một phiên, giữ lại lý do |
| **Kích hoạt** | Khung thời gian nhận đơn đóng lại, hoặc đơn dồn lại |
| **Tiền điều kiện** | Đợt tuyển có đơn; người gọi có quyền tuyển thành viên |
| **Dữ liệu vào** | Kết quả sàng lọc từng đơn, quyết định và lý do |
| **Thực thể / trạng thái** | `RecruitmentApplication`: `Submitted → Screening → Shortlisted → {Accepted, Rejected, Waitlisted}`; `RecruitmentCampaign → Completed` |
| **Quy tắc** | BR54; Lý do từ chối có thể là bắt buộc theo tài liệu chính sách |
| **Liên quan · Pain point** | UC17, UC19, UC20 · BP11 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC18-01 | Liệt kê và lọc đơn của một đợt tuyển, cho phép xem xét từng đơn theo tiêu chí và chuyển sang `Screening` |
| FR-UC18-02 | Cho CMB đưa vào danh sách rút gọn hoặc từ chối một đơn đã sàng lọc |
| FR-UC18-03 | Cho đính kèm một bản đánh giá từ UC19 vào ứng viên trong danh sách rút gọn và hiển thị điểm tổng hợp tại đây |
| FR-UC18-04 | Cho CMB quyết định `Accepted`, `Rejected` hoặc `Waitlisted`, ghi lý do ở nơi chính sách yêu cầu |
| FR-UC18-05 | Thông báo cho ứng viên mọi quyết định và hiển thị nó trong UC02 của họ |
| FR-UC18-06 | *(A1)* Hỗ trợ từ chối hoặc rút gọn hàng loạt với một lý do dùng chung |
| FR-UC18-07 | *(A2)* Cho phép nhận một ứng viên trong danh sách chờ khi có suất trống |
| FR-UC18-08 | *(E1)* Chặn số lượng nhận vượt chỉ tiêu của đợt tuyển và gợi ý đưa vào danh sách chờ |
| FR-UC18-09 | *(E2)* Đóng đơn đã rút mà không ra quyết định |
| FR-UC18-10 | Chuyển đợt tuyển sang `Completed` khi mọi đơn đã có quyết định |
| FR-UC18-11 | *(E)* Từ chối khi người gọi thiếu permission `club.application.review` trong CLB đó (BR54) |

**Hậu điều kiện** — mọi đơn đều có quyết định; các đơn được nhận đủ điều kiện sang UC20.
**Đầu ra** — quyết định trên từng đơn, thông báo.

### UC19 — Ghi nhận đánh giá ứng viên

| | |
|---|---|
| **Module · Ưu tiên** | M04 · P1 |
| **Actor chính** | Club Member có permission `club.application.review` |
| **Mục tiêu nghiệp vụ** | Làm cho quyết định tuyển chọn có căn cứ, bằng một bản đánh giá có cấu trúc |
| **Kích hoạt** | Một ứng viên trong danh sách rút gọn được phỏng vấn hoặc kiểm tra |
| **Tiền điều kiện** | Đơn đang `Shortlisted` |
| **Dữ liệu vào** | Kết quả phỏng vấn, điểm theo từng tiêu chí rubric, nhận xét của người đánh giá |
| **Thực thể / trạng thái** | `CandidateEvaluation` — bất biến sau khi có quyết định |
| **Quy tắc** | BR54; Rubric được cấu hình theo từng đợt tuyển |
| **Liên quan** | UC18 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC19-01 | Cho người đánh giá chấm từng tiêu chí rubric của một đơn trong danh sách rút gọn và thêm nhận xét |
| FR-UC19-02 | Lưu bản đánh giá gắn với cả đơn lẫn người đánh giá |
| FR-UC19-03 | Hiển thị điểm tổng hợp trong UC18 |
| FR-UC19-04 | *(A1)* Chấp nhận mỗi người đánh giá một bản riêng và hiển thị độ phân tán giữa các bản |
| FR-UC19-05 | *(E1)* Ghi nhận một đánh giá dạng văn bản tự do khi đợt tuyển không định nghĩa rubric |
| FR-UC19-06 | Khoá bản đánh giá thành bất biến ngay khi quyết định được đưa ra |
| FR-UC19-07 | *(E)* Từ chối khi người gọi thiếu permission `club.application.review` trong CLB đó (BR54) |

**Hậu điều kiện** — bản đánh giá gắn với đơn. **Đầu ra** — `CandidateEvaluation`.

### UC20 — Tiếp nhận ứng viên trúng tuyển

| | |
|---|---|
| **Module · Ưu tiên** | M04 · P1 |
| **Actor chính** | Club Member có permission `club.application.review` |
| **Mục tiêu nghiệp vụ** | Biến một quyết định trúng tuyển thành một bản ghi thành viên thật |
| **Kích hoạt** | CLB xác nhận việc nhận một ứng viên trúng tuyển |
| **Tiền điều kiện** | Đơn đang `Accepted` |
| **Dữ liệu vào** | Ngày gia nhập, bộ phận |
| **Thực thể / trạng thái** | Tạo `ClubMembership` ở `Active`; `RecruitmentApplication → Onboarded` (hoặc `Declined` ở A2) |
| **Quy tắc** | BR13, BR46, BR54, BR56 |
| **Liên quan · Pain point** | UC18, UC21, UC23, UC24 · BP02, BP11 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC20-01 | Tạo `ClubMembership` với ngày gia nhập khi việc nhận được xác nhận, **tự động gán role Members** (BR56), và chuyển đơn sang `Onboarded` |
| FR-UC20-02 | Cấp cho thành viên mới quyền truy cập UC24 |
| FR-UC20-03 | *(A1)* Cho phép tiếp nhận thủ công không qua đợt tuyển bởi một thành viên có thẩm quyền, kèm lý do được ghi lại (BR13) |
| FR-UC20-04 | *(A2)* Cho phép CMB ghi nhận việc ứng viên từ chối, chuyển đơn sang `Declined` (trạng thái cuối); suất trống được lấp qua UC18 A2 |
| FR-UC20-05 | *(E1)* Từ chối tạo khi đã tồn tại một tư cách thành viên active của sinh viên đó ở CLB đó |
| FR-UC20-06 | *(E2)* Từ chối tiếp nhận — kể cả tiếp nhận thủ công — với sinh viên có tư cách thành viên `Banned` ở CLB đó (BR46) |
| FR-UC20-07 | Thông báo cho thành viên mới và cập nhật số lượng thành viên |
| FR-UC20-08 | *(E)* Từ chối khi người gọi thiếu permission `club.application.review` trong CLB đó (BR54) |

**Hậu điều kiện** — tồn tại một `ClubMembership` đang active. **Đầu ra** — `ClubMembership`, thông báo.

### UC21 — Quản lý trạng thái thành viên

| | |
|---|---|
| **Module · Ưu tiên** | M04 · P1 |
| **Actor chính** | Club Member có permission `club.member.manage` |
| **Mục tiêu nghiệp vụ** | Giữ danh sách thành viên đúng với thực tế tại mọi thời điểm, kể cả khi chấm dứt tư cách thành viên |
| **Kích hoạt** | Một học kỳ bắt đầu, một thành viên ngừng tham gia, bị buộc rời, hoặc xin rời (UC22) |
| **Tiền điều kiện** | Tư cách thành viên tồn tại; người gọi có quyền quản lý thành viên |
| **Dữ liệu vào** | Trạng thái mới, ngày hiệu lực, lý do khi cấm |
| **Thực thể / trạng thái** | `ClubMembership`: `Active ⇄ Inactive`, `Active`/`Inactive → Left`, `Active`/`Inactive → Banned` (cả hai là trạng thái cuối) |
| **Quy tắc** | BR46, BR52, BR54; mọi thay đổi phải có ngày hiệu lực; lệnh cấm luôn quy được trách nhiệm |
| **Liên quan · Pain point** | UC20, UC22, UC23 · BP02 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC21-01 | Cho CMB chuyển một tư cách thành viên giữa `Active` và `Inactive`, kèm ngày hiệu lực |
| FR-UC21-02 | Cho CMB đặt `Banned` với **lý do bắt buộc**, chấm dứt tư cách thành viên vĩnh viễn |
| FR-UC21-03 | Khi tư cách thành viên kết thúc (`Left`, `Banned`), thu hồi mọi role đang giữ, kể cả Members (role ban điều hành chịu E1 / BR52); ghi audit mọi thay đổi trạng thái |
| FR-UC21-04 | Thông báo cho thành viên bị ảnh hưởng và hiển thị thay đổi trong UC24 của họ |
| FR-UC21-05 | *(A1)* Thực thi yêu cầu rời CLB đã nộp ở UC22 bằng cách chuyển tư cách thành viên sang `Left` và liên kết với yêu cầu đó |
| FR-UC21-06 | *(A2)* Hỗ trợ đăng ký lại thành viên theo kỳ: vào đầu mỗi học kỳ theo lịch học kỳ (UC04), chuyển mọi tư cách `Active` chưa được xác nhận sang `Inactive` và mọi tư cách `Inactive` được xác nhận sang `Active`, hiệu lực từ đầu học kỳ |
| FR-UC21-07 | *(E1)* Từ chối chuyển sang `Inactive`, `Left` hoặc `Banned` với thành viên đang giữ một ghế ban chủ nhiệm đã xác nhận cho tới khi UC10 / UC11 thay người — kể cả trong đợt quét A2, nơi thành viên ban chủ nhiệm được tính là đã xác nhận |
| FR-UC21-08 | *(E2)* Từ chối ngày hiệu lực lùi về quá khứ nếu nó làm thay đổi một bảng điểm danh hoặc một kỳ đánh giá đã chốt |
| FR-UC21-09 | Coi `Left` và `Banned` là trạng thái cuối: sinh viên đã `Left` chỉ quay lại bằng một tư cách thành viên mới (UC20); sinh viên `Banned` không thể quay lại CLB đó (BR46) |
| FR-UC21-10 | Giữ toàn bộ lịch sử trạng thái ở dạng đọc được |
| FR-UC21-11 | *(E)* Từ chối khi người gọi thiếu permission `club.member.manage` trong CLB đó (BR54) |

**Hậu điều kiện** — tư cách thành viên mang trạng thái mới kèm ngày hiệu lực, lịch sử đọc được.
**Đầu ra** — lịch sử trạng thái thành viên, bản ghi audit, thông báo.

### UC22 — Xin rời CLB

| | |
|---|---|
| **Module · Ưu tiên** | M04 · P1 |
| **Actor chính** | Club Member |
| **Mục tiêu nghiệp vụ** | Cho thành viên chấm dứt tư cách một cách có ghi nhận thay vì biến mất |
| **Kích hoạt** | Thành viên không muốn tham gia nữa |
| **Tiền điều kiện** | Có tư cách thành viên `Active` hoặc `Inactive` |
| **Dữ liệu vào** | Lý do, ngày hiệu lực đề nghị |
| **Thực thể / trạng thái** | Yêu cầu rời CLB; tư cách thành viên chỉ đổi ở UC21 |
| **Quy tắc** | BR05, BR52; thành viên khởi tạo, CLB thực thi — mỗi use case một actor |
| **Liên quan · Pain point** | UC21, UC24 · BP02 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC22-01 | Cho sinh viên gửi yêu cầu rời CLB từ màn hình tư cách thành viên trong UC24, kèm lý do và ngày đề nghị |
| FR-UC22-02 | Thông báo cho CLB để thực thi ở UC21 |
| FR-UC22-03 | Cho sinh viên theo dõi yêu cầu trong UC02 |
| FR-UC22-04 | *(E1)* Nhận yêu cầu từ sinh viên đang giữ ghế ban chủ nhiệm đã xác nhận, nhưng chỉ cho có hiệu lực sau khi UC10 / UC11 thay người |
| FR-UC22-05 | Không đổi trạng thái tư cách thành viên trong use case này; mọi role của thành viên bị thu hồi khi UC21 A1 thực thi yêu cầu |

**Hậu điều kiện** — tồn tại một yêu cầu rời CLB đang chờ. **Đầu ra** — yêu cầu rời CLB, thông báo.

### UC23 — Quản lý vai trò CLB và phân quyền

| | |
|---|---|
| **Module · Ưu tiên** | M03 / M04 · P1 |
| **Actor chính** | Club Leader |
| **Mục tiêu nghiệp vụ** | Chủ nhiệm tự tổ chức CLB — tạo role, quyết định mỗi role làm được gì, và giao role cho thành viên |
| **Kích hoạt** | CLB cần giao việc cho thành viên (thủ quỹ, trưởng ban sự kiện…), đổi quyền của một role, hoặc thêm / bỏ một role thường |
| **Tiền điều kiện** | Người gọi là Club Leader của CLB (BR47); CLB `Active`, hoặc `Pending Setup` với ghế tạm của người đứng đơn (UC08) |
| **Dữ liệu vào** | Tên role, mô tả, ban/bộ phận (UC09), một hay nhiều người giữ, tập permission; thành viên, khoảng thời gian hiệu lực (tuỳ chọn) |
| **Thực thể / trạng thái** | `ClubPosition` (role CLB) và permission của nó, `ClubPositionAssignment`, `ClubRoleStructureVersion` (một phiên bản mới cho mỗi thay đổi cơ cấu) |
| **Quy tắc** | BR47, BR49, BR54, BR55, BR56; không cần ICPDP xác nhận, trừ role ban điều hành (người giữ qua UC10 / UC11 / UC13, thêm / bỏ qua UC12 / UC13) |
| **Liên quan** | UC07, UC08, UC09, UC10, UC11, UC12, UC13, UC20, UC21, UC24 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC23-01 | Cho Club Leader xem danh sách role của CLB cùng permission và người đang giữ từng role |
| FR-UC23-02 | Cho Club Leader tạo hoặc sửa role: tên, mô tả, ban/bộ phận, giới hạn một người giữ hay nhiều người |
| FR-UC23-03 | Hiển thị danh mục permission cố định (BR55), đã ẩn bốn quyền giữ riêng của Club Leader, và cho chọn permission cho role |
| FR-UC23-04 | Cho Club Leader gán một hoặc nhiều thành viên `Active` vào role, có thể kèm thời hạn |
| FR-UC23-05 | Áp dụng quyền ngay khi lưu; mỗi lần tạo, sửa, ngừng dùng role hoặc đổi permission tạo một **phiên bản cơ cấu mới** (số phiên bản, ngày hiệu lực, người sửa, lý do tuỳ chọn) và không ghi đè phiên bản trước (BR56); giới hạn theo CLB và nhiệm kỳ đang hoạt động; ghi audit trước/sau, thông báo cho thành viên liên quan và hiển thị role ở UC24 |
| FR-UC23-06 | Cho ICPDP xem role, người giữ role và toàn bộ lịch sử phiên bản cơ cấu của mọi CLB ở chế độ chỉ đọc (qua trang CLB từ UC02); cho Club Leader xem lịch sử phiên bản cơ cấu của CLB mình |
| FR-UC23-07 | *(A1)* Khi sửa permission của một role (kể cả role ban điều hành), áp dụng ngay cho mọi người đang giữ role đó |
| FR-UC23-08 | *(A2)* Cho thu hồi role của một thành viên; quyền mất ngay, có audit và thông báo |
| FR-UC23-09 | *(A3)* Lấy cơ cấu ban đầu của CLB từ hồ sơ thành lập đã duyệt (UC07 / UC08, phiên bản cơ cấu 1); role Members không gán tay ở đây — nó được tự gán ở UC20 |
| FR-UC23-10 | *(A4)* Cho Club Leader cấu hình permission của role là ghế ban chủ nhiệm, nhưng không cho gán người giữ ghế đó ở đây — người giữ chỉ đến từ UC10 / UC11 / UC13 |
| FR-UC23-11 | *(E1)* Từ chối gán cho thành viên không ở trạng thái `Active` |
| FR-UC23-12 | *(E2)* Từ chối người giữ thứ hai với role chỉ cho phép một người, cho tới khi người giữ hiện tại bị thu hồi |
| FR-UC23-13 | *(E3)* Từ chối cấp một quyền giữ riêng của Club Leader cho bất kỳ role nào (BR55) |
| FR-UC23-14 | *(E4)* Từ chối ngừng dùng một role còn người giữ, hoặc đang là ghế ban chủ nhiệm đã xác nhận, cho tới khi thu hồi hết hoặc thay người qua UC10 / UC11 |
| FR-UC23-15 | *(E5)* Từ chối khi người gọi không phải Club Leader của CLB (BR47) |
| FR-UC23-16 | *(E6)* Từ chối thêm, bỏ hoặc đánh dấu lại một **role ban điều hành** trong nhiệm kỳ đang chạy; thay đổi đó phải đi qua kế hoạch chuyển giao UC12 / UC13 (BR55) |
| FR-UC23-17 | *(E7)* Từ chối sửa hoặc xoá role Chủ nhiệm, và từ chối xoá role Members (BR56) |

**Hậu điều kiện** — role và permission đã lưu; thành viên giữ role có đúng các quyền đó; mọi thay
đổi có bản ghi audit. **Đầu ra** — role CLB, permission của role, bản gán role, bản ghi audit, thông báo.
### UC24 — Sử dụng không gian thành viên của tôi

| | |
|---|---|
| **Module · Ưu tiên** | M04 (đọc M05, M06, M07, M12) · P1 |
| **Actor chính** | Club Member |
| **Mục tiêu nghiệp vụ** | Làm cho tư cách thành viên có ý nghĩa bên trong hệ thống |
| **Kích hoạt** | Thành viên mở một CLB mà mình thuộc về |
| **Tiền điều kiện** | Có tư cách thành viên `Active` hoặc `Inactive` ở CLB đó |
| **Thực thể / trạng thái** | Không — chỉ đọc |
| **Quy tắc** | BR49; giới hạn trong các CLB có tư cách thành viên `Active` hoặc `Inactive`; không tạo thực thể mới và không tạo dữ liệu mới |
| **Liên quan · Pain point** | UC20, UC22, UC29, UC31, UC48 · BP02 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC24-01 | Hiển thị bản ghi tư cách thành viên và chức vụ của người gọi trong CLB đang chọn |
| FR-UC24-02 | Hiển thị danh sách thành viên và ban chủ nhiệm của CLB |
| FR-UC24-03 | Hiển thị các sự kiện sắp tới của CLB kèm trạng thái đăng ký của người gọi |
| FR-UC24-04 | Hiển thị lịch sử điểm danh của người gọi tại CLB đó |
| FR-UC24-05 | Hiển thị các nghĩa vụ còn treo của người gọi — phản hồi chưa gửi, yêu cầu rời CLB đang chờ |
| FR-UC24-06 | Liên kết tới UC29, UC31, UC48 và UC22 **chỉ như điều hướng giao diện**; mỗi cái vẫn là use case độc lập của Student, không phải quan hệ «extend» của UC24 |
| FR-UC24-07 | *(A1)* Cho sinh viên chuyển giữa các CLB mà mình thuộc về |
| FR-UC24-08 | *(E1)* Hạ quyền truy cập về chế độ công khai của UC06 khi tư cách thành viên kết thúc (`Left` hoặc `Banned`); tư cách `Inactive` vẫn vào được, được đánh dấu và vẫn có liên kết tới UC22 |
| FR-UC24-09 | Không ghi dữ liệu nào và không cung cấp nhắn tin, chat hay chia sẻ file nội bộ (ngoài phạm vi) |

**Hậu điều kiện** — không có. **Đầu ra** — không ghi dữ liệu.

---

## 4.4 M05 — Sự kiện và hoạt động

### UC25 — Nộp đề xuất tổ chức sự kiện

| | |
|---|---|
| **Module · Ưu tiên** | M05 · P1 |
| **Actor chính** | Club Member có permission `club.event.manage` |
| **Mục tiêu nghiệp vụ** | Xin phép tổ chức sự kiện qua một workflow duy nhất, truy vết được; với sự kiện nội bộ thì ghi nhận nó vào hệ thống |
| **Kích hoạt** | CLB lên kế hoạch một hoạt động |
| **Tiền điều kiện** | CLB đang `Active` (BR10) và người gọi có quyền về sự kiện |
| **Dữ liệu vào** | Phạm vi (`Public` / `Internal`), mục tiêu, thời gian, địa điểm, đối tượng, sức chứa, kế hoạch, mức rủi ro, phần ngân sách (tuỳ chọn), nhu cầu cơ sở vật chất |
| **Thực thể / trạng thái** | `Event`: `Draft → Pending Approval`; `Revision Requested → Pending Approval` (bản sửa mới); `Draft → Approved` với sự kiện nội bộ ghi nhận thẳng (BR53) |
| **Quy tắc** | BR10, BR15, BR21, BR22, BR44, BR45, BR53, BR54 |
| **Liên quan · Pain point** | UC04, UC26, UC45 · BP05, BP06, BP09 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC25-01 | Thu thập toàn bộ đề xuất — mục tiêu, thời gian, địa điểm, đối tượng, sức chứa, kế hoạch, mức rủi ro và nhu cầu cơ sở vật chất |
| FR-UC25-02 | Validate tính đầy đủ và thời gian báo trước tối thiểu định nghĩa trong tài liệu chính sách |
| FR-UC25-03 | Đánh giá quy tắc xung đột **BR15** khi nộp và hiển thị `No Conflict`, `Warning` hoặc `Blocking Conflict`, đồng thời lưu kết quả phân tích xung đột cùng đề xuất |
| FR-UC25-04 | Cho phép đính kèm một yêu cầu đặt cơ sở vật chất (UC45) vào đề xuất |
| FR-UC25-05 | Chuyển `Pending Approval` khi nộp và tạo review task cho ICPDP |
| FR-UC25-06 | *(A1)* Cho lưu đề xuất ở `Draft` |
| FR-UC25-07 | *(A2)* Từ `Revision Requested`, cho CMB sửa và nộp lại; tạo **bản sửa mới**, đưa đề xuất về `Pending Approval`, và không bao giờ ghi đè bản sửa trước |
| FR-UC25-08 | *(A3)* Chấp nhận chuỗi hoạt động định kỳ như một đề xuất duy nhất liệt kê các lần diễn ra |
| FR-UC25-09 | *(E1)* Từ chối nộp khi có blocking conflict trong lúc chính sách cấm chồng lịch |
| FR-UC25-10 | *(E2)* Từ chối nộp, nêu rõ nghĩa vụ còn treo, khi một nghĩa vụ bắt buộc (báo cáo, quyết toán, hoàn trả) đã quá hạn và công tắc cưỡng chế BR21 đang bật |
| FR-UC25-11 | *(E3)* Từ chối nộp khi CLB đang `Suspended` (BR10) |
| FR-UC25-12 | *(E4)* Từ chối sự kiện không bắt đầu và kết thúc trong cùng một học kỳ (BR44) |
| FR-UC25-13 | *(E5)* Từ chối sự kiện kết thúc sau học kỳ `Dissolving` khi CLB đã có quyết định giải thể (BR45) |
| FR-UC25-14 | Bắt buộc chọn phạm vi sự kiện: `Public` (mở cho mọi sinh viên) hoặc `Internal` (chỉ thành viên CLB) |
| FR-UC25-15 | *(A4)* Với sự kiện `Internal` không có phần ngân sách: khi nộp thì **ghi nhận thẳng** sang `Approved`, không tạo review task, ghi audit hành động `RECORD_INTERNAL` và hiển thị sự kiện cho ICPDP ở UC02 (BR53). BR10, BR15, BR21, BR44, BR45 và thời gian báo trước tối thiểu vẫn áp dụng |
| FR-UC25-16 | *(A4)* Sự kiện `Internal` có phần ngân sách đi luồng chính (`Pending Approval` → UC26); yêu cầu booking đính kèm luôn do UC46 quyết định, kể cả khi sự kiện được ghi nhận thẳng (BR35) |
| FR-UC25-17 | *(E)* Từ chối khi người gọi thiếu permission `club.event.manage` trong CLB đó (BR54) |
| FR-UC25-18 | Cho đề xuất kèm **phần ngân sách** tuỳ chọn: các dòng ngân sách (hạng mục, số tiền, mục đích, khoản chi dự kiến) và tổng số tiền xin; validate tổng số. Đây là cách duy nhất để CLB xin kinh phí (BR22) |
| FR-UC25-19 | Đóng băng phần ngân sách trong bản sửa của đề xuất; một lần nộp lại ở A2 tạo bản sửa mới chứa cả ngân sách, không ghi đè bản trước |

**Hậu điều kiện** — đề xuất ở `Pending Approval` với một bản sửa bất biến và một review task; hoặc, với sự kiện nội bộ theo BR53, sự kiện ở `Approved` và ICPDP xem được.
**Đầu ra** — `Event`, `EventProposalVersion` (gồm phần ngân sách), `ApprovalTask`, có thể kèm yêu cầu `PropertyBooking`.

### UC26 — Thẩm định và quyết định đề xuất sự kiện

| | |
|---|---|
| **Module · Ưu tiên** | M05 · P1 |
| **Actor chính** | ICPDP Officer |
| **Mục tiêu nghiệp vụ** | Một phiên thẩm định kết thúc bằng một trong ba kết quả, kèm lập luận của nhà trường được lưu lại |
| **Kích hoạt** | Một review task từ UC25 |
| **Tiền điều kiện** | Đề xuất đang `Pending Approval` |
| **Dữ liệu vào** | Ghi chú thẩm định, nhận xét có cấu trúc, quyết định và lý do; số tiền duyệt theo từng dòng ngân sách |
| **Thực thể / trạng thái** | `Event`: `Pending Approval → Under Review → {Revision Requested, Approved, Rejected}`; tạo `EventBudget` ở `Approved` khi duyệt đề xuất có phần ngân sách |
| **Quy tắc** | BR05, BR14, BR16, BR22, BR31 |
| **Liên quan · Pain point** | UC05, UC25, UC27, UC35, UC46 · BP05, BP09, BP15 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC26-01 | Chuyển đề xuất sang `Under Review` khi officer mở nó |
| FR-UC26-02 | Hiển thị mức độ tuân thủ, địa điểm, thời gian, phần ngân sách, mức rủi ro, các nghĩa vụ quá hạn của CLB, kết quả xung đột và yêu cầu booking đính kèm |
| FR-UC26-03 | Ghi lại ghi chú thẩm định, gồm mọi ý kiến của Cơ sở vật chất, An ninh hay Tài chính lấy từ ngoài hệ thống |
| FR-UC26-04 | Cung cấp đúng ba kết quả: **yêu cầu chỉnh sửa** (bắt buộc nhận xét có cấu trúc) → `Revision Requested`; **phê duyệt** → `Approved`; **từ chối** (bắt buộc lý do) → `Rejected` |
| FR-UC26-05 | Ghi audit quyết định kèm actor, thời điểm và lý do (BR05) và thông báo cho CLB |
| FR-UC26-06 | Không bao giờ coi việc duyệt một đề xuất có kèm yêu cầu booking là đã duyệt booking đó — UC46 quyết định riêng |
| FR-UC26-07 | *(A1)* Định tuyến sự kiện rủi ro cao hoặc quy mô lớn lên cấp ICPDP thứ hai theo rule của UC05 (BR16) |
| FR-UC26-08 | *(A2)* Hỗ trợ phê duyệt kèm điều kiện, và các điều kiện này được kiểm tra lại ở UC34 |
| FR-UC26-09 | *(E1)* Chấp nhận việc đề xuất bị `Cancelled` bởi UC15 khi CLB bị tạm ngừng hoặc giải thể giữa lúc nộp và quyết định |
| FR-UC26-10 | *(E2)* Để scheduler chuyển `Expired` khi hết deadline chỉnh sửa; CLB phải nộp đề xuất mới |
| FR-UC26-11 | Chỉ cho phép công bố ở UC27 với sự kiện đã `Approved` (BR14) |
| FR-UC26-12 | Không nhận review task cho sự kiện nội bộ được ghi nhận thẳng theo BR53; ICPDP xem các sự kiện đó ở UC02 và xử lý sai phạm qua UC40 |
| FR-UC26-13 | Với đề xuất có phần ngân sách, hiển thị cho officer điều kiện, hạn mức còn lại của kỳ và khả năng trùng lặp với các ngân sách khác của CLB; yêu cầu chỉnh sửa có thể nhắm riêng vào phần ngân sách |
| FR-UC26-14 | Khi phê duyệt đề xuất có phần ngân sách, bắt buộc officer chốt **số tiền duyệt** theo từng dòng — có thể thấp hơn số xin ở nơi chính sách cho phép, mỗi dòng giảm kèm lý do — lưu tách biệt với số xin, và tạo `EventBudget` ở `Approved` |
| FR-UC26-15 | *(A3)* Định tuyến đề xuất có tổng ngân sách vượt ngưỡng lên cấp ICPDP thứ hai theo rule của UC05 (BR16) |
| FR-UC26-16 | *(E3)* Cho officer yêu cầu chỉnh sửa hoặc từ chối kèm lý do được ghi lại khi hạn mức ngân sách của kỳ đã cạn |

**Hậu điều kiện** — đề xuất ở `Revision Requested`, `Approved` hoặc `Rejected`.
**Đầu ra** — `ApprovalDecision`, `EventBudget` (khi có phần ngân sách), bản ghi audit, thông báo.

### UC27 — Công bố sự kiện và mở đăng ký

| | |
|---|---|
| **Module · Ưu tiên** | M05 · P1 |
| **Actor chính** | Club Member có permission `club.event.manage` |
| **Mục tiêu nghiệp vụ** | Cho khán giả thấy sự kiện và tham gia được |
| **Kích hoạt** | Sự kiện đã được phê duyệt |
| **Tiền điều kiện** | Sự kiện đang `Approved` (BR14) |
| **Dữ liệu vào** | Khung thời gian đăng ký, mô tả công khai, phạm vi đối tượng, sức chứa |
| **Thực thể / trạng thái** | `Event`: `Approved → Upcoming` |
| **Quy tắc** | BR14, BR17, BR50, BR53, BR54 |
| **Liên quan · Pain point** | UC06, UC24, UC26, UC29 · BP05 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC27-01 | Cho CMB đặt khung thời gian đăng ký, phạm vi đối tượng, sức chứa và thông tin công khai của một sự kiện đã duyệt |
| FR-UC27-02 | Chuyển `Upcoming` khi công bố và hiển thị sự kiện trong UC06 và UC24 |
| FR-UC27-03 | Suy ra "đang mở đăng ký" và "đã đóng đăng ký" từ khung thời gian đăng ký, chứ không từ một trạng thái riêng của sự kiện |
| FR-UC27-04 | *(A1)* Với sự kiện `Internal` (phạm vi chọn ở UC25), giới hạn đối tượng về thành viên CLB và chỉ hiển thị trong UC24, không hiển thị ở UC06 |
| FR-UC27-05 | *(A2)* Cho phép công bố sự kiện mở tự do, không cần khung thời gian đăng ký, nhưng vẫn áp dụng check-in |
| FR-UC27-06 | *(E1)* Từ chối công bố sự kiện chưa `Approved` (BR14) |
| FR-UC27-07 | *(E2)* Từ chối khung thời gian đăng ký kết thúc sau khi sự kiện đã bắt đầu |
| FR-UC27-08 | Để scheduler lo việc chuyển `Upcoming → Ongoing → Completed` theo mốc giờ của chính sự kiện |
| FR-UC27-09 | *(E)* Từ chối khi người gọi thiếu permission `club.event.manage` trong CLB đó (BR54) |

**Hậu điều kiện** — sự kiện ở `Upcoming` và hiển thị công khai. **Đầu ra** — `Event` đã công bố, thông báo.

### UC28 — Huỷ hoặc đổi lịch sự kiện

| | |
|---|---|
| **Module · Ưu tiên** | M05 · P1 |
| **Actor chính** | Club Member có permission `club.event.manage` |
| **Mục tiêu nghiệp vụ** | Thay đổi một sự kiện đã duyệt mà không mất vết và không để rò rỉ phòng đã đặt |
| **Kích hoạt** | CLB không thể tổ chức sự kiện như đã duyệt |
| **Tiền điều kiện** | Sự kiện đang `Approved`, `Upcoming` hoặc `Ongoing` |
| **Dữ liệu vào** | Lý do; với đổi lịch là thời gian và địa điểm mới |
| **Thực thể / trạng thái** | `Event`: `… → Cancelled`, hoặc được đổi lịch và có thể quay lại UC26 |
| **Quy tắc** | BR15 (đánh giá lại), BR35, BR54; quyết định còn mở D4 |
| **Liên quan** | UC15, UC27, UC40, UC47 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC28-01 | Cho CMB chọn `Huỷ` hoặc `Đổi lịch` và bắt buộc nhập lý do |
| FR-UC28-02 | Đánh giá lại BR15 khi đổi lịch và, ở nơi chính sách yêu cầu, đưa sự kiện quay lại UC26 để có quyết định mới (D4); sự kiện nội bộ theo BR53 chỉ được ghi nhận lại, không quay lại UC26 |
| FR-UC28-03 | Cập nhật hoặc giải phóng booking cơ sở vật chất liên quan qua UC47 (BR35) |
| FR-UC28-04 | Thông báo cho mọi người đã đăng ký về việc huỷ hoặc thời gian mới |
| FR-UC28-05 | Tính lại các nghĩa vụ báo cáo và ngân sách của sự kiện: khi huỷ, `EventBudget` chưa tạm ứng chuyển `Cancelled`; đã tạm ứng thì CLB phải quyết toán ở UC36 và phần chưa chi bị thu hồi ở UC37 (BR57, BR58) |
| FR-UC28-06 | *(A1)* Huỷ sự kiện **không cần thao tác của CMB** khi UC15 (tạm ngừng, giải thể) hoặc UC40 (kết quả hồ sơ vi phạm) yêu cầu, ghi quyết định đó làm lý do, liên kết tới nó, và vẫn thực hiện FR-UC28-03…05; E2 không áp dụng cho cascade này và ICPDP **không** phải actor của use case này |
| FR-UC28-07 | *(E1)* Từ chối huỷ một sự kiện đã chốt điểm danh; sự kiện đó phải đóng qua UC33 và UC34 |
| FR-UC28-08 | *(E2)* Ghi nhận việc huỷ trong thời hạn báo trước định nghĩa trong tài liệu chính sách như một tín hiệu tuân thủ cho UC40 |
| FR-UC28-09 | Ghi audit lý do và trạng thái kết quả |
| FR-UC28-10 | *(E)* Từ chối khi người gọi thiếu permission `club.event.manage` trong CLB đó (BR54) |

**Hậu điều kiện** — sự kiện `Cancelled`, hoặc đã đổi lịch với booking và danh sách đăng ký được cập nhật.
**Đầu ra** — trạng thái sự kiện, booking được giải phóng, thông báo, bản ghi audit.

---

## 4.5 M06 — Đăng ký và điểm danh

### UC29 — Đăng ký tham gia sự kiện

| | |
|---|---|
| **Module · Ưu tiên** | M06 · P1 |
| **Actor chính** | Student |
| **Mục tiêu nghiệp vụ** | Ghi nhận người tham gia ngay trên hồ sơ sự kiện, không phải trên một form riêng |
| **Kích hoạt** | Sinh viên tìm thấy một sự kiện đã công bố ở UC06 hoặc UC24 |
| **Tiền điều kiện** | Sự kiện đang `Upcoming` và trong khung thời gian đăng ký |
| **Dữ liệu vào** | Sự kiện, và các câu trả lời mà form đăng ký của sự kiện yêu cầu |
| **Thực thể / trạng thái** | `EventRegistration`: `Confirmed` hoặc `Waitlisted`; `→ Cancelled` khi sinh viên tự huỷ |
| **Quy tắc** | BR17, BR48, BR50 |
| **Liên quan · Pain point** | UC27, UC30, UC31 · BP07 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC29-01 | Validate khung thời gian đăng ký, phạm vi đối tượng, trùng lặp và sức chứa còn lại trước khi tạo đăng ký |
| FR-UC29-02 | Tạo đăng ký ở `Confirmed` khi sức chứa còn, và xác nhận cho sinh viên trong UC02 và UC24 |
| FR-UC29-03 | Không bao giờ để số đăng ký `Confirmed` vượt sức chứa trừ khi chính sách cho phép overbooking (BR17), thực thi bằng một thao tác ghi nguyên tử có điều kiện chứ không phải đọc-kiểm-ghi |
| FR-UC29-04 | *(A1)* Tạo đăng ký ở `Waitlisted` khi sự kiện đã đầy và danh sách chờ được bật; việc đẩy lên từ danh sách chờ do UC30 xử lý |
| FR-UC29-05 | *(A2)* Cho sinh viên huỷ đăng ký trước khi sự kiện bắt đầu, giải phóng suất |
| FR-UC29-06 | *(E1)* Từ chối đăng ký sau khi khung thời gian đã đóng |
| FR-UC29-07 | *(E2)* Đóng đăng ký và báo cho sinh viên khi đã đạt sức chứa và không có danh sách chờ |
| FR-UC29-08 | *(E3)* Từ chối đăng ký của sinh viên nằm ngoài phạm vi đối tượng của sự kiện |
| FR-UC29-09 | Bảo đảm mỗi sinh viên chỉ có một đăng ký cho một sự kiện bằng unique index |

**Hậu điều kiện** — tồn tại một đăng ký ở `Confirmed` hoặc `Waitlisted`. **Đầu ra** — `EventRegistration`, thông báo.

### UC30 — Quản lý sức chứa và danh sách chờ

| | |
|---|---|
| **Module · Ưu tiên** | M06 · P1 |
| **Actor chính** | Club Member có permission `club.attendance.manage` |
| **Mục tiêu nghiệp vụ** | Lấp đầy chỗ khi danh sách đăng ký biến động |
| **Kích hoạt** | Có suất trống, hoặc CLB thay đổi sức chứa |
| **Tiền điều kiện** | Sự kiện đang `Upcoming`, trong khung thời gian đăng ký, và có danh sách chờ |
| **Thực thể / trạng thái** | `EventRegistration`: `Waitlisted → Confirmed` |
| **Quy tắc** | BR05, BR17, BR54; việc đẩy lên theo quy tắc định nghĩa trong tài liệu chính sách, không bao giờ theo ưu ái thủ công không ghi vết |
| **Liên quan** | UC29 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC30-01 | Hiển thị danh sách đăng ký của sự kiện kèm số đã xác nhận, sức chứa và thứ tự danh sách chờ |
| FR-UC30-02 | Cho CMB điều chỉnh sức chứa hoặc đẩy một sinh viên từ danh sách chờ lên |
| FR-UC30-03 | Áp dụng chính sách đẩy lên đã cấu hình và thông báo cho mọi người bị ảnh hưởng |
| FR-UC30-04 | *(A1)* Tự động đẩy sinh viên đầu danh sách chờ lên khi một đăng ký đã xác nhận bị huỷ |
| FR-UC30-05 | *(E1)* Từ chối giảm sức chứa xuống dưới số đã xác nhận và nêu rõ những đăng ký sẽ phải bị huỷ |
| FR-UC30-06 | Giữ nguyên thứ tự danh sách chờ qua mọi thao tác |
| FR-UC30-07 | *(E)* Từ chối khi người gọi thiếu permission `club.attendance.manage` trong CLB đó (BR54) |

**Hậu điều kiện** — danh sách xác nhận khớp sức chứa. **Đầu ra** — trạng thái đăng ký, thông báo.

### UC31 — Check-in vào sự kiện

| | |
|---|---|
| **Module · Ưu tiên** | M06 · P1 |
| **Actor chính** | Student · **Hỗ trợ:** Club Member có `club.attendance.manage` (check-in thủ công) |
| **Mục tiêu nghiệp vụ** | Chứng minh việc có mặt ngay tại nơi sự kiện diễn ra |
| **Kích hoạt** | Người tham dự đến địa điểm |
| **Tiền điều kiện** | Sự kiện đang `Ongoing` hoặc trong khung giờ check-in định nghĩa trong tài liệu chính sách; sinh viên có đăng ký đã xác nhận, hoặc sự kiện là loại mở tự do |
| **Dữ liệu vào** | Mã check-in hoặc QR của sự kiện; hoặc định danh người tham dự khi check-in thủ công |
| **Thực thể / trạng thái** | Tạo `Attendance`; mở feedback window của người đó |
| **Quy tắc** | BR18, BR36 |
| **Liên quan · Pain point** | UC29, UC32, UC48 · BP07 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC31-01 | Kiểm tra đăng ký và khung giờ check-in khi một mã hoặc QR được nhập |
| FR-UC31-02 | Tạo đúng một bản ghi `Attendance` có dấu thời gian cho mỗi người tham dự và mỗi sự kiện (BR18) |
| FR-UC31-03 | Mở feedback window cho người tham dự đó **ngay tại thời điểm check-in** (BR36) |
| FR-UC31-04 | *(A1)* Cho một thành viên CMB có quyền check-in hộ bằng tra cứu, và **lưu lại ai đã thực hiện** |
| FR-UC31-05 | *(A2)* Cho phép check-in tại chỗ (walk-in) ở sự kiện cho phép, đồng thời tạo bản ghi đăng ký kèm theo |
| FR-UC31-06 | *(E1)* Không tạo bản ghi thứ hai khi check-in trùng, và giữ nguyên bản ghi đầu tiên (BR18) |
| FR-UC31-07 | *(E2)* Từ chối check-in ngoài khung giờ, khi đó chỉ còn đường check-in thủ công kèm lý do |
| FR-UC31-08 | *(E3)* Từ chối check-in khi không có đăng ký ở sự kiện chỉ dành cho người đã đăng ký |

**Hậu điều kiện** — tồn tại đúng một bản ghi điểm danh cho người đó và sự kiện đó.
**Đầu ra** — `Attendance`, feedback window đã mở.

### UC32 — Chốt điểm danh sự kiện

| | |
|---|---|
| **Module · Ưu tiên** | M06 · P1 |
| **Actor chính** | Club Member có permission `club.attendance.manage` |
| **Mục tiêu nghiệp vụ** | Tạo ra bộ dữ liệu điểm danh chính thức mà báo cáo và đánh giá dựa vào |
| **Kích hoạt** | Sự kiện đã kết thúc |
| **Tiền điều kiện** | Sự kiện đang `Completed`; điểm danh chưa được chốt |
| **Dữ liệu vào** | Các hiệu chỉnh cho bản ghi bất thường, kèm lý do |
| **Thực thể / trạng thái** | Bộ dữ liệu `Attendance` bị khoá; `Event`: `Completed → Closed` với sự kiện nội bộ theo BR53 |
| **Quy tắc** | BR18, BR19, BR53, BR54 |
| **Liên quan · Pain point** | UC31, UC33, UC42 · BP07 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC32-01 | Đánh dấu các bản ghi bất thường — vắng mặt, walk-in, check-in thủ công và check-in ngoài khung giờ |
| FR-UC32-02 | Cho CMB sửa hoặc xác nhận từng bản ghi bị đánh dấu, kèm lý do |
| FR-UC32-03 | Khoá bộ dữ liệu khi chốt và từ chối mọi thay đổi sau đó |
| FR-UC32-04 | *(A1)* Cho người giữ vai trò đặc biệt được cấp ở UC03 mở khoá bộ dữ liệu kèm lý do, và ghi audit lần mở khoá (BR19) |
| FR-UC32-05 | *(E1)* Từ chối chốt khi còn bản ghi bị đánh dấu chưa được sửa hoặc xác nhận kèm lý do |
| FR-UC32-06 | Không điều khiển feedback window tại đây — BR36 đã mở nó từ lúc check-in |
| FR-UC32-07 | Đưa bộ dữ liệu đã chốt thành đầu vào của UC33 và UC42 |
| FR-UC32-08 | *(A2)* Với sự kiện nội bộ được ghi nhận thẳng theo BR53, chuyển sự kiện `Completed → Closed` ngay khi chốt; bộ điểm danh đã chốt là bản ghi hoạt động mà ICPDP xem ở UC02 |
| FR-UC32-09 | *(E)* Từ chối khi người gọi thiếu permission `club.attendance.manage` trong CLB đó (BR54) |

**Hậu điều kiện** — bộ dữ liệu điểm danh chính thức đã bị khoá. **Đầu ra** — bộ `Attendance` chính thức, bản ghi audit.

---

## 4.6 M08 — Trách nhiệm giải trình sau sự kiện

### UC33 — Nộp báo cáo sau sự kiện

| | |
|---|---|
| **Module · Ưu tiên** | M08 · P1 |
| **Actor chính** | Club Member có permission `club.report.submit` |
| **Mục tiêu nghiệp vụ** | Khép vòng trách nhiệm giải trình của một sự kiện đã được duyệt |
| **Kích hoạt** | Sự kiện `Completed`, hoặc deadline báo cáo đến gần |
| **Tiền điều kiện** | Điểm danh đã được chốt (UC32) |
| **Dữ liệu vào** | Kết quả thực tế so với mục tiêu, minh chứng, sự cố, bài học rút ra |
| **Thực thể / trạng thái** | `Event`: `Completed → Report Submitted`; tạo `PostEventReport` |
| **Quy tắc** | BR20, BR21, BR54 |
| **Liên quan · Pain point** | UC32, UC34, UC36, UC49 · BP08 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC33-01 | Nạp sẵn đề xuất đã duyệt, bảng điểm danh đã chốt, ngân sách và các khoản chi, và bản tổng hợp phản hồi nếu UC49 đã có dữ liệu |
| FR-UC33-02 | Thu thập kết quả thực tế, sự cố và bài học rút ra ở dạng nhập tay |
| FR-UC33-03 | Cho CMB đính kèm minh chứng vào báo cáo |
| FR-UC33-04 | Chuyển sự kiện sang `Report Submitted` khi nộp, đóng băng các số liệu đã nạp sẵn, và tạo task cho ICPDP |
| FR-UC33-05 | *(A1)* Cho lưu báo cáo ở `Draft` và hoàn thiện trước deadline |
| FR-UC33-06 | *(A2)* Cho sửa và nộp lại như một version mới với báo cáo bị UC34 trả về |
| FR-UC33-07 | *(E1)* Từ chối nộp khi điểm danh chưa được chốt |
| FR-UC33-08 | *(E2)* Vẫn nhận báo cáo nộp sau deadline nhưng đánh dấu trễ, dữ liệu này đi vào BR21 và kỳ đánh giá |
| FR-UC33-09 | Lấy deadline từ chính sách cấu hình ở UC04 (BR20) |
| FR-UC33-10 | Không sinh nghĩa vụ báo cáo cho sự kiện nội bộ được ghi nhận thẳng theo BR53 — sự kiện đó đóng ở UC32 |
| FR-UC33-11 | *(E)* Từ chối khi người gọi thiếu permission `club.report.submit` trong CLB đó (BR54) |

**Hậu điều kiện** — báo cáo ở `Report Submitted` với các số liệu nạp sẵn đã đóng băng.
**Đầu ra** — `PostEventReport`, `ApprovalTask`.

### UC34 — Thẩm định và đóng báo cáo sự kiện

| | |
|---|---|
| **Module · Ưu tiên** | M08 · P1 |
| **Actor chính** | ICPDP Officer |
| **Mục tiêu nghiệp vụ** | Xác định sự kiện đã duyệt có thực sự diễn ra đúng như đã duyệt hay không, và kết thúc vòng đời của nó |
| **Kích hoạt** | Một task báo cáo từ UC33, hoặc deadline báo cáo đã qua mà không có báo cáo nào được nộp (A1) |
| **Tiền điều kiện** | Sự kiện đang `Report Submitted`, hoặc deadline báo cáo đã qua mà không có báo cáo nào được nộp (A1) |
| **Dữ liệu vào** | Ghi chú thẩm định, quyết định, yêu cầu sửa hoặc phát hiện vi phạm |
| **Thực thể / trạng thái** | `Event`: `Report Submitted → Closed`, hoặc `Report Submitted → Completed` khi trả về |
| **Quy tắc** | BR05, BR21 |
| **Liên quan · Pain point** | UC33, UC40, UC42 · BP08, BP15 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC34-01 | Hiển thị kế hoạch đối chiếu thực tế — điểm danh, ngân sách, mục tiêu và các điều kiện đã gắn ở UC26 A2 |
| FR-UC34-02 | Cung cấp đúng ba kết quả: **chấp nhận** → sự kiện `Closed`; **trả về để sửa** → sự kiện quay về `Completed` và báo cáo quay về UC33 A2; **ghi nhận một phát hiện** → báo cáo được chấp nhận kèm phát hiện, và một hồ sơ được mở ở UC40 |
| FR-UC34-03 | Ghi audit quyết định và thông báo cho CLB |
| FR-UC34-04 | *(A1)* Cho officer ghi nhận việc hoàn toàn không nộp báo cáo, dữ liệu này đi vào BR21 và kỳ đánh giá |
| FR-UC34-05 | *(E1)* Buộc officer trả về thay vì chấp nhận khi số liệu trong báo cáo mâu thuẫn với bảng điểm danh đã chốt |
| FR-UC34-06 | Đưa sự kiện đã đóng và mọi phát hiện thành đầu vào của UC42 |

**Hậu điều kiện** — sự kiện `Closed`, hoặc báo cáo đã quay về CLB.
**Đầu ra** — quyết định về báo cáo, sự kiện `Closed`, bản ghi audit, phát hiện.

---

## 4.7 M07 — Tài chính và ngân sách

### UC35 — Ghi nhận giải ngân

| | |
|---|---|
| **Module · Ưu tiên** | M07 · P3 |
| **Actor chính** | ICPDP Officer |
| **Mục tiêu nghiệp vụ** | Theo dõi mọi dòng tiền của một ngân sách đã duyệt: tạm ứng trước sự kiện, cấp bù sau đối soát, tiền CLB hoàn trả khi bị thu hồi |
| **Kích hoạt** | Kinh phí được chuyển cho CLB, hoặc CLB hoàn tiền cho nhà trường |
| **Tiền điều kiện** | `EventBudget` đang `Approved` / `Disbursed` (tạm ứng), `Reconciled` (cấp bù), hoặc `Recovery Pending` (hoàn trả) |
| **Dữ liệu vào** | Loại dòng tiền (`Advance`, `TopUp`, `Refund`), số tiền, ngày, mã tham chiếu thanh toán |
| **Thực thể / trạng thái** | `EventBudget`: `Approved → Disbursed`, `Reconciled → Closed`, `Recovery Pending → Closed`; các bản ghi `BudgetDisbursement` |
| **Quy tắc** | BR23, BR26, BR58 |
| **Liên quan · Pain point** | UC26, UC36, UC37 · BP10 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC35-01 | Cho officer ghi một lần **tạm ứng** (số tiền, ngày, mã tham chiếu) vào ngân sách đã duyệt của một sự kiện — một phần hoặc toàn bộ số duyệt |
| FR-UC35-02 | Đối chiếu tổng tạm ứng và cấp bù luỹ kế với số tiền đã duyệt (BR23) và chuyển `Disbursed` ở lần tạm ứng đầu tiên |
| FR-UC35-03 | Thông báo cho CLB mỗi dòng tiền; với tạm ứng, kèm hạn quyết toán (BR57) |
| FR-UC35-04 | *(A1)* Cộng dồn nhiều lần tạm ứng vào một lần duyệt, mỗi lần ghi riêng, trạng thái giữ nguyên `Disbursed` |
| FR-UC35-05 | *(E1)* Từ chối dòng tiền làm tổng tạm ứng và cấp bù vượt số tiền đã duyệt khi chưa có văn bản điều chỉnh (BR23) |
| FR-UC35-06 | Chỉ theo dõi — không hạch toán kế toán, không sổ cái, không thực hiện thanh toán |
| FR-UC35-07 | *(A2)* Với ngân sách `Reconciled` có chênh lệch tất toán dương, cho ghi một khoản **cấp bù** đúng bằng chênh lệch đó rồi chuyển `Closed` (BR26) |
| FR-UC35-08 | *(A3)* Với ngân sách `Recovery Pending`, cho ghi các khoản **CLB hoàn trả**; chuyển `Closed` khi tổng hoàn đạt số phải hoàn (BR26, BR58), nếu chưa thì hiển thị phần còn phải hoàn |
| FR-UC35-09 | *(E2)* Từ chối khoản cấp bù khác chênh lệch tất toán, hoặc khoản hoàn vượt phần còn phải hoàn |

**Hậu điều kiện** — tổng đã tạm ứng là xác định và là đầu vào của UC36, UC37; với A2 / A3, ngân sách ở `Closed`. **Đầu ra** — `BudgetDisbursement`.

### UC36 — Ghi nhận khoản chi và nộp quyết toán

| | |
|---|---|
| **Module · Ưu tiên** | M07 · P3 |
| **Actor chính** | Club Member có permission `club.expense.record` |
| **Mục tiêu nghiệp vụ** | Chứng minh chi tiêu thực tế của khoản đã tạm ứng và nộp quyết toán đầy đủ sau sự kiện |
| **Kích hoạt** | CLB chi tiền; sự kiện kết thúc hoặc bị huỷ, hoặc hạn quyết toán đến gần |
| **Tiền điều kiện** | `EventBudget` đang `Disbursed` hoặc `Reconciliation Pending`; người gọi có permission `club.expense.record` |
| **Dữ liệu vào** | Hạng mục, số tiền, ngày, mô tả; hoá đơn, biên lai hoặc chứng từ thanh toán |
| **Thực thể / trạng thái** | `Expense` (+ `FinancialEvidence`); `EventBudget`: `Disbursed / Reconciliation Pending → Settlement Submitted` |
| **Quy tắc** | BR21, BR24, BR25, BR54, BR57 |
| **Liên quan · Pain point** | UC33, UC35, UC37 · BP09, BP10 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC36-01 | Ghi một khoản chi vào `EventBudget` của sự kiện, kèm hạng mục, số tiền, ngày và mô tả |
| FR-UC36-02 | Cho CMB đính kèm chứng từ mà hạng mục đó yêu cầu (BR25), mỗi chứng từ tham chiếu đúng một khoản chi |
| FR-UC36-03 | Validate hạng mục so với phần đã duyệt và gắn cờ **ngoại lệ** cho khoản chi ngoài hạng mục (BR24) |
| FR-UC36-04 | Lưu người tải lên và thời điểm của mọi chứng từ |
| FR-UC36-05 | *(A1)* Chấp nhận khoản chi chưa có chứng từ và hiển thị nó là **chưa có chứng từ** cho tới khi chứng từ được bổ sung |
| FR-UC36-06 | *(A2)* Cho sửa một khoản chi trước khi nộp quyết toán, và ghi audit thay đổi |
| FR-UC36-07 | *(E1)* Ghi nhận và gắn cờ ngoại lệ cho khoản chi vượt phần đã duyệt còn lại |
| FR-UC36-08 | Làm cho việc tồn tại một chứng từ không tham chiếu khoản chi nào là bất khả thi về mặt cấu trúc |
| FR-UC36-09 | *(E)* Từ chối khi người gọi thiếu permission `club.expense.record` trong CLB đó (BR54) |
| FR-UC36-10 | Khi sự kiện đã `Completed` hoặc `Cancelled`, cho **nộp quyết toán**: hiển thị đã tạm ứng, tổng chi, số dư chưa chi, khoản thiếu chứng từ và khoản bị gắn cờ; cảnh báo rằng khoản thiếu chứng từ sẽ bị loại khi đối soát; khi xác nhận thì chuyển `Settlement Submitted`, khoá bộ khoản chi và tạo task cho ICPDP |
| FR-UC36-11 | *(A3)* Từ `Reconciliation Pending`, cho bổ sung và nộp lại quyết toán → `Settlement Submitted` |
| FR-UC36-12 | *(E4)* Từ chối nộp quyết toán khi sự kiện chưa kết thúc và chưa bị huỷ |
| FR-UC36-13 | *(E5)* Nhận quyết toán nộp sau hạn (BR57) nhưng đánh dấu trễ và đưa vào BR21; từ chối nếu UC37 A2 đã chốt đối soát |

**Hậu điều kiện** — ngân sách ở `Settlement Submitted` với bộ khoản chi đã khoá, là đầu vào của UC37.
**Đầu ra** — `Expense`, `FinancialEvidence`, quyết toán đã nộp, `ApprovalTask`.

### UC37 — Đối soát ngân sách và chi tiêu

| | |
|---|---|
| **Module · Ưu tiên** | M07 · P3 |
| **Actor chính** | ICPDP Officer |
| **Mục tiêu nghiệp vụ** | Xác lập rằng số đã duyệt, đã tạm ứng, đã chi và đã có chứng từ cùng kể một câu chuyện, và chốt ai còn nợ ai bao nhiêu |
| **Kích hoạt** | Task quyết toán từ UC36, hoặc hạn quyết toán đã qua mà CLB chưa nộp (A2) |
| **Tiền điều kiện** | `EventBudget` đang `Settlement Submitted`, hoặc `Disbursed` / `Reconciliation Pending` với hạn quyết toán đã qua (A2) |
| **Thực thể / trạng thái** | `EventBudget`: `Settlement Submitted → {Reconciliation Pending, Reconciled, Recovery Pending}`; `Reconciled → Closed` khi chênh lệch bằng 0 |
| **Quy tắc** | BR21, BR23, BR24, BR26, BR57, BR58 |
| **Liên quan · Pain point** | UC35, UC36, UC40, UC42 · BP10 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC37-01 | Tính và hiển thị tách bạch: **đã duyệt**, **đã tạm ứng**, **khoản chi đã ghi nhận**, **khoản chi có chứng từ**, **khoản chi thiếu chứng từ**, **số dư chưa chi** |
| FR-UC37-02 | Liệt kê các ngoại lệ do UC36 gắn cờ, và cho officer **chấp nhận** hoặc **loại** từng khoản chi kèm lý do; khoản thiếu chứng từ luôn bị loại |
| FR-UC37-03 | Chốt **chi hợp lệ** (tổng khoản được chấp nhận, trần là số duyệt) và **chênh lệch tất toán** = chi hợp lệ − đã tạm ứng |
| FR-UC37-04 | Theo chênh lệch tất toán: bằng 0 → `Reconciled` rồi `Closed`; dương → `Reconciled`, chờ cấp bù ở UC35 A2; âm → `Recovery Pending` với **số phải hoàn** và hạn hoàn trả (BR58). Không bao giờ đóng ngân sách khi chênh lệch chưa xử lý (BR26) |
| FR-UC37-05 | Ghi audit kết quả, thông báo cho CLB và hiển thị nó cho CLB qua UC02 |
| FR-UC37-06 | *(A1)* Cho officer yêu cầu bổ sung chứng từ, để hồ sơ ở `Reconciliation Pending` cho tới khi CLB nộp lại ở UC36 |
| FR-UC37-07 | *(E1)* Từ chối đối soát khi số đã tạm ứng vượt số đã duyệt mà chưa có văn bản điều chỉnh (BR23) |
| FR-UC37-08 | Giữ ICPDP là actor chính duy nhất; CMB đọc cùng bộ số liệu qua UC02 |
| FR-UC37-09 | Đưa kết quả đối soát thành đầu vào của UC42 |
| FR-UC37-10 | *(A2)* Khi hạn quyết toán đã qua mà chưa có quyết toán, cho officer chốt đối soát trên các khoản chi đã có chứng từ; phần còn lại của số đã tạm ứng thành số phải hoàn → `Recovery Pending` (BR57, BR58) |
| FR-UC37-11 | *(E2)* Khi quá hạn hoàn trả mà chưa hoàn đủ, đánh dấu khoản phải hoàn là nghĩa vụ quá hạn (BR21) và cho officer mở hồ sơ vi phạm ở UC40 từ chính ngân sách đó (BR58) |

**Hậu điều kiện** — ngân sách ở `Reconciled` (chờ cấp bù), `Recovery Pending` (chờ hoàn trả) hoặc `Closed`.
**Đầu ra** — kết quả đối soát (chi hợp lệ, chênh lệch tất toán, số phải hoàn), bản ghi audit, thông báo.

---

## 4.8 M08 — Báo cáo và tuân thủ

### UC38 — Nộp báo cáo hoạt động định kỳ

| | |
|---|---|
| **Module · Ưu tiên** | M08 · P4 |
| **Actor chính** | Club Member có permission `club.report.submit` |
| **Mục tiêu nghiệp vụ** | Hoàn thành nghĩa vụ báo cáo từ chính dữ liệu hệ thống đã có |
| **Kích hoạt** | Kỳ báo cáo kết thúc, hoặc deadline đến gần |
| **Tiền điều kiện** | CLB đang `Active`, hoặc `Suspended` nhưng còn nghĩa vụ; kỳ báo cáo được định nghĩa ở UC04 |
| **Dữ liệu vào** | Phần thuyết minh, kế hoạch kỳ sau, minh chứng mà hệ thống không có sẵn |
| **Thực thể / trạng thái** | `PeriodicReport`: `Draft → Submitted` |
| **Quy tắc** | BR20, BR54 |
| **Liên quan · Pain point** | UC04, UC39 · BP14 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC38-01 | Mở báo cáo cho kỳ tương ứng — học kỳ, năm học hoặc một kỳ khác định nghĩa trong tài liệu chính sách |
| FR-UC38-02 | Nạp sẵn các sự kiện, số liệu thành viên, điểm danh và tình hình tài chính của kỳ đó |
| FR-UC38-03 | Thu thập phần thuyết minh, kế hoạch kỳ sau và mọi minh chứng bên ngoài |
| FR-UC38-04 | Chuyển `Submitted` khi nộp, đóng băng số liệu nạp sẵn và tạo task cho ICPDP |
| FR-UC38-05 | *(A1)* Cho lưu báo cáo ở `Draft` và hoàn thiện trước deadline |
| FR-UC38-06 | *(A2)* Cho nộp lại như một version mới với báo cáo bị UC39 trả về |
| FR-UC38-07 | *(E1)* Vẫn nhận báo cáo trễ nhưng đánh dấu trễ, dữ liệu này đi vào BR21 và kỳ đánh giá |
| FR-UC38-08 | Lấy deadline và các mốc nhắc từ UC04 và §8.2 |
| FR-UC38-09 | *(E)* Từ chối khi người gọi thiếu permission `club.report.submit` trong CLB đó (BR54) |

**Hậu điều kiện** — báo cáo ở `Submitted` với số liệu nạp sẵn đã đóng băng.
**Đầu ra** — `PeriodicReport`, `ApprovalTask`.

### UC39 — Thẩm định báo cáo hoạt động định kỳ

| | |
|---|---|
| **Module · Ưu tiên** | M08 · P4 |
| **Actor chính** | ICPDP Officer |
| **Mục tiêu nghiệp vụ** | Xác nhận báo cáo để nó dùng được làm đầu vào đánh giá |
| **Kích hoạt** | Một task từ UC38 |
| **Tiền điều kiện** | Báo cáo đang `Submitted` |
| **Quy tắc** | BR05, BR21 |
| **Liên quan · Pain point** | UC38, UC42 · BP14 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC39-01 | Hiển thị báo cáo cạnh số liệu của chính hệ thống trong cùng kỳ |
| FR-UC39-02 | Cho officer chấp nhận báo cáo, hoặc trả về để sửa kèm nhận xét có cấu trúc |
| FR-UC39-03 | Ghi audit kết quả và thông báo cho CLB |
| FR-UC39-04 | *(A1)* Hỗ trợ chấp nhận kèm một ghi nhận được lưu lại cho kỳ đánh giá |
| FR-UC39-05 | *(E1)* Cho officer ghi nhận việc không nộp đúng hạn, dữ liệu này đi vào BR21 và kỳ đánh giá |
| FR-UC39-06 | Đưa báo cáo được chấp nhận thành đầu vào đánh giá cho UC42 |

**Hậu điều kiện** — báo cáo được chấp nhận trở thành đầu vào đánh giá. **Đầu ra** — quyết định về báo cáo, bản ghi audit.

### UC40 — Quản lý hồ sơ vi phạm và tuân thủ

| | |
|---|---|
| **Module · Ưu tiên** | M08 · P5 |
| **Actor chính** | ICPDP Officer |
| **Mục tiêu nghiệp vụ** | Xử lý một vi phạm như một hồ sơ có trạng thái, có người phụ trách và có vết xử lý |
| **Kích hoạt** | Một khiếu nại được leo thang (UC51), một phát hiện từ báo cáo (UC34), một báo cáo quá hạn, một ngoại lệ tài chính (UC37), một sự kiện không phép, hoặc một lần huỷ booking sát giờ (UC47) |
| **Tiền điều kiện** | Người gọi có quyền về tuân thủ |
| **Dữ liệu vào** | Nguồn gốc, mức độ nghiêm trọng, mô tả, chứng cứ, CLB liên quan, biện pháp khắc phục |
| **Thực thể / trạng thái** | `Violation`: `Open → Under Investigation → Awaiting Club Response → Decision Issued → Corrective Action → Resolved` |
| **Quy tắc** | BR27, BR28 |
| **Liên quan · Pain point** | UC15, UC34, UC37, UC42, UC47, UC51 · BP12 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC40-01 | Mở hồ sơ ghi rõ **nguồn gốc** và mức độ nghiêm trọng theo thang phân loại định nghĩa trong tài liệu chính sách (BR27) |
| FR-UC40-02 | Liên kết ngược hồ sơ được mở từ một khiếu nại về chính khiếu nại đó |
| FR-UC40-03 | Hỗ trợ giai đoạn điều tra với việc thu thập chứng cứ → `Under Investigation` |
| FR-UC40-04 | Yêu cầu CLB giải trình → `Awaiting Club Response`, phần trả lời đến từ đây hoặc từ UC52 khi nguồn gốc là một khiếu nại |
| FR-UC40-05 | Bắt buộc có lý do và chứng cứ cho quyết định (BR28) → `Decision Issued` |
| FR-UC40-06 | Ghi nhận biện pháp khắc phục và hạn hoàn thành → `Corrective Action`, và chuyển `Resolved` khi biện pháp được xác minh |
| FR-UC40-07 | *(A1)* Leo thang sang vòng đời CLB — tạm ngừng hoặc giải thể, thực hiện ở UC15 và liên kết với hồ sơ |
| FR-UC40-08 | *(A2)* Đóng hồ sơ không kèm biện pháp khi điều tra kết luận không có vi phạm, ghi rõ lý do |
| FR-UC40-09 | *(E1)* Cho officer tiếp tục và ghi nhận việc không phản hồi khi CLB quá hạn giải trình |
| FR-UC40-10 | Đưa lịch sử hồ sơ thành đầu vào của UC42 |

**Hậu điều kiện** — hồ sơ `Resolved` hoặc đã đóng, lịch sử đọc được.
**Đầu ra** — `Violation`, `CorrectiveAction`, bản ghi audit.

---

## 4.9 M09 — Đánh giá hiệu quả

### UC41 — Cấu hình scheme đánh giá

| | |
|---|---|
| **Module · Ưu tiên** | M09 · P5 |
| **Actor chính** | ICPDP Officer |
| **Mục tiêu nghiệp vụ** | Định nghĩa cách chấm điểm CLB, trước khi bất cứ thứ gì được chấm |
| **Kích hoạt** | Một kỳ đánh giá mới, hoặc chính sách chấm điểm thay đổi |
| **Tiền điều kiện** | Người gọi có quyền cấu hình đánh giá |
| **Dữ liệu vào** | Các dimension D1–D6, trọng số, ngưỡng xếp loại, kỳ áp dụng, trạng thái kích hoạt |
| **Thực thể / trạng thái** | `EvaluationScheme` version: `Draft → Active` |
| **Quy tắc** | BR29, BR30, BR51 |
| **Liên quan · Pain point** | UC42 · BP13 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC41-01 | Cho officer tạo hoặc mở một version scheme và đặt các dimension, trọng số và ngưỡng xếp loại |
| FR-UC41-02 | *(E1)* Validate tổng trọng số trước khi kích hoạt và từ chối tổng không hợp lệ (BR29) |
| FR-UC41-03 | Kích hoạt đúng một scheme cho mỗi kỳ đánh giá |
| FR-UC41-04 | Đánh phiên bản và ghi audit mọi thay đổi scheme |
| FR-UC41-05 | *(A1)* Cho sao chép scheme của kỳ trước rồi chỉnh sửa |
| FR-UC41-06 | *(E2)* Tạo version mới thay vì sửa tại chỗ khi scheme đã được một kỳ đánh giá đã công bố sử dụng |

**Hậu điều kiện** — đúng một scheme hoạt động cho mỗi kỳ. **Đầu ra** — `EvaluationScheme` version, bản ghi audit.

### UC42 — Sinh bản nháp đánh giá hiệu quả CLB

| | |
|---|---|
| **Module · Ưu tiên** | M09 · P5 |
| **Actor chính** | ICPDP Officer |
| **Mục tiêu nghiệp vụ** | Biến dữ liệu vận hành của một kỳ thành dữ liệu quản trị, không phải tổng hợp thủ công |
| **Kích hoạt** | Kỳ đánh giá kết thúc |
| **Tiền điều kiện** | Có một scheme đang hoạt động (UC41); báo cáo của kỳ đã được thẩm định (UC39) |
| **Dữ liệu vào** | Kỳ đánh giá và danh sách CLB trong phạm vi |
| **Thực thể / trạng thái** | `Evaluation`: `Draft → Data Ready` |
| **Quy tắc** | BR29, BR30, BR51 |
| **Liên quan · Pain point** | UC37, UC39, UC40, UC41, UC43 · BP13 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC42-01 | Thu thập cho mỗi CLB trong phạm vi: hoạt động (UC26–UC34), điểm danh (UC32), thành viên (UC21), tài chính (UC37), báo cáo (UC39), vi phạm (UC40), phản hồi (UC48), kết quả khiếu nại (UC51) và mức tuân thủ booking (UC46, UC47) |
| FR-UC42-02 | Áp dụng scheme đang hoạt động của UC41 và tính điểm cho từng dimension |
| FR-UC42-03 | Lưu **chứng cứ và data lineage** phía sau mỗi kết quả dimension: `kết quả dimension → chỉ số → thực thể nguồn → kỳ dữ liệu nguồn` |
| FR-UC42-04 | Đặt bản nháp ở `Data Ready` và không bao giờ công bố nó khi chưa qua UC43 |
| FR-UC42-05 | *(A1)* Sinh lại bản nháp cho một CLB riêng lẻ sau một lần hiệu chỉnh muộn |
| FR-UC42-06 | *(E1)* Đánh dấu dimension là `Insufficient data` thay vì chấm 0 khi nguồn dữ liệu không đầy đủ |

**Hậu điều kiện** — mỗi CLB có một bản nháp đánh giá kèm chứng cứ. **Đầu ra** — bản nháp đánh giá, data lineage.

### UC43 — Xem lại, chốt và công bố đánh giá

| | |
|---|---|
| **Module · Ưu tiên** | M09 · P5 |
| **Actor chính** | ICPDP Officer |
| **Mục tiêu nghiệp vụ** | Công bố một kết quả chính thức mà CLB đọc được và phản biện được |
| **Kích hoạt** | Một bản nháp ở `Data Ready` |
| **Tiền điều kiện** | Bản nháp của kỳ đó tồn tại |
| **Dữ liệu vào** | Xử lý các bất thường, các dimension chấm tay được phép, xếp loại cuối |
| **Thực thể / trạng thái** | `Evaluation`: `Data Ready → Under Review → Finalized → Published` |
| **Quy tắc** | BR30 |
| **Liên quan · Pain point** | UC42 · BP13 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC43-01 | Hiển thị bản nháp kèm dữ liệu nguồn và cho officer xử lý các bất thường và các dimension `Insufficient data` |
| FR-UC43-02 | Cho officer thêm các dimension chấm tay mà scheme cho phép, mỗi cái kèm lý giải |
| FR-UC43-03 | Cho officer chốt (`Finalized`) rồi công bố (`Published`), và thông báo cho các CLB |
| FR-UC43-04 | Không bao giờ sửa tại chỗ một kỳ đánh giá đã công bố — phải tạo bản sửa hoặc bản chụp mới (BR30) |
| FR-UC43-05 | *(A1)* Hỗ trợ bản sửa sau công bố như một version mới, giữ bản đã công bố vẫn đọc được |
| FR-UC43-06 | *(E1)* Xử lý khiếu nại về kết quả như một hồ sơ ở UC40, mọi hiệu chỉnh trở thành một bản sửa mới |
| FR-UC43-07 | Giữ lịch sử đánh giá theo từng CLB và từng kỳ để đọc được xu hướng |

**Hậu điều kiện** — mỗi CLB có một kỳ đánh giá đã công bố, kèm lịch sử.
**Đầu ra** — `Evaluation` đã công bố, thông báo, bản ghi audit.

---

## 4.10 M11 — Cơ sở vật chất và đặt chỗ

### UC44 — Quản lý danh mục cơ sở vật chất

| | |
|---|---|
| **Module · Ưu tiên** | M11 · P2 |
| **Actor chính** | ICPDP Officer |
| **Mục tiêu nghiệp vụ** | Định nghĩa những gì CLB được phép đặt |
| **Kích hoạt** | Nhà trường mở một phòng hoặc thiết bị cho hoạt động CLB, hoặc thông tin của nó thay đổi |
| **Tiền điều kiện** | Người gọi có quyền quản trị cơ sở vật chất |
| **Dữ liệu vào** | Mã và tên property, loại (phòng, hội trường, thiết bị), sức chứa, vị trí, thiết bị đi kèm, khung giờ được đặt, các giai đoạn khoá, trạng thái hoạt động |
| **Thực thể / trạng thái** | `Property`: `Active ⇄ Inactive` |
| **Quy tắc** | BR41 |
| **Liên quan · Pain point** | UC45, UC46 · BP16 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC44-01 | Cho officer thêm một property kèm mã, tên, loại, sức chứa, vị trí và thiết bị đi kèm |
| FR-UC44-02 | Cho officer đặt khung giờ được đặt và các giai đoạn khoá |
| FR-UC44-03 | Làm cho property đã kích hoạt trở nên chọn được ở UC45 |
| FR-UC44-04 | *(A1)* Cho ngừng kích hoạt một property, các booking đã duyệt hiện có vẫn giữ nguyên |
| FR-UC44-05 | *(A2)* Cho khoá một giai đoạn để bảo trì và hiển thị các yêu cầu bị xung đột với nó |
| FR-UC44-06 | *(E1)* Từ chối xoá khi còn booking tương lai đã duyệt, và chỉ cho ngừng kích hoạt (BR41) |
| FR-UC44-07 | Không bao giờ làm vô hiệu một quyết định đã ra khi khung giờ được đặt thay đổi |
| FR-UC44-08 | Chỉ lưu những property được mở cho hoạt động CLB — UCMS không thay thế hệ thống đặt phòng chung của trường |

**Hậu điều kiện** — danh mục phản ánh đúng những gì đặt được, và từ khi nào. **Đầu ra** — bản ghi `Property`, bản ghi audit.

### UC45 — Gửi yêu cầu đặt cơ sở vật chất

| | |
|---|---|
| **Module · Ưu tiên** | M11 · P2 |
| **Actor chính** | Club Member có permission `club.booking.manage` |
| **Mục tiêu nghiệp vụ** | Xin phòng hoặc thiết bị qua một quy trình truy vết được và gắn với sự kiện |
| **Kích hoạt** | CLB cần địa điểm hoặc thiết bị cho một sự kiện hay hoạt động định kỳ |
| **Tiền điều kiện** | CLB đang `Active` (BR34); người gọi có quyền; property đang hoạt động trong UC44 |
| **Dữ liệu vào** | Property, mục đích sử dụng, thời điểm bắt đầu và kết thúc, số người dự kiến, thiết bị đi kèm, sự kiện liên quan nếu có |
| **Thực thể / trạng thái** | `PropertyBooking`: `Draft → Requested`; `Revision Requested → Requested` (version mới) |
| **Quy tắc** | BR15, BR33, BR34, BR45, BR54 |
| **Liên quan · Pain point** | UC25, UC44, UC46 · BP16 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC45-01 | Cho CMB chọn một property từ danh mục của UC44 và hiển thị tình trạng còn trống của nó |
| FR-UC45-02 | Thu thập thông tin sử dụng — mục đích, thời điểm bắt đầu và kết thúc, số người dự kiến, thiết bị đi kèm, sự kiện liên quan |
| FR-UC45-03 | Đánh giá quy tắc xung đột **BR15** với các booking và sự kiện đã duyệt trước khi nộp |
| FR-UC45-04 | Chuyển `Requested` khi nộp và tạo review task cho ICPDP |
| FR-UC45-05 | *(A1)* Cho lưu yêu cầu ở `Draft` |
| FR-UC45-06 | *(A2)* Cho đính kèm yêu cầu vào một đề xuất sự kiện đang soạn ở UC25 |
| FR-UC45-07 | *(A3)* Từ `Revision Requested`, cho CMB sửa và nộp lại; tạo **version mới** và đưa booking về `Requested` |
| FR-UC45-08 | *(E1)* Từ chối yêu cầu cho khung giờ đã có người đặt khi chính sách cấm overbooking (BR33) |
| FR-UC45-09 | *(E2)* Từ chối yêu cầu rơi vào giai đoạn khoá |
| FR-UC45-10 | *(E3)* Cảnh báo khi số người dự kiến vượt sức chứa của property, và để UC46 quyết định |
| FR-UC45-11 | *(E4)* Từ chối booking kết thúc sau học kỳ `Dissolving` khi CLB đã có quyết định giải thể (BR45) |
| FR-UC45-12 | Từ chối booking mới với CLB đang `Suspended` (BR34) |
| FR-UC45-13 | *(E)* Từ chối khi người gọi thiếu permission `club.booking.manage` trong CLB đó (BR54) |

**Hậu điều kiện** — booking ở `Requested`. **Đầu ra** — `PropertyBooking`, `ApprovalTask`.

### UC46 — Thẩm định và quyết định yêu cầu đặt cơ sở vật chất

| | |
|---|---|
| **Module · Ưu tiên** | M11 · P2 |
| **Actor chính** | ICPDP Officer |
| **Mục tiêu nghiệp vụ** | Cấp phát nguồn lực của trường một cách có kiểm soát, với lý do được lưu lại |
| **Kích hoạt** | Một task từ UC45 |
| **Tiền điều kiện** | Booking đang `Requested` |
| **Dữ liệu vào** | Ghi chú thẩm định, quyết định và lý do |
| **Thực thể / trạng thái** | `PropertyBooking`: `Requested → Under Review → {Revision Requested, Approved, Rejected}` |
| **Quy tắc** | BR31, BR33, BR34, BR35 |
| **Liên quan · Pain point** | UC26, UC45, UC47 · BP16 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC46-01 | Chuyển yêu cầu sang `Under Review` khi officer mở nó |
| FR-UC46-02 | Hiển thị trạng thái CLB, mục đích, các xung đột và các nghĩa vụ quá hạn của CLB |
| FR-UC46-03 | Cung cấp đúng ba kết quả: **yêu cầu chỉnh sửa**, **phê duyệt**, **từ chối** — bắt buộc lý do với hai kết quả sau |
| FR-UC46-04 | Khoá khung giờ khi phê duyệt để không booking nào khác được duyệt chồng lên (BR33) |
| FR-UC46-05 | Ghi audit quyết định, cập nhật trạng thái và gửi `Property booking status` cho CMB |
| FR-UC46-06 | *(A1)* Cho officer đề xuất một khung giờ hoặc property thay thế, CLB chấp nhận qua UC45 A3 |
| FR-UC46-07 | *(E1)* Trả lại yêu cầu do xung đột khi một booking khác đã được duyệt cho cùng khung giờ trong lúc chờ |
| FR-UC46-08 | Chỉ nhận quyết định từ ICPDP (BR31) và từ chối booking mới với CLB đang `Suspended` (BR34) |

**Hậu điều kiện** — booking ở `Approved`, `Rejected` hoặc `Revision Requested`; booking đã duyệt khoá khung giờ.
**Đầu ra** — `ApprovalDecision`, khung giờ bị khoá, bản ghi audit, thông báo.

### UC47 — Theo dõi và huỷ / trả cơ sở vật chất đã đặt

| | |
|---|---|
| **Module · Ưu tiên** | M11 · P2 |
| **Actor chính** | Club Member có permission `club.booking.manage` |
| **Mục tiêu nghiệp vụ** | Giải phóng nguồn lực không còn cần tới để CLB khác đặt được |
| **Kích hoạt** | Sự kiện bị huỷ hoặc đổi lịch (UC28), hoặc CLB không cần property nữa |
| **Tiền điều kiện** | Booking đang `Requested` hoặc `Approved`, hoặc `In Use` khi việc huỷ đến từ UC15 hoặc UC40 (A1) |
| **Dữ liệu vào** | Lý do huỷ |
| **Thực thể / trạng thái** | `PropertyBooking`: `Requested`/`Approved → Cancelled`; `Approved → Released` |
| **Quy tắc** | BR35, BR54 |
| **Liên quan · Pain point** | UC28, UC40, UC46 · BP16 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC47-01 | Cho CMB huỷ một booking `Requested` hoặc `Approved` kèm lý do |
| FR-UC47-02 | Giải phóng khung giờ ngay lập tức và đưa nó trở lại trạng thái đặt được ở UC45 |
| FR-UC47-03 | Thông báo cho ICPDP về việc huỷ hoặc trả |
| FR-UC47-04 | *(A1)* Tự động giải phóng booking khi sự kiện của nó bị huỷ ở UC28 (BR35); khi việc huỷ đó đến từ UC15 hoặc UC40 thì giải phóng cả booking đang `In Use` và không áp dụng E2 |
| FR-UC47-05 | *(E1)* Từ chối huỷ thủ công một booking đã `In Use` hoặc `Completed` |
| FR-UC47-06 | *(E2)* Ghi nhận lần huỷ trong thời hạn báo trước định nghĩa trong tài liệu chính sách như một tín hiệu tuân thủ cho UC40 |
| FR-UC47-07 | Để scheduler chuyển `Approved → In Use → Completed` theo mốc giờ của chính booking |
| FR-UC47-08 | *(E)* Từ chối khi người gọi thiếu permission `club.booking.manage` trong CLB đó (BR54) |

**Hậu điều kiện** — booking ở `Cancelled` hoặc `Released`; khung giờ đã trống.
**Đầu ra** — trạng thái booking, khung giờ được giải phóng, thông báo, tín hiệu tuân thủ.

---

## 4.11 M12 — Phản hồi và khiếu nại

### UC48 — Gửi phản hồi sau sự kiện

| | |
|---|---|
| **Module · Ưu tiên** | M12 · P5 |
| **Actor chính** | Student |
| **Mục tiêu nghiệp vụ** | Thu thập đánh giá của người tham dự làm dữ liệu cải tiến và dữ liệu đánh giá |
| **Kích hoạt** | Feedback window mở tại thời điểm người tham dự check-in (BR36) |
| **Tiền điều kiện** | Sinh viên có bản ghi điểm danh của sự kiện đó |
| **Dữ liệu vào** | Điểm theo từng tiêu chí, nhận xét tự do, tuỳ chọn ẩn danh |
| **Thực thể / trạng thái** | `EventFeedback`: `Submitted` và bất biến — trạng thái duy nhất nó có |
| **Quy tắc** | BR36, BR37, BR40 |
| **Liên quan · Pain point** | UC31, UC42, UC49 · BP17 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC48-01 | Chỉ hiển thị form phản hồi cho người gọi có bản ghi điểm danh của sự kiện đó |
| FR-UC48-02 | Nhận phản hồi từ thời điểm **check-in** của chính người đó cho tới khi feedback window đóng (BR36) |
| FR-UC48-03 | Nhận đúng một phản hồi cho mỗi người tham dự trên mỗi sự kiện (BR36) |
| FR-UC48-04 | Lưu phản hồi ở dạng bất biến — không ai được sửa hoặc xoá (BR37) |
| FR-UC48-05 | Cập nhật thống kê tổng hợp của sự kiện khi có phản hồi mới |
| FR-UC48-06 | *(A1)* Hỗ trợ phản hồi ẩn danh: danh tính bị ẩn khỏi CMB, và chỉ giữ một liên kết nội bộ phục vụ chống spam |
| FR-UC48-07 | *(E1)* Từ chối lần gửi thứ hai cho cùng một sự kiện |
| FR-UC48-08 | *(E2)* Từ chối gửi sau khi feedback window đã đóng |
| FR-UC48-09 | *(E3)* Không hiển thị form khi không có bản ghi điểm danh |
| FR-UC48-10 | Không bao giờ để lộ bản tổng hợp khi số người phản hồi chưa đạt mức tối thiểu cấu hình được (BR40) |

**Hậu điều kiện** — tồn tại một bản ghi `EventFeedback` bất biến. **Đầu ra** — `EventFeedback`, bản tổng hợp được cập nhật.

### UC49 — Xem phản hồi sự kiện

| | |
|---|---|
| **Module · Ưu tiên** | M12 · P5 |
| **Actor chính** | Club Member có permission `club.feedback.view` |
| **Mục tiêu nghiệp vụ** | Dùng đánh giá của người tham dự để cải thiện hoạt động kế tiếp |
| **Kích hoạt** | Feedback window đóng lại, hoặc CLB chuẩn bị báo cáo sau sự kiện |
| **Tiền điều kiện** | Sự kiện có phản hồi và số người phản hồi đạt mức tối thiểu của BR40 |
| **Thực thể / trạng thái** | Không — chỉ đọc bản tổng hợp |
| **Quy tắc** | BR37, BR40, BR54 |
| **Liên quan · Pain point** | UC33, UC42, UC48 · BP17 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC49-01 | Hiển thị cho CMB bản tổng hợp của một sự kiện: điểm trung bình theo từng tiêu chí, phân bố điểm và các nhận xét |
| FR-UC49-02 | Không bao giờ cho CMB sửa hoặc xoá phản hồi của người tham dự (BR37) |
| FR-UC49-03 | *(E1)* Chỉ hiển thị việc *có tồn tại* phản hồi — không bao giờ hiển thị nội dung — khi số người phản hồi chưa đạt mức tối thiểu của BR40 |
| FR-UC49-04 | *(A1)* Cho CLB so sánh bản tổng hợp giữa các sự kiện của chính mình trong một giai đoạn |
| FR-UC49-05 | Đưa bản tổng hợp vào UC33 và UC42; bài học rút ra được ghi ở UC33, không ghi tại đây |
| FR-UC49-06 | *(E)* Từ chối khi người gọi thiếu permission `club.feedback.view` trong CLB đó (BR54) |

**Hậu điều kiện** — không có; chỉ đọc. **Đầu ra** — bản tổng hợp phản hồi; đầu vào cho UC33 và UC42.

### UC50 — Gửi khiếu nại về một CLB

| | |
|---|---|
| **Module · Ưu tiên** | M12 · P5 |
| **Actor chính** | Student |
| **Mục tiêu nghiệp vụ** | Cho sinh viên một kênh khiếu nại chính thức có vết xử lý |
| **Kích hoạt** | Sinh viên gặp vấn đề với một CLB hoặc một hoạt động của CLB |
| **Tiền điều kiện** | Có phiên hợp lệ (UC01) |
| **Dữ liệu vào** | CLB liên quan, sự kiện liên quan nếu có, loại khiếu nại, mô tả, chứng cứ |
| **Thực thể / trạng thái** | `Complaint`: `— → Submitted`; `… → Withdrawn` |
| **Quy tắc** | BR38 |
| **Liên quan · Pain point** | UC02, UC51 · BP18 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC50-01 | Cho sinh viên chọn CLB và sự kiện (nếu có), chọn loại khiếu nại, mô tả vấn đề và đính kèm chứng cứ |
| FR-UC50-02 | Chuyển `Submitted` và tạo task cho ICPDP |
| FR-UC50-03 | Chuyển khiếu nại **thẳng tới ICPDP**: CLB không có quyền truy cập cho tới khi UC51 chuyển xuống (BR38) |
| FR-UC50-04 | Cho người khiếu nại theo dõi tiến trình trong UC02 |
| FR-UC50-05 | *(A1)* Cho sinh viên rút khiếu nại chưa có quyết định (`Submitted` hoặc `Under Triage`) → `Withdrawn` |
| FR-UC50-06 | *(E1)* Liên kết các khiếu nại trùng của cùng một sinh viên về cùng một sự việc và phân loại chung |

**Hậu điều kiện** — khiếu nại ở `Submitted` và theo dõi được. **Đầu ra** — `Complaint`, `ApprovalTask`, thông báo.

### UC51 — Phân loại khiếu nại

| | |
|---|---|
| **Module · Ưu tiên** | M12 · P5 |
| **Actor chính** | ICPDP Officer |
| **Mục tiêu nghiệp vụ** | Lọc khiếu nại và chỉ mở hồ sơ khi thực sự có căn cứ |
| **Kích hoạt** | Một task từ UC50 |
| **Tiền điều kiện** | Khiếu nại đang `Submitted` |
| **Dữ liệu vào** | Mức độ nghiêm trọng, đánh giá tính hợp lệ, quyết định và lý do |
| **Thực thể / trạng thái** | `Complaint`: `Submitted → Under Triage → {Dismissed, Forwarded, Escalated}`; `Club Responded → {Closed, Escalated}` |
| **Quy tắc** | BR38, BR39 |
| **Liên quan · Pain point** | UC40, UC42, UC50, UC52 · BP18 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC51-01 | Chuyển khiếu nại sang `Under Triage` khi officer mở nó, và cho officer phân loại mức độ nghiêm trọng và tính hợp lệ |
| FR-UC51-02 | Cung cấp đúng ba kết quả: **Dismissed** (ghi lý do), **Forwarded** (chuyển cho CLB trả lời qua UC52), **Escalated** (mở một hồ sơ ở UC40 và liên kết ngược lại) |
| FR-UC51-03 | Bắt buộc lý do cho mọi kết quả và ghi audit (BR39) |
| FR-UC51-04 | Thông báo kết quả cho người khiếu nại |
| FR-UC51-05 | Chỉ nhận lệnh bác bỏ hoặc leo thang từ ICPDP |
| FR-UC51-06 | *(A1)* Đóng khiếu nại đã chuyển xuống khi phần trả lời của CLB làm officer hài lòng, ngược lại thì leo thang |
| FR-UC51-07 | *(E1)* Ghi nhận và đóng khiếu nại về một CLB đã giải thể, giữ nguyên lịch sử |
| FR-UC51-08 | Đưa kết quả khiếu nại thành đầu vào của UC42 |

**Hậu điều kiện** — khiếu nại ở `Dismissed`, `Forwarded`, `Escalated` hoặc `Closed`; khi leo thang thì tồn tại một `Violation` liên kết ngược lại.
**Đầu ra** — quyết định phân loại, `Violation` khi leo thang, bản ghi audit, thông báo.

### UC52 — Trả lời khiếu nại được chuyển xuống

| | |
|---|---|
| **Module · Ưu tiên** | M12 · P5 |
| **Actor chính** | Club Member có permission `club.complaint.respond` |
| **Mục tiêu nghiệp vụ** | Cho CLB cơ hội giải trình chính thức, có ghi nhận |
| **Kích hoạt** | ICPDP chuyển một khiếu nại xuống ở UC51 |
| **Tiền điều kiện** | Khiếu nại đang `Forwarded` |
| **Dữ liệu vào** | Phần trả lời, chứng cứ, hành động CLB đã hoặc sẽ thực hiện |
| **Thực thể / trạng thái** | `Complaint`: `Forwarded → Club Responded` |
| **Quy tắc** | BR54; CMB không bao giờ được sửa hoặc đóng khiếu nại; phải trả lời trong thời hạn định nghĩa trong tài liệu chính sách |
| **Liên quan · Pain point** | UC40, UC51 · BP18 |

| ID | Hệ thống phải … |
|---|---|
| FR-UC52-01 | Hiển thị khiếu nại đã chuyển xuống cho CMB, chỉ để lộ danh tính người khiếu nại ở mức chính sách cho phép (quyết định còn mở D5) |
| FR-UC52-02 | Cho ban chủ nhiệm nhập phần trả lời và đính kèm chứng cứ |
| FR-UC52-03 | Chuyển `Club Responded` khi nộp và trả khiếu nại về ICPDP cho UC51 |
| FR-UC52-04 | *(A1)* Cho phần trả lời nêu một hành động cụ thể, mà ICPDP có thể xác minh trước khi đóng |
| FR-UC52-05 | *(E1)* Ghi nhận việc quá hạn trả lời như một tín hiệu tuân thủ cho UC40 |
| FR-UC52-06 | Không bao giờ cho CMB sửa, bác bỏ hoặc đóng khiếu nại |
| FR-UC52-07 | *(E)* Từ chối khi người gọi thiếu permission `club.complaint.respond` trong CLB đó (BR54) |

**Hậu điều kiện** — khiếu nại ở `Club Responded` và trở về với ICPDP.
**Đầu ra** — phần trả lời của CLB, bản ghi audit, thông báo.

---

# 5. Quy tắc nghiệp vụ

Quy tắc nghiệp vụ được **thực thi ở tầng usecase** (CON-06), không bao giờ chỉ nằm ở UI.
BR01–BR39 đến từ R1 §14; BR40–BR52 và các sửa đổi đến từ R2 §11; BR53 đến từ I57, BR54–BR56 và bản sửa BR47 đến từ I58. **BR43 đã bị rút và số hiệu
của nó không bao giờ được dùng lại.**

| ID | Quy tắc | Thực thi tại |
|---|---|---|
| BR01 | Chỉ CLB `Active` mới được tạo đợt tuyển thành viên hoặc đề xuất sự kiện mới | UC16, UC25 |
| BR02 | Hồ sơ thành lập phải có đủ các tài liệu bắt buộc do ICPDP cấu hình | UC07, UC04 |
| BR03 | Số thành viên sáng lập tối thiểu là giá trị cấu hình được | UC07, UC04 |
| BR04 | Một version hồ sơ đã nộp không bao giờ bị ghi đè | UC07, UC08 |
| BR05 | Mọi lần phê duyệt hoặc từ chối đều lưu actor, thời điểm và lý do (nếu áp dụng) | UC08, UC11, UC13, UC26, UC34, UC39, UC46 |
| BR06 | Không được có hai nhiệm kỳ Chủ nhiệm chồng nhau trừ khi tài liệu chính sách cho phép | UC10 |
| BR07 | Điều kiện giữ chức vụ lãnh đạo định nghĩa trong tài liệu chính sách | UC10, UC11 |
| BR08 | Quyền mới chỉ có hiệu lực khi chuyển giao nhiệm kỳ được xác nhận | UC13 |
| BR09 | CLB `Suspended` không được mở đợt tuyển mới | UC15, UC16, UC06 |
| BR10 | CLB `Suspended` không được nộp đề xuất sự kiện mới | UC15, UC25 |
| BR11 | Đợt tuyển chỉ nhận đơn trong khung thời gian của nó | UC16, UC17 |
| BR12 | Một sinh viên không được nộp đơn trùng vào cùng một đợt tuyển | UC17 |
| BR13 | Tư cách thành viên chỉ được tạo từ một ứng viên trúng tuyển hoặc một lần tiếp nhận thủ công có thẩm quyền | UC20, UC17 |
| BR14 | Sự kiện chỉ được công khai khi đã `Approved` **và** được công bố ở UC27 (`Upcoming`) | UC26, UC27 |
| BR15 | **Quy tắc xung đột** — trùng thời gian trên cùng một property, nơi một sự kiện hoặc booking đã duyệt chặn lại, cho kết quả `Blocking Conflict`; trùng nhẹ cho `Warning`; ngưỡng được cấu hình ở UC04. Đây là một quy tắc, không phải use case | UC25, UC45, UC28 |
| BR16 | **Đã sửa đổi** — duyệt đa cấp theo rule định tuyến của UC05; hồ sơ không khớp rule nào được quyết định ở một cấp, và mọi cấp đều do ICPDP Officer thực hiện nên BR31 vẫn đúng | UC05, UC08, UC26, UC46 |
| BR17 | Số đăng ký đã xác nhận không bao giờ vượt sức chứa trừ khi chính sách cho phép overbooking | UC29, UC30 |
| BR18 | Mỗi người tham dự chỉ có một bản ghi điểm danh chính thức cho mỗi sự kiện | UC31, UC32 |
| BR19 | Bảng điểm danh đã chốt chỉ được mở khoá bởi một vai trò đặc biệt, cấp ở UC03 | UC32, UC03 |
| BR20 | Deadline báo cáo sau sự kiện và báo cáo định kỳ là cấu hình được | UC04, UC33, UC38 |
| BR21 | **Mở rộng (I60)** — CLB quá hạn một nghĩa vụ bắt buộc — báo cáo, quyết toán (BR57) hoặc khoản phải hoàn (BR58) — có thể bị chặn sự kiện mới, nếu chính sách bật cưỡng chế | UC04, UC25, UC34, UC36, UC37, UC39 |
| BR22 | **Đã sửa (I59)** — Ngân sách chỉ tồn tại như một phần của đề xuất sự kiện (UC25) và được quyết định cùng đề xuất ở UC26; không có ngân sách tách rời sự kiện | UC25, UC26 |
| BR23 | Tổng tạm ứng và cấp bù không bao giờ vượt số tiền đã duyệt khi chưa có văn bản điều chỉnh | UC35, UC37 |
| BR24 | Khoản chi ngoài hạng mục đã duyệt bị gắn cờ ngoại lệ | UC36, UC37 |
| BR25 | Yêu cầu về chứng từ theo từng hạng mục chi định nghĩa trong tài liệu chính sách | UC36 |
| BR26 | **Đã đổi (I60)** — Ngân sách của một sự kiện chỉ đóng khi đã đối soát và chênh lệch tất toán đã được xử lý: cấp bù xong, hoặc CLB đã hoàn đủ | UC35, UC37 |
| BR27 | Thang phân loại mức độ vi phạm định nghĩa trong tài liệu chính sách | UC40 |
| BR28 | Quyết định về vi phạm phải có lý do và chứng cứ | UC40 |
| BR29 | Tổng trọng số đánh giá phải hợp lệ trước khi một scheme được kích hoạt | UC41, UC42 |
| BR30 | Kỳ đánh giá đã công bố không bao giờ được sửa tại chỗ; phải tạo bản sửa hoặc bản chụp mới | UC43 |
| BR31 | ICPDP là cấp phê duyệt duy nhất cho mọi yêu cầu CLB hoặc sinh viên gửi lên nhà trường; quyết định nội bộ CLB do CMB của CLB đó đưa ra trong phạm vi của mình | UC08, UC26, UC46, UC51 |
| BR32 | Hệ thống chỉ chấp nhận đăng nhập qua Google OAuth với email thuộc domain đã cấu hình | UC01, UC04 |
| BR33 | Một property không được có hai booking `Approved` trùng khung giờ trừ khi chính sách cho phép overbooking | UC45, UC46 |
| BR34 | CLB `Suspended` không được cấp booking mới | UC15, UC45, UC46 |
| BR35 | Booking chỉ được duyệt bởi ICPDP và tự động được giải phóng khi sự kiện liên quan bị huỷ | UC46, UC28, UC47 |
| BR36 | **Đã sửa đổi** — mỗi người tham dự một phản hồi cho một sự kiện, nhận từ thời điểm **check-in** của chính họ cho tới khi feedback window đóng (v1 mở window sau khi chốt điểm danh, khiến dimension D1 và D2 của mô hình đánh giá bị thiếu dữ liệu) | UC31, UC48 |
| BR37 | CMB không được sửa hoặc xoá phản hồi sự kiện và chỉ thấy nó ở dạng tổng hợp | UC48, UC49 |
| BR38 | Khiếu nại của sinh viên đi thẳng tới ICPDP; CLB chỉ tiếp cận được sau khi ICPDP chuyển xuống | UC50, UC51, UC52 |
| BR39 | Mọi quyết định với khiếu nại (bác bỏ / chuyển xuống / leo thang) phải có lý do và được audit | UC51 |
| BR40 | **Mới** — bản tổng hợp phản hồi chỉ hiển thị khi số người phản hồi đạt mức tối thiểu cấu hình được; dưới ngưỡng đó chỉ hiển thị việc có tồn tại phản hồi (nếu không, phản hồi "ẩn danh" trong một sự kiện mười người là không ẩn danh) | UC48, UC49, UC04 |
| BR41 | **Mới** — không được xoá một property còn booking tương lai đã duyệt; chỉ được ngừng kích hoạt | UC44 |
| BR42 | **Mới** — màn hình cấu hình chỉ bao gồm các giá trị liệt kê ở UC04; mọi giá trị chính sách khác là hằng số định nghĩa trong tài liệu chính sách (danh sách ngay dưới bảng) | UC04 |
| ~~BR43~~ | **Đã rút** — nó từng dùng để giữ bản phát hành đầu độc lập với các use case bị hoãn; nay mọi use case ra cùng một bản phát hành. Số hiệu không được dùng lại | — |
| BR44 | **Mới** — một sự kiện phải bắt đầu và kết thúc trong cùng một học kỳ của lịch học kỳ | UC25, UC15 |
| BR45 | **Mới** — khi một CLB đã có quyết định giải thể, không sự kiện, đề xuất hay booking nào của CLB đó được kết thúc sau học kỳ `Dissolving` của nó; UC25 và UC45 từ chối những hồ sơ như vậy, UC15 huỷ những gì đã tồn tại | UC15, UC25, UC45 |
| BR46 | **Mới** — sinh viên có tư cách thành viên `Banned` ở một CLB không được nộp đơn vào, hoặc được tiếp nhận lại vào, CLB đó | UC17, UC20, UC21 |
| BR47 | **Đã sửa (I58)** — Quyền trong CLB chỉ đến từ một vị trí trong nhiệm kỳ đang hoạt động của CLB đó: (a) ghế Chủ nhiệm đã xác nhận ở UC11 / UC13 → Club Leader, mọi permission CLB; (b) ghế tạm của người đứng đơn (UC08) → quyền leader chỉ cho UC09, UC10, UC23 khi CLB `Pending Setup`; (c) một ghế ban chủ nhiệm khác đã xác nhận (UC11 / UC13) hoặc một role được gán ở UC23 → đúng các permission của role đó. UC03 không bao giờ cấp quyền CLB. | UC01, UC03, UC08, UC11, UC13, UC23 |
| BR48 | **Mới** — Mỗi sinh viên có tối đa một đăng ký cho mỗi sự kiện. | UC29 |
| BR49 | **Mới** — Người dùng chỉ thấy và thao tác trên các CLB mà họ có tư cách thành viên hoặc chức vụ trong nhiệm kỳ đang hoạt động; ICPDP thấy mọi CLB. | UC02, UC23, UC24 |
| BR50 | **Mới** — `Registration Open` / `Registration Closed` suy ra từ registration window đặt ở UC27, không bao giờ lưu thành trạng thái của sự kiện. | UC27, UC29 |
| BR51 | **Mới** — Một scheme đánh giá đã được dùng thì bị khoá; muốn thay đổi phải tạo version mới, và kỳ đánh giá dùng version có hiệu lực cho kỳ đó. | UC41, UC42 |
| BR52 | **Mới** — Thành viên đang giữ một ghế ban chủ nhiệm đã xác nhận phải được thay qua UC10/UC11 trước khi tư cách thành viên của họ kết thúc. | UC21, UC22 |
| BR53 | **Mới** — Sự kiện `Internal` (chỉ thành viên CLB) không có phần ngân sách được **ghi nhận**, không xin duyệt: UC25 chuyển thẳng `Draft → Approved`, ghi audit, và ICPDP xem được mọi sự kiện như vậy ở UC02. Sự kiện đó không cần báo cáo sau sự kiện và đóng khi chốt điểm danh ở UC32. Sự kiện `Internal` có phần ngân sách đi đường duyệt UC26 như sự kiện `Public`; booking luôn do UC46 quyết định | UC02, UC25, UC26, UC27, UC32, UC33 |
| BR54 | **Mới (I58)** — Mỗi use case vận hành CLB kiểm tra người gọi có permission tương ứng trong CLB đó (danh mục permission ở §2.3); thiếu quyền thì từ chối. Một thành viên giữ nhiều role có quyền là hợp các permission của các role; Club Leader có mọi permission CLB | UC09, UC16, UC18–UC21, UC25, UC27, UC28, UC30, UC32, UC33, UC36, UC38, UC45, UC47, UC49, UC52 |
| BR55 | **Mới (I58)** — Danh mục permission CLB là cố định, do hệ thống định nghĩa; chỉ được chọn từ danh mục đó. Bốn quyền giữ riêng của leader — `club.role.manage`, `club.board.nominate`, `club.transition.plan`, `club.suspension.request` — không cấp được cho role nào. Cơ cấu role ban đầu được ICPDP thẩm định cùng hồ sơ thành lập (UC07 / UC08); sau đó Club Leader sửa cơ cấu ở UC23 không cần ICPDP xác nhận, trừ role ban điều hành: người giữ chỉ đến từ UC10 / UC11 / UC13, và việc thêm / bỏ role ban điều hành chỉ đi qua chuyển giao UC12 / UC13 | UC07, UC08, UC10, UC11, UC12, UC13, UC23 |
| BR56 | **Mới (I58)** — Cơ cấu role của CLB được **đánh phiên bản**: phiên bản 1 là cơ cấu được duyệt ở UC08; mỗi thay đổi ở UC23 hoặc UC13 tạo một phiên bản mới có ngày hiệu lực và không bao giờ ghi đè phiên bản trước. Mỗi CLB luôn có role Chủ nhiệm (cố định) và role Members (mặc định, không xoá được, tự gán cho mọi thành viên ở UC20). ICPDP xem được mọi phiên bản cơ cấu và lịch sử người giữ role ban điều hành theo nhiệm kỳ | UC02, UC07, UC08, UC13, UC20, UC23 |
| BR57 | **Mới (I60)** — Ngân sách đã tạm ứng phải được CLB quyết toán — đủ khoản chi và chứng từ — trong thời hạn định nghĩa trong tài liệu chính sách, tính từ lúc sự kiện kết thúc hoặc bị huỷ. Quá hạn là nghĩa vụ quá hạn theo BR21, và ICPDP được chốt đối soát trên các khoản chi đã có chứng từ | UC36, UC37 |
| BR58 | **Mới (I60)** — Phần đã tạm ứng không được chứng minh bằng chi hợp lệ (số dư chưa chi, khoản chi thiếu chứng từ hoặc bị loại) bị thu hồi: CLB phải hoàn trong thời hạn định nghĩa trong tài liệu chính sách; ICPDP ghi nhận tiền hoàn ở UC35. Quá hạn là nghĩa vụ quá hạn theo BR21 và là căn cứ mở hồ sơ vi phạm ở UC40 | UC35, UC37, UC40 |

**Cấu hình được và hằng số (BR42).** Chỉ chín giá trị liệt kê ở UC04 là sửa được trong sản
phẩm. Mọi giá trị chính sách khác là **hằng số định nghĩa trong tài liệu chính sách** cho tới khi có nhu
cầu thật — xem quyết định còn mở D2. Danh sách hằng số: điều kiện được lập CLB (UC07); điều kiện giữ chức vụ lãnh đạo (BR07) và việc cho phép nhiệm kỳ Chủ nhiệm chồng lấn (BR06); thời gian báo trước tối thiểu của sự kiện (UC25); thời hạn báo trước khi huỷ (UC28, UC47); chính sách đẩy lên từ danh sách chờ (UC30); khung giờ check-in (UC31); yêu cầu chứng từ theo hạng mục chi (BR25); thang phân loại mức độ vi phạm (BR27); các kỳ báo cáo ngoài học kỳ (UC38); các loại khiếu nại (UC50); thời hạn CMB trả lời khiếu nại (UC52); hạn nộp quyết toán sau sự kiện (BR57); hạn hoàn trả khoản bị thu hồi (BR58).

---

# 6. Vòng đời thực thể (máy trạng thái)

Mỗi chuyển trạng thái đều nêu rõ **tác nhân điều khiển**: một use case, hoặc scheduler. Một
chuyển trạng thái không có trong đây là không tồn tại, và không chuyển trạng thái nào được điều
khiển bởi một "Hệ thống" không giải thích được. Sơ đồ nằm ở
[`03-diagrams/UCMS_State_Diagrams.drawio`](03-diagrams/UCMS_State_Diagrams.drawio)
(bản PNG ở `03-diagrams/img/`).

## 6.1 Club Application (hồ sơ thành lập CLB)

```text
Draft → Submitted → Under Review → {Revision Requested → Submitted(version mới)} → Approved | Rejected
                                 ↘ Withdrawn (cuối)        Revision Requested → Expired (cuối)
```

| Từ → Đến | Tác nhân |
|---|---|
| Draft → Submitted | UC07 |
| Submitted → Under Review | UC08 |
| Under Review → Revision Requested | UC08 |
| Revision Requested → Submitted (version mới) | UC07 A2 |
| Under Review → Approved / Rejected | UC08 |
| Submitted / Under Review / Revision Requested → Withdrawn | UC07 A3 |
| Revision Requested → Expired | **Scheduler** (deadline chỉnh sửa đặt ở UC08) |

`Withdrawn` và `Expired` là trạng thái cuối; sau `Expired`, người nộp phải làm hồ sơ mới.

## 6.2 Club (CLB)

```text
Pending Setup → Active ⇄ Suspended → Dissolving → Dissolved
```

| Từ → Đến | Tác nhân |
|---|---|
| Pending Setup → Active | UC11 (ban chủ nhiệm được xác nhận) |
| Active → Suspended | UC15 |
| Suspended → Active | UC15 |
| Active / Suspended → Dissolving | **Scheduler**, vào đầu học kỳ sau quyết định giải thể ở UC15 |
| Dissolving → Dissolved | **Scheduler**, vào cuối học kỳ đó, trước khi học kỳ kế tiếp bắt đầu |

Quyết định giải thể ở UC15 không đổi trạng thái ngay: CLB tiếp tục hoạt động hết học kỳ hiện
tại. `Inactive` **cố tình không** là một trạng thái của CLB — CLB ngừng hoạt động thì ở
`Suspended` kèm lý do không hoạt động.

## 6.3 Recruitment Campaign (đợt tuyển)

```text
Draft → Published → Accepting Applications → Screening → Completed
                 ↘ Cancelled
```

Tác nhân: UC16 (`Draft → Published`, và `Cancelled` từ mọi trạng thái chưa kết thúc);
**Scheduler** (mở khung thời gian → `Accepting Applications`, đóng khung thời gian →
`Screening`); UC18 (`Completed`).

## 6.4 Recruitment Application (đơn ứng tuyển)

```text
Draft → Submitted → Screening → Shortlisted → Accepted | Rejected | Waitlisted → Onboarded
                  ↘ Withdrawn (cuối)                      Accepted ↘ Declined (cuối)
```

Tác nhân: UC17 (`Draft → Submitted`, và `Withdrawn` từ `Submitted` / `Screening` /
`Shortlisted`); UC18 (từ sàng lọc tới quyết định); UC20 (`Accepted → Onboarded`, hoặc `Accepted → Declined` khi CMB ghi nhận ứng viên từ chối).

## 6.5 Membership (tư cách thành viên)

```text
Active ⇄ Inactive
Active | Inactive → Left (cuối)
Active | Inactive → Banned (cuối)
```

| Từ → Đến | Tác nhân |
|---|---|
| (chưa có) → Active | UC20 tiếp nhận |
| Active → Inactive | UC21 (ngừng tham gia; hoặc UC21 A2 không đăng ký lại) — bị từ chối khi đang giữ ghế ban chủ nhiệm đã xác nhận |
| Inactive → Active | UC21 (tham gia lại; hoặc UC21 A2 đã đăng ký lại) |
| Active / Inactive → Left | UC21 A1, thực thi yêu cầu của UC22 — bị từ chối khi đang giữ ghế ban chủ nhiệm đã xác nhận |
| Active / Inactive → Banned | UC21, bắt buộc lý do — bị từ chối khi đang giữ ghế ban chủ nhiệm đã xác nhận |

Sinh viên đã `Left` có thể quay lại bằng một tư cách thành viên mới (UC20); sinh viên `Banned`
thì không (BR46).

## 6.6 Event (sự kiện)

```text
Draft → Pending Approval → Under Review → {Revision Requested → Pending Approval(bản sửa mới)}
      → Approved → Upcoming → Ongoing → Completed → Report Submitted → Closed
```

| Từ → Đến | Tác nhân |
|---|---|
| Draft → Pending Approval | UC25 |
| Draft → Approved | UC25 A4 — sự kiện nội bộ ghi nhận thẳng (BR53) |
| Pending Approval → Under Review | UC26 |
| Under Review → Revision Requested | UC26 |
| Revision Requested → Pending Approval (bản sửa mới) | UC25 A2 |
| Under Review → Approved / Rejected | UC26 |
| Approved → Upcoming | UC27 |
| Upcoming → Ongoing | **Scheduler** (giờ bắt đầu) |
| Ongoing → Completed | **Scheduler** (giờ kết thúc) |
| Completed → Report Submitted | UC33 |
| Report Submitted → Closed | UC34 (chấp nhận) |
| Report Submitted → Completed | UC34 (trả báo cáo về để sửa) |
| Completed → Closed | UC32 A2 — sự kiện nội bộ ghi nhận thẳng, không có báo cáo (BR53) |
| Approved / Upcoming / Ongoing → Cancelled | UC28, hoặc UC15 / UC40 tác động lên CLB |
| Draft / Pending Approval / Under Review / Revision Requested → Cancelled | UC15 (tạm ngừng, hoặc giải thể theo BR45), hoặc **Scheduler** khi CLB chuyển `Dissolved` |
| Revision Requested → Expired | **Scheduler** (deadline chỉnh sửa đặt ở UC26); là trạng thái cuối — CLB phải nộp đề xuất mới |

`Upcoming` bao trùm toàn bộ khoảng từ lúc công bố tới lúc bắt đầu, bất kể đăng ký đang mở, đã
đóng hay không dùng tới. **`Registration Open` và `Registration Closed` được suy ra từ khung thời
gian đăng ký đặt ở UC27, không phải trạng thái của sự kiện.**

## 6.7 Event Budget (ngân sách sự kiện)

Ngân sách không có vòng nộp / thẩm định riêng: nó là một phần của đề xuất sự kiện (BR22), nên
nháp, chờ duyệt, yêu cầu chỉnh sửa và từ chối là trạng thái của `Event`. `EventBudget` chỉ ra
đời khi UC26 phê duyệt một đề xuất có phần ngân sách.

```text
Approved → Disbursed → Settlement Submitted → Reconciled ──────────→ Closed
                                            ↘ Recovery Pending ────↗
Settlement Submitted ⇄ Reconciliation Pending
Disbursed / Reconciliation Pending → Recovery Pending   (quá hạn quyết toán)
Approved → Cancelled
```

| Từ → Đến | Tác nhân |
|---|---|
| (tạo) → Approved | UC26 phê duyệt đề xuất có phần ngân sách, kèm số tiền duyệt |
| Approved → Disbursed | UC35 — lần tạm ứng đầu tiên, một phần hoặc toàn bộ số duyệt; tạm ứng thêm giữ nguyên `Disbursed` |
| Disbursed → Settlement Submitted | UC36 — CLB nộp quyết toán sau khi sự kiện kết thúc hoặc bị huỷ (BR57) |
| Settlement Submitted → Reconciliation Pending | UC37 A1 (trả về để bổ sung chứng từ) |
| Reconciliation Pending → Settlement Submitted | UC36 A3 (nộp lại quyết toán) |
| Settlement Submitted → Reconciled | UC37 — chi hợp lệ không thấp hơn số đã tạm ứng |
| Settlement Submitted → Recovery Pending | UC37 — chi hợp lệ thấp hơn số đã tạm ứng; chốt số phải hoàn (BR58) |
| Disbursed / Reconciliation Pending → Recovery Pending | UC37 A2 — quá hạn quyết toán (BR57) |
| Reconciled → Closed | UC37 khi chênh lệch tất toán bằng 0, hoặc UC35 A2 ghi khoản cấp bù (BR26) |
| Recovery Pending → Closed | UC35 A3 khi CLB đã hoàn đủ (BR26, BR58) |
| Approved → Cancelled | UC28, hoặc UC15 / UC40 tác động lên CLB, khi sự kiện bị huỷ trước khi tạm ứng |

**Chênh lệch tất toán** = chi hợp lệ (trần là số duyệt) − đã tạm ứng. Không còn trạng thái
`Exception`: phần tạm ứng không được chứng minh bằng chi hợp lệ phải hoàn trả (BR58), không được
đóng kèm chênh lệch.

## 6.8 Property Booking (đặt cơ sở vật chất)

```text
Draft → Requested → Under Review → {Revision Requested → Requested(version mới)}
      → Approved → In Use → Completed
      Approved → Released | Cancelled
```

| Từ → Đến | Tác nhân |
|---|---|
| Draft → Requested | UC45 |
| Requested → Under Review | UC46 |
| Under Review → Revision Requested | UC46 |
| Revision Requested → Requested (version mới) | UC45 A3 |
| Under Review → Approved / Rejected | UC46 |
| Approved → In Use | **Scheduler** (giờ bắt đầu) |
| In Use → Completed | **Scheduler** (giờ kết thúc) |
| Requested / Approved → Cancelled | UC47 |
| Approved → Released | UC28 qua BR35, hoặc UC47 |

## 6.9 Violation (hồ sơ vi phạm)

```text
Open → Under Investigation → Awaiting Club Response → Decision Issued → Corrective Action → Resolved
```

Tác nhân: UC40 xuyên suốt. Bước `Awaiting Club Response → Decision Issued` được mở khoá bởi phần
trả lời của CLB, ghi ở UC40 hoặc, với hồ sơ bắt nguồn từ khiếu nại, ở UC52.

## 6.10 Complaint (khiếu nại)

```text
Submitted → Under Triage → Dismissed | Forwarded | Escalated
Forwarded → Club Responded → Closed | Escalated
Escalated → (Violation Open)
```

| Từ → Đến | Tác nhân |
|---|---|
| — → Submitted | UC50 |
| Submitted → Under Triage | UC51 |
| Under Triage → Dismissed / Forwarded / Escalated | UC51 |
| Forwarded → Club Responded | **UC52** |
| Club Responded → Closed / Escalated | UC51 |
| Escalated → Violation `Open` | UC40 |
| Submitted / Under Triage → Withdrawn | UC50 A1 (cuối) |

## 6.11 Event Feedback (phản hồi sự kiện)

```text
(chưa có bản ghi) --UC48--> Submitted   [bất biến]
```

Bản ghi chỉ có **một** trạng thái, vì BR37 cấm sửa và cấm xoá.
`Window Open` / `Window Closed` của v1 là thuộc tính của **sự kiện** (suy ra từ thời điểm check-in
của người tham dự và window cấu hình được, BR36), còn `Aggregated` là một *khung nhìn* trên các
bản ghi đã nộp, không phải trạng thái của một bản ghi.

## 6.12 Evaluation (kỳ đánh giá)

```text
Draft → Data Ready → Under Review → Finalized → Published
```

Tác nhân: UC42 tới `Data Ready`; UC43 từ `Under Review` trở đi. Kỳ đánh giá đã công bố không bao
giờ được sửa tại chỗ (BR30).

---

# 7. Yêu cầu dữ liệu

## 7.1 Thực thể theo module

| Module | Thực thể |
|---|---|
| M01 | `User`, `StudentProfile`, `Role`, `Permission`, `PolicyVersion`, `RoutingRuleSet` |
| M02 | `Club`, `ClubApplication`, `ClubApplicationVersion` |
| M03 | `ClubTerm`, `ClubPosition`, `ClubPositionAssignment`, `ClubRoleStructureVersion`, `TransitionPlan` |
| M04 | `RecruitmentCampaign`, `RecruitmentApplication`, `CandidateEvaluation`, `ClubMembership` |
| M05 | `Event`, `EventProposalVersion` |
| M06 | `EventRegistration`, `Attendance` |
| M07 | `EventBudget`, `BudgetDisbursement`, `Expense`, `FinancialEvidence`, `FinancialReconciliation` |
| M08 | `PostEventReport`, `PeriodicReport`, `Violation`, `CorrectiveAction` |
| M09 | `EvaluationScheme`, `EvaluationDimension`, `Evaluation`, `EvaluationDimensionResult` |
| M10 | `ApprovalTask`, `ApprovalDecision`, `Notification`, `EmailDeliveryLog`, `AuditLog` |
| M11 | `Property`, `PropertyBooking` |
| M12 | `EventFeedback`, `Complaint` |

## 7.2 Thuộc tính chính của từng aggregate (tập tối thiểu)

| Thực thể | Thuộc tính mà yêu cầu phụ thuộc vào |
|---|---|
| `User` | email (unique, kiểm tra domain), googleSubject, displayName, avatarUrl, accountState (`Active`/`Locked`), lockReason, createdAt |
| `StudentProfile` | userId, studentCode, fullName, faculty, các trường đồng bộ từ OAuth |
| `Role` / `Permission` | code, scope (`system` / `club`), danh sách mã quyền |
| `PolicyVersion` | chín giá trị của UC04, effectiveFrom, createdBy, createdAt |
| `RoutingRuleSet` | version, state, rules[] {requestType, amountThreshold, riskCategory, propertyClass, complianceCondition, requiredLevel, slaHours} |
| `Club` | code, name, field, state, description, contact, charter, channels, các trường thuộc thẩm quyền nhà trường, dissolutionDecision {decidedAt, effectiveSemester, reason}, createdAt |
| `ClubApplication` | clubName, field, objectives, foundingMembers[], documents[], proposedRoleStructure (role, isBoardSeat, permissionCodes[] — UC07), state, currentVersion, lịch sử quyết định |
| `ClubApplicationVersion` | applicationId, versionNo, bản chụp payload, submittedBy, submittedAt (bất biến) |
| `ClubTerm` | clubId, name, startAt, endAt, state, previousTermId |
| `ClubPosition` (role CLB, UC07 / UC23) | clubId, code, name, unit, isBoardSeat (role ban điều hành), isLeaderRole (Chủ nhiệm), isDefaultMemberRole (Members), isSingleHolder, permissionCodes[] (BR55) |
| `ClubRoleStructureVersion` | clubId, versionNo (unique theo CLB), effectiveFrom, source (`APPLICATION` / `ROLE_EDIT` / `TRANSITION`), sourceRefId, roles[] (bản chụp role + permissionCodes + isBoardSeat), createdBy, reason, createdAt — bất biến (BR56) |
| `ClubPositionAssignment` | clubId, termId, positionId, membershipId, effectiveFrom, effectiveTo |
| `ClubMembership` | clubId, userId, state (`Active`/`Inactive`/`Left`/`Banned`), joinedAt, statusHistory[] {state, effectiveDate, reason, actor}, departmentId |
| `RecruitmentCampaign` | clubId, positions[], criteria, windowStart, windowEnd, capacity, selectionSteps[], formSchema, rubric, state |
| `RecruitmentApplication` | campaignId, userId (unique theo campaign), position, answers, attachments[], state, decision {outcome, reason, actor, at} |
| `CandidateEvaluation` | applicationId, reviewerId, scores[], comment, createdAt (bất biến sau quyết định) |
| `Event` | clubId, clubName (denormalize), title, objective, startAt, endAt, venue/propertyId, audienceScope (`PUBLIC` / `MEMBERS_ONLY`, chọn ở UC25 — BR53), capacity, riskCategory, state, conflictResult, approvalConditions[], registrationWindow {start, end}, currentRevision |
| `EventProposalVersion` | eventId, revisionNo, bản chụp payload, budgetLines[] {category, amount, purpose, plannedItems}, requestedBudgetTotal, submittedBy, submittedAt (bất biến) |
| `EventRegistration` | eventId, studentId (cặp unique), state (`Confirmed`/`Waitlisted`/`Cancelled`), waitlistPosition, answers, createdAt |
| `Attendance` | eventId, studentId (cặp unique), registrationId, checkedInAt, method (`self`/`manual`/`walk-in`), performedBy, abnormalFlags[], finalized, finalizedBy, finalizedAt |
| `PostEventReport` | eventId, bản chụp số liệu nạp sẵn, actualResult, incidents, lessonsLearned, evidence[], state, versions[], submittedAt, lateFlag |
| `PeriodicReport` | clubId, period, bản chụp số liệu nạp sẵn, narrative, nextPlan, evidence[], state, versions[], lateFlag |
| `EventBudget` | eventId (unique), clubId, lines[] {category, requestedAmount, approvedAmount, reason}, requestedTotal, approvedTotal, approvedByDecisionId, disbursedTotal, settlementDueAt, settlementSubmittedAt, acceptedTotal, settlementBalance, recoveryAmount, recoveryDueAt, refundedTotal, state |
| `BudgetDisbursement` | eventBudgetId, kind (`Advance` / `TopUp` / `Refund`), amount, date, paymentReference, recordedBy |
| `Expense` | eventBudgetId, eventId, category, amount, date, description, isOutOfCategory, isOverRemaining, supported (suy ra), reviewOutcome (`Accepted` / `Rejected`), reviewReason |
| `FinancialEvidence` | expenseId (đúng một), type, externalLink, uploadedBy, uploadedAt |
| `FinancialReconciliation` | eventBudgetId, approved, disbursed, recorded, supported, unsupported, remaining, accepted, settlementBalance, outcome (`Reconciled` / `Recovery Pending`), isOverdueSettlement, closedBy, closedAt |
| `Property` | code, name, type, capacity, location, equipment[], bookableHours, blackouts[], isActive |
| `PropertyBooking` | propertyId, clubId, clubName (denormalize), eventId?, purpose, startAt, endAt, headcount, state, currentVersion, decision {actor, reason, at} |
| `EventFeedback` | eventId, attendanceId, studentId (nội bộ, ẩn khi gửi ẩn danh), scores[], comment, isAnonymous, submittedAt (bất biến) |
| `Complaint` | complainantId, clubId, eventId?, type, description, evidence[], state, triage {severity, validity, outcome, reason, actor, at}, clubResponse {text, evidence[], at}, violationId? |
| `Violation` | clubId, origin {type, sourceId}, severity, description, evidence[], state, decision {reason, evidence, actor, at}, correctiveActions[] |
| `EvaluationScheme` | period, version, state, dimensions[] {code, name, weight, scoringRule}, thresholds[] |
| `Evaluation` | clubId, period, schemeVersion, state, totalScore, classification, dimensionResults[], revisions[] |
| `EvaluationDimensionResult` | evaluationId, dimensionCode, score, cờ `Insufficient data`, evidence[] {metric, sourceEntity, sourceId, sourcePeriod} |
| `ApprovalTask` | entityType, entityId, state, assigneeRole, requiredLevel, slaDueAt, createdAt, decisions[] |
| `ApprovalDecision` | approvalTaskId, level, outcome, reason, comments[], actor, at |
| `Notification` | recipientId, event, channels[], payload, state, dueAt, attempts, lastError |
| `EmailDeliveryLog` | notificationId, to, status, attempt, providerResponse, at |
| `AuditLog` | entityType, entityId, action, actorId, actorRole, before, after, changeDiff, reason, correlationId, at |

## 7.3 Quan hệ

```text
User 1 ─ 1 StudentProfile            User 1 ─ N ClubMembership          Club 1 ─ N ClubMembership
Club 1 ─ N ClubTerm                  ClubTerm 1 ─ N ClubPositionAssignment
Club 1 ─ N RecruitmentCampaign       RecruitmentCampaign 1 ─ N RecruitmentApplication
User 1 ─ N RecruitmentApplication    RecruitmentApplication 1 ─ 0..1 ClubMembership (qua UC20)

Club 1 ─ N Event                     Event 1 ─ N EventProposalVersion
Event 1 ─ N EventRegistration        EventRegistration 1 ─ 0..1 Attendance
Event 1 ─ 0..1 PostEventReport       Attendance 1 ─ 0..1 EventFeedback

Event 1 ─ 0..1 EventBudget
EventBudget 1 ─ N BudgetDisbursement     EventBudget 1 ─ N Expense
Expense 1 ─ N FinancialEvidence      EventBudget 1 ─ 0..1 FinancialReconciliation

Property 1 ─ N PropertyBooking       Club 1 ─ N PropertyBooking       Event 0..1 ─ N PropertyBooking

User 1 ─ N Complaint                 Club 1 ─ N Complaint             Complaint 1 ─ 0..1 Violation
Club 1 ─ N Violation                 Violation 1 ─ N CorrectiveAction
Club 1 ─ N PeriodicReport            Club 1 ─ N Evaluation            Evaluation 1 ─ N EvaluationDimensionResult

<thực thể nghiệp vụ bất kỳ> 1 ─ N ApprovalTask     ApprovalTask 1 ─ N ApprovalDecision
<thực thể nghiệp vụ bất kỳ> 1 ─ N AuditLog
```

## 7.4 Yêu cầu toàn vẹn dữ liệu

| ID | Yêu cầu |
|---|---|
| DAT-01 | Mỗi aggregate một collection MongoDB; tham chiếu bằng `ObjectId`; không join xuyên collection trong đường đi nóng |
| DAT-02 | **Unique index**: `User.email`; `(campaignId, userId)` trên đơn ứng tuyển; `(clubId, userId)` trên tư cách thành viên active; `(eventId, studentId)` trên đăng ký; `(eventId, studentId)` trên điểm danh; `(eventId, studentId)` trên phản hồi |
| DAT-03 | **Compound index** được tạo lúc khởi động bởi repository: `(clubId, state)`, `(propertyId, startAt, endAt)`, `(entityType, entityId)` trên audit và approval, `(dueAt, state)` trên hàng đợi thông báo, `(clubId, period)` trên báo cáo và đánh giá |
| DAT-04 | Sức chứa đăng ký (BR17) và trùng booking (BR33) được bảo vệ bằng unique index cộng `findOneAndUpdate` có điều kiện, không dùng đọc-kiểm-ghi (CON-07) |
| DAT-05 | Các document version / bản sửa (`ClubApplicationVersion`, `EventProposalVersion`) là chỉ-ghi-thêm và không bao giờ bị sửa (BR04, CON-08) |
| DAT-06 | Chỉ denormalize **phục vụ màn hình danh sách** (ví dụ `{ clubId, clubName }` trên dòng sự kiện và booking); use case của module sở hữu chịu trách nhiệm cập nhật bản sao khi đổi tên |
| DAT-07 | Các bản chụp bị đóng băng lúc nộp (số liệu nạp sẵn của báo cáo, payload hồ sơ, lineage đánh giá) không bao giờ đổi theo dữ liệu nguồn sau đó |
| DAT-08 | Một bản ghi đã bước vào workflow thì không bao giờ bị xoá cứng; các trạng thái vòng đời (`Cancelled`, `Withdrawn`, `Dissolved`, `Rejected`) thay cho việc xoá, và lịch sử vẫn đọc được |
| DAT-09 | Chứng từ tài chính được lưu dưới dạng liên kết ngoài kèm người tải lên và thời điểm trong bản phát hành này (CON-15) |
| DAT-10 | Mọi thao tác ghi làm đổi trạng thái đều sinh ra một dòng `AuditLog` trong chính use case đó (xem §8.3) |

---

# 8. Yêu cầu xuyên suốt — workflow, thông báo, audit, scheduler

Ba cơ chế này (module M10) là thứ biến mười hai module thành một hệ thống. Mỗi cơ chế là một
**domain port với đúng một bản cài ở tầng infrastructure**, được inject trong `main.ts` như một
repository.

## 8.1 Workflow phê duyệt

Năm đối tượng nghiệp vụ đi qua *nộp → thẩm định → sửa → quyết định*: hồ sơ thành lập (UC07/08),
đề xuất sự kiện kèm ngân sách (UC25/26), đặt cơ sở vật chất (UC45/48), khiếu nại
(UC50/53) và tạm ngừng CLB (UC14/15). Xác nhận ban chủ nhiệm (UC10/11), chuyển giao nhiệm kỳ
(UC12/13) và hai loại thẩm định báo cáo (UC33/34, UC38/41) dùng cùng cơ chế task.

| ID | Yêu cầu |
|---|---|
| WF-01 | Tất cả dùng chung **một** aggregate `ApprovalTask` `{ entityType, entityId, state, assignee, requiredLevel, slaDueAt, decisions[] }`, đây chính là thứ tạo ra một hộp thư phê duyệt hợp nhất cho ICPDP |
| WF-02 | Module giữ trạng thái thực thể của mình (`Event.status`); approval task giữ trạng thái *thẩm định*. Use case gọi `approval.open(entityType, entityId, …)`, và callback quyết định lật trạng thái thực thể thông qua use case **sở hữu** nó |
| WF-03 | Mọi use case assess-and-decide cung cấp đúng ba kết quả — yêu cầu chỉnh sửa, phê duyệt, từ chối — và ghi actor, thời điểm và lý do (BR05) |
| WF-04 | Một lần nộp lại tạo ra **document version mới** và đưa thực thể về trạng thái chờ quyết định (`Submitted` / `Pending Approval` / `Requested`); nó không bao giờ sửa version trước (BR04, CON-08) |
| WF-05 | Định tuyến đa cấp được đánh giá từ `RoutingRuleSet` đang hoạt động của UC05; hồ sơ không khớp rule nào được quyết định ở một cấp (BR16). Mọi cấp đều là ICPDP Officer (BR31) |
| WF-06 | Việc vi phạm SLA trên một task đang mở được hiển thị ở dashboard ICPDP dưới dạng *approval aging* và được leo thang theo §8.2 |
| WF-07 | Deadline chỉnh sửa trôi qua mà không có bản nộp lại sẽ đưa thực thể sang `Expired` qua scheduler (hồ sơ thành lập, đề xuất sự kiện) |
| WF-08 | Lịch sử quyết định đọc được ngay trong chính màn hình assess-and-decide — đó là cách BP15 được giải quyết mà không cần một use case audit riêng |

## 8.2 Thông báo, deadline và leo thang

```text
usecase commit thay đổi nghiệp vụ
  → notification.enqueue(event, recipients, channels)      # cùng request, ghi vào Mongo
  → scheduler rút outbox → dòng in-app / Google SMTP → EmailDeliveryLog (+ retry)
```

| ID | Yêu cầu |
|---|---|
| NTF-01 | Thông báo được **đưa vào hàng đợi bên trong transaction đã commit** và gửi đi bất đồng bộ. Email không bao giờ được gửi đồng bộ (CON-09) |
| NTF-02 | Gửi thất bại không bao giờ rollback hay chặn thay đổi nghiệp vụ; nó được thử lại với backoff, và số lần thử nằm trên document outbox |
| NTF-03 | Mỗi lần thử gửi email ghi một dòng `EmailDeliveryLog` |
| NTF-04 | Thông báo in-app do chính UCMS lưu và đọc được từ mọi workspace |
| NTF-05 | Leo thang deadline theo `T − X ngày → Nhắc`, `T → Đến hạn`, `T + Y ngày → Quá hạn`, `T + Z ngày → Leo thang lên ICPDP`, với X, Y, Z cấu hình ở UC04 |
| NTF-06 | Scheduler tìm mục đến hạn bằng cách quét các index theo ngày đến hạn (DAT-03), không bao giờ quét toàn bộ collection |
| NTF-07 | Instance thứ hai của ứng dụng không được gửi trùng: scheduler giữ một lease document trong Mongo |

**Ma trận thông báo**

| Sự kiện nghiệp vụ | Người nhận | Kênh |
|---|---|---|
| Hồ sơ thành lập được nộp | ICPDP | In-app |
| Hồ sơ thành lập bị yêu cầu chỉnh sửa | Người nộp | In-app + Email |
| CLB được duyệt / bị từ chối | Người nộp, CMB | In-app + Email |
| Đề xuất ban chủ nhiệm được nộp / được xác nhận | ICPDP / CMB | In-app |
| Nhiệm kỳ sắp hết hạn | CMB + ICPDP | Nhắc |
| Kết quả tuyển thành viên | Sinh viên | In-app |
| Đề xuất sự kiện được nộp | ICPDP | In-app |
| Sự kiện được duyệt / bị từ chối | CMB | In-app + Email |
| Sự kiện bị đổi lịch hoặc huỷ | Người đã đăng ký | In-app |
| Nhắc sự kiện sắp diễn ra | Người tham dự | In-app |
| Yêu cầu booking được nộp | ICPDP | In-app |
| Booking được duyệt / bị từ chối | CMB | In-app + Email |
| Booking bị huỷ / được trả | ICPDP | In-app |
| Feedback window mở | Người tham dự (lúc check-in) | In-app |
| Có phản hồi sự kiện mới | CMB | In-app |
| Báo cáo sau sự kiện sắp đến hạn | CMB | Nhắc |
| Ngân sách được duyệt / được giải ngân | CMB | In-app |
| Khoản chi thiếu chứng từ | Thủ quỹ / CMB | Nhắc |
| Đối soát quá hạn | CMB + ICPDP | Leo thang |
| Báo cáo định kỳ đến hạn | CMB | Nhắc |
| Khiếu nại được gửi | ICPDP | In-app + Email |
| Khiếu nại đã được phân loại | Người khiếu nại | In-app |
| Khiếu nại được chuyển xuống | CMB | In-app + Email |
| Hồ sơ vi phạm được mở / có quyết định | CMB | In-app + Email |
| Kết quả đánh giá được công bố | CMB | In-app |

## 8.3 Audit

| ID | Yêu cầu |
|---|---|
| AUD-01 | Mọi use case làm đổi trạng thái đều ghi `{ entityType, entityId, action, actorId, actorRole, before, after, changeDiff, reason, correlationId, at }` qua một `AuditPort` |
| AUD-02 | Lời gọi audit nằm **trong usecase** — không nằm ở middleware của route (vì route không biết tên hành động nghiệp vụ) và không nằm ở repository (vì repository không biết actor) |
| AUD-03 | Bắt buộc audit mạnh cho: quyết định hồ sơ thành lập, thay đổi trạng thái CLB, xác nhận ban chủ nhiệm, chuyển giao nhiệm kỳ, duyệt sự kiện, ghi nhận sự kiện nội bộ không qua duyệt (BR53), duyệt và giải ngân ngân sách, quyết định booking, sửa đổi khoản chi và chứng từ, quyết định phân loại khiếu nại, quyết định vi phạm, công bố đánh giá, thay đổi RBAC, và **các lần đăng nhập Google OAuth bị từ chối** (sai domain, tài khoản bị khoá) |
| AUD-04 | Bản ghi audit là chỉ-ghi-thêm và không bao giờ được sửa hoặc xoá |
| AUD-05 | Một `correlationId` buộc chung mọi bản ghi sinh ra từ một request, bao gồm cả các cascade UC15 → UC28 A1 / UC47 A1 |

Ví dụ:

```text
Entity: Event #E1002
Before: UNDER_REVIEW        Action: APPROVE        After: APPROVED
Actor:  ICPDP Officer (id)  Reason: Meets governance requirements   At: 2026-09-24T09:12:04Z
```

## 8.4 Scheduler — chức năng hệ thống

Scheduler **không phải actor**. Nó sở hữu đúng các hành vi sau, mỗi hành vi kiểm thử được riêng:

| ID | Hành vi theo lịch | Nguồn chân lý |
|---|---|---|
| SCH-01 | `Upcoming → Ongoing → Completed` của sự kiện | giờ bắt đầu và kết thúc của chính sự kiện |
| SCH-02 | `Approved → In Use → Completed` của booking | giờ bắt đầu và kết thúc của chính booking |
| SCH-03 | Mở (`Accepting Applications`) và đóng (`Screening`) khung thời gian của đợt tuyển | khung thời gian của đợt tuyển |
| SCH-04 | `Revision Requested → Expired` của hồ sơ thành lập và đề xuất sự kiện | deadline chỉnh sửa đặt ở UC08 / UC26 |
| SCH-05 | `Active`/`Suspended → Dissolving` vào đầu học kỳ sau quyết định giải thể | lịch học kỳ (UC04) + quyết định ở UC15 |
| SCH-06 | `Dissolving → Dissolved` vào cuối học kỳ đó, gồm huỷ các đề xuất và booking chưa quyết định, ghi nhận nghĩa vụ tồn đọng và lưu trữ hồ sơ | lịch học kỳ (UC04) |
| SCH-07 | Đóng feedback window | độ dài window cấu hình ở UC04 (BR36) |
| SCH-08 | Quét đăng ký lại thành viên theo kỳ (UC21 A2) | lịch học kỳ (UC04) |
| SCH-09 | Nhắc hạn, đánh dấu quá hạn và leo thang (`T−X / T / T+Y / T+Z`) | các mốc ở UC04 + ngày đến hạn của từng mục |
| SCH-10 | Rút hàng đợi thông báo và thử lại email thất bại | trạng thái outbox + backoff |

SCH-06 phải là tất-cả-hoặc-không-gì với từng CLB: nếu bất kỳ phần nào thất bại, CLB ở lại
`Dissolving` và ICPDP được cảnh báo (FR-UC15-11).

---

# 9. Mô hình đánh giá hiệu quả CLB

Không hard-code bất kỳ công thức điểm nào. Hệ thống cung cấp một **khung đánh giá cấu hình
được** (UC41) trên sáu dimension, và mọi kết quả phải giải thích được qua data lineage của nó.

| Dim | Tên | Đầu vào | Câu hỏi nghiệp vụ |
|---|---|---|---|
| **D1** | Thực thi hoạt động | sự kiện đã duyệt, sự kiện đã hoàn thành, sự kiện bị huỷ, báo cáo sau sự kiện, property được cấp so với thực dùng, điểm phản hồi trung bình | CLB có thực sự làm những gì đã cam kết không? |
| **D2** | Mức độ tham gia của thành viên | thành viên active, điểm danh, tỉ lệ giữ chân, tỉ lệ tham gia, tỉ lệ phản hồi | Thành viên có thực sự tham gia hay chỉ tồn tại trên danh sách? |
| **D3** | Kỷ luật báo cáo | mức độ hoàn thành báo cáo, ngày đến hạn, số ngày trễ, số lần phải sửa | CLB có tuân thủ nghĩa vụ báo cáo không? |
| **D4** | Tuân thủ tài chính | ngân sách được duyệt, số đã giải ngân, khoản chi, chứng từ, kết quả đối soát | CLB dùng ngân sách có minh bạch và đúng quy trình không? |
| **D5** | Quản trị | ban chủ nhiệm hợp lệ, nhiệm kỳ, chuyển giao, hồ sơ thành viên | CLB có bộ máy vận hành và khả năng kế thừa tốt không? |
| **D6** | Tuân thủ và rủi ro | số lượng và mức độ vi phạm, hồ sơ chưa xử lý xong, biện pháp khắc phục, khiếu nại bị leo thang, số lần huỷ booking sát giờ | CLB có tạo ra rủi ro quản trị hoặc tuân thủ cho nhà trường không? |

```text
Evaluation Scheme
├─ Kỳ học
├─ Các dimension (D1–D6)
├─ Tiêu chí
├─ Trọng số      ← cấu hình ở UC41; tổng phải hợp lệ (BR29)
├─ Quy tắc chấm điểm
└─ Ngưỡng xếp loại
```

| ID | Yêu cầu |
|---|---|
| EVL-01 | Trọng số, ngưỡng và kỳ áp dụng được cấu hình ở UC41 — không bao giờ giả định trong code |
| EVL-02 | Mỗi kết quả dimension lưu lineage của nó: `kết quả dimension → chỉ số → thực thể nguồn → kỳ dữ liệu nguồn` (ví dụ *Tuân thủ báo cáo → 4 báo cáo đến hạn, 3 nộp đúng hạn → nguồn: PeriodicReport #…*) |
| EVL-03 | Dimension có nguồn dữ liệu không đầy đủ được đánh dấu `Insufficient data`, không bao giờ chấm 0 |
| EVL-04 | Bản nháp không bao giờ được công bố khi chưa qua thẩm định ở UC43 |
| EVL-05 | Kỳ đánh giá đã công bố là bất biến; hiệu chỉnh là một bản sửa hoặc bản chụp mới (BR30) |
| EVL-06 | Lịch sử đánh giá được giữ theo từng CLB và từng kỳ để đọc được xu hướng |
| EVL-07 | Dimension chấm tay chỉ được phép ở nơi scheme cho phép, và mỗi cái kèm lý giải |

---

# 10. Yêu cầu dashboard

UC02 hiển thị một dashboard cho mỗi vai trò. Mọi con số là **truy vấn trực tiếp vào module sở
hữu** — không bao giờ là bản sao thứ hai của dữ liệu — và không dashboard nào thực hiện chuyển
trạng thái.

## 10.1 Dashboard ICPDP

| Widget | Câu hỏi nghiệp vụ |
|---|---|
| CLB Active / Suspended | Hiện có bao nhiêu CLB đang hoạt động hợp lệ? |
| Hồ sơ chờ duyệt theo loại | Những hồ sơ nào đang chờ ICPDP? |
| Approval aging / vi phạm SLA | Hồ sơ nào đã chờ quá lâu? |
| Sự kiện sắp diễn ra | Sự kiện nào sắp tới? |
| Sự kiện nội bộ đã ghi nhận | CLB nào đang sinh hoạt nội bộ, khi nào và bao nhiêu người tham dự? (BR53) |
| Cơ cấu và ban điều hành CLB | CLB có những role nào, cơ cấu đổi khi nào, và ai giữ ban điều hành qua từng nhiệm kỳ? (BR56) |
| Cảnh báo xung đột | Có sự kiện hay booking nào trùng lịch không? |
| Mức độ cam kết ngân sách | Tổng đã duyệt, đã giải ngân và đã đối soát là bao nhiêu? |
| Hàng đợi booking | Yêu cầu đặt cơ sở vật chất nào đang chờ? |
| Mức sử dụng cơ sở vật chất | Phòng/thiết bị nào được cấp nhưng không dùng? |
| Báo cáo quá hạn | CLB nào chưa hoàn thành nghĩa vụ? |
| Khiếu nại đang mở | Khiếu nại nào chưa được phân loại? |
| Hồ sơ vi phạm đang mở | Hồ sơ tuân thủ nào chưa xử lý xong? |
| Tổng hợp phản hồi | Điểm phản hồi trung bình của CLB và sự kiện trong kỳ là bao nhiêu? |
| Sức khoẻ / rủi ro CLB | CLB nào có tín hiệu rủi ro? |
| Phân bố kết quả đánh giá | Chất lượng CLB trong kỳ như thế nào? |

## 10.2 Dashboard phía CLB (Club Member / Club Leader)

Club Member chỉ thấy các mục thuộc permission của mình (BR54); Club Leader thấy toàn bộ và thêm danh
sách role CLB cùng người giữ role (UC23). Các mục: số thành viên active · các đợt tuyển đang chạy · sự kiện sắp diễn ra · đề xuất đang `Pending`
hoặc `Revision Requested` · ngân sách còn lại · khoản chi thiếu chứng từ · báo cáo sắp đến hạn ·
booking đang chờ duyệt và đã duyệt · phản hồi sự kiện gần nhất · hồ sơ vi phạm đang mở · thời
gian còn lại của nhiệm kỳ · công việc chuyển giao chưa xong.

## 10.3 Dashboard Student

Tôi đang thuộc CLB nào · CLB nào đang tuyển · đơn của tôi đang ở trạng thái nào · sự kiện nào tôi
đăng ký được · sự kiện nào tôi đã đăng ký · sự kiện sắp tới của tôi · lịch sử điểm danh của tôi ·
sự kiện nào tôi chưa gửi phản hồi · khiếu nại của tôi đang ở trạng thái nào.

> **Không có** dashboard cho "School Supporting Reviewer": actor đó đã bị loại bỏ, và toàn bộ
> hàng đợi phê duyệt nằm trên dashboard ICPDP.

---

# 11. Yêu cầu phi chức năng

## 11.1 Hiệu năng và quy mô

| ID | Yêu cầu |
|---|---|
| NFR-PERF-01 | Hệ thống phục vụ một trường: vài trăm sinh viên truy cập đồng thời, vài chục CLB. Bản phát hành này không yêu cầu mở rộng ngang |
| NFR-PERF-02 | Mỗi panel dashboard và mỗi màn hình danh sách chỉ dùng một truy vấn đi qua index liệt kê ở DAT-03; truy vấn N+1 theo từng dòng là không chấp nhận được |
| NFR-PERF-03 | Check-in (UC31) và đăng ký (UC29) hoàn tất trong một thao tác ghi nguyên tử có điều kiện, để một đợt dồn ở cửa sự kiện không tạo bản ghi trùng hay vượt sức chứa |
| NFR-PERF-04 | Sinh bản nháp đánh giá (UC42) là tác vụ theo lô và có thể lâu hơn một request tương tác; nó chạy theo kỳ và báo tiến độ thay vì khoá màn hình |
| NFR-PERF-05 | Báo cáo dùng aggregation pipeline thuần; chỉ đưa read model hoặc database báo cáo vào khi một truy vấn chậm có thể đo được |

## 11.2 Độ tin cậy và khả dụng

| ID | Yêu cầu |
|---|---|
| NFR-REL-01 | Một transaction nghiệp vụ đã commit không bao giờ hỏng vì gửi email thất bại (CON-09) |
| NFR-REL-02 | Google OAuth không khả dụng thì từ chối phiên mới, nhưng không bao giờ tạo bản ghi `User` dở dang |
| NFR-REL-03 | Một lượt chạy scheduler thất bại giữa chừng để thực thể ở nguyên trạng thái trước đó và cảnh báo ICPDP; nó không bao giờ để lại một CLB giải thể dở (FR-UC15-11) |
| NFR-REL-04 | Server fail-fast lúc khởi động khi cấu hình thiếu hoặc không hợp lệ (`infra/config/`) |
| NFR-REL-05 | Chỉ một instance scheduler hành động tại một thời điểm, bảo vệ bằng một lease document trong Mongo |

## 11.3 Khả dụng giao diện và tiếp cận

| ID | Yêu cầu |
|---|---|
| NFR-USE-01 | Độ tương phản đạt WCAG 2.1 AA: ≥ 4.5:1 cho chữ và ≥ 3:1 cho viền mang nghĩa, ở **cả hai** theme; màu cam thương hiệu không bao giờ dùng cho chữ |
| NFR-USE-02 | Trạng thái không bao giờ chỉ được truyền đạt bằng màu (UI-02) |
| NFR-USE-03 | Mọi phần tử tương tác có vòng focus nhìn thấy được; mọi nút chỉ có icon phải có `aria-label`; vùng chạm ≥ 44×44 px |
| NFR-USE-04 | Giao diện chạy đúng ở 375 / 768 / 1024 / 1440 px, không cuộn ngang toàn trang; bảng rộng chuyển thành danh sách thẻ xếp chồng dưới `md` |
| NFR-USE-05 | Tôn trọng `prefers-reduced-motion: reduce`, tắt các chuyển động không thiết yếu |
| NFR-USE-06 | Chữ nội dung không bao giờ nhỏ hơn 16 px trên mobile; độ dài dòng văn xuôi giới hạn 65–75 ký tự |
| NFR-USE-07 | Mọi hành động phá huỷ hoặc không thể hoàn tác (cấm thành viên, huỷ, giải thể, chốt điểm danh, công bố đánh giá) đều hỏi xác nhận và nêu rõ hệ quả |

## 11.4 Đa ngôn ngữ

| ID | Yêu cầu |
|---|---|
| NFR-I18N-01 | Giao diện có tiếng Anh và tiếng Việt qua i18next, file chuỗi tách theo module; không chuỗi hiển thị nào được hard-code trong component |
| NFR-I18N-02 | Bố cục chịu được chuỗi tiếng Việt dài hơn 30–60%: không đặt chiều rộng cố định quanh giá trị đã dịch, các hàng tự xuống dòng |
| NFR-I18N-03 | Font chữ là **Be Vietnam Pro**, được chọn vì giữ dấu tiếng Việt đọc được ở cỡ 14 px |
| NFR-I18N-04 | Ngày, giờ và tiền tệ được định dạng theo ngôn ngữ; mọi dấu thời gian lưu ở UTC và hiển thị theo múi giờ của trường |

## 11.5 Khả năng bảo trì và kiểm thử

| ID | Yêu cầu |
|---|---|
| NFR-MNT-01 | Use case unit-test được **không cần database**, thông qua port và fake in-memory |
| NFR-MNT-02 | Ranh giới các tầng được kiểm tra tự động; `npm run check` (constitution + lint + typecheck + test) là Definition of Done |
| NFR-MNT-03 | Một module mới tốn 4 file phía server cộng 2 file phía client — đúng hình dạng lát cắt dọc của R8 §3 |
| NFR-MNT-04 | Mỗi thư mục có một `README.md` nói rõ thứ gì thuộc về nó (CON-13) |
| NFR-MNT-05 | Mỗi quy tắc máy kiểm tra được thêm vào dự án phải kèm phần kiểm tra trong `scripts/check-constitution.sh` ở cùng PR |
| NFR-MNT-06 | Mỗi quy tắc nghiệp vụ ở §5 có ít nhất một unit test trên use case thực thi nó; mỗi máy trạng thái ở §6 có test cho từng chuyển trạng thái và từng chuyển trạng thái bị từ chối |

## 11.6 Khả năng audit và truy vết

| ID | Yêu cầu |
|---|---|
| NFR-AUD-01 | Mọi thay đổi trạng thái đều quy được về một actor, một thời điểm và — nơi có quyết định — một lý do (§8.3) |
| NFR-AUD-02 | Câu hỏi "ICPDP đã duyệt chính xác nội dung gì" trả lời được chỉ bằng các document version chỉ-ghi-thêm |
| NFR-AUD-03 | Mọi điểm đánh giá giải thích được tới tận bản ghi nguồn (EVL-02) |

## 11.7 Tương thích và triển khai

| ID | Yêu cầu |
|---|---|
| NFR-CMP-01 | Hỗ trợ Chrome, Edge, Firefox và Safari bản hiện hành; không giao app mobile native |
| NFR-CMP-02 | Hệ thống chạy bằng `docker compose`: `mongo` + `server` + một host tĩnh cho client đã build |
| NFR-CMP-03 | Mọi bí mật mới được thêm vào schema của `infra/config/` và vào `.env.example` trong cùng một thay đổi |

---

# 12. Yêu cầu bảo mật và quyền riêng tư

| ID | Yêu cầu |
|---|---|
| SEC-01 | **Xác thực** chỉ qua Google OAuth (BR32). Không lưu mật khẩu, và không tồn tại đường đăng nhập nội bộ |
| SEC-02 | Chỉ email thuộc domain trường đã cấu hình mới được tạo phiên hoặc tạo `User` (FR-UC01-03, FR-UC01-09) |
| SEC-03 | **Hai lớp kiểm tra thẩm quyền**: kiểm tra *quyền* thô ở middleware của route (vai trò này có được làm hành động này không), và kiểm tra *phạm vi* bên trong use case (actor này có ở **đúng CLB** đó, với **đúng role** mang permission cần thiết (BR54), trong **nhiệm kỳ hiện tại** không; hoặc có phải Club Leader với các quyền giữ riêng — BR55). Lớp kiểm tra phạm vi mới là lớp thực sự bảo vệ dữ liệu (CON-06) |
| SEC-04 | Quyền được suy ra từ `ClubPositionAssignment ∩ ClubTerm đang hoạt động` và permission của role (BR47, BR54), không bao giờ từ một cờ trên user; nhờ vậy thay đổi ban chủ nhiệm hay role CLB là thay đổi dữ liệu, không phải migration. Thay đổi permission của role hoặc thu hồi role ở UC23 có hiệu lực ngay ở request kế tiếp |
| SEC-05 | Cookie phiên được ký, `httpOnly`, `SameSite=Lax`, và có cờ `Secure` ngoài môi trường dev. Thay đổi hoặc thu hồi vai trò sẽ vô hiệu hoá ngay các phiên bị ảnh hưởng (FR-UC03-04) |
| SEC-06 | Tài khoản bị khoá bị từ chối ngay khi đăng nhập và lần thử đó được audit (FR-UC01-10) |
| SEC-07 | Mọi dữ liệu vào được validate bằng zod ở biên trước mọi truy vấn Mongoose — đây là thứ chặn NoSQL injection |
| SEC-08 | Một lần thử trái phép thực hiện hành động chỉ dành cho ICPDP (ví dụ duyệt booking) bị từ chối **và được audit** (AC17) |
| SEC-09 | **Quyền riêng tư khiếu nại**: khiếu nại chỉ ICPDP thấy được cho tới khi UC51 chuyển xuống; danh tính người khiếu nại chỉ hiển thị cho CMB ở mức chính sách cho phép (quyết định còn mở D5) |
| SEC-10 | **Quyền riêng tư phản hồi**: CMB chỉ thấy phản hồi ở dạng tổng hợp, không bao giờ thấy một phản hồi định danh được; phản hồi ẩn danh ẩn danh tính khỏi CMB và chỉ giữ liên kết nội bộ phục vụ chống spam; không hiển thị tổng hợp khi chưa đạt số người phản hồi tối thiểu (BR37, BR40) |
| SEC-11 | Dữ liệu cá nhân UCMS lưu giới hạn ở những gì Google OAuth trả về cộng hồ sơ sinh viên của trường; hệ thống không bao giờ hỏi mật khẩu, thông tin thanh toán hay giấy tờ tuỳ thân |
| SEC-12 | Bản ghi audit, document version và kỳ đánh giá đã công bố là chỉ-ghi-thêm; không vai trò nào sửa hoặc xoá được |
| SEC-13 | Chứng từ được tải lên hoặc liên kết chỉ truy cập được bởi các vai trò mà use case sở hữu cho phép (CLB đã nộp nó, và ICPDP) |
| SEC-14 | Bí mật (`GOOGLE_CLIENT_ID/SECRET`, `SESSION_SECRET`, `SMTP_*`, `MONGO_URI`) chỉ nằm trong biến môi trường được validate lúc khởi động; không bao giờ commit và không bao giờ ghi ra log |
| SEC-15 | MongoDB không bao giờ mở ra ngoài; file compose ở môi trường dev bind nó vào `127.0.0.1` |

---

# 13. Tiêu chí nghiệm thu

Các tiêu chí dưới đây là ví dụ mang tính cam kết của §4 và §5, viết theo dạng Cho / Khi / Thì.
Chúng là hạt giống của bộ test hệ thống.

| ID | Tiêu chí |
|---|---|
| **AC01** Nộp hồ sơ thành lập | **Cho** sinh viên đã điền đủ mọi trường bắt buộc, **khi** họ nộp, **thì** hồ sơ chuyển `Submitted`, ICPDP nhận một review task, và version đã nộp không còn sửa trực tiếp được |
| **AC02** Yêu cầu chỉnh sửa | **Cho** hồ sơ đang `Under Review`, **khi** ICPDP yêu cầu chỉnh sửa, **thì** phải nhập ít nhất một lý do và trạng thái chuyển `Revision Requested` |
| **AC03** Duyệt thành lập CLB | **Cho** hồ sơ đang `Under Review`, **khi** ICPDP phê duyệt, **thì** hồ sơ chuyển `Approved` và **đúng một** bản ghi `Club` được tạo, ở `Pending Setup` |
| **AC04** Đơn ứng tuyển trùng | **Cho** một đợt tuyển đang mở, **khi** một sinh viên đủ điều kiện nộp lần đầu, **thì** đơn được tạo; **khi** chính sinh viên đó nộp lại vào cùng đợt tuyển, **thì** hệ thống từ chối đơn trùng |
| **AC05** Đề xuất sự kiện | **Cho** CLB đang `Active`, **khi** CMB nộp một đề xuất hợp lệ, **thì** đề xuất chuyển `Pending Approval` và kết quả phân tích xung đột được lưu kèm |
| **AC06** Duyệt sự kiện | **Cho** đề xuất đang `Under Review`, **khi** ICPDP phê duyệt, **thì** trạng thái chuyển `Approved` và sự kiện **chưa** công khai cho tới khi UC27 công bố |
| **AC07** Sức chứa sự kiện | **Cho** sức chứa là 100 và đã có 100 đăng ký đã xác nhận, **khi** sinh viên tiếp theo đăng ký, **thì** đăng ký chuyển `Waitlisted` nếu danh sách chờ được bật, và bị từ chối nếu không |
| **AC08** Check-in | **Cho** sinh viên có đăng ký hợp lệ, **khi** một lần check-in hợp lệ được xử lý, **thì** một bản ghi `Attendance` được tạo, và check-in trùng không tạo bản ghi thứ hai |
| **AC09** Chốt điểm danh | **Cho** sự kiện đã kết thúc, **khi** CMB chốt điểm danh, **thì** bộ dữ liệu bị khoá và mọi thay đổi sau đó cần vai trò mở khoá đặc biệt |
| **AC10** Báo cáo sau sự kiện | **Cho** sự kiện đã `Completed` và điểm danh đã chốt, **khi** CMB mở form báo cáo, **thì** số liệu điểm danh đã chốt được nạp sẵn |
| **AC11** Duyệt ngân sách | **Cho** đề xuất sự kiện có phần ngân sách đang `Under Review`, **khi** ICPDP phê duyệt, **thì** số tiền duyệt được lưu tách biệt với số xin, `EventBudget` được tạo, và actor, thời điểm, quyết định được audit |
| **AC12** Chứng từ tài chính | **Cho** một khoản chi đã tồn tại, **khi** CMB đính kèm chứng từ, **thì** chứng từ tham chiếu đúng khoản chi đó và người tải lên cùng thời điểm được lưu |
| **AC13** Đối soát | **Cho** một ngân sách đã có khoản chi, **khi** chạy đối soát, **thì** hệ thống hiển thị tách bạch **Đã duyệt / Đã tạm ứng / Đã ghi nhận / Có chứng từ / Thiếu chứng từ / Còn lại**, và sau khi officer chấp nhận / loại từng khoản chi, chốt **chi hợp lệ** và **chênh lệch tất toán**: âm thì ngân sách chuyển `Recovery Pending` với số phải hoàn |
| **AC14** Tạm ngừng | **Cho** CLB đang `Active`, **khi** ICPDP tạm ngừng, **thì** CLB chuyển `Suspended`, không thể công bố đợt tuyển mới và không thể nộp đề xuất sự kiện mới |
| **AC15** Đánh giá | **Cho** một kỳ đánh giá đã được cấu hình, **khi** ICPDP sinh bản nháp, **thì** mọi dimension đều truy vết được về dữ liệu nguồn |
| **AC16** Xung đột booking | **Cho** property P đã có booking `Approved` từ 14:00–16:00 ngày D, **khi** một CLB khác xin P từ 15:00–17:00 ngày D, **thì** hệ thống trả `Blocking Conflict` và booking không thể chuyển `Approved` khi chính sách cấm overbooking |
| **AC17** Thẩm quyền booking | **Cho** một booking đang `Requested`, **khi** một người dùng không phải ICPDP cố phê duyệt, **thì** hệ thống từ chối thao tác **và ghi audit lần thử trái quyền đó** |
| **AC18** Phản hồi sự kiện | **Cho** sinh viên đã check-in sự kiện E và window đang mở, **khi** họ gửi phản hồi lần đầu, **thì** một bản ghi `EventFeedback` được tạo; **khi** chính sinh viên đó gửi lần hai cho E, **thì** bị từ chối; **khi** window đã đóng, **thì** bị từ chối |
| **AC19** Định tuyến khiếu nại | **Cho** sinh viên gửi khiếu nại về CLB X, **khi** khiếu nại được tạo, **thì** chỉ ICPDP thấy nội dung gốc, CLB X không nhận được gì cho tới khi ICPDP chọn `Forwarded`, và khi ICPDP chọn `Escalated` thì một `Violation` được tạo và trỏ ngược về khiếu nại |
| **AC20** Đăng nhập Google OAuth | **Cho** người dùng đã xác thực thành công với Google, **khi** email trả về nằm ngoài domain đã cấu hình, **thì** không tạo phiên và không tạo bản ghi `User`; **khi** email thuộc domain hợp lệ và chưa có `User`, **thì** đúng một `User` và một `StudentProfile` được tạo |

Hai tiêu chí bổ sung đến từ các sửa đổi của v2, và có tính bắt buộc như trên:

| ID | Tiêu chí |
|---|---|
| **AC21** Ngưỡng ẩn danh phản hồi | **Cho** một sự kiện có số người phản hồi ít hơn mức tối thiểu đã cấu hình, **khi** CMB mở màn hình phản hồi, **thì** chỉ hiển thị việc có tồn tại phản hồi — không hiển thị điểm, phân bố hay nhận xét (BR40) |
| **AC22** Giải thể có lịch | **Cho** ICPDP ghi nhận một quyết định giải thể trong học kỳ S, **thì** CLB tiếp tục hoạt động hết S, chuyển `Dissolving` vào đầu S+1 và không được tạo việc mới, và chuyển `Dissolved` vào cuối S+1 — đồng thời không sự kiện hay booking nào của CLB đó kết thúc sau S+1 (BR44, BR45) |

---

# 14. Truy vết yêu cầu

## 14.1 Pain point → use case → yêu cầu

| BP | Use case | Yêu cầu chính | Mức phủ |
|---|---|---|---|
| BP01 trạng thái CLB không tập trung | UC02, UC15 | FR-UC02-02, FR-UC15-03…11 | Đầy đủ — câu trả lời là dashboard, không phải lệnh tạm ngừng |
| BP02 số thành viên không chính xác | UC20, UC21, UC24 | FR-UC20-01, FR-UC21-01…10, FR-UC24-01 | Đầy đủ |
| BP03 lịch sử ban chủ nhiệm và nhiệm kỳ | UC10, UC11, UC12, UC13 | FR-UC11-03, FR-UC13-03 | Đầy đủ |
| BP04 hồ sơ thành lập phân tán | UC07, UC08 | FR-UC07-03/06, FR-UC08-04…08 | Đầy đủ |
| BP05 không có workflow sự kiện | UC25, UC26, UC27 | FR-UC25-05, FR-UC26-04, FR-UC27-02 | Đầy đủ |
| BP06 không phát hiện trùng lịch | BR15 bên trong UC25 và UC45 | FR-UC25-03, FR-UC45-03 | Đầy đủ — là quy tắc luôn bật, không phải use case có thể hoãn |
| BP07 đăng ký tách rời sự kiện | UC29, UC31, UC32 | FR-UC29-01, FR-UC31-02, FR-UC32-03 | Đầy đủ |
| BP08 sự kiện có thực sự diễn ra không | UC33, UC34 | FR-UC33-01/04, FR-UC34-02 | Đầy đủ |
| BP09 ngân sách không liên kết end-to-end | UC25, UC26, UC35–UC37 | FR-UC25-18, FR-UC26-14, FR-UC36-02, FR-UC37-01 | Đầy đủ |
| BP10 không phát hiện được chi vượt | UC35, UC36, UC37 | FR-UC35-05, FR-UC36-03/07, FR-UC37-01 | Đầy đủ |
| BP11 tuyển thành viên không liên kết | UC16, UC17, UC18, UC20 | FR-UC17-02, FR-UC20-01 | Đầy đủ |
| BP12 không có lịch sử tuân thủ | UC34, UC40 | FR-UC34-02, FR-UC40-01…10 | Đầy đủ — một phát hiện trên báo cáo mở ra một hồ sơ |
| BP13 đánh giá thủ công | UC41, UC42, UC43 | FR-UC42-01…03, FR-UC43-03 | Đầy đủ |
| BP14 nhắc deadline thủ công | UC04 + scheduler (§8.2), hiển thị ở UC02 | FR-UC04-01, NTF-05, SCH-09 | Đầy đủ |
| BP15 không có audit trail | BR05 xuyên suốt, đọc bên trong UC08, UC26, UC46 | AUD-01…05, WF-08 | Đầy đủ, không cần use case riêng |
| BP16 mượn cơ sở vật chất qua email | UC44, UC45, UC46, UC47 | FR-UC45-03, FR-UC46-04, FR-UC47-02 | Đầy đủ |
| BP17 phản hồi không có cấu trúc | UC48, UC49 | FR-UC48-02/03, FR-UC49-01 | Đầy đủ |
| BP18 không có kênh khiếu nại | UC50, UC51, UC52 | FR-UC50-03, FR-UC51-02, FR-UC52-03 | Đầy đủ |
| BP19 phải nhớ thêm mật khẩu | UC01 | FR-UC01-01…12 | Đầy đủ |

## 14.2 Use case → module, actor, thực thể và quy tắc

| UC | Module | Actor | Thực thể chính | Quy tắc |
|---|---|---|---|---|
| UC01 | M01 | Tất cả | User, StudentProfile | BR32, BR47 |
| UC02 | M01 | Tất cả | — (chỉ đọc) | BR49, BR53, BR56 |
| UC03 | M01 | ICPDP | User, Role | BR19, BR47 |
| UC04 | M01 | ICPDP | PolicyVersion | BR42 + 9 giá trị |
| UC05 | M01 | ICPDP | RoutingRuleSet | BR16, BR31 |
| UC06 | M02 | Student | Club (đọc) | BR09, BR14 |
| UC07 | M02 | Student | ClubApplication (gồm cơ cấu role dự kiến) | BR02, BR03, BR04, BR55, BR56 |
| UC08 | M02 | ICPDP | ClubApplication, Club, ClubRoleStructureVersion | BR05, BR31, BR55, BR56 |
| UC09 | M02/M03 | Club Member | Club, ban / bộ phận | BR54 |
| UC10 | M03 | Club Leader | Đề xuất ban chủ nhiệm | BR06, BR07, BR47, BR55 |
| UC11 | M03 | ICPDP | ClubTerm, ClubPositionAssignment | BR05, BR07, BR47, BR55, BR56 |
| UC12 | M03 | Club Leader | TransitionPlan | BR08, BR47, BR55, BR56 |
| UC13 | M03 | ICPDP | ClubTerm, ClubRoleStructureVersion | BR08, BR55, BR56 |
| UC14 | M02 | Club Leader | Yêu cầu tạm ngừng | BR47, BR55 |
| UC15 | M02 | ICPDP | Club | BR09, BR10, BR34, BR44, BR45 |
| UC16 | M04 | Club Member | RecruitmentCampaign | BR01, BR09, BR11, BR54 |
| UC17 | M04 | Student | RecruitmentApplication | BR11, BR12, BR13, BR46 |
| UC18 | M04 | Club Member | RecruitmentApplication | BR54 |
| UC19 | M04 | Club Member | CandidateEvaluation | BR54 |
| UC20 | M04 | Club Member | ClubMembership, ClubPositionAssignment (Members) | BR13, BR46, BR54, BR56 |
| UC21 | M04 | Club Member | ClubMembership | BR46, BR52, BR54 |
| UC22 | M04 | Club Member | Yêu cầu rời CLB | BR05, BR52 |
| UC23 | M03/M04 | Club Leader | ClubPosition (role CLB), ClubPositionAssignment, ClubRoleStructureVersion | BR47, BR49, BR54, BR55, BR56 |
| UC24 | M04 | Club Member | — (chỉ đọc) | BR49 |
| UC25 | M05 | Club Member | Event, EventProposalVersion | BR10, BR15, BR21, BR44, BR45, BR53, BR54 |
| UC26 | M05 | ICPDP | Event | BR05, BR14, BR16, BR31 |
| UC27 | M05 | Club Member | Event | BR14, BR17, BR50, BR53, BR54 |
| UC28 | M05 | Club Member | Event, PropertyBooking | BR15, BR35, BR54 |
| UC29 | M06 | Student | EventRegistration | BR17, BR48, BR50 |
| UC30 | M06 | Club Member | EventRegistration | BR05, BR17, BR54 |
| UC31 | M06 | Student (+Club Member) | Attendance | BR18, BR36 |
| UC32 | M06 | Club Member | Attendance | BR18, BR19, BR53, BR54 |
| UC33 | M08 | Club Member | PostEventReport | BR20, BR21, BR54 |
| UC34 | M08 | ICPDP | PostEventReport, Event | BR05, BR21 |
| UC35 | M07 | ICPDP | EventBudget, BudgetDisbursement | BR23, BR26, BR58 |
| UC36 | M07 | Club Member | Expense, FinancialEvidence, EventBudget | BR21, BR24, BR25, BR54, BR57 |
| UC37 | M07 | ICPDP | FinancialReconciliation | BR21, BR23, BR24, BR26, BR57, BR58 |
| UC38 | M08 | Club Member | PeriodicReport | BR20, BR54 |
| UC39 | M08 | ICPDP | PeriodicReport | BR05, BR21 |
| UC40 | M08 | ICPDP | Violation, CorrectiveAction | BR27, BR28 |
| UC41 | M09 | ICPDP | EvaluationScheme | BR29, BR30, BR51 |
| UC42 | M09 | ICPDP | Evaluation | BR29, BR30, BR51 |
| UC43 | M09 | ICPDP | Evaluation | BR30 |
| UC44 | M11 | ICPDP | Property | BR41 |
| UC45 | M11 | Club Member | PropertyBooking | BR15, BR33, BR34, BR45, BR54 |
| UC46 | M11 | ICPDP | PropertyBooking | BR31, BR33, BR34, BR35 |
| UC47 | M11 | Club Member | PropertyBooking | BR35, BR54 |
| UC48 | M12 | Student | EventFeedback | BR36, BR37, BR40 |
| UC49 | M12 | Club Member | — (đọc bản tổng hợp) | BR37, BR40, BR54 |
| UC50 | M12 | Student | Complaint | BR38 |
| UC51 | M12 | ICPDP | Complaint, Violation | BR38, BR39 |
| UC52 | M12 | Club Member | Complaint | BR54 |

## 14.3 User story → use case

| US | Use case | US | Use case | US | Use case |
|---|---|---|---|---|---|
| US01 | UC07 | US15 | UC30 | US29 | UC43 |
| US02 | UC08 | US16 | UC31, UC32 | US30 | UC02, UC04 |
| US03 | UC08 | US17 | UC33 | US31 | UC02 |
| US04 | UC09, UC23 | US18 | UC34 | US32 | §8.3 audit |
| US05 | UC11 | US19 | UC25 | US33 | UC06 |
| US06 | UC12 | US20 | UC25, UC26 | US34 | UC15 |
| US07 | UC16 | US21 | UC36 | US35 | UC43 |
| US08 | UC02, UC17 | US22 | UC37 | US36 | UC45 |
| US09 | UC18, UC19 | US23 | UC38 | US37 | UC46 |
| US10 | UC20 | US24 | UC02, §8.2 | US38 | UC48 |
| US11 | UC25 | US25 | UC40 | US39 | UC49 |
| US12 | BR15 trong UC25 | US26 | UC40, UC52 | US40 | UC50 |
| US13 | UC26 | US27 | UC42 | US41 | UC01 |
| US14 | UC29 | US28 | UC41 | | |

## 14.4 Luồng dữ liệu context → use case

Mọi luồng trên context diagram (R5) đều được tạo ra hoặc tiêu thụ bởi ít nhất một use case.

| Từ → Đến | Luồng dữ liệu | Use case |
|---|---|---|
| Student → Hệ thống | Club establishment application | UC07 (gồm cơ cấu role dự kiến) |
| Student → Hệ thống | Membership application | UC17 |
| Student → Hệ thống | Event registration, check-in & feedback | UC29, UC31, UC48 |
| Student → Hệ thống | Club complaint | UC50 |
| Hệ thống → Student | Club & event information | UC06 |
| Hệ thống → Student | Student profile | UC01, UC02 |
| Hệ thống → Student | Application & registration results | UC08, UC18, UC20, UC29, UC30 |
| Hệ thống → Student | Complaint outcome | UC51 |
| Club Member → Hệ thống | Club profile & membership data | UC09, UC16, UC18, UC19, UC20, UC21 |
| Club Member → Hệ thống | Event proposals & internal events | UC25 (gồm ngân sách sự kiện và sự kiện nội bộ theo BR53), UC27, UC28, UC30, UC32 |
| Club Member → Hệ thống | Event & periodic reports | UC33, UC38 |
| Club Member → Hệ thống | Expenses | UC36 |
| Club Member → Hệ thống | Property booking requests | UC45, UC47 |
| Club Member → Hệ thống | Complaint response | UC52 |
| Club Member → Hệ thống | Leave request | UC22 |
| Hệ thống → Club Member | Member workspace | UC24 |
| Hệ thống → Club Member | Member applications & event registrations | UC17 → UC18, UC29 → UC30, UC32 |
| Hệ thống → Club Member | Review decisions & disbursements | UC26, UC34, UC35, UC39, UC46 |
| Hệ thống → Club Member | Event feedback & forwarded complaints | UC49, UC51 → UC52 |
| Hệ thống → Club Member | Violation notices & evaluation results | UC40, UC43 |
| Hệ thống → Club Member | Deadline reminders | UC04 + scheduler |
| Club Leader → Hệ thống | Leadership & suspension requests | UC10, UC12, UC14 |
| Club Leader → Hệ thống | Club roles & permissions | UC23 (phiên bản cơ cấu mới, BR56) |
| Hệ thống → Club Leader | Leadership & club status decisions | UC11, UC13, UC15 |
| ICPDP → Hệ thống | System configuration | UC03, UC04, UC05, UC41, UC44 |
| ICPDP → Hệ thống | Review decisions | UC08, UC11, UC13, UC26, UC34, UC39, UC46 |
| ICPDP → Hệ thống | Club status & violation decisions | UC15, UC40 |
| ICPDP → Hệ thống | Disbursements & reconciliation | UC35, UC37 |
| ICPDP → Hệ thống | Complaint triage | UC51 |
| ICPDP → Hệ thống | Evaluation scoring | UC43 |
| Hệ thống → ICPDP | Submissions for review | UC07 → UC08, UC10 → UC11, UC12 → UC13, UC14 → UC15, UC25 → UC26, UC33 → UC34, UC36 → UC37, UC38 → UC39, UC45 → UC46 |
| Hệ thống → ICPDP | Club complaints | UC50 → UC51 |
| Hệ thống → ICPDP | Internal event records | UC25 (BR53) → UC02 |
| Hệ thống → ICPDP | Club statistics & evaluation draft | UC02, UC42 |
| Hệ thống → ICPDP | Club role structure & board history | UC02 (phiên bản cơ cấu và lịch sử ban điều hành của mọi CLB; BR56) |
| Hệ thống → Google OAuth | Authentication request | UC01 |
| Google OAuth → Hệ thống | Identity data | UC01 |
| Hệ thống → Google SMTP | Email message | mọi thông báo có kênh email (§8.2) |
| Hệ thống → Cloudinary | Image file | mọi UC có tải ảnh lên |
| Cloudinary → Hệ thống | Image URL | mọi UC có tải ảnh lên |

## 14.5 Bản đồ quan hệ use case

```text
UC01 Đăng nhập
 └─ UC02 Dashboard ── mọi use case đều mở từ đây

CLB:         UC07 Nộp ⇄ UC08 Thẩm định&Quyết định → UC09 Hồ sơ/Cơ cấu
                                                  → UC10 Đề xuất ban → UC11 Xác nhận
                                                  → UC15 Tạm ngừng/Kích hoạt lại/Giải thể
Tuyển TV:    UC06 Khám phá → UC17 Ứng tuyển → UC18 Sàng lọc&Quyết định → UC20 Tiếp nhận → UC21 Trạng thái
                                             ├─ UC19 Đánh giá ứng viên
                                             └─ UC24 Không gian thành viên
                                                UC22 Xin rời → UC21
                                                UC23 Vai trò CLB & phân quyền (Club Leader)
Sự kiện:     UC25 Đề xuất ⇄ UC26 Thẩm định&Quyết định → UC27 Công bố → UC29 Đăng ký → UC31 Check-in
                │  BR15 xung đột đánh giá bên trong                     └─ UC30 Danh sách chờ
                └─ «extend» UC45 Booking                              → UC32 Chốt điểm danh
             UC28 Huỷ/Đổi lịch tác động lên UC27–UC33 và gọi UC47
                                                                      → UC33 Báo cáo → UC34 Đóng
Tài chính:   UC26 duyệt ngân sách trong đề xuất → UC35 Giải ngân → UC36 Khoản chi+Chứng từ
                                                                      → UC37 Đối soát
Cơ sở VC:    UC44 Danh mục → UC45 Yêu cầu ⇄ UC46 Thẩm định&Quyết định → UC47 Theo dõi/Trả
Báo cáo:     UC38 Nộp → UC39 Thẩm định
Phản hồi:    UC31 Check-in → UC48 Phản hồi → UC49 CMB xem → UC33 Báo cáo
Khiếu nại:   UC50 Gửi → UC51 Phân loại ─┬─ Bác bỏ
                                        ├─ Chuyển xuống → UC52 CLB trả lời
                                        └─ Leo thang → UC40 Hồ sơ → UC15
Đánh giá:    UC41 Scheme → UC42 Bản nháp → UC43 Công bố
             UC42 tiêu thụ UC21, UC32, UC34, UC37, UC39, UC40, UC46, UC47, UC48, UC51
Cấu hình:    UC03 Tài khoản · UC04 Chính sách&Deadline · UC05 Định tuyến
             cấp dữ liệu cho UC01, UC08, UC26, UC46
```

`⇄` đánh dấu một cặp nộp / thẩm định mà vòng chỉnh sửa của nó là **luồng thay thế của use case
nộp**, không phải một use case riêng. Use case diagram không vẽ `«extend»`: quan hệ
UC45→UC25 và UC47→UC28 chỉ ghi trong Spec; điều hướng giữa các màn hình và cascade hệ thống
**không** được mô hình hoá bằng `«extend»` (review issue I27, I28, I55).

---

# 15. Phạm vi phát hành và thứ tự triển khai

Cả 52 use case ra trong **một bản phát hành**, nhóm thành các vòng lặp mà mỗi vòng đều khép kín
— không có gì kết thúc ở một trạng thái mà không use case nào rời đi được.

| # | Vòng lặp | Use case | Khép kín khi |
|---|---|---|---|
| 1 | Truy cập & cấu hình | UC01–UC05 | người dùng vào được workspace và ICPDP đặt được chính sách, định tuyến |
| 2 | Thành lập & quản trị CLB | UC06–UC15 | một CLB tồn tại, có ban chủ nhiệm, và có thể bị tạm ngừng, kích hoạt lại hoặc giải thể |
| 3 | Tuyển thành viên → thành viên | UC16–UC24 | một đơn ứng tuyển trở thành tư cách thành viên với danh sách duy trì được |
| 4 | Duyệt → công bố sự kiện | UC25–UC28 | một sự kiện đã duyệt được công bố, và huỷ hoặc đổi lịch được |
| 5 | Đăng ký → điểm danh | UC29–UC32 | tồn tại một bộ dữ liệu điểm danh chính thức |
| 6 | Trách nhiệm sau sự kiện | UC33, UC34 | sự kiện chuyển `Closed` |
| 7 | Tài chính | UC35–UC37 | ngân sách sự kiện `Closed` sau khi đối soát |
| 8 | Báo cáo định kỳ | UC38, UC39 | một báo cáo được chấp nhận trở thành đầu vào đánh giá |
| 9 | Governance intelligence | UC40–UC43 | tồn tại một kỳ đánh giá đã công bố, và hồ sơ vi phạm được xử lý xong |
| 10 | Cơ sở vật chất | UC44–UC47 | một khung giờ đã đặt được sử dụng hoặc được trả lại |
| 11 | Phản hồi & khiếu nại | UC48–UC52 | phản hồi được tổng hợp và khiếu nại có kết quả xử lý |

**Không cắt use case nào.** Mỗi vòng lặp được build trọn, không bao giờ làm nửa vòng, theo thứ tự
sprint dưới đây.

**Thứ tự sprint đề xuất** (theo phụ thuộc): 1 → 2 → 3 → 4 → 5 → 6 → 10 → 7 → 8 → 11 → 9.
Vòng 10 được đặt trước Tài chính vì vòng sự kiện đã liên kết sang booking (FR-UC25-04 /
UC45 A2), và vòng 9 đặt cuối vì UC42 cần dữ liệu trọn một kỳ từ mọi vòng khác.

---

# 16. Quyết định còn mở và vấn đề đã biết

## 16.1 Quyết định còn mở của nhóm (theo R2 §14)

| # | Quyết định | Vì sao không thể mặc định | Hệ quả nếu chốt muộn |
|---|---|---|---|
| **D1** | Cấp duyệt thứ hai là một quyền RBAC hay một actor thứ tư (`ICPDP Head`)? | BR31 như đang viết cấm actor thứ tư; tính năng định tuyến lại đòi cấp thứ hai. Hiện cả hai cùng đúng chỉ vì mọi cấp đều do một ICPDP Officer thực hiện | Đổi sơ đồ actor, §2.3 và mô hình quyền — cần chốt **trước khi** làm UC05 |
| **D2** | Ngoài danh sách của UC04, những giá trị nào nữa được sửa trong sản phẩm? | Mỗi giá trị thêm vào tốn một màn hình, một schema và một đường validate; danh sách phải đến từ quy trình thật của ICPDP | Đổi UC04 và BR42 — cần chốt trước khi đóng băng màn hình cấu hình |
| **D3** | Số người phản hồi tối thiểu ban đầu cho BR40 | Đây là con số chính sách, không phải con số kỹ thuật. Năm là mức sàn phổ biến | Thấp — giá trị này cấu hình được ở UC04 |
| **D4** | Sự kiện đổi lịch có cần quyết định mới từ UC26, hay chỉ cần thông báo? | Phụ thuộc cách ICPDP thực sự xử lý một thay đổi thời gian | Đổi FR-UC28-02 — cần chốt trước khi làm UC28 |
| **D5** | UC52 có cho CMB thấy danh tính người khiếu nại không? | Đây là quy tắc riêng tư mà nhà trường phải đặt ra; mô hình hỗ trợ cả hai hướng | Đổi FR-UC52-01 và SEC-09 |

## 16.2 Vấn đề tài liệu còn mở (theo R4)

| ID | Vấn đề | Trạng thái trong SRS này |
|---|---|---|
| **I21** | UC09 E2 và UC21 bước 4 tham chiếu UC23 để thu hồi chức vụ, vốn là một phụ thuộc chéo phase trong cách chia phase cũ | Cách chia phase đã bị rút (I26) và mọi use case ra cùng một bản phát hành, nên phụ thuộc này là hợp lệ. SRS này nêu rõ cả hai đường: ghế **ban chủ nhiệm** được thay qua UC10 / UC11 (FR-UC23-14, FR-UC21-07) và role **nội bộ** qua UC23 (FR-UC21-03). Không còn mâu thuẫn |
| **I22** | UC06 nói "chỉ liệt kê CLB `Active`" rồi lại nói "CLB `Suspended` vẫn hiển thị nhưng được đánh dấu" — hai câu mâu thuẫn nhau | **Đã sửa** (2026-09-26): liệt kê CLB `Active` và `Suspended`; CLB `Suspended` được đánh dấu và không hiện đợt tuyển nào (BR09); CLB `Dissolved` không được liệt kê — FR-UC06-03, R2, R3 đã thống nhất |

## 16.3 Nợ tài liệu

| Hạng mục | Việc cần làm |
|---|---|
| [`02-use-cases/UCMS_UseCase_Specifications_v2.docx`](02-use-cases/UCMS_UseCase_Specifications_v2.docx) vẫn mang phần bìa của v1 ("57 business use cases", "BR01–BR39") và ra đời trước các issue I04–I07, I23–I30 | Xuất lại từ `UCMS_UseCase_Specification_v2.md` trước lần nộp tiếp theo |
| [`01-business-analysis/UCMS_Business_System_Analysis.md`](01-business-analysis/UCMS_Business_System_Analysis.md) dùng cách đánh số v1 (UC01–UC57) và BR01–BR39, và bản tiếng Anh song song đã bị xoá | Giữ làm lịch sử. **SRS này thay thế §8–§11, §14–§15, §21–§22 của nó**; chỉ dùng §1–§7, §12–§13, §16–§20, §23–§24 làm nền tảng tham khảo |
| Các file PNG trong `03-diagrams/img/` được xuất từ nguồn `.drawio` | Xuất lại sau mỗi lần sửa sơ đồ, giữ quy ước tên `<file>_<số-trang>_<tên-trang>.png` |

---

# 17. Thuật ngữ

| Thuật ngữ | Định nghĩa |
|---|---|
| **Aggregate** | Một cụm thực thể được ghi như một khối duy nhất bởi module sở hữu nó (§2.2, CON-05) |
| **Approval task** | Việc cần xử lý phía người duyệt, dùng chung cho mọi cặp nộp / thẩm định (§8.1) |
| **Assess-and-decide** | Mẫu thẩm định một phiên với đúng ba kết quả: yêu cầu chỉnh sửa, phê duyệt, từ chối |
| **Attendance đã chốt** | Bộ dữ liệu điểm danh bị khoá do UC32 tạo ra; là đầu vào của báo cáo sau sự kiện và của kỳ đánh giá |
| **Blackout period** | Giai đoạn một property không được đặt (bảo trì, nhà trường sử dụng) |
| **Blocking conflict** | Kết quả BR15 ngăn việc nộp hoặc phê duyệt khi chính sách cấm chồng lịch |
| **CMB** | Club Management Board — tên gọi chung của phía CLB (Club Leader và Club Member có role), không còn là actor (I58) |
| **Club Leader / Club Member** | Actor A3 / A2 (§2.3); Student ◁ Club Member ◁ Club Leader |
| **Club context** | CLB mà người dùng đang thao tác nhân danh; một người có thể có nhiều |
| **Compliance signal** | Một sự kiện được ghi nhận để UC40 dùng về sau (huỷ sát giờ, quá hạn trả lời, báo cáo quá hạn) |
| **Data lineage** | `kết quả dimension → chỉ số → thực thể nguồn → kỳ dữ liệu nguồn` (EVL-02) |
| **Dissolving** | Học kỳ mà một CLB bị giải thể dùng để đóng nốt công việc còn lại; không tạo gì mới |
| **Founding permission** | Quyền leader tạm thời do UC08 cấp, chỉ dùng cho UC09, UC10 và UC23, bị thu hồi ở UC11 (BR47) |
| **ICPDP** | Đơn vị quản lý hoạt động CLB của nhà trường — actor A3, cấp phê duyệt duy nhất cho yêu cầu gửi lên nhà trường |
| **Outbox** | Hàng đợi thông báo được lưu xuống DB và do scheduler rút (§8.2) |
| **Policy version** | Bản chụp có ngày hiệu lực của chín giá trị cấu hình được ở UC04 |
| **Property** | Phòng, hội trường hoặc thiết bị có thể đặt (UC44) |
| **Release / Released (booking)** | Booking được giải phóng vì sự kiện của nó bị huỷ (BR35) |
| **Revision / Version** | Bản chụp chỉ-ghi-thêm của một hồ sơ đã nộp (CON-08) |
| **Routing rule** | Điều kiện ở UC05 quyết định một hồ sơ có cần cấp ICPDP thứ hai hay không |
| **Scheduler** | Chức năng hệ thống chạy theo thời gian (§8.4); không bao giờ là actor |
| **Scope check** | Kiểm tra trong usecase rằng actor thuộc *đúng* CLB đó, với *đúng* chức vụ đó, trong *đúng* nhiệm kỳ hiện tại (SEC-03) |
| **Settlement (quyết toán)** | Bộ khoản chi và chứng từ CLB nộp cho một ngân sách đã tạm ứng sau khi sự kiện kết thúc hoặc bị huỷ (UC36, BR57) |
| **Settlement balance (chênh lệch tất toán)** | Chi hợp lệ (trần là số duyệt) − đã tạm ứng; dương → cấp bù, âm → thu hồi (UC37, BR58) |
| **Supported / unsupported expense** | Khoản chi có, hoặc chưa có, chứng từ mà hạng mục của nó yêu cầu (BR25) |
| **Term** | Nhiệm kỳ có giới hạn thời gian (`ClubTerm`), là nguồn suy ra quyền CMB |
| **Waitlist** | Hàng đợi có thứ tự của các đăng ký vượt sức chứa (UC29 A1, UC30) |

---

# Phụ lục A — User story

41 user story của R1 §12. Mỗi story ánh xạ tới một use case ở §14.3.

| # | Với tư cách … | Tôi muốn … | để … |
|---|---|---|---|
| US01 | Sinh viên | nộp hồ sơ thành lập CLB trực tuyến | tôi không phải quản lý nhiều file và email trong quá trình xin thành lập |
| US02 | ICPDP Officer | xem được mọi version của một hồ sơ thành lập | tôi biết chính xác người nộp đã thay đổi gì trước khi tôi duyệt |
| US03 | ICPDP Officer | yêu cầu chỉnh sửa trên từng phần cụ thể | người nộp biết chính xác phải sửa gì thay vì nhận phản hồi chung chung |
| US04 | Chủ nhiệm CLB | duy trì cơ cấu tổ chức của CLB | quyền hạn và trách nhiệm trong CLB minh bạch |
| US05 | ICPDP Officer | nhiệm kỳ lãnh đạo được ghi nhận chính thức | nhà trường xác định được ai đại diện CLB ở từng thời điểm |
| US06 | Chủ nhiệm sắp mãn nhiệm | lập một kế hoạch chuyển giao có cấu trúc | công việc tồn đọng không bị mất giữa hai nhiệm kỳ |
| US07 | Chủ nhiệm CLB | công bố các đợt tuyển thành viên | đơn của sinh viên được thu thập theo một quy trình thống nhất |
| US08 | Sinh viên | theo dõi trạng thái đơn ứng tuyển của mình | tôi không phải liên hệ thủ công với CLB để hỏi kết quả |
| US09 | Chủ nhiệm CLB | đánh giá ứng viên theo một quy trình đã định | quyết định tuyển chọn nhất quán hơn |
| US10 | Chủ nhiệm CLB | ứng viên trúng tuyển trở thành thành viên mà không phải nhập lại dữ liệu | danh sách thành viên luôn đồng bộ |
| US11 | Chủ nhiệm CLB | nộp đề xuất sự kiện trực tuyến | ICPDP xét duyệt theo một workflow thống nhất |
| US12 | Chủ nhiệm CLB | hệ thống cảnh báo trùng lịch sự kiện | vấn đề trùng địa điểm/thời gian được phát hiện trước khi duyệt |
| US13 | ICPDP Officer | yêu cầu chỉnh sửa thay vì từ chối ngay | một đề xuất hợp lý có cơ hội được hoàn thiện |
| US14 | Sinh viên | đăng ký các sự kiện đã được duyệt | thông tin tham gia của tôi được ghi nhận tập trung |
| US15 | Chủ nhiệm CLB | quản lý sức chứa và danh sách chờ | số người tham gia không vượt quá khả năng tổ chức |
| US16 | Chủ nhiệm CLB | điểm danh gắn với đăng ký | thống kê sau sự kiện đáng tin cậy |
| US17 | Chủ nhiệm CLB | báo cáo sau sự kiện tái sử dụng dữ liệu đăng ký và điểm danh | tôi không phải tổng hợp lại thủ công |
| US18 | ICPDP Officer | sự kiện chưa hoàn tất cho tới khi báo cáo bắt buộc được nộp | CLB phải chịu trách nhiệm sau khi được phép tổ chức |
| US19 | Thủ quỹ CLB | lập phần ngân sách có cấu trúc ngay trong đề xuất sự kiện | quyết định cấp kinh phí truy vết được |
| US20 | ICPDP Officer | mọi khoản ngân sách gắn với một sự kiện và được duyệt cùng đề xuất | tôi hiểu rõ kinh phí dùng vào việc gì |
| US21 | Thủ quỹ CLB | mỗi khoản chi gắn với chứng từ của nó | việc đối soát nhanh và minh bạch |
| US22 | ICPDP Officer | so sánh kinh phí đã duyệt với chi tiêu có chứng từ | tôi đánh giá được mức độ tuân thủ tài chính |
| US23 | Chủ nhiệm CLB | báo cáo định kỳ được nạp sẵn dữ liệu hệ thống | tôi chỉ phải nhập những gì hệ thống chưa có |
| US24 | ICPDP Officer | nhìn thấy các nghĩa vụ quá hạn | tôi can thiệp trước khi vấn đề trở nên nghiêm trọng |
| US25 | ICPDP Officer | vi phạm được lưu thành hồ sơ có cấu trúc | cảnh báo và quyết định xử lý dựa trên chứng cứ |
| US26 | Chủ nhiệm CLB | được phản hồi các hồ sơ tuân thủ | CLB có cơ hội giải trình và cung cấp chứng cứ |
| US27 | ICPDP Officer | dữ liệu đánh giá được thu thập tự động từ các module khác | đánh giá không phụ thuộc tổng hợp Excel thủ công |
| US28 | ICPDP Officer | dimension và trọng số đánh giá cấu hình được | thay đổi chính sách không đòi hỏi sửa code |
| US29 | ICPDP Officer | xem lại bản nháp đánh giá trước khi công bố | dữ liệu bất thường có thể được kiểm tra |
| US30 | Chủ nhiệm CLB | nhìn thấy deadline báo cáo và tài chính | CLB không vi phạm chỉ vì quên hạn |
| US31 | ICPDP Officer | một dashboard các hồ sơ chờ duyệt | không hồ sơ nào bị bỏ quên |
| US32 | ICPDP Officer | mọi quyết định phê duyệt được audit | tranh chấp có thể điều tra khách quan |
| US33 | Sinh viên | chỉ thấy các CLB đang hoạt động và các đợt tuyển hợp lệ | tôi không ứng tuyển vào CLB đã ngừng hoạt động |
| US34 | ICPDP Officer | lệnh tạm ngừng chặn ngay các thao tác bị cấm | quyết định quản trị thực sự được thực thi |
| US35 | ICPDP Officer | lịch sử đánh giá theo học kỳ và năm học | tôi theo dõi được xu hướng phát triển của CLB |
| US36 | Chủ nhiệm CLB | xin phòng và thiết bị ngay trong cùng hệ thống với đề xuất sự kiện | tôi không phải xin cơ sở vật chất qua email tách rời |
| US37 | ICPDP Officer | thấy xung đột booking trước khi duyệt | hai CLB không được cấp cùng một phòng trong cùng khung giờ |
| US38 | Sinh viên | gửi phản hồi sau sự kiện tôi đã tham dự | ý kiến của tôi được ghi nhận thay vì chỉ nói miệng |
| US39 | Chủ nhiệm CLB | xem phản hồi sự kiện ở dạng tổng hợp | tôi biết cần cải thiện gì ở lần sau |
| US40 | Sinh viên | gửi khiếu nại về một CLB thẳng tới ICPDP | phản ánh của tôi không bị chính CLB bị khiếu nại chặn lại |
| US41 | Người dùng bất kỳ | đăng nhập bằng tài khoản Google của trường | tôi không phải nhớ thêm một mật khẩu riêng |

---

# Phụ lục B — Chỉ mục sơ đồ

Mọi sơ đồ đều có nguồn draw.io kèm bản xuất PNG trong `03-diagrams/img/`
(`<file>_<số-trang>_<tên-trang>.png`).

| Sơ đồ | Các trang | File |
|---|---|---|
| **Context diagram v2.1** (hiện hành, 40 luồng, 7 thực thể ngoài) | Context diagram v2.1 | [`03-diagrams/UCMS_Context_Diagram_v2.1.drawio`](03-diagrams/UCMS_Context_Diagram_v2.1.drawio) |
| Context diagram v2 (đã thay thế, 57 luồng) | Context diagram v2 | [`03-diagrams/UCMS_Context_Diagram_v2.drawio`](03-diagrams/UCMS_Context_Diagram_v2.drawio) |
| Context diagram v1 (đã thay thế, 40 luồng) | Context diagram | [`03-diagrams/UCMS_Context_Diagram.drawio`](03-diagrams/UCMS_Context_Diagram.drawio) |
| So sánh context diagram v1 → v2 | — | [`03-diagrams/UCMS_Context_Diagram_Comparison.docx`](03-diagrams/UCMS_Context_Diagram_Comparison.docx) |
| **Use case diagram theo actor** (UC01–UC52) | All users (kế thừa actor) · Student · Club Leader · Club Member 1 - Club & recruitment · Club Member 2 - Events & bookings · Club Member 3 - Accountability & finance · ICPDP 1 Access & club lifecycle · ICPDP 2 Events, bookings & finance · ICPDP 3 Compliance & evaluation | [`03-diagrams/UCMS_UseCase_ByActor.drawio`](03-diagrams/UCMS_UseCase_ByActor.drawio) |
| **Cơ cấu tổ chức và luồng nghiệp vụ chính** (§2.4, §2.5) | Organization structure · Main business flows | [`03-diagrams/UCMS_Organization_and_Flows.drawio`](03-diagrams/UCMS_Organization_and_Flows.drawio) |
| **State diagram** | Club Application · Club · Membership · Recruitment Campaign · Recruitment Application · Event · Event Budget · Property Booking | [`03-diagrams/UCMS_State_Diagrams.drawio`](03-diagrams/UCMS_State_Diagrams.drawio) |

Quy ước vẽ đang có hiệu lực (review issue I09–I13, I27–I30, I55):

- Actor vẽ bằng hình người; biên hệ thống là một khung có nhãn `UCMS`.
- Mỗi trang actor chỉ nối actor tới các use case nhóm `Manage …`; use case nhóm `«include»` các
  chức năng con (use case quản lý danh mục tách theo CRUD). Oval chỉ ghi tên, không ghi mã UC.
- Không vẽ `«extend»`. Quan hệ UC45→UC25 và UC47→UC28 chỉ ghi trong Spec (luồng thay thế,
  Related UC); điều hướng màn hình và cascade hệ thống cũng không vẽ thành quan hệ (I27, I28, I55).
- Actor phụ được nối bằng association nét liền, không phải nét đứt.
- Không tồn tại `UC02 «include» UC01`: đăng nhập là **tiền điều kiện** của dashboard.
- Tên use case không bao giờ được rút gọn tới mức mất nghĩa ("Suspend / reactivate / dissolve
  club", "Cancel / release booking").
- Hai vòng đời không có trang state diagram riêng vì mỗi cái chỉ có một trạng thái có nghĩa hoặc
  hoàn toàn tuyến tính: **Event Feedback** (§6.11) và **Evaluation** (§6.12); **Violation**
  (§6.9) và **Complaint** (§6.10) chỉ được đặc tả ở §6.

---

# Phụ lục C — Bản đồ REST endpoint dự kiến

Suy ra từ R8 §7 và các aggregate ở §7.1. Mỗi module một file route; hình dạng chính xác của
request và response do schema zod định nghĩa và được công bố tại `/docs`.

| Module | Endpoint (dự kiến) |
|---|---|
| M01 | `GET /auth/google`, `GET /auth/google/callback`, `POST /auth/logout`, `GET /me`, `GET /dashboard`, `GET|PATCH /users/:id/roles`, `POST /users/:id/lock`, `GET|PUT /policies`, `GET|PUT /approval-routing` |
| M02 | `GET /clubs`, `GET /clubs/:id`, `POST /club-applications`, `PATCH /club-applications/:id` (nộp lại → version mới), `POST /club-applications/:id/withdraw`, `POST /club-applications/:id/decision`, `PATCH /clubs/:id/profile`, `POST /clubs/:id/suspension-requests`, `POST /clubs/:id/lifecycle` |
| M03 | `POST /clubs/:id/terms/nominations`, `POST /nominations/:id/decision`, `POST /clubs/:id/transitions`, `POST /transitions/:id/decision`, `GET|POST /clubs/:id/positions`, `POST /clubs/:id/position-assignments` |
| M04 | `GET|POST /clubs/:id/campaigns`, `POST /campaigns/:id/publish`, `GET|POST /campaigns/:id/applications`, `POST /applications/:id/withdraw`, `POST /applications/:id/screening`, `POST /applications/:id/decision`, `POST /applications/:id/evaluations`, `POST /applications/:id/onboard`, `GET /clubs/:id/members`, `PATCH /memberships/:id/status`, `POST /memberships/:id/leave-requests`, `GET /me/memberships` |
| M05 | `GET|POST /events`, `PATCH /events/:id` (nộp lại → bản sửa mới), `POST /events/:id/decision`, `POST /events/:id/publish`, `POST /events/:id/cancel`, `POST /events/:id/reschedule` |
| M06 | `POST /events/:id/registrations`, `DELETE /registrations/:id`, `GET /events/:id/registrations`, `PATCH /events/:id/capacity`, `POST /registrations/:id/promote`, `POST /events/:id/check-ins`, `POST /events/:id/attendance/finalize`, `POST /events/:id/attendance/unlock` |
| M07 | `GET /event-budgets/:id`, `POST /event-budgets/:id/disbursements` (`Advance` / `TopUp` / `Refund`), `GET|POST /event-budgets/:id/expenses`, `POST /expenses/:id/evidence`, `POST /event-budgets/:id/settlement`, `GET|POST /event-budgets/:id/reconciliation` — ngân sách được xin và duyệt qua `/events` (M05) |
| M08 | `GET|POST /events/:id/report`, `POST /event-reports/:id/decision`, `GET|POST /clubs/:id/periodic-reports`, `POST /periodic-reports/:id/decision`, `GET|POST /violations`, `PATCH /violations/:id`, `POST /violations/:id/corrective-actions` |
| M09 | `GET|POST /evaluation-schemes`, `POST /evaluation-schemes/:id/activate`, `POST /evaluations/generate`, `GET /evaluations`, `POST /evaluations/:id/finalize`, `POST /evaluations/:id/publish` |
| M10 | `GET /approvals` (hộp thư phê duyệt dùng chung), `GET /approvals/:id`, `GET /notifications`, `PATCH /notifications/:id/read`, `GET /audit-logs?entityType=&entityId=` |
| M11 | `GET|POST /properties`, `PATCH /properties/:id`, `GET /properties/:id/availability`, `GET|POST /property-bookings`, `PATCH /property-bookings/:id`, `POST /property-bookings/:id/decision`, `POST /property-bookings/:id/cancel` |
| M12 | `POST /events/:id/feedback`, `GET /events/:id/feedback/summary`, `GET|POST /complaints`, `POST /complaints/:id/withdraw`, `POST /complaints/:id/triage`, `POST /complaints/:id/response` |

Quy ước: endpoint **decision** mang kết quả (`request-revision` / `approve` / `reject`) kèm lý do
và nhận xét, và idempotent theo từng quyết định (API-07). **Nộp lại** là một `PATCH` trên chính
tài nguyên nộp, tạo ra một version mới chứ không ghi đè (CON-08).

---

*Hết tài liệu — UCMS Software Requirements Specification v1.0, 2026-09-24.*
