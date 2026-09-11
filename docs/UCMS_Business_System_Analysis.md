# HỆ THỐNG QUẢN LÝ CÂU LẠC BỘ TRONG TRƯỜNG ĐẠI HỌC
## University Club Management System (UCMS)

> **Loại tài liệu:** Business & System Analysis / Requirement Baseline  
> **Mục tiêu:** Làm nền tảng cho SRS, Use Case Diagram, Use Case Specification, Activity Diagram, Sequence Diagram, ERD, Database Design, API Design, UI/UX, Test Case, Product Backlog và Sprint Backlog.  
> **Nguyên tắc thiết kế:** Business Problem → Business Process → Actor → Requirement → Use Case.  
> **Quy mô mục tiêu:** 4 actor chính, 10 module nghiệp vụ, 50 business use case có liên kết end-to-end.

---

# MỤC LỤC

1. [Executive Summary](#1-executive-summary)
2. [Business Problems](#2-business-problems)
3. [Stakeholder Analysis](#3-stakeholder-analysis)
4. [Actor Analysis](#4-actor-analysis)
5. [System Scope](#5-system-scope)
6. [Module Decomposition](#6-module-decomposition)
7. [Core Business Flows](#7-core-business-flows)
8. [Master Use Case List](#8-master-use-case-list)
9. [Detailed Use Case Specification](#9-detailed-use-case-specification)
10. [Use Case Relationship Map](#10-use-case-relationship-map)
11. [Actor → Use Case Mapping](#11-actor--use-case-mapping)
12. [User Stories](#12-user-stories)
13. [Acceptance Criteria](#13-acceptance-criteria)
14. [Business Rules](#14-business-rules)
15. [Entity Lifecycle / State Machine](#15-entity-lifecycle--state-machine)
16. [Domain Model](#16-domain-model)
17. [Club Performance Evaluation Model](#17-club-performance-evaluation-model)
18. [Dashboard Requirements](#18-dashboard-requirements)
19. [Notification & Deadline Rules](#19-notification--deadline-rules)
20. [Audit Requirements](#20-audit-requirements)
21. [Requirement Traceability Matrix](#21-requirement-traceability-matrix)
22. [MVP vs Version 2](#22-mvp-vs-version-2)
23. [Feature nổi bật của đồ án](#23-feature-nổi-bật-của-đồ-án)
24. [Final Review](#24-final-review)

---

# 1. EXECUTIVE SUMMARY

## 1.1 Bài toán hệ thống

**University Club Management System – UCMS** là nền tảng quản trị tập trung cho toàn bộ hoạt động câu lạc bộ sinh viên trong trường đại học.

Bài toán cốt lõi **không phải** là tạo một website CRUD để lưu danh sách câu lạc bộ.

Bài toán thật sự là:

> **Chuẩn hóa, số hóa và kiểm soát toàn bộ vòng đời quản trị câu lạc bộ giữa sinh viên, Ban chủ nhiệm CLB, ICPDP và các đơn vị hỗ trợ của nhà trường.**

Vòng đời CLB được quản lý theo hướng:

```text
Thành lập
→ Xét duyệt
→ Vận hành
→ Tuyển thành viên
→ Tổ chức hoạt động
→ Quản lý tài chính
→ Báo cáo
→ Tuân thủ
→ Đánh giá
→ Chuyển giao nhiệm kỳ
→ Tạm ngừng / Giải thể
```

## 1.2 Giá trị cốt lõi

Hệ thống hướng tới ba mục tiêu chính:

1. **Single Source of Truth**  
   Tạo nguồn dữ liệu chính thức cho CLB, thành viên, nhiệm kỳ, sự kiện, ngân sách, báo cáo, vi phạm và đánh giá.

2. **Workflow Governance**  
   Mọi hồ sơ quan trọng đều có trạng thái, người chịu trách nhiệm, lịch sử xử lý và luồng phê duyệt rõ ràng.

3. **Cross-module Data**  
   Dữ liệu được tạo từ module trước trở thành input cho nghiệp vụ sau.

Ví dụ:

```text
Event
→ Registration
→ Attendance
→ Post-event Report
→ Evaluation
```

```text
Budget
→ Expense
→ Financial Evidence
→ Reconciliation
→ Financial Compliance
→ Evaluation
```

```text
Recruitment
→ Membership
→ Attendance
→ Member Engagement
→ Evaluation
```

```text
Violation
→ Compliance History
→ Evaluation
```

## 1.3 Nguyên tắc thiết kế use case

Không chia CRUD thành các use case kiểu:

- Thêm CLB
- Sửa CLB
- Xóa CLB
- Xem CLB

chỉ để tăng số lượng.

Mỗi use case phải:

- giải quyết một business problem;
- có actor chịu trách nhiệm rõ ràng;
- tạo ra business outcome;
- liên kết với ít nhất một nghiệp vụ khác nếu phù hợp;
- có dữ liệu đầu vào/đầu ra;
- có state transition nếu entity có lifecycle.

---

# 2. BUSINESS PROBLEMS

## 2.1 As-Is – Hiện trạng giả định

> **Assumption:** Nhà trường hiện chưa có một nền tảng tập trung đầy đủ cho vòng đời CLB; quy trình đang được thực hiện bằng nhiều công cụ rời rạc.

Ví dụ quy trình một sự kiện:

```text
CLB lập kế hoạch
→ điền Word/Google Form
→ gửi Email cho ICPDP
→ nhận phản hồi
→ sửa file
→ gửi lại
→ được duyệt qua Email
→ mở Google Form đăng ký
→ điểm danh bằng Excel
→ lưu hóa đơn trên Drive
→ làm báo cáo Word
→ gửi ICPDP
→ ICPDP tổng hợp Excel cuối kỳ
```

Nhược điểm chính là **business context bị đứt đoạn**.

Event A có thể tồn tại ở:

- một file Word;
- một Google Form;
- một Excel attendance;
- một folder Drive;
- một email phê duyệt;
- một file báo cáo khác.

Không có quan hệ dữ liệu chính thức giữa chúng.

---

## 2.2 Pain Points

| ID | Vấn đề nghiệp vụ |
|---|---|
| BP01 | ICPDP không có nguồn dữ liệu tập trung để biết CLB nào đang Active, Suspended hay đã ngừng hoạt động. |
| BP02 | Không xác định chính xác số lượng thành viên active thực tế của từng CLB tại từng thời điểm. |
| BP03 | Lịch sử Ban chủ nhiệm và nhiệm kỳ không được quản lý có cấu trúc. |
| BP04 | Hồ sơ thành lập CLB và lịch sử bổ sung/phê duyệt nằm rải rác qua nhiều file/email. |
| BP05 | Quy trình đăng ký và xét duyệt sự kiện thiếu workflow thống nhất. |
| BP06 | Không có cơ chế tập trung để phát hiện trùng thời gian hoặc địa điểm sự kiện. |
| BP07 | Registration và Attendance của sự kiện tách rời khỏi hồ sơ sự kiện. |
| BP08 | Khó xác định một sự kiện đã được duyệt có thực sự diễn ra và đã hoàn thành báo cáo hay chưa. |
| BP09 | Budget Request, Expense và Financial Evidence không được liên kết end-to-end. |
| BP10 | Khó phát hiện chi vượt ngân sách hoặc khoản chi thiếu chứng từ. |
| BP11 | Tuyển thành viên thường thực hiện qua Forms riêng, không liên kết trực tiếp với Membership. |
| BP12 | Vi phạm/cảnh báo CLB không có lịch sử compliance có cấu trúc. |
| BP13 | Đánh giá CLB cuối kỳ phụ thuộc vào việc tổng hợp dữ liệu thủ công. |
| BP14 | Deadline báo cáo, đối soát ngân sách và chuyển giao nhiệm kỳ phụ thuộc vào nhắc việc thủ công. |
| BP15 | Thiếu audit trail để xác định ai đã duyệt, từ chối hoặc thay đổi một quyết định quan trọng. |

---

## 2.3 Root Causes

### RC01 – Fragmented Data

Dữ liệu nằm ở Excel, Google Forms, Drive, Email, Messenger và hồ sơ giấy.

### RC02 – No Standard Workflow

Không có state machine thống nhất cho:

- Club Application
- Event Proposal
- Budget Request
- Recruitment Application
- Report
- Violation
- Evaluation

### RC03 – Weak Traceability

Quyết định phê duyệt không luôn gắn với:

- người phê duyệt;
- thời điểm;
- phiên bản hồ sơ;
- lý do;
- chứng cứ;
- trạng thái trước/sau.

### RC04 – Lack of Cross-Module Data Model

Membership, Attendance, Event, Finance và Violation không được nối bằng mô hình dữ liệu chung.

### RC05 – Manual Evaluation

ICPDP phải tự thu thập và tổng hợp nhiều nguồn trước khi đánh giá CLB.

### RC06 – Decentralized Deadline Management

Deadline nằm trong email, file Excel hoặc lịch cá nhân.

---

## 2.4 Business Impact

### Đối với ICPDP

- tăng khối lượng hành chính;
- khó theo dõi yêu cầu chờ xử lý;
- khó kiểm soát compliance;
- khó audit;
- khó ra quyết định trên dữ liệu;
- khó lập báo cáo tổng thể.

### Đối với Ban chủ nhiệm CLB

- mất thời gian gửi và sửa hồ sơ;
- khó biết request đang ở trạng thái nào;
- khó quản lý ngân sách;
- khó tổng hợp attendance;
- khó bàn giao giữa nhiệm kỳ.

### Đối với sinh viên

- khó tìm CLB phù hợp;
- khó biết CLB nào đang tuyển;
- khó theo dõi application;
- trải nghiệm event bị phân tán.

### Đối với nhà trường

- thiếu khả năng governance;
- thiếu dữ liệu đánh giá chất lượng CLB;
- tăng financial/compliance risk;
- khó hoạch định hoạt động sinh viên.

---

## 2.5 To-Be

UCMS trở thành **system of record** cho toàn bộ vòng đời CLB.

### Luồng sự kiện

```text
Event Proposal
→ Approval
→ Event
→ Registration
→ Attendance
→ Post-event Report
→ Evaluation Input
```

### Luồng tài chính

```text
Budget Request
→ Approval
→ Disbursement
→ Expense
→ Evidence
→ Reconciliation
→ Financial Compliance Score
```

### Luồng thành viên

```text
Recruitment
→ Application
→ Screening
→ Decision
→ Membership
→ Participation
→ Engagement Metric
```

---

# 3. STAKEHOLDER ANALYSIS

| Stakeholder | Mối quan tâm | Mức ảnh hưởng | Tương tác |
|---|---|---:|---|
| Ban lãnh đạo nhà trường | Governance, risk, chất lượng hoạt động sinh viên | Cao | Tiêu thụ báo cáo/KPI |
| ICPDP | Quản trị toàn bộ hoạt động CLB | Rất cao | Trực tiếp |
| Ban chủ nhiệm CLB | Vận hành CLB | Cao | Trực tiếp |
| Thành viên CLB | Tham gia hoạt động | Trung bình | Trực tiếp |
| Sinh viên toàn trường | Tìm CLB, ứng tuyển, đăng ký event | Trung bình | Trực tiếp |
| Finance/Facility/Security/... | Review một số request | Trung bình | Supporting |
| IT/System Admin | Vận hành kỹ thuật | Trung bình | Technical |

---

# 4. ACTOR ANALYSIS

## A1 – Student

Bao gồm:

- sinh viên chưa tham gia CLB;
- ứng viên tuyển thành viên;
- thành viên bình thường khi sử dụng chức năng phía student.

### Trách nhiệm

- tìm CLB;
- ứng tuyển;
- theo dõi application;
- đăng ký event;
- check-in;
- xem membership.

### Dữ liệu tạo ra

- RecruitmentApplication
- EventRegistration
- Attendance
- ClubApplication nếu là founding student

### Dữ liệu tiêu thụ

- Club
- RecruitmentCampaign
- Event
- ApplicationStatus

---

## A2 – Club Management Board

Đại diện cho **Ban chủ nhiệm/Ban điều hành CLB**.

Không tách các vai trò sau thành actor độc lập:

- Chủ nhiệm
- Phó chủ nhiệm
- Trưởng ban
- Thủ quỹ
- Event Coordinator

Các vai trò này được xử lý bằng **RBAC**.

### Trách nhiệm

- vận hành hồ sơ CLB;
- quản lý cơ cấu;
- tuyển thành viên;
- quản lý membership;
- submit event;
- quản lý attendance;
- submit budget;
- ghi expense;
- nộp báo cáo;
- chuẩn bị chuyển giao nhiệm kỳ.

---

## A3 – ICPDP Officer

Actor đại diện phía nhà trường.

### Trách nhiệm

- xét duyệt thành lập CLB;
- quản lý lifecycle CLB;
- xác nhận Ban chủ nhiệm;
- phê duyệt sự kiện;
- xét duyệt ngân sách;
- quản lý compliance;
- xử lý vi phạm;
- đánh giá CLB;
- theo dõi báo cáo;
- cấu hình chính sách.

---

## A4 – School Supporting Reviewer

> **Assumption:** Một số request có thể cần ý kiến từ phòng ban khác.

Ví dụ:

- Finance Office
- Facility Management
- Security
- Academic Department
- Faculty Advisor

Không tạo nhiều actor riêng mà tổng quát thành:

**School Supporting Reviewer**

với role/permission tương ứng.

Ví dụ:

```text
Normal Event
→ ICPDP

Large Event
→ ICPDP
→ Facility
→ Security
```

```text
High Budget Request
→ ICPDP
→ Finance Reviewer
```

### Kết luận actor

4 actor:

1. Student
2. Club Management Board
3. ICPDP Officer
4. School Supporting Reviewer

Actor 4 có thể đưa sang V2 nếu quy trình thực tế của trường chỉ do ICPDP xử lý.

---

# 5. SYSTEM SCOPE

## 5.1 In Scope

- Authentication
- Authorization / RBAC
- Club establishment
- Club lifecycle
- Leadership & term
- Recruitment
- Membership
- Event proposal
- Event approval
- Event registration
- Attendance
- Budget request
- Expense
- Financial evidence
- Financial reconciliation
- Periodic reporting
- Compliance
- Violation
- Club performance evaluation
- Notification
- Deadline reminder
- Audit log
- Dashboard

## 5.2 Out of Scope

Để tránh biến hệ thống thành ERP:

- full accounting ERP;
- payroll;
- tuition/payment;
- mạng xã hội/chat riêng;
- LMS;
- room booking engine toàn trường;
- inventory ERP;
- payment gateway;
- sponsorship marketplace;
- native mobile app;
- facial recognition attendance;
- AI chatbot bắt buộc.

---

# 6. MODULE DECOMPOSITION

| Module | Mục tiêu | Actor | Dữ liệu chính | Liên kết |
|---|---|---|---|---|
| M01 Identity & RBAC | Kiểm soát tài khoản và quyền | All | User, Role, Permission | Tất cả |
| M02 Club Lifecycle & Governance | Quản lý vòng đời CLB | CMB, ICPDP | Club, ClubApplication | M03, M04, M09 |
| M03 Leadership & Term | Quản lý nhiệm kỳ | CMB, ICPDP | ClubTerm, Position | M01, M02 |
| M04 Recruitment & Membership | Tuyển/quản lý thành viên | Student, CMB | Campaign, Application, Membership | M06, M09 |
| M05 Event & Activity | Quản trị sự kiện | CMB, ICPDP | EventProposal, Event | M06, M07, M08 |
| M06 Registration & Attendance | Đăng ký/điểm danh | Student, CMB | Registration, Attendance | M05, M08, M09 |
| M07 Finance & Budget | Quản trị ngân sách/chi tiêu | CMB, ICPDP | BudgetRequest, Expense, Evidence | M05, M09 |
| M08 Reporting & Compliance | Báo cáo và tuân thủ | CMB, ICPDP | Report, Violation | M05, M07, M09 |
| M09 Performance Evaluation | Đánh giá CLB | ICPDP | Evaluation, Criteria | M02–M08 |
| M10 Workflow, Notification & Audit | Governance xuyên module | All | ApprovalTask, Notification, AuditLog | Tất cả |

---

# 7. CORE BUSINESS FLOWS

## Flow 1 – Club Establishment

```text
Student
→ Submit Club Application
→ ICPDP Review
→ Revision Requested (nếu cần)
→ Student Resubmit
→ ICPDP Approve/Reject
→ Club được tạo
→ Cấu hình vận hành
```

## Flow 2 – Leadership & Transition

```text
Club Active
→ Define Organization
→ Nominate Management Board
→ ICPDP Confirm
→ Term Operates
→ Create Transition Plan
→ Nominate Next Board
→ ICPDP Confirm
→ Transfer Permission
→ Archive Old Term
```

## Flow 3 – Recruitment

```text
Create Recruitment Campaign
→ Publish
→ Student Apply
→ Screening
→ Evaluation
→ Accept/Reject
→ Onboard
→ Membership Created
```

## Flow 4 – Event Lifecycle

```text
Event Proposal
→ Conflict Check
→ ICPDP Review
→ Revision nếu cần
→ Approval
→ Publish
→ Registration
→ Check-in
→ Attendance Finalization
→ Post-event Report
→ ICPDP Close
→ Evaluation Input
```

## Flow 5 – Budget Lifecycle

```text
Budget Request
→ Review
→ Approval
→ Disbursement
→ Expense
→ Evidence
→ Reconciliation
→ Evaluation Input
```

## Flow 6 – Compliance

```text
Issue / Violation
→ Compliance Case
→ Investigation
→ Club Response
→ Decision
→ Corrective Action
→ Resolution
→ Compliance History
```

## Flow 7 – Periodic Evaluation

```text
Events
+ Attendance
+ Membership
+ Reports
+ Finance
+ Violations
→ Evaluation Draft
→ ICPDP Review
→ Finalize
→ Publish
→ Recognition / Warning / Improvement
```

## Flow 8 – Suspension / Dissolution

```text
Request / Violation / Inactivity
→ ICPDP Review
→ Suspend
→ Corrective Action
→ Reactivate

hoặc

→ Dissolution Decision
→ Archive Club
→ Revoke Management Permission
```

---

# 8. MASTER USE CASE LIST

## 8.1 Club Lifecycle & Governance

| ID | Use Case | Actor | Module | Business Goal | Related UC | Priority |
|---|---|---|---|---|---|---|
| UC01 | Xác thực và truy cập workspace theo quyền | All | M01 | Truy cập an toàn | All | Must |
| UC02 | Gửi hồ sơ đề nghị thành lập CLB | Student | M02 | Đề xuất CLB mới | UC03 | Must |
| UC03 | Thẩm định hồ sơ thành lập CLB | ICPDP | M02 | Kiểm tra hồ sơ | UC04, UC06 | Must |
| UC04 | Yêu cầu bổ sung/chỉnh sửa hồ sơ | ICPDP | M02 | Hoàn thiện hồ sơ | UC05 | Must |
| UC05 | Nộp lại hồ sơ sau chỉnh sửa | Student | M02 | Phản hồi yêu cầu revision | UC03 | Must |
| UC06 | Phê duyệt/Từ chối thành lập CLB | ICPDP | M02 | Quyết định chính thức | UC07 | Must |
| UC07 | Cấu hình hồ sơ vận hành CLB | CMB | M02 | Thiết lập thông tin vận hành | UC08 | Must |
| UC08 | Cấu hình cơ cấu tổ chức CLB | CMB | M03 | Xác định bộ máy | UC09 | Should |
| UC09 | Đề xuất Ban chủ nhiệm CLB | CMB | M03 | Thiết lập leadership | UC10 | Must |
| UC10 | Xác nhận Ban chủ nhiệm | ICPDP | M03 | Xác nhận thẩm quyền | UC09 | Must |
| UC11 | Lập kế hoạch chuyển giao nhiệm kỳ | CMB | M03 | Chuẩn bị handover | UC12 | Should |
| UC12 | Xác nhận chuyển giao nhiệm kỳ | ICPDP | M03 | Chuyển quyền an toàn | UC11 | Should |
| UC13 | Yêu cầu tạm ngừng hoạt động CLB | CMB | M02 | Tạm dừng hợp lệ | UC14 | Could |
| UC14 | Tạm ngừng/Kích hoạt lại/Giải thể CLB | ICPDP | M02 | Kiểm soát lifecycle | UC48–50 | Must |

## 8.2 Recruitment & Membership

| ID | Use Case | Actor | Module | Business Goal | Related UC | Priority |
|---|---|---|---|---|---|---|
| UC15 | Tạo và công bố đợt tuyển thành viên | CMB | M04 | Tuyển thành viên | UC16 | Must |
| UC16 | Nộp đơn ứng tuyển vào CLB | Student | M04 | Ứng tuyển | UC17 | Must |
| UC17 | Sàng lọc đơn ứng tuyển | CMB | M04 | Shortlist | UC18 | Must |
| UC18 | Ghi nhận đánh giá ứng viên | CMB | M04 | Đánh giá có cấu trúc | UC19 | Should |
| UC19 | Ra quyết định ứng tuyển | CMB | M04 | Accept/Reject | UC20 | Must |
| UC20 | Onboard ứng viên trúng tuyển | CMB | M04 | Tạo membership | UC21 | Must |
| UC21 | Quản lý trạng thái thành viên | CMB | M04 | Duy trì roster chính xác | UC22 | Must |
| UC22 | Phân công chức vụ trong CLB | CMB | M03/M04 | Phân quyền nội bộ | UC09 | Should |
| UC23 | Rời CLB/Loại thành viên | Student/CMB | M04 | Kết thúc membership | UC21 | Should |

## 8.3 Event

| ID | Use Case | Actor | Module | Business Goal | Related UC | Priority |
|---|---|---|---|---|---|---|
| UC24 | Gửi đề xuất tổ chức sự kiện | CMB | M05 | Xin phép tổ chức | UC25–29 | Must |
| UC25 | Phát hiện xung đột sự kiện | System/CMB | M05 | Tránh trùng lịch/địa điểm | UC24, UC29 | Should |
| UC26 | Thẩm định đề xuất sự kiện | ICPDP | M05 | Kiểm tra proposal | UC27, UC29 | Must |
| UC27 | Yêu cầu chỉnh sửa đề xuất sự kiện | ICPDP | M05 | Hoàn thiện proposal | UC28 | Must |
| UC28 | Nộp lại đề xuất sự kiện | CMB | M05 | Phản hồi review | UC26 | Must |
| UC29 | Phê duyệt/Từ chối sự kiện | ICPDP | M05 | Cho phép tổ chức | UC30 | Must |
| UC30 | Công bố sự kiện và mở đăng ký | CMB | M05 | Cho phép tham gia | UC31 | Must |
| UC31 | Đăng ký tham gia sự kiện | Student | M06 | Ghi nhận người tham gia | UC32 | Must |
| UC32 | Quản lý capacity và waitlist | CMB | M06 | Kiểm soát số lượng | UC31 | Should |
| UC33 | Check-in người tham gia | Student/CMB | M06 | Xác thực attendance | UC34 | Must |
| UC34 | Chốt attendance sự kiện | CMB | M06 | Tạo attendance chính thức | UC36 | Must |
| UC35 | Hủy/Đổi lịch sự kiện | CMB/ICPDP | M05 | Xử lý thay đổi | UC29–34 | Should |
| UC36 | Nộp báo cáo sau sự kiện | CMB | M08 | Hoàn tất accountability | UC37 | Must |
| UC37 | Thẩm định và đóng báo cáo sự kiện | ICPDP | M08 | Khép lifecycle event | UC49 | Must |

## 8.4 Finance

| ID | Use Case | Actor | Module | Business Goal | Related UC | Priority |
|---|---|---|---|---|---|---|
| UC38 | Gửi yêu cầu ngân sách | CMB | M07 | Xin kinh phí | UC39 | Must |
| UC39 | Thẩm định yêu cầu ngân sách | ICPDP | M07 | Kiểm tra funding request | UC40, UC41 | Must |
| UC40 | Chỉnh sửa và nộp lại yêu cầu ngân sách | CMB | M07 | Sửa request | UC39 | Should |
| UC41 | Phê duyệt/Từ chối yêu cầu ngân sách | ICPDP | M07 | Quyết định funding | UC42 | Must |
| UC42 | Ghi nhận giải ngân | ICPDP | M07 | Theo dõi kinh phí đã cấp | UC43 | Should |
| UC43 | Ghi nhận khoản chi | CMB | M07 | Theo dõi actual spending | UC44 | Must |
| UC44 | Nộp chứng từ tài chính | CMB | M07 | Chứng minh chi phí | UC45 | Must |
| UC45 | Đối soát ngân sách và chi tiêu | ICPDP/CMB | M07 | Đảm bảo accountability | UC49 | Must |

## 8.5 Reporting, Compliance & Evaluation

| ID | Use Case | Actor | Module | Business Goal | Related UC | Priority |
|---|---|---|---|---|---|---|
| UC46 | Nộp báo cáo hoạt động định kỳ | CMB | M08 | Hoàn thành nghĩa vụ báo cáo | UC47 | Must |
| UC47 | Thẩm định báo cáo hoạt động định kỳ | ICPDP | M08 | Xác thực báo cáo | UC49 | Must |
| UC48 | Quản lý vụ việc vi phạm/tuân thủ | ICPDP | M08 | Kiểm soát compliance | UC49 | Must |
| UC49 | Tạo bản nháp đánh giá hiệu quả CLB | ICPDP | M09 | Tổng hợp dữ liệu performance | UC50 | Should |
| UC50 | Review, chốt và công bố đánh giá | ICPDP | M09 | Đánh giá chính thức | UC49 | Should |

**Tổng cộng: 50 business use case.**

---

# 9. DETAILED USE CASE SPECIFICATION

## UC01 – Xác thực và truy cập workspace theo quyền

- **Primary Actor:** All
- **Business Goal:** Chỉ cho phép người dùng truy cập đúng dữ liệu/chức năng theo vai trò.
- **Trigger:** Người dùng đăng nhập.
- **Preconditions:** Tài khoản tồn tại và còn hiệu lực.
- **Main Flow:**
  1. Người dùng gửi thông tin xác thực.
  2. Hệ thống xác minh.
  3. Hệ thống tải role/permission.
  4. Hệ thống điều hướng tới workspace tương ứng.
- **Exception:** Tài khoản bị khóa hoặc không hợp lệ.
- **Postcondition:** Session hợp lệ được tạo.
- **Priority:** Must.

## UC02 – Gửi hồ sơ đề nghị thành lập CLB

- **Primary Actor:** Student
- **Business Goal:** Cho phép sinh viên đề xuất thành lập CLB theo quy trình chuẩn.
- **Trigger:** Sinh viên chọn tạo hồ sơ thành lập.
- **Preconditions:** Đã đăng nhập, đủ điều kiện theo policy.
- **Main Flow:**
  1. Nhập tên, lĩnh vực, mục tiêu CLB.
  2. Khai báo founding members.
  3. Tải tài liệu bắt buộc.
  4. Hệ thống validate.
  5. Student xác nhận.
  6. Hệ thống tạo version.
  7. Status chuyển `Submitted`.
  8. ICPDP nhận review task.
- **Alternative:** Lưu Draft.
- **Exception:** Thiếu tài liệu bắt buộc.
- **Postcondition:** Application ở trạng thái Submitted.
- **Related:** UC03, UC04, UC05, UC06.
- **Pain Point:** BP04.

## UC03 – Thẩm định hồ sơ thành lập CLB

- **Primary Actor:** ICPDP
- **Goal:** Kiểm tra tính đầy đủ và hợp lệ của hồ sơ.
- **Preconditions:** Hồ sơ đã Submitted/Resubmitted.
- **Main Flow:**
  1. ICPDP mở hồ sơ.
  2. Kiểm tra thông tin CLB.
  3. Kiểm tra founding members.
  4. Kiểm tra document.
  5. Kiểm tra version history.
  6. Chọn Approve / Revision / Reject.
- **Alternative:** Giao Supporting Reviewer.
- **Postcondition:** Kết quả review được ghi nhận.
- **Related:** UC04, UC06.

## UC04 – Yêu cầu bổ sung/chỉnh sửa hồ sơ

- **Primary Actor:** ICPDP
- **Goal:** Cho phép sửa hồ sơ mà không phải từ chối ngay.
- **Main Flow:**
  1. ICPDP chọn phần chưa đạt.
  2. Nhập comment cụ thể.
  3. Thiết lập deadline nếu cần.
  4. Chuyển trạng thái sang `Revision Requested`.
  5. Student nhận notification.
- **Rule:** ICPDP không sửa dữ liệu thay applicant.

## UC05 – Nộp lại hồ sơ sau chỉnh sửa

- **Primary Actor:** Student
- **Precondition:** Application đang `Revision Requested`.
- **Main Flow:** Chỉnh dữ liệu → tạo version mới → Resubmit.
- **Rule:** Version cũ không bị ghi đè.
- **Related:** UC03.

## UC06 – Phê duyệt/Từ chối thành lập CLB

- **Primary Actor:** ICPDP
- **Main Flow:**
  1. Xem review result.
  2. Chọn Approve hoặc Reject.
  3. Nhập reason nếu cần.
  4. Hệ thống ghi audit.
- **Nếu Approve:**
  - Application → Approved.
  - Tạo Club.
  - Club → Pending Setup hoặc Active theo policy.
- **Nếu Reject:** Không tạo Club.

## UC07 – Cấu hình hồ sơ vận hành CLB

- **Primary Actor:** CMB
- **Goal:** Hoàn thiện thông tin vận hành sau khi CLB được công nhận.
- **Data:** Description, contact, charter, communication channels, operating scope.
- **Rule:** Một số institutional field chỉ ICPDP được sửa.

## UC08 – Cấu hình cơ cấu tổ chức CLB

- **Primary Actor:** CMB
- **Goal:** Mô hình hóa Board, Department, Position.
- **Rule:** Có thể giới hạn theo template của nhà trường.
- **Priority:** Should.

## UC09 – Đề xuất Ban chủ nhiệm CLB

- **Primary Actor:** CMB
- **Main Flow:** Chọn member → chức vụ → nhiệm kỳ → submit nomination.
- **Postcondition:** Nomination `Pending Confirmation`.

## UC10 – Xác nhận Ban chủ nhiệm

- **Primary Actor:** ICPDP
- **Main Flow:** Kiểm eligibility → conflict → term → approve/reject.
- **Nếu approve:** quyền quản trị tương ứng có hiệu lực.

## UC11 – Lập kế hoạch chuyển giao nhiệm kỳ

- **Primary Actor:** CMB
- **Data:**
  - nhiệm kỳ mới;
  - ứng viên leadership;
  - outstanding events;
  - outstanding budget;
  - incomplete reports;
  - tài sản/trách nhiệm cần bàn giao.
- **Postcondition:** Transition `Pending Confirmation`.

## UC12 – Xác nhận chuyển giao nhiệm kỳ

- **Primary Actor:** ICPDP
- **Khi approve:**
  - đóng old term;
  - active new term;
  - revoke quyền cũ;
  - grant quyền mới;
  - lưu lịch sử.

## UC13 – Yêu cầu tạm ngừng hoạt động CLB

- **Primary Actor:** CMB
- **Input:** reason, expected duration, obligations, recovery plan.
- **Related:** UC14.
- **Priority:** Could.

## UC14 – Tạm ngừng/Kích hoạt lại/Giải thể CLB

- **Primary Actor:** ICPDP
- **Trigger:** Request, inactivity, serious violation hoặc policy.
- **Rule:** Suspended Club bị chặn event/recruitment mới.
- **Dissolution:** archive governance history và revoke management access.

## UC15 – Tạo và công bố đợt tuyển thành viên

- **Primary Actor:** CMB
- **Precondition:** Club Active.
- **Input:** vị trí, criteria, application window, capacity, selection process.
- **Postcondition:** Campaign Published/Open.

## UC16 – Nộp đơn ứng tuyển

- **Primary Actor:** Student
- **Main Flow:** Chọn campaign → điền form → submit.
- **Validation:** eligibility, window, duplicate application.
- **Postcondition:** Application Submitted.

## UC17 – Sàng lọc đơn ứng tuyển

- **Primary Actor:** CMB
- **Flow:** Submitted → Screening → Shortlisted/Rejected.
- **Rule:** Reason cho rejection có thể bắt buộc theo policy.

## UC18 – Ghi nhận đánh giá ứng viên

- **Primary Actor:** CMB
- **Data:** interview result, rubric score, reviewer comment.
- **Rule:** Rubric configurable theo campaign.

## UC19 – Ra quyết định ứng tuyển

- **Primary Actor:** CMB
- **Outcome:** Accepted / Rejected / Waitlisted.
- **Accepted:** đủ điều kiện vào UC20.

## UC20 – Onboard ứng viên trúng tuyển

- **Primary Actor:** CMB
- **Flow:** Confirm acceptance → tạo ClubMembership → default role → join date.
- **Rule:** Không tạo duplicate active membership.

## UC21 – Quản lý trạng thái thành viên

- **Primary Actor:** CMB
- **State:** Active → On Leave → Inactive → Ended.
- **Rule:** Mỗi thay đổi có effective date.

## UC22 – Phân công chức vụ trong CLB

- **Primary Actor:** CMB
- **Rule:** Member phải active.
- **Sensitive Position:** Có thể yêu cầu UC10.

## UC23 – Rời CLB/Loại thành viên

- **Primary Actor:** Student/CMB
- **Student:** Request withdrawal.
- **CMB:** Initiate removal theo business rule.
- **Rule:** Sensitive removal phải có reason/audit.

## UC24 – Gửi đề xuất tổ chức sự kiện

- **Primary Actor:** CMB
- **Precondition:** Club Active và người dùng có quyền.
- **Input:** mục tiêu, thời gian, địa điểm, audience, capacity, plan, risk, budget estimate.
- **Flow:** Validate → UC25 conflict check → Submitted/Pending Approval.

## UC25 – Phát hiện xung đột sự kiện

- **Actor:** System/CMB
- **Input:** venue, start time, end time, event status.
- **Output:** No Conflict / Warning / Blocking Conflict.
- **Rule:** Không tự reject nếu policy chỉ cảnh báo.

## UC26 – Thẩm định đề xuất sự kiện

- **Primary Actor:** ICPDP
- **Review:** compliance, venue, time, budget, safety, overdue obligations.
- **Outcome:** Revision hoặc UC29.

## UC27 – Yêu cầu chỉnh sửa đề xuất sự kiện

- **Primary Actor:** ICPDP
- **Status:** Under Review → Revision Requested.
- **Requirement:** Có structured comments.

## UC28 – Nộp lại đề xuất sự kiện

- **Primary Actor:** CMB
- **Rule:** Tạo revision version mới, không overwrite.

## UC29 – Phê duyệt/Từ chối sự kiện

- **Primary Actor:** ICPDP
- **Rule:** Chỉ Approved Event mới được publish qua UC30.
- **Audit:** actor, timestamp, decision, reason.

## UC30 – Công bố sự kiện và mở đăng ký

- **Primary Actor:** CMB
- **State:** Approved → Open for Registration.
- **Rule:** Enforce registration window và capacity.

## UC31 – Đăng ký tham gia sự kiện

- **Primary Actor:** Student
- **Validation:** window, eligibility, duplicate, capacity.
- **Outcome:** Confirmed hoặc Waitlisted.

## UC32 – Quản lý capacity và waitlist

- **Primary Actor:** CMB
- **Rule:** Khi có slot trống, promote theo configurable policy.

## UC33 – Check-in người tham gia

- **Primary Actor:** Student/CMB
- **Method:** QR / code / manual authorized lookup.
- **Rule:** Duplicate check-in không tạo attendance mới.

## UC34 – Chốt attendance sự kiện

- **Primary Actor:** CMB
- **Flow:** Review abnormal check-in → finalize → lock.
- **Output:** Official Attendance dataset.

## UC35 – Hủy/Đổi lịch sự kiện

- **Primary Actor:** CMB/ICPDP
- **Flow:** nhập reason → conflict check nếu đổi lịch → notify registrants → cập nhật deadline/report/budget impact.

## UC36 – Nộp báo cáo sau sự kiện

- **Primary Actor:** CMB
- **Preloaded Data:** approved proposal, attendance, budget/expense.
- **Manual Data:** actual result, evidence, incident, lessons learned.
- **Postcondition:** Report Submitted.

## UC37 – Thẩm định và đóng báo cáo sự kiện

- **Primary Actor:** ICPDP
- **Flow:** compare plan vs actual → accept / request correction / raise violation.
- **Outcome:** Event Closed nếu report được accept.

## UC38 – Gửi yêu cầu ngân sách

- **Primary Actor:** CMB
- **Can Link To:** event, semester plan, approved activity.
- **Input:** category, amount, purpose, expected expense.

## UC39 – Thẩm định yêu cầu ngân sách

- **Primary Actor:** ICPDP
- **Review:** eligibility, available allocation, duplication, related activity status.

## UC40 – Chỉnh sửa và nộp lại yêu cầu ngân sách

- **Primary Actor:** CMB
- **Rule:** Giữ version history và approval history.

## UC41 – Phê duyệt/Từ chối ngân sách

- **Primary Actor:** ICPDP
- **Rule:** Approved amount có thể khác requested amount nếu policy cho phép.
- **Audit:** Bắt buộc.

## UC42 – Ghi nhận giải ngân

- **Primary Actor:** ICPDP
- **Data:** approved amount, disbursed amount, date, reference.
- **Scope:** Chỉ tracking, không thay thế accounting ERP.

## UC43 – Ghi nhận khoản chi

- **Primary Actor:** CMB/Treasurer
- **Input:** category, amount, date, related budget/event, description.

## UC44 – Nộp chứng từ tài chính

- **Primary Actor:** CMB
- **Evidence:** invoice, receipt, proof.
- **Rule:** Mỗi evidence phải liên kết tới Expense.

## UC45 – Đối soát ngân sách và chi tiêu

- **Primary Actor:** ICPDP/CMB
- **System Calculates:**
  - approved;
  - disbursed;
  - recorded expenses;
  - supported expenses;
  - unsupported expenses;
  - remaining balance.
- **Outcome:** Reconciled/Exception.

## UC46 – Nộp báo cáo hoạt động định kỳ

- **Primary Actor:** CMB
- **Period:** Semester/Academic Year/configured period.
- **Auto Preload:** events, membership, attendance, finance.
- **Manual:** narrative/evidence chưa có trong system.

## UC47 – Thẩm định báo cáo hoạt động định kỳ

- **Primary Actor:** ICPDP
- **Outcome:** Accept / Return for correction.
- **Accepted Report:** Evaluation Input.

## UC48 – Quản lý vụ việc vi phạm/tuân thủ

- **Primary Actor:** ICPDP
- **Trigger:** manual report, overdue report, financial issue, unauthorized event, policy breach.
- **Lifecycle:** Open → Investigation → Club Response → Decision → Corrective Action → Resolved.

## UC49 – Tạo bản nháp đánh giá hiệu quả CLB

- **Primary Actor:** ICPDP
- **Input:** activity, attendance, membership, finance, reports, violations.
- **Processing:** Áp dụng evaluation scheme hiện hành.
- **Output:** Evaluation Draft.

## UC50 – Review, chốt và công bố đánh giá

- **Primary Actor:** ICPDP
- **Flow:** Review source data → xử lý anomaly → manual dimension nếu được phép → finalize → publish.
- **Rule:** Published Evaluation không sửa trực tiếp; tạo revision/snapshot mới.

---

# 10. USE CASE RELATIONSHIP MAP

## 10.1 Club Establishment

```text
UC02 Submit Club Application
→ UC03 Review
   ├─→ UC04 Request Revision
   │    → UC05 Resubmit
   │    → UC03 Review
   └─→ UC06 Approve/Reject
        → UC07 Configure Club
        → UC08 Organization
        → UC09 Nominate Board
        → UC10 Confirm Board
```

## 10.2 Recruitment

```text
UC15 Recruitment Campaign
→ UC16 Student Application
→ UC17 Screening
→ UC18 Candidate Evaluation
→ UC19 Decision
→ UC20 Membership Creation
→ UC21 Membership Lifecycle
   ├─→ UC22 Position Assignment
   └─→ UC23 Withdrawal/Removal
```

## 10.3 Event

```text
UC24 Event Proposal
├─ include → UC25 Conflict Detection
→ UC26 Review
   ├─→ UC27 Revision Request
   │    → UC28 Resubmit
   │    → UC26
   └─→ UC29 Approval
        → UC30 Publish
        → UC31 Registration
        ↔ UC32 Capacity/Waitlist
        → UC33 Check-in
        → UC34 Attendance
        → UC36 Post-event Report
        → UC37 Review/Close
        → UC49 Evaluation
```

UC35 có thể tác động từ UC30 đến UC36.

## 10.4 Finance

```text
UC38 Budget Request
→ UC39 Review
   ├─→ UC40 Revision
   │    → UC39
   └─→ UC41 Approval
        → UC42 Disbursement
        → UC43 Expense
        → UC44 Evidence
        → UC45 Reconciliation
        → UC49 Evaluation
```

## 10.5 Reporting / Compliance / Evaluation

```text
UC37 Event Report
UC45 Financial Reconciliation
UC47 Periodic Report
UC21 Membership Data
UC34 Attendance Data
UC48 Violation Data
        ↓
UC49 Evaluation Draft
        ↓
UC50 Final Evaluation
```

---

# 11. ACTOR → USE CASE MAPPING

## Student

- UC01
- UC02
- UC05
- UC16
- UC23
- UC31
- UC33

## Club Management Board

- UC01
- UC07–UC09
- UC11
- UC13
- UC15
- UC17–UC24
- UC28
- UC30
- UC32–UC36
- UC38
- UC40
- UC43–UC46

## ICPDP Officer

- UC01
- UC03–UC06
- UC10
- UC12
- UC14
- UC26–UC29
- UC35
- UC37
- UC39
- UC41–UC42
- UC45
- UC47–UC50

## School Supporting Reviewer

Supporting actor trong:

- UC03
- UC26
- UC39
- UC48

khi approval routing yêu cầu.

---

# 12. USER STORIES

## US01
**As a Student,**  
I want to submit a club establishment application digitally,  
**so that** tôi không phải quản lý nhiều file/email trong quá trình xin thành lập CLB.

## US02
**As an ICPDP Officer,**  
I want to review all versions of a club application,  
**so that** tôi biết chính xác applicant đã thay đổi gì trước khi phê duyệt.

## US03
**As an ICPDP Officer,**  
I want to request corrections on specific sections,  
**so that** applicant biết chính xác phần nào cần bổ sung thay vì nhận phản hồi chung chung.

## US04
**As a Club Leader,**  
I want to maintain the club organization structure,  
**so that** quyền hạn và trách nhiệm trong CLB được minh bạch.

## US05
**As an ICPDP Officer,**  
I want leadership terms to be formally recorded,  
**so that** nhà trường xác định được ai đại diện CLB ở từng thời điểm.

## US06
**As an outgoing Club Leader,**  
I want to create a structured transition plan,  
**so that** công việc tồn đọng không bị mất giữa hai nhiệm kỳ.

## US07
**As a Club Leader,**  
I want to publish recruitment campaigns,  
**so that** application của sinh viên được thu thập theo một quy trình thống nhất.

## US08
**As a Student,**  
I want to track my recruitment application status,  
**so that** tôi không phải liên hệ thủ công với CLB để hỏi kết quả.

## US09
**As a Club Leader,**  
I want to evaluate candidates using a defined process,  
**so that** quyết định tuyển thành viên nhất quán hơn.

## US10
**As a Club Leader,**  
I want accepted candidates to become members without duplicate data entry,  
**so that** roster thành viên luôn đồng bộ.

## US11
**As a Club Leader,**  
I want to submit event proposals online,  
**so that** ICPDP có thể xét duyệt theo workflow thống nhất.

## US12
**As a Club Leader,**  
I want the system to warn about event conflicts,  
**so that** vấn đề trùng địa điểm/thời gian được phát hiện trước khi event được duyệt.

## US13
**As an ICPDP Officer,**  
I want to request event revisions instead of immediately rejecting,  
**so that** proposal hợp lệ có cơ hội được hoàn thiện.

## US14
**As a Student,**  
I want to register for approved events,  
**so that** thông tin tham gia của tôi được ghi nhận tập trung.

## US15
**As a Club Leader,**  
I want to manage capacity and waiting lists,  
**so that** số người tham gia không vượt khả năng tổ chức.

## US16
**As a Club Leader,**  
I want attendance linked to registrations,  
**so that** thống kê sau sự kiện đáng tin cậy.

## US17
**As a Club Leader,**  
I want post-event reports to reuse registration and attendance data,  
**so that** tôi không phải tổng hợp lại thủ công.

## US18
**As an ICPDP Officer,**  
I want events to remain incomplete until required reports are submitted,  
**so that** CLB phải chịu trách nhiệm sau khi được cho phép tổ chức.

## US19
**As a Club Treasurer,**  
I want to submit structured budget requests,  
**so that** quyết định cấp kinh phí có thể truy vết.

## US20
**As an ICPDP Officer,**  
I want budget requests linked to events/activities,  
**so that** tôi hiểu rõ mục đích sử dụng kinh phí.

## US21
**As a Club Treasurer,**  
I want each expense linked to evidence,  
**so that** quá trình đối soát diễn ra nhanh và minh bạch.

## US22
**As an ICPDP Officer,**  
I want to compare approved funding with supported expenses,  
**so that** tôi đánh giá được mức độ tuân thủ tài chính.

## US23
**As a Club Leader,**  
I want periodic reports pre-populated with system data,  
**so that** tôi chỉ phải nhập những thông tin mà hệ thống chưa có.

## US24
**As an ICPDP Officer,**  
I want overdue obligations to be visible,  
**so that** tôi can thiệp trước khi vấn đề trở nên nghiêm trọng.

## US25
**As an ICPDP Officer,**  
I want violations stored as structured cases,  
**so that** cảnh báo và quyết định xử lý dựa trên evidence.

## US26
**As a Club Leader,**  
I want to respond to compliance cases,  
**so that** CLB có cơ hội giải trình và cung cấp bằng chứng.

## US27
**As an ICPDP Officer,**  
I want evaluation data collected automatically from other modules,  
**so that** đánh giá không phụ thuộc vào việc tổng hợp Excel thủ công.

## US28
**As an ICPDP Officer,**  
I want evaluation dimensions and weights configurable,  
**so that** thay đổi policy không đòi hỏi sửa code.

## US29
**As an ICPDP Officer,**  
I want to review evaluation drafts before publication,  
**so that** dữ liệu bất thường có thể được kiểm tra.

## US30
**As a Club Leader,**  
I want to see reporting and finance deadlines,  
**so that** CLB tránh vi phạm do quên deadline.

## US31
**As an ICPDP Officer,**  
I want a dashboard of pending approvals,  
**so that** không có request bị bỏ quên.

## US32
**As an ICPDP Officer,**  
I want every approval decision audited,  
**so that** tranh chấp có thể được điều tra khách quan.

## US33
**As a Student,**  
I want to see only active clubs and valid recruitment campaigns,  
**so that** tôi không ứng tuyển vào CLB không còn hoạt động.

## US34
**As an ICPDP Officer,**  
I want suspension to immediately restrict prohibited operations,  
**so that** quyết định quản trị thực sự được enforce.

## US35
**As an ICPDP Officer,**  
I want evaluation history by semester/year,  
**so that** tôi theo dõi được xu hướng phát triển của CLB.

---

# 13. ACCEPTANCE CRITERIA

## AC01 – Submit Club Application

**Given** sinh viên đã hoàn thành toàn bộ mandatory fields  
**When** sinh viên submit hồ sơ  
**Then** trạng thái hồ sơ trở thành `Submitted`  
**And** ICPDP nhận review task  
**And** submitted version không thể bị sửa trực tiếp.

## AC02 – Request Revision

**Given** hồ sơ đang `Under Review`  
**When** ICPDP yêu cầu chỉnh sửa  
**Then** ít nhất một revision reason phải được nhập  
**And** trạng thái chuyển thành `Revision Requested`.

## AC03 – Approve Club

**Given** hồ sơ đang `Under Review`  
**When** ICPDP approve  
**Then** application → `Approved`  
**And** đúng một Club record được tạo.

## AC04 – Recruitment Duplicate

**Given** campaign đang mở  
**When** một student đủ điều kiện submit lần đầu  
**Then** application được tạo.

**When** cùng student submit lại vào cùng campaign  
**Then** hệ thống từ chối duplicate application.

## AC05 – Event Proposal

**Given** Club đang Active  
**When** CMB submit event proposal hợp lệ  
**Then** event proposal → `Pending Approval`  
**And** conflict analysis được lưu.

## AC06 – Event Approval

**Given** event proposal đang `Under Review`  
**When** ICPDP approve  
**Then** status → `Approved`  
**And** event chưa public cho tới UC30.

## AC07 – Event Capacity

**Given** capacity = 100 và đã có 100 confirmed registrations  
**When** student tiếp theo đăng ký  
**Then** status → `Waitlisted` nếu waitlist được bật.

## AC08 – Check-in

**Given** student có valid registration  
**When** token check-in hợp lệ được xử lý  
**Then** một Attendance record được tạo  
**And** duplicate check-in không tạo record thứ hai.

## AC09 – Attendance Finalization

**Given** event đã kết thúc  
**When** CMB finalize attendance  
**Then** attendance dataset bị lock  
**And** mọi thay đổi sau đó yêu cầu permission đặc biệt.

## AC10 – Post-event Report

**Given** event đã Completed  
**When** CMB mở report form  
**Then** finalized attendance statistics được pre-populate.

## AC11 – Budget Approval

**Given** budget request đang `Under Review`  
**When** ICPDP approve  
**Then** approved amount được lưu  
**And** actor + timestamp + decision được audit.

## AC12 – Financial Evidence

**Given** Expense tồn tại  
**When** CMB upload evidence  
**Then** evidence phải reference Expense đó  
**And** uploader/time được lưu.

## AC13 – Reconciliation

**Given** budget đã có expense  
**When** reconciliation chạy  
**Then** hệ thống hiển thị riêng Approved / Disbursed / Recorded / Supported / Unsupported / Remaining.

## AC14 – Suspension

**Given** Club đang Active  
**When** ICPDP suspend  
**Then** Club → Suspended  
**And** không thể publish recruitment mới  
**And** không thể submit event proposal mới.

## AC15 – Evaluation

**Given** evaluation period được cấu hình  
**When** ICPDP generate draft  
**Then** mỗi dimension phải truy vết được source data.

---

# 14. BUSINESS RULES

| Rule | Nội dung |
|---|---|
| BR01 | Chỉ Active Club được phép tạo recruitment campaign hoặc event proposal mới. |
| BR02 | Club Application phải có mandatory documents theo cấu hình của ICPDP. |
| BR03 | Số lượng founding members tối thiểu là Configurable Business Rule. |
| BR04 | Application version đã submit không được overwrite. |
| BR05 | Approval/Reject phải lưu actor, timestamp và reason khi áp dụng. |
| BR06 | Không được có overlapping President trong cùng thời gian trừ khi policy cho phép. |
| BR07 | Điều kiện giữ leadership position là configurable. |
| BR08 | Permission mới chỉ có hiệu lực khi leadership transition được confirm. |
| BR09 | Suspended Club không được mở recruitment campaign mới. |
| BR10 | Suspended Club không được submit event proposal mới. |
| BR11 | Recruitment chỉ nhận application trong application window. |
| BR12 | Một student không được nộp duplicate application vào cùng campaign. |
| BR13 | Membership chỉ tạo từ accepted candidate hoặc authorized manual onboarding. |
| BR14 | Event chỉ được public sau khi Approved. |
| BR15 | Conflict threshold là configurable. |
| BR16 | Event có risk category nhất định có thể yêu cầu Supporting Reviewer. |
| BR17 | Confirmed registration không vượt capacity nếu policy không cho phép overbooking. |
| BR18 | Một participant chỉ có một official attendance record/event. |
| BR19 | Finalized attendance chỉ được unlock bởi role đặc biệt. |
| BR20 | Deadline post-event report là configurable. |
| BR21 | CLB quá hạn mandatory report có thể bị chặn event mới nếu policy bật enforcement. |
| BR22 | Budget Request phải gắn với valid business purpose. |
| BR23 | Disbursed Amount không được vượt Approved Amount nếu chưa có amendment. |
| BR24 | Expense ngoài approved category phải bị flag exception. |
| BR25 | Requirement về evidence theo expense category là configurable. |
| BR26 | Reconciliation phải hoàn thành trước khi budget case được đóng. |
| BR27 | Violation severity taxonomy do ICPDP cấu hình. |
| BR28 | Violation decision phải có reason/evidence. |
| BR29 | Tổng evaluation weight phải hợp lệ trước khi scheme được activate. |
| BR30 | Published Evaluation không sửa trực tiếp; phải tạo revision/snapshot mới. |

---

# 15. ENTITY LIFECYCLE / STATE MACHINE

## 15.1 Club Application

```text
Draft
→ Submitted
→ Under Review
→ Revision Requested
→ Resubmitted
→ Under Review
→ Approved / Rejected
```

| Transition | Actor | UC |
|---|---|---|
| Draft → Submitted | Student | UC02 |
| Submitted → Under Review | ICPDP | UC03 |
| Under Review → Revision Requested | ICPDP | UC04 |
| Revision Requested → Resubmitted | Student | UC05 |
| Under Review → Approved/Rejected | ICPDP | UC06 |

## 15.2 Club

```text
Pending Setup
→ Active
→ Suspended
→ Active
→ Dissolved
```

Có thể bổ sung `Inactive` nếu business xác nhận cần phân biệt với `Suspended`.

## 15.3 Recruitment Campaign

```text
Draft
→ Published
→ Accepting Applications
→ Screening
→ Completed

hoặc → Cancelled
```

## 15.4 Recruitment Application

```text
Draft
→ Submitted
→ Screening
→ Shortlisted
→ Accepted / Rejected / Waitlisted
→ Onboarded
```

## 15.5 Event

```text
Draft
→ Pending Approval
→ Under Review
→ Revision Requested
→ Resubmitted
→ Approved
→ Open for Registration
→ Ongoing
→ Completed
→ Report Submitted
→ Closed
```

Exceptional:

```text
Approved / Open for Registration / Ongoing
→ Cancelled
```

## 15.6 Budget Request

```text
Draft
→ Submitted
→ Under Review
→ Revision Requested
→ Resubmitted
→ Approved / Rejected
→ Disbursed
→ Reconciliation Pending
→ Reconciled
→ Closed
```

## 15.7 Violation

```text
Open
→ Under Investigation
→ Awaiting Club Response
→ Decision Issued
→ Corrective Action
→ Resolved
```

## 15.8 Evaluation

```text
Draft
→ Data Ready
→ Under Review
→ Finalized
→ Published
```

---

# 16. DOMAIN MODEL

## 16.1 Core Entities

- User
- StudentProfile
- Role
- Permission
- Club
- ClubApplication
- ClubApplicationVersion
- ClubMembership
- ClubTerm
- ClubPosition
- ClubPositionAssignment
- RecruitmentCampaign
- RecruitmentApplication
- CandidateEvaluation
- Event
- EventProposalVersion
- EventRegistration
- Attendance
- PostEventReport
- BudgetRequest
- BudgetRequestVersion
- BudgetDisbursement
- Expense
- FinancialEvidence
- FinancialReconciliation
- PeriodicReport
- Violation
- CorrectiveAction
- Evaluation
- EvaluationScheme
- EvaluationDimension
- EvaluationDimensionResult
- ApprovalTask
- ApprovalDecision
- Notification
- AuditLog

## 16.2 Relationships

```text
User
1 --- N ClubMembership

Club
1 --- N ClubMembership

Club
1 --- N ClubTerm

ClubTerm
1 --- N ClubPositionAssignment

Club
1 --- N RecruitmentCampaign

RecruitmentCampaign
1 --- N RecruitmentApplication

User
1 --- N RecruitmentApplication
```

### Event

```text
Club
1 --- N Event

Event
1 --- N EventProposalVersion

Event
1 --- N EventRegistration

EventRegistration
1 --- 0..1 Attendance

Event
1 --- 0..1 PostEventReport
```

### Finance

```text
Club
1 --- N BudgetRequest

Event
0..1 --- N BudgetRequest

BudgetRequest
1 --- N Expense

Expense
1 --- N FinancialEvidence

BudgetRequest
1 --- 0..1 FinancialReconciliation
```

### Compliance & Evaluation

```text
Club
1 --- N Violation

Club
1 --- N PeriodicReport

Club
1 --- N Evaluation

Evaluation
1 --- N EvaluationDimensionResult
```

### Workflow

```text
Business Entity
1 --- N ApprovalTask

ApprovalTask
1 --- N ApprovalDecision

Business Entity
1 --- N AuditLog
```

---

# 17. CLUB PERFORMANCE EVALUATION MODEL

Không hard-code một công thức điểm cố định nếu chưa có policy thật của trường.

Thay vào đó xây dựng **Evaluation Framework có thể cấu hình**.

## D1 – Activity Execution

**Input:**

- approved events;
- completed events;
- cancelled events;
- post-event reports.

**Business Question:**

> CLB có thực sự triển khai những hoạt động đã đăng ký/cam kết không?

## D2 – Member Engagement

**Input:**

- active members;
- attendance;
- retention;
- participation rate.

**Business Question:**

> Thành viên có thực sự tham gia hoạt động hay chỉ tồn tại trên danh sách?

## D3 – Reporting Discipline

**Input:**

- report completion;
- due date;
- overdue days;
- number of revisions.

**Business Question:**

> CLB có tuân thủ nghĩa vụ báo cáo không?

## D4 – Financial Compliance

**Input:**

- approved budget;
- disbursed amount;
- expenses;
- evidence;
- reconciliation.

**Business Question:**

> CLB sử dụng ngân sách có minh bạch và đúng quy trình không?

## D5 – Governance

**Input:**

- valid management board;
- leadership term;
- transition;
- membership records.

**Business Question:**

> CLB có bộ máy vận hành và khả năng continuity tốt không?

## D6 – Compliance & Risk

**Input:**

- violation count;
- severity;
- unresolved cases;
- corrective actions.

**Business Question:**

> CLB có tạo ra governance/compliance risk cho nhà trường không?

## Evaluation Scheme

```text
Evaluation Scheme
├─ Academic Period
├─ Dimensions
├─ Criteria
├─ Weight
├─ Scoring Rule
└─ Threshold
```

ICPDP cấu hình trọng số.

Không tự giả định 10%, 20%, 30% nếu chưa có policy.

## Data Lineage

Mỗi kết quả phải trace được:

```text
Dimension Result
→ Metric
→ Source Entity
→ Source Period
```

Ví dụ:

```text
Reporting Compliance
→ 4 reports due
→ 3 submitted on time
→ Source: PeriodicReport #...
```

---

# 18. DASHBOARD REQUIREMENTS

## 18.1 ICPDP Dashboard

| Widget | Business Question |
|---|---|
| Active/Suspended Clubs | Hiện có bao nhiêu CLB đang hoạt động hợp lệ? |
| Pending Approvals | Những request nào đang chờ ICPDP xử lý? |
| Approval Aging | Request nào chờ quá lâu? |
| Upcoming Events | Sự kiện nào sắp diễn ra? |
| Conflict Alerts | Có sự kiện nào trùng lịch/địa điểm? |
| Budget Exposure | Tổng approved/disbursed/reconciled là bao nhiêu? |
| Overdue Reports | CLB nào chưa hoàn thành nghĩa vụ? |
| Open Violations | Compliance case nào chưa xử lý? |
| Club Health | CLB nào có tín hiệu rủi ro? |
| Evaluation Distribution | Chất lượng CLB trong kỳ như thế nào? |

## 18.2 Club Management Dashboard

Trả lời các câu hỏi:

- CLB hiện có bao nhiêu active members?
- Campaign nào đang chạy?
- Event nào sắp diễn ra?
- Proposal nào đang Pending/Revision Requested?
- Budget còn bao nhiêu?
- Expense nào thiếu evidence?
- Report nào sắp quá hạn?
- Có open violation không?
- Nhiệm kỳ còn bao lâu?
- Transition task nào chưa hoàn thành?

## 18.3 Student Dashboard

- Tôi đang thuộc CLB nào?
- CLB nào đang tuyển?
- Application của tôi ở trạng thái nào?
- Event nào tôi có thể đăng ký?
- Event nào tôi đã đăng ký?
- Event sắp tới của tôi?
- Attendance history?

## 18.4 Supporting Reviewer Dashboard

- Request nào được assign?
- SLA còn bao lâu?
- Request nào đã review?
- Recommendation nào đang chờ ICPDP quyết định?

---

# 19. NOTIFICATION & DEADLINE RULES

| Business Event | Recipient | Channel |
|---|---|---|
| Club Application Submitted | ICPDP | In-app |
| Club Application Revision Requested | Applicant | In-app + Email |
| Club Approved | Applicant/CMB | In-app + Email |
| Recruitment Decision | Student | In-app |
| Event Proposal Submitted | ICPDP | In-app |
| Event Approved/Rejected | CMB | In-app + Email |
| Event Rescheduled | Registered Students | In-app |
| Event Reminder | Participants | In-app |
| Post-event Report Due Soon | CMB | Reminder |
| Budget Approved | CMB | In-app |
| Expense Missing Evidence | Treasurer/CMB | Reminder |
| Reconciliation Overdue | CMB + ICPDP | Escalation |
| Periodic Report Due | CMB | Reminder |
| Violation Opened | CMB | In-app + Email |
| Leadership Term Near Expiry | CMB + ICPDP | Reminder |
| Evaluation Published | CMB | In-app |

## Configurable Deadline Escalation

```text
T - X days → Reminder
T          → Due
T + Y days → Overdue
T + Z days → Escalate ICPDP
```

X, Y, Z là configurable business rules.

---

# 20. AUDIT REQUIREMENTS

Audit record tối thiểu:

```text
Audit ID
Entity Type
Entity ID
Action
Actor ID
Actor Role
Before State
After State
Timestamp
Reason
Change Diff
Correlation ID
```

Bắt buộc audit mạnh cho:

- Club Application Decision
- Club Status
- Management Board
- Leadership Transition
- Event Approval
- Budget Approval
- Expense/Evidence Modification
- Violation
- Evaluation
- RBAC Change

Ví dụ:

```text
Entity: EventProposal #E1002
Before: UNDER_REVIEW
Action: APPROVE
After: APPROVED
Actor: ICPDP Officer
Reason: Meets governance requirements
Timestamp: ...
```

---

# 21. REQUIREMENT TRACEABILITY MATRIX

| Business Problem | Requirement | Use Case | Actor | User Story | Rule |
|---|---|---|---|---|---|
| BP04 | Standardized club establishment workflow | UC02–06 | Student/ICPDP | US01–03 | BR02–05 |
| BP03 | Leadership history | UC08–12 | CMB/ICPDP | US04–06 | BR06–08 |
| BP11 | Central recruitment | UC15–20 | Student/CMB | US07–10 | BR11–13 |
| BP02 | Accurate membership lifecycle | UC20–23 | CMB | US10 | BR13 |
| BP05 | Event approval workflow | UC24–30 | CMB/ICPDP | US11–13 | BR14–16 |
| BP06 | Conflict detection | UC25 | CMB/System | US12 | BR15 |
| BP07 | Registration & attendance | UC31–34 | Student/CMB | US14–16 | BR17–19 |
| BP08 | Post-event accountability | UC36–37 | CMB/ICPDP | US17–18 | BR20–21 |
| BP09 | Budget lifecycle | UC38–45 | CMB/ICPDP | US19–22 | BR22–26 |
| BP10 | Financial reconciliation | UC45 | ICPDP | US22 | BR23–26 |
| BP14 | Deadline management | UC36, UC45, UC46 | All | US24, US30 | BR20–21 |
| BP12 | Structured compliance cases | UC48 | ICPDP | US25–26 | BR27–28 |
| BP13 | Data-driven evaluation | UC49–50 | ICPDP | US27–29, US35 | BR29–30 |
| BP15 | Auditability | Cross-module | ICPDP | US32 | BR05 |
| BP01 | Club lifecycle control | UC14 | ICPDP | US34 | BR09–10 |

---

# 22. MVP VS VERSION 2

## 22.1 MVP

MVP nên tập trung khoảng 25–30 UC core.

### Club Establishment

- UC01–UC07
- UC09–UC10

### Recruitment

- UC15–UC17
- UC19–UC21

### Event

- UC24
- UC26–UC31
- UC33–UC34
- UC36–UC37

### Finance

- UC38–UC39
- UC41
- UC43–UC45

### Reporting

- UC46–UC47

MVP phải chứng minh được ít nhất 4 lifecycle:

```text
Club
Recruitment
Event
Finance
```

## 22.2 Version 2

Có thể defer:

- UC08 – Organization customization nâng cao
- UC11–12 – Leadership transition automation
- UC13 – Voluntary suspension
- UC18 – Candidate evaluation rubric
- UC22 – Advanced role assignment
- UC23 – Complex member removal
- UC25 – Advanced conflict engine
- UC32 – Advanced waitlist
- UC35 – Complex reschedule workflow
- UC40 – Budget revision versioning
- UC42 – Detailed disbursement tracking
- UC48 – Full compliance case management
- UC49–50 – Fully configurable performance evaluation

---

# 23. FEATURE NỔI BẬT CỦA ĐỒ ÁN

## Feature 1 – Configurable Approval Workflow

### Bài toán

Không phải mọi request đều có cùng approval path.

### Input

- request type;
- amount;
- event risk;
- venue;
- club status.

### Processing

Rule-based routing:

```text
Normal Event
→ ICPDP

Large Event
→ ICPDP
→ Facility
→ Security

High Budget
→ ICPDP
→ Finance
```

### Output

- approval tasks;
- decision history;
- current approver;
- SLA;
- audit trail.

### Business Value

Giảm hard-code và phản ánh được governance thực tế.

### Related UC

UC03, UC06, UC26, UC29, UC39, UC41.

---

## Feature 2 – Event Conflict Detection

### Input

- venue;
- start time;
- end time;
- status;
- capacity.

### Processing

```text
Overlap time?
AND same venue?
AND existing event blocks?
```

### Output

- No Conflict
- Warning
- Blocking Conflict

### Business Value

Giảm trùng lịch và xung đột địa điểm.

### AI?

Không cần AI. Deterministic business logic là phù hợp hơn.

### Related UC

UC24, UC25, UC29, UC35.

---

## Feature 3 – Budget & Financial Reconciliation

### Bài toán

Approved Budget không đồng nghĩa Actual Spend và Supported Spend.

### Input

- approved allocation;
- disbursement;
- expenses;
- evidence.

### Processing/Output

```text
Approved Amount
Disbursed Amount
Recorded Expense
Supported Expense
Unsupported Expense
Remaining Balance
Variance
```

### Business Value

Tăng accountability và khả năng audit.

### Related UC

UC38–UC45.

---

## Feature 4 – Club Performance Evaluation Engine

### Input

```text
Membership
Events
Attendance
Finance
Reports
Violations
```

### Processing

Evaluation Scheme + dimensions + weight + rules.

### Output

- score/dimension;
- evidence;
- trend;
- classification;
- historical result.

### Business Value

Biến dữ liệu vận hành thành dữ liệu phục vụ governance.

### Related UC

UC49–UC50.

---

## Feature 5 – Club Health / Risk Monitoring

> Có thể để Version 2.

### Input

- overdue reports;
- unreconciled budget;
- low membership;
- open violations;
- no recent activity;
- expiring leadership term.

### Processing

Rule-based risk indicators.

### Output

- Low / Medium / High risk;
- reason;
- recommended action.

### AI?

Ban đầu không cần AI.

Nếu có đủ dữ liệu lịch sử, sau này mới cân nhắc ML để dự báo nguy cơ CLB inactive hoặc vi phạm.

---

# 24. FINAL REVIEW

## 24.1 Hệ thống đang giải quyết bài toán gì?

Hệ thống giải quyết:

- governance của CLB;
- dữ liệu phân tán;
- approval workflow;
- membership;
- event lifecycle;
- attendance;
- budget accountability;
- reporting;
- compliance;
- evaluation;
- leadership continuity.

Đây không phải website quản lý danh mục CLB.

---

## 24.2 Tại sao cần hệ thống thay vì Excel + Google Forms?

Excel/Forms có thể thu thập dữ liệu, nhưng rất khó enforce:

- lifecycle/state;
- authorization;
- referential integrity;
- versioning;
- approval;
- audit;
- deadline;
- cross-module relationship;
- historical governance;
- automated evaluation.

Ví dụ:

```text
Event A
→ phải được Approved
→ mới được Publish
→ Registration phải thuộc Event A
→ Attendance phải thuộc Registration
→ Report phải dùng Attendance đã chốt
→ Evaluation phải trace về Event/Report đó
```

Đây là giá trị mà spreadsheet đơn lẻ khó cung cấp.

---

## 24.3 4 actor có hợp lý không?

Có.

Ba actor chắc chắn:

1. Student
2. Club Management Board
3. ICPDP Officer

Actor thứ tư:

4. School Supporting Reviewer

hợp lý nếu có approval đa phòng ban.

Nếu business thực tế không có, actor này có thể giảm vai trò hoặc đưa sang V2.

---

## 24.4 50 use case có bị artificial không?

Không đáng kể.

Use case được hình thành từ 5 nhóm lifecycle:

```text
Club Governance
Recruitment & Membership
Event
Finance
Reporting / Compliance / Evaluation
```

Các use case như Request Revision, Resubmit và Approve được tách vì:

- actor khác;
- trách nhiệm khác;
- state transition khác;
- audit requirement khác.

---

## 24.5 Core Use Cases

Nhóm quan trọng nhất:

- UC02–UC06 – Club Establishment
- UC15–UC20 – Recruitment
- UC24–UC30 – Event Approval
- UC31–UC37 – Event Execution
- UC38–UC45 – Finance
- UC46–UC50 – Reporting & Evaluation

---

## 24.6 Dependency chính

```text
UC06
→ UC07
→ UC15 / UC24 / UC38
```

```text
UC15
→ UC16
→ UC19
→ UC20
```

```text
UC24
→ UC29
→ UC30
→ UC31
→ UC33
→ UC34
→ UC36
→ UC37
```

```text
UC38
→ UC41
→ UC43
→ UC44
→ UC45
```

```text
UC37
UC45
UC47
UC48
 ↓
UC49
 ↓
UC50
```

---

## 24.7 Module trung tâm

### Về business

**Club Lifecycle & Governance**

### Về architecture

**Identity + Workflow + Audit**

### Về differentiation

**Performance Evaluation**

---

## 24.8 Data flow xuyên module

```text
Recruitment Application
→ Membership
→ Attendance
→ Engagement Metric
→ Evaluation
```

```text
Event Proposal
→ Event
→ Registration
→ Attendance
→ Report
→ Evaluation
```

```text
Budget Request
→ Expense
→ Evidence
→ Reconciliation
→ Financial Compliance
→ Evaluation
```

```text
Violation
→ Compliance History
→ Evaluation
```

```text
Leadership
→ Governance Health
→ Evaluation
```

Đây là điểm quan trọng nhất giúp hệ thống không biến thành nhiều module CRUD độc lập.

---

## 24.9 Feature tạo chiều sâu

Nên ưu tiên:

1. Approval Workflow Engine
2. Event Conflict Detection
3. Budget Reconciliation
4. Club Performance Evaluation
5. Leadership Transition / Risk Monitoring

---

## 24.10 Nhóm 4 sinh viên làm 4–6 tháng có khả thi không?

Có, nếu scope được kiểm soát.

Không nên cố triển khai cả 50 UC ở production-level trong cùng một phiên bản.

Chiến lược:

- 25–30 UC làm MVP hoàn chỉnh;
- phần còn lại làm simplified hoặc V2;
- modular monolith;
- REST API;
- không microservices nếu không có lý do;
- không xây full ERP;
- không ép AI;
- không làm native app nếu không cần.

---

## 24.11 Nếu phải cắt scope, bỏ gì trước?

1. AI/Predictive Club Health.
2. Multi-department approval quá phức tạp.
3. Advanced waitlist.
4. Voluntary suspension workflow.
5. Advanced transition checklist.
6. Recruitment rubric phức tạp.
7. Automated risk scoring.

Không nên cắt:

- Club Establishment;
- Event Approval;
- Attendance;
- Budget/Expense;
- Reporting.

---

## 24.12 Có đủ chiều sâu cho đồ án Software Engineering không?

Có.

Hệ thống có:

- multi-actor workflow;
- state machines;
- RBAC;
- approval routing;
- transactional business rules;
- versioning;
- conflict detection;
- budget reconciliation;
- audit log;
- notification/deadline;
- cross-domain data;
- configurable evaluation;
- historical lifecycle.

Nếu triển khai tốt, đề tài đủ nền tảng để phát triển tiếp:

```text
Business Analysis
→ SRS
→ Use Case Diagram
→ Detailed Use Case Specification
→ Activity Diagram
→ Domain Model
→ ERD
→ System Architecture
→ API Design
→ Sequence Diagram
→ UI/UX
→ Test Cases
→ Product Backlog
→ Sprint Planning
```

---

# KẾT LUẬN

Điểm quan trọng nhất cần giữ xuyên suốt đồ án:

> **UCMS không phải hệ thống “quản lý thông tin câu lạc bộ”. UCMS là hệ thống quản trị vòng đời, trách nhiệm, tuân thủ và hiệu quả hoạt động của câu lạc bộ.**

Mô hình tổng thể:

```text
                  UNIVERSITY CLUB
                        │
         ┌──────────────┼──────────────┐
         ↓              ↓              ↓
     Membership       Events        Finance
         │              │              │
         ↓              ↓              ↓
     Engagement      Attendance     Evidence
         │              │              │
         └───────┬──────┴──────┬───────┘
                 ↓             ↓
              Reports      Compliance
                 └─────┬───────┘
                       ↓
                  Evaluation
                       ↓
              Governance Decision
```

Đây chính là yếu tố biến đề tài từ một website CRUD thành một **Software Engineering Graduation Project có business logic, workflow, state, rule, audit và cross-module data rõ ràng**.
