# HỆ THỐNG QUẢN LÝ CÂU LẠC BỘ TRONG TRƯỜNG ĐẠI HỌC
## University Club Management System (UCMS)

> **Loại tài liệu:** Business & System Analysis / Requirement Baseline  
> **Mục tiêu:** Làm nền tảng cho SRS, Use Case Diagram, Use Case Specification, Activity Diagram, Sequence Diagram, ERD, Database Design, API Design, UI/UX, Test Case, Product Backlog và Sprint Backlog.  
> **Nguyên tắc thiết kế:** Business Problem → Business Process → Actor → Requirement → Use Case.  
> **Quy mô mục tiêu:** 3 actor chính, 2 external system, 12 module nghiệp vụ, 57 business use case có liên kết end-to-end.  
> **Nguồn chốt scope:** Context Diagram đã được team thống nhất (Student, ICPDP Officer, Club's Admin, Google OAuth, Google SMTP Service).

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
Property Booking
→ Approved Resource
→ Event Execution
→ Utilization Metric
→ Evaluation
```

```text
Event Feedback
→ Feedback Summary
→ Post-event Report
→ Evaluation
```

```text
Student Complaint
→ Triage
→ Violation
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
| BP16 | Việc mượn phòng/cơ sở vật chất cho hoạt động CLB xin qua email hoặc giấy tờ rời, không gắn với hồ sơ sự kiện và không phát hiện được trùng lịch sử dụng. |
| BP17 | Phản hồi của người tham gia sau sự kiện không được thu thập có cấu trúc nên không dùng được làm dữ liệu đánh giá chất lượng hoạt động. |
| BP18 | Sinh viên không có kênh chính thức để khiếu nại về CLB; phản ánh đi qua kênh không chính thức và không để lại vết xử lý. |
| BP19 | Mỗi hệ thống nội bộ tự quản lý tài khoản riêng, sinh viên phải nhớ thêm một bộ credential ngoài tài khoản trường. |

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
- Property Booking
- Report
- Violation
- Student Complaint
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
- trải nghiệm event bị phân tán;
- không có kênh chính thức để góp ý hoặc khiếu nại.

### Đối với nhà trường

- thiếu khả năng governance;
- thiếu dữ liệu đánh giá chất lượng CLB;
- tăng financial/compliance risk;
- khó hoạch định hoạt động sinh viên;
- cơ sở vật chất bị cấp trùng hoặc cấp rồi không dùng mà không ai phát hiện.

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

### Luồng cơ sở vật chất

```text
Property Booking Request
→ Availability & Conflict Check
→ ICPDP Review
→ Approved / Rejected
→ Booking Status
→ Event Execution
```

### Luồng phản hồi và khiếu nại

```text
Event Feedback / Club Complaint
→ Routing
→ Club Response hoặc Compliance Case
→ Resolution
→ Evaluation Input
```

---

# 3. STAKEHOLDER ANALYSIS

| Stakeholder | Mối quan tâm | Mức ảnh hưởng | Tương tác |
|---|---|---:|---|
| Ban lãnh đạo nhà trường | Governance, risk, chất lượng hoạt động sinh viên | Cao | Tiêu thụ báo cáo/KPI |
| ICPDP | Quản trị toàn bộ hoạt động CLB; **đại diện duy nhất của nhà trường trong hệ thống** | Rất cao | Trực tiếp |
| Ban chủ nhiệm CLB | Vận hành CLB | Cao | Trực tiếp |
| Thành viên CLB | Tham gia hoạt động | Trung bình | Trực tiếp |
| Sinh viên toàn trường | Tìm CLB, ứng tuyển, đăng ký event | Trung bình | Trực tiếp |
| Các phòng ban hỗ trợ (Finance, Facility, Security) | Kinh phí, cơ sở vật chất, an toàn sự kiện | Trung bình | **Gián tiếp** – ý kiến được ICPDP tổng hợp ngoài hệ thống |
| IT/System Admin | Vận hành kỹ thuật | Trung bình | Technical |
| Google (OAuth, SMTP) | Cung cấp dịch vụ xác thực và gửi email | Thấp | External system |

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
- xem membership và xin rời CLB;
- gửi phản hồi sau sự kiện;
- gửi khiếu nại về CLB.

### Dữ liệu tạo ra

- RecruitmentApplication
- EventRegistration
- Attendance
- EventFeedback
- Complaint
- ClubApplication nếu là founding student

### Dữ liệu tiêu thụ

- Club
- RecruitmentCampaign
- Event
- ApplicationStatus
- Membership status
- StudentProfile (đồng bộ từ Google OAuth)

---

## A2 – Club Management Board (Club's Admin)

Đại diện cho **Ban chủ nhiệm/Ban điều hành CLB**. Trên Context Diagram, actor này được đặt tên là **Club's Admin**.

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
- gửi yêu cầu đặt cơ sở vật chất;
- quản lý attendance;
- submit budget;
- ghi expense;
- nộp báo cáo;
- xem và xử lý feedback sự kiện;
- phản hồi compliance case;
- chuẩn bị chuyển giao nhiệm kỳ.

---

## A3 – ICPDP Officer

Actor **đại diện duy nhất của nhà trường** trong hệ thống và nắm **quyền cao nhất**.

Mọi quyết định quản trị cuối cùng — thành lập, đình chỉ, giải thể CLB, phê duyệt sự kiện,
phê duyệt ngân sách, cấp cơ sở vật chất, xử lý vi phạm, chốt đánh giá — đều kết thúc ở ICPDP.
Không có actor nào khác có thể override hoặc phủ quyết quyết định của ICPDP.

### Vì sao không tách thêm actor phía nhà trường

Các phòng ban như Finance Office, Facility Management, Security hay Faculty Advisor **không
tương tác trực tiếp** với UCMS. Khi một request cần ý kiến chuyên môn của họ, ICPDP lấy ý
kiến **ngoài hệ thống** và ghi nhận kết quả vào quyết định của mình. Hệ quả thiết kế:

- hệ thống chỉ có **một** approval authority duy nhất phía nhà trường;
- approval routing là **đa cấp trong nội bộ ICPDP** (theo request type/ngưỡng giá trị/mức rủi ro),
  không phải đa phòng ban;
- phân cấp trong ICPDP (officer, senior officer, head) xử lý bằng **RBAC**, không tạo actor mới.

### Trách nhiệm

- xét duyệt thành lập CLB;
- quản lý lifecycle CLB (active/suspend/reactivate/dissolve);
- xác nhận Ban chủ nhiệm và chuyển giao nhiệm kỳ;
- phê duyệt sự kiện;
- xét duyệt ngân sách và giải ngân;
- phê duyệt yêu cầu đặt cơ sở vật chất;
- quản lý compliance;
- tiếp nhận khiếu nại của sinh viên và xử lý vi phạm;
- theo dõi báo cáo định kỳ và báo cáo sau sự kiện;
- xem tổng hợp feedback CLB/sự kiện;
- chấm điểm và công bố đánh giá CLB;
- cấu hình chính sách, deadline, evaluation scheme và RBAC.

### Dữ liệu tạo ra

- ApprovalDecision (club, event, budget, property booking)
- Violation, CorrectiveAction
- Evaluation, EvaluationScheme
- Policy/Configuration

### Dữ liệu tiêu thụ

- Club's leadership information
- Event registration list
- Club recruitment result
- Club and event feedback
- Club evaluation report
- Property booking request
- Periodic reports
- Club transition notification

---

## External Systems

Hai hệ thống ngoài tham gia luồng dữ liệu nhưng **không phải actor nghiệp vụ** — chúng không
ra quyết định và không sở hữu business outcome nào.

### ES1 – Google OAuth

- **Vai trò:** nhà cung cấp danh tính. UCMS không tự quản lý mật khẩu.
- **Luồng vào:** UCMS gửi `Authentication request`.
- **Luồng ra:** Google OAuth trả `Authentication data` (email, họ tên, ảnh đại diện).
- **Hệ quả:** tài khoản được nhận diện theo email trường; domain hợp lệ là configurable business rule.

### ES2 – Google SMTP Service

- **Vai trò:** kênh gửi email.
- **Luồng vào:** UCMS gửi `Send email request` cho mọi notification có channel Email.
- **Hệ quả:** notification in-app do UCMS tự lưu; notification email phụ thuộc dịch vụ ngoài
  nên cần retry/log trạng thái gửi.

---

## Kết luận actor

**3 actor:**

1. Student
2. Club Management Board (Club's Admin)
3. ICPDP Officer

**2 external system:** Google OAuth, Google SMTP Service.

> **Thay đổi so với bản trước:** actor `School Supporting Reviewer` đã bị **loại bỏ**.
> Quy trình thực tế của trường do ICPDP xử lý toàn bộ; ICPDP là quyền cao nhất và đại diện
> cho nhà trường. Ý kiến của Finance/Facility/Security được ICPDP thu thập ngoài hệ thống và
> phản ánh vào quyết định cuối cùng của chính ICPDP.

---

# 5. SYSTEM SCOPE

## 5.1 In Scope

- Authentication qua **Google OAuth**
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
- **Property booking cho hoạt động CLB** (request → ICPDP duyệt → status)
- Budget request
- Expense
- Financial evidence
- Financial reconciliation
- Periodic reporting
- **Event feedback**
- **Student complaint intake**
- Compliance
- Violation
- Club performance evaluation
- Notification (in-app + email qua **Google SMTP**)
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
- room booking engine toàn trường (UCMS chỉ quản lý booking phục vụ **hoạt động CLB**, không thay thế hệ thống đặt phòng chung của nhà trường);
- inventory ERP;
- payment gateway;
- sponsorship marketplace;
- native mobile app;
- facial recognition attendance;
- AI chatbot bắt buộc;
- cơ chế xác thực tự xây (username/password nội bộ) — đã thay bằng Google OAuth;
- mail server riêng — dùng Google SMTP;
- quy trình phê duyệt đa phòng ban (Finance/Facility/Security review trực tiếp trên hệ thống) — ICPDP là điểm duyệt duy nhất.

---

# 6. MODULE DECOMPOSITION

| Module | Mục tiêu | Actor | Dữ liệu chính | Liên kết |
|---|---|---|---|---|
| M01 Identity & RBAC | Xác thực qua Google OAuth, kiểm soát tài khoản và quyền | All | User, StudentProfile, Role, Permission | Tất cả |
| M02 Club Lifecycle & Governance | Quản lý vòng đời CLB | CMB, ICPDP | Club, ClubApplication | M03, M04, M09 |
| M03 Leadership & Term | Quản lý nhiệm kỳ | CMB, ICPDP | ClubTerm, Position | M01, M02 |
| M04 Recruitment & Membership | Tuyển/quản lý thành viên | Student, CMB | Campaign, Application, Membership | M06, M09 |
| M05 Event & Activity | Quản trị sự kiện | CMB, ICPDP | EventProposal, Event | M06, M07, M08, M11 |
| M06 Registration & Attendance | Đăng ký/điểm danh | Student, CMB | Registration, Attendance | M05, M08, M09 |
| M07 Finance & Budget | Quản trị ngân sách/chi tiêu | CMB, ICPDP | BudgetRequest, Expense, Evidence | M05, M09 |
| M08 Reporting & Compliance | Báo cáo và tuân thủ | CMB, ICPDP | Report, Violation | M05, M07, M09, M12 |
| M09 Performance Evaluation | Đánh giá CLB | ICPDP | Evaluation, Criteria | M02–M08, M11, M12 |
| M10 Workflow, Notification & Audit | Governance xuyên module | All | ApprovalTask, Notification, AuditLog | Tất cả |
| M11 Property & Facility Booking | Xin và cấp cơ sở vật chất cho hoạt động CLB | CMB, ICPDP | Property, PropertyBooking | M05, M09 |
| M12 Feedback & Complaint | Thu thập phản hồi sự kiện và khiếu nại về CLB | Student, CMB, ICPDP | EventFeedback, Complaint | M06, M08, M09 |

Hai module M11 và M12 được bổ sung theo Context Diagram đã chốt
(`Property booking request` / `Property booking status`, `Event feedback`, `Club complaint`).

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
→ Property Booking Request (nếu cần cơ sở vật chất)
→ ICPDP Review
→ Revision nếu cần
→ Approval
→ Publish
→ Registration
→ Check-in
→ Attendance Finalization
→ Post-event Report
→ Event Feedback
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
Student Complaint / Issue / Violation
→ Triage
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
+ Event Feedback
+ Complaint History
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

## Flow 9 – Property Booking

```text
CMB Submit Property Booking Request
→ Availability & Conflict Check
→ ICPDP Review
→ Approved / Rejected
→ Booking Status trả về CMB
→ Sử dụng trong Event
→ Release / Cancel
```

## Flow 10 – Feedback

```text
Event Closed hoặc Attendance Finalized
→ Feedback Window mở
→ Student Submit Event Feedback
→ Aggregate
→ CMB xem kết quả
→ ICPDP xem tổng hợp Club and Event Feedback
→ Evaluation Input
```

## Flow 11 – Authentication

```text
User chọn đăng nhập
→ UCMS gửi Authentication request → Google OAuth
→ Google OAuth trả Authentication data
→ UCMS map email → User + StudentProfile
→ Load role/permission
→ Workspace tương ứng
```

---

# 8. MASTER USE CASE LIST

## 8.1 Club Lifecycle & Governance

| ID | Use Case | Actor | Module | Business Goal | Related UC | Priority |
|---|---|---|---|---|---|---|
| UC01 | Xác thực qua Google OAuth và truy cập workspace theo quyền | All | M01 | Truy cập an toàn | All | Must |
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
| UC24 | Gửi đề xuất tổ chức sự kiện | CMB | M05 | Xin phép tổ chức | UC25–29, UC51 | Must |
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
| UC48 | Quản lý vụ việc vi phạm/tuân thủ | ICPDP | M08 | Kiểm soát compliance | UC49, UC57 | Must |
| UC49 | Tạo bản nháp đánh giá hiệu quả CLB | ICPDP | M09 | Tổng hợp dữ liệu performance | UC50 | Should |
| UC50 | Review, chốt và công bố đánh giá | ICPDP | M09 | Đánh giá chính thức | UC49 | Should |

## 8.6 Property & Facility Booking

| ID | Use Case | Actor | Module | Business Goal | Related UC | Priority |
|---|---|---|---|---|---|---|
| UC51 | Gửi yêu cầu đặt cơ sở vật chất | CMB | M11 | Xin phòng/thiết bị cho hoạt động CLB | UC24, UC52 | Must |
| UC52 | Phê duyệt/Từ chối yêu cầu đặt cơ sở vật chất | ICPDP | M11 | Cấp phát tài nguyên có kiểm soát | UC51, UC53 | Must |
| UC53 | Theo dõi và hủy/trả cơ sở vật chất đã đặt | CMB | M11 | Giải phóng tài nguyên không dùng | UC35, UC52 | Should |

## 8.7 Feedback & Complaint

| ID | Use Case | Actor | Module | Business Goal | Related UC | Priority |
|---|---|---|---|---|---|---|
| UC54 | Gửi phản hồi sau sự kiện | Student | M12 | Thu thập đánh giá người tham gia | UC34, UC55 | Should |
| UC55 | Xem và xử lý phản hồi sự kiện | CMB | M12 | Cải thiện chất lượng hoạt động | UC54, UC36 | Should |
| UC56 | Gửi khiếu nại về CLB | Student | M12 | Kênh phản ánh chính thức | UC57 | Should |
| UC57 | Tiếp nhận, phân loại và chuyển khiếu nại thành compliance case | ICPDP | M12 | Xử lý khiếu nại có vết | UC48, UC56 | Should |

**Tổng cộng: 57 business use case** (UC01–UC50 giữ nguyên đánh số từ bản trước; UC51–UC57 bổ sung theo Context Diagram).

> **Đã được thay thế:** phần use case model ở §8–§11, §14–§15 và §21–§22 đã được sửa lại trong
> [`UCMS_UseCase_Model_v2.md`](UCMS_UseCase_Model_v2.md) (54 use case). Khi hai bản khác nhau,
> lấy bản đó; phần bên dưới giữ lại làm lịch sử.

---

# 9. DETAILED USE CASE SPECIFICATION

## UC01 – Xác thực qua Google OAuth và truy cập workspace theo quyền

- **Primary Actor:** All
- **Supporting System:** Google OAuth (ES1)
- **Business Goal:** Chỉ cho phép người dùng truy cập đúng dữ liệu/chức năng theo vai trò, không tự quản lý mật khẩu.
- **Trigger:** Người dùng chọn đăng nhập.
- **Preconditions:** Người dùng có tài khoản Google thuộc domain được nhà trường cho phép.
- **Main Flow:**
  1. Hệ thống gửi `Authentication request` tới Google OAuth.
  2. Người dùng xác thực trên Google.
  3. Google OAuth trả `Authentication data` (email, họ tên, ảnh đại diện).
  4. Hệ thống kiểm tra domain email theo policy.
  5. Hệ thống map email tới User; nếu chưa có thì tạo User + StudentProfile ở lần đăng nhập đầu.
  6. Hệ thống tải role/permission hiện hành.
  7. Hệ thống điều hướng tới workspace tương ứng (Student / Club's Admin / ICPDP).
- **Alternative:** Một người dùng có thể có nhiều context (vừa là Student, vừa là Club's Admin của một CLB) và chọn workspace.
- **Exception:**
  - email ngoài domain cho phép → từ chối truy cập;
  - tài khoản bị khóa → từ chối và ghi audit;
  - Google OAuth không phản hồi → báo lỗi, không tạo session.
- **Postcondition:** Session hợp lệ được tạo; `StudentProfile` được đồng bộ.
- **Rule:** Hệ thống **không** lưu mật khẩu người dùng.
- **Pain Point:** BP19.
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
- **Alternative:** Chuyển hồ sơ lên cấp cao hơn trong ICPDP nếu vượt thẩm quyền của officer đang xử lý (RBAC, không phải actor khác).
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
- **Input:** mục tiêu, thời gian, địa điểm, audience, capacity, plan, risk, budget estimate, nhu cầu cơ sở vật chất.
- **Flow:** Validate → UC25 conflict check → (tùy chọn) UC51 property booking request → Submitted/Pending Approval.
- **Related:** UC25, UC26, UC51.

## UC25 – Phát hiện xung đột sự kiện

- **Actor:** System/CMB
- **Input:** venue/property, start time, end time, event status, booking status.
- **Output:** No Conflict / Warning / Blocking Conflict.
- **Rule:** Không tự reject nếu policy chỉ cảnh báo.
- **Scope:** Dùng chung cho cả Event (UC24) và Property Booking (UC51).

## UC26 – Thẩm định đề xuất sự kiện

- **Primary Actor:** ICPDP
- **Review:** compliance, venue, time, budget, safety, overdue obligations, property booking đi kèm.
- **Rule:** ICPDP là điểm duyệt duy nhất. Ý kiến Facility/Security/Finance (nếu cần) được ICPDP thu thập ngoài hệ thống và ghi vào review note.
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
- **Flow:** nhập reason → conflict check nếu đổi lịch → cập nhật/hủy property booking liên quan (UC53) → notify registrants → cập nhật deadline/report/budget impact.

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
- **Trigger:** khiếu nại của sinh viên (UC57), manual report, overdue report, financial issue, unauthorized event, policy breach.
- **Lifecycle:** Open → Investigation → Club Response → Decision → Corrective Action → Resolved.
- **Rule:** Mỗi case phải ghi nguồn khởi tạo; case xuất phát từ khiếu nại phải liên kết tới Complaint gốc.

## UC49 – Tạo bản nháp đánh giá hiệu quả CLB

- **Primary Actor:** ICPDP
- **Input:** activity, attendance, membership, finance, reports, violations, event feedback, complaint history, property booking compliance.
- **Processing:** Áp dụng evaluation scheme hiện hành.
- **Output:** Evaluation Draft.

## UC50 – Review, chốt và công bố đánh giá

- **Primary Actor:** ICPDP
- **Flow:** Review source data → xử lý anomaly → manual dimension nếu được phép → finalize → publish.
- **Rule:** Published Evaluation không sửa trực tiếp; tạo revision/snapshot mới.

## UC51 – Gửi yêu cầu đặt cơ sở vật chất

- **Primary Actor:** CMB
- **Business Goal:** Xin phòng/thiết bị phục vụ hoạt động CLB theo một quy trình có vết.
- **Trigger:** CLB cần địa điểm hoặc thiết bị cho sự kiện/sinh hoạt định kỳ.
- **Preconditions:** Club Active; người dùng có quyền tương ứng.
- **Input:** property, mục đích sử dụng, ngày/giờ bắt đầu–kết thúc, số người dự kiến, thiết bị kèm theo, event liên quan (nếu có).
- **Main Flow:**
  1. CMB chọn property từ danh mục do ICPDP quản lý.
  2. Hệ thống hiển thị tình trạng khả dụng.
  3. CMB nhập thông tin sử dụng.
  4. Hệ thống chạy conflict check (UC25).
  5. CMB submit.
  6. Status → `Requested`; ICPDP nhận review task.
- **Alternative:** Lưu Draft; gắn booking vào một Event Proposal đang soạn.
- **Exception:** Property đã bị đặt trong khung giờ đó và policy chặn overbooking.
- **Postcondition:** PropertyBooking ở trạng thái `Requested`.
- **Related:** UC24, UC25, UC52.
- **Pain Point:** BP16.
- **Priority:** Must.

## UC52 – Phê duyệt/Từ chối yêu cầu đặt cơ sở vật chất

- **Primary Actor:** ICPDP
- **Business Goal:** Cấp phát tài nguyên của nhà trường có kiểm soát.
- **Preconditions:** Booking ở trạng thái `Requested`.
- **Main Flow:**
  1. ICPDP mở yêu cầu.
  2. Kiểm tra tình trạng CLB, mục đích, conflict, nghĩa vụ quá hạn.
  3. Chọn Approve / Reject / Request Revision.
  4. Nhập reason khi Reject hoặc Revision.
  5. Hệ thống ghi audit và cập nhật trạng thái.
  6. Hệ thống gửi `Property booking status` cho CMB.
- **Rule:**
  - chỉ ICPDP có quyền quyết định;
  - Approved booking khóa khung giờ của property đó;
  - CLB đang Suspended không được cấp booking mới.
- **Postcondition:** Booking → `Approved` hoặc `Rejected`.
- **Related:** UC51, UC53, UC26.
- **Priority:** Must.

## UC53 – Theo dõi và hủy/trả cơ sở vật chất đã đặt

- **Primary Actor:** CMB
- **Business Goal:** Giải phóng tài nguyên không còn dùng để CLB khác có thể đặt.
- **Trigger:** Sự kiện bị hủy/đổi lịch (UC35), hoặc CLB không còn nhu cầu.
- **Main Flow:**
  1. CMB mở booking đang `Approved`.
  2. Chọn Cancel và nhập reason.
  3. Hệ thống giải phóng khung giờ.
  4. ICPDP nhận notification.
- **Rule:** Hủy sát giờ sử dụng có thể bị ghi nhận là vi phạm theo policy (liên kết UC48).
- **Postcondition:** Booking → `Cancelled` hoặc `Released`.
- **Related:** UC35, UC52, UC48.
- **Priority:** Should.

## UC54 – Gửi phản hồi sau sự kiện

- **Primary Actor:** Student
- **Business Goal:** Thu thập đánh giá của người tham gia làm dữ liệu cải tiến và đánh giá CLB.
- **Trigger:** Feedback window mở sau khi attendance được chốt.
- **Preconditions:** Student có attendance record hợp lệ của sự kiện đó.
- **Input:** điểm theo tiêu chí, nhận xét tự do, tùy chọn ẩn danh.
- **Main Flow:**
  1. Student mở sự kiện đã tham gia.
  2. Điền form feedback.
  3. Submit.
  4. Hệ thống lưu và cập nhật thống kê tổng hợp.
- **Rule:**
  - mỗi student chỉ gửi **một** feedback cho một sự kiện;
  - feedback chỉ nhận trong feedback window (configurable);
  - feedback ẩn danh không hiển thị danh tính cho CMB nhưng vẫn lưu liên kết nội bộ để chống spam.
- **Postcondition:** EventFeedback được tạo.
- **Related:** UC34, UC55, UC49.
- **Pain Point:** BP17.
- **Priority:** Should.

## UC55 – Xem và xử lý phản hồi sự kiện

- **Primary Actor:** CMB
- **Business Goal:** Dùng phản hồi để cải thiện chất lượng hoạt động.
- **Main Flow:**
  1. CMB mở bảng tổng hợp feedback theo sự kiện.
  2. Xem điểm trung bình theo tiêu chí và phân bố.
  3. Đọc nhận xét.
  4. Ghi nhận lessons learned vào post-event report (UC36).
- **Rule:** CMB không được sửa hoặc xóa feedback của người tham gia.
- **Output:** Feedback summary; input cho UC36 và UC49.
- **Related:** UC54, UC36, UC49.
- **Priority:** Should.

## UC56 – Gửi khiếu nại về CLB

- **Primary Actor:** Student
- **Business Goal:** Cho sinh viên một kênh phản ánh chính thức, có vết xử lý.
- **Trigger:** Sinh viên gặp vấn đề với một CLB hoặc một hoạt động của CLB.
- **Input:** CLB liên quan, event liên quan (nếu có), loại khiếu nại, mô tả, evidence đính kèm.
- **Main Flow:**
  1. Student chọn CLB/sự kiện.
  2. Chọn loại khiếu nại.
  3. Mô tả và đính kèm evidence.
  4. Submit.
  5. Status → `Submitted`; ICPDP nhận task.
- **Rule:** Khiếu nại gửi thẳng tới **ICPDP**, không đi qua CLB bị khiếu nại.
- **Postcondition:** Complaint ở trạng thái `Submitted`; student theo dõi được trạng thái xử lý.
- **Related:** UC57, UC48.
- **Pain Point:** BP18.
- **Priority:** Should.

## UC57 – Tiếp nhận, phân loại và chuyển khiếu nại thành compliance case

- **Primary Actor:** ICPDP
- **Business Goal:** Sàng lọc khiếu nại và chỉ mở compliance case khi có cơ sở.
- **Preconditions:** Complaint ở trạng thái `Submitted`.
- **Main Flow:**
  1. ICPDP mở khiếu nại.
  2. Phân loại mức độ và tính hợp lệ.
  3. Chọn một trong:
     - `Dismissed` – không có cơ sở, ghi reason;
     - `Forwarded` – chuyển CLB xử lý và phản hồi;
     - `Escalated` – mở Violation case qua UC48.
  4. Hệ thống ghi audit và thông báo cho người khiếu nại.
- **Rule:**
  - mọi quyết định phải có reason;
  - chỉ ICPDP có quyền dismiss hoặc escalate.
- **Postcondition:** Complaint → `Dismissed` / `Forwarded` / `Escalated`; nếu Escalated thì một Violation được tạo và liên kết ngược tới Complaint.
- **Related:** UC56, UC48, UC49.
- **Priority:** Should.

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
├─ include  → UC25 Conflict Detection
├─ extend   → UC51 Property Booking Request
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
        → UC54 Event Feedback
        → UC37 Review/Close
        → UC49 Evaluation
```

UC35 có thể tác động từ UC30 đến UC36, và kéo theo UC53 nếu có property booking.

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
UC52 Property Booking Compliance
UC54 Event Feedback Data
UC57 Complaint Outcome
        ↓
UC49 Evaluation Draft
        ↓
UC50 Final Evaluation
```

## 10.6 Property Booking

```text
UC51 Property Booking Request
├─ include → UC25 Conflict Detection
→ UC52 ICPDP Decision
   ├─→ Approved
   │    → UC53 Track / Cancel / Release
   │    → UC24 Event Execution
   └─→ Rejected
        → UC51 Resubmit
```

## 10.7 Feedback & Complaint

```text
UC34 Attendance Finalized
→ UC54 Student Event Feedback
   ├─→ UC55 CMB Review Feedback
   │    → UC36 Post-event Report
   └─→ UC49 Evaluation
```

```text
UC56 Student Complaint
→ UC57 ICPDP Triage
   ├─→ Dismissed
   ├─→ Forwarded → CMB Response
   └─→ Escalated → UC48 Violation Case
                    → UC49 Evaluation
```

---

# 11. ACTOR → USE CASE MAPPING

> Hệ thống có **3 actor**. Actor `School Supporting Reviewer` đã bị loại bỏ — toàn bộ thẩm
> quyền phía nhà trường nằm ở ICPDP Officer.

## Student

- UC01
- UC02
- UC05
- UC16
- UC23
- UC31
- UC33
- UC54
- UC56

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
- UC51
- UC53
- UC55

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
- UC52
- UC57

ICPDP là **quyền cao nhất**: mọi quyết định approve/reject/suspend/dissolve/finalize trong
hệ thống đều thuộc actor này, không có actor nào khác review song song hay phủ quyết.

## External Systems

Không phải actor, chỉ tham gia luồng dữ liệu:

| System | Use Case liên quan | Luồng |
|---|---|---|
| Google OAuth | UC01 | Authentication request → / ← Authentication data |
| Google SMTP Service | Mọi UC có notification channel Email (§19) | Send email request → |

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

## US36
**As a Club Leader,**  
I want to request rooms and equipment inside the same system as my event proposal,  
**so that** tôi không phải xin cơ sở vật chất qua email tách rời khỏi hồ sơ sự kiện.

## US37
**As an ICPDP Officer,**  
I want to see property booking conflicts before approving,  
**so that** hai CLB không được cấp cùng một phòng trong cùng khung giờ.

## US38
**As a Student,**  
I want to give feedback after an event I attended,  
**so that** ý kiến của tôi được ghi nhận thay vì chỉ nói miệng.

## US39
**As a Club Leader,**  
I want to see aggregated event feedback,  
**so that** tôi biết cần cải thiện điều gì ở sự kiện tiếp theo.

## US40
**As a Student,**  
I want to send a complaint about a club directly to ICPDP,  
**so that** phản ánh của tôi không bị chính CLB bị khiếu nại chặn lại.

## US41
**As any user,**  
I want to log in with my school Google account,  
**so that** tôi không phải nhớ thêm một mật khẩu riêng cho hệ thống này.

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

## AC16 – Property Booking Conflict

**Given** property P đã có booking `Approved` từ 14:00–16:00 ngày D  
**When** CLB khác submit booking cho P từ 15:00–17:00 ngày D  
**Then** hệ thống trả Blocking Conflict  
**And** booking không thể chuyển sang `Approved` nếu policy không cho overbooking.

## AC17 – Property Booking Authority

**Given** một booking đang `Requested`  
**When** một người dùng không phải ICPDP cố phê duyệt  
**Then** hệ thống từ chối thao tác  
**And** ghi audit lần thử truy cập trái quyền.

## AC18 – Event Feedback

**Given** student có finalized attendance của event E và feedback window đang mở  
**When** student submit feedback lần đầu  
**Then** một EventFeedback record được tạo.

**When** cùng student submit lần hai cho E  
**Then** hệ thống từ chối duplicate feedback.

**Given** feedback window đã đóng  
**When** student submit feedback  
**Then** hệ thống từ chối.

## AC19 – Complaint Routing

**Given** student submit khiếu nại về CLB X  
**When** khiếu nại được tạo  
**Then** chỉ ICPDP nhìn thấy nội dung gốc  
**And** CLB X không nhận được khiếu nại cho tới khi ICPDP chọn `Forwarded`  
**And** khi ICPDP chọn `Escalated` thì một Violation được tạo và trỏ ngược về Complaint.

## AC20 – Google OAuth Login

**Given** người dùng xác thực thành công trên Google  
**When** email trả về **không** thuộc domain được cấu hình  
**Then** hệ thống từ chối tạo session  
**And** không tạo User record.

**When** email thuộc domain hợp lệ và chưa có User  
**Then** đúng một User + StudentProfile được tạo.

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
| BR16 | Event có risk category cao hơn ngưỡng cấu hình phải được duyệt ở cấp ICPDP cao hơn (RBAC nội bộ ICPDP), không chuyển sang actor khác. |
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
| BR31 | ICPDP là approval authority duy nhất; không có quyết định nào trong hệ thống được duyệt bởi actor khác. |
| BR32 | Hệ thống chỉ chấp nhận đăng nhập qua Google OAuth với email thuộc domain được cấu hình. |
| BR33 | Một property không được có hai booking `Approved` trùng khung giờ nếu policy không cho overbooking. |
| BR34 | Suspended Club không được cấp property booking mới. |
| BR35 | Property booking chỉ được `Approved` bởi ICPDP và tự động giải phóng khi event liên quan bị hủy. |
| BR36 | Mỗi participant chỉ gửi được một event feedback cho một sự kiện, trong feedback window cấu hình được. |
| BR37 | CMB không được sửa hoặc xóa event feedback; chỉ được xem ở dạng tổng hợp. |
| BR38 | Khiếu nại của sinh viên đi thẳng tới ICPDP; CLB bị khiếu nại chỉ tiếp cận được sau khi ICPDP chuyển. |
| BR39 | Mọi quyết định với khiếu nại (dismiss/forward/escalate) phải có reason và được audit. |

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

## 15.9 Property Booking

```text
Draft
→ Requested
→ Under Review
→ Revision Requested
→ Requested
→ Approved / Rejected
→ In Use
→ Completed
```

Exceptional:

```text
Requested / Approved
→ Cancelled

Approved
→ Released (khi event liên quan bị hủy)
```

| Transition | Actor | UC |
|---|---|---|
| Draft → Requested | CMB | UC51 |
| Requested → Under Review | ICPDP | UC52 |
| Under Review → Approved/Rejected | ICPDP | UC52 |
| Approved → Cancelled/Released | CMB | UC53 |
| Approved → In Use → Completed | System | UC52, UC35 |

## 15.10 Complaint

```text
Submitted
→ Under Triage
→ Dismissed

hoặc → Forwarded → Club Responded → Closed

hoặc → Escalated → Violation (15.7)
```

| Transition | Actor | UC |
|---|---|---|
| — → Submitted | Student | UC56 |
| Submitted → Under Triage | ICPDP | UC57 |
| Under Triage → Dismissed/Forwarded/Escalated | ICPDP | UC57 |
| Forwarded → Club Responded | CMB | UC57 |
| Escalated → Violation Open | ICPDP | UC48 |

## 15.11 Event Feedback

```text
Window Open
→ Submitted
→ Aggregated
→ Window Closed
```

Feedback không có bước phê duyệt: đã submit thì không sửa, không xóa (BR37).

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
- Property
- PropertyBooking
- EventFeedback
- Complaint
- Violation
- CorrectiveAction
- Evaluation
- EvaluationScheme
- EvaluationDimension
- EvaluationDimensionResult
- ApprovalTask
- ApprovalDecision
- Notification
- EmailDeliveryLog
- AuditLog

## 16.2 Relationships

```text
User
1 --- 1 StudentProfile

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

### Property Booking

```text
Property
1 --- N PropertyBooking

Club
1 --- N PropertyBooking

Event
0..1 --- N PropertyBooking
```

### Feedback & Complaint

```text
Event
1 --- N EventFeedback

EventRegistration
1 --- 0..1 EventFeedback

User
1 --- N Complaint

Club
1 --- N Complaint

Complaint
1 --- 0..1 Violation
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
- post-event reports;
- property booking được cấp vs. thực sử dụng;
- điểm feedback trung bình của sự kiện.

**Business Question:**

> CLB có thực sự triển khai những hoạt động đã đăng ký/cam kết không?

## D2 – Member Engagement

**Input:**

- active members;
- attendance;
- retention;
- participation rate;
- feedback response rate.

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
- corrective actions;
- số khiếu nại được ICPDP escalate;
- số lần hủy property booking sát giờ.

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
| Property Booking Queue | Yêu cầu đặt cơ sở vật chất nào đang chờ duyệt? |
| Property Utilization | Phòng/thiết bị nào được cấp nhưng không sử dụng? |
| Overdue Reports | CLB nào chưa hoàn thành nghĩa vụ? |
| Open Complaints | Khiếu nại nào của sinh viên chưa được phân loại? |
| Open Violations | Compliance case nào chưa xử lý? |
| Feedback Summary | Điểm feedback trung bình của CLB/sự kiện trong kỳ là bao nhiêu? |
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
- Booking cơ sở vật chất nào đang chờ duyệt/đã được duyệt?
- Feedback sự kiện gần nhất ra sao?
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
- Sự kiện nào tôi chưa gửi feedback?
- Khiếu nại của tôi đang ở trạng thái nào?

> **Lưu ý:** Dashboard dành cho `School Supporting Reviewer` ở bản trước đã bị **loại bỏ**
> cùng với actor đó. Toàn bộ approval queue nằm ở ICPDP Dashboard (§18.1).

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
| Property Booking Submitted | ICPDP | In-app |
| Property Booking Approved/Rejected | CMB | In-app + Email |
| Property Booking Cancelled | ICPDP | In-app |
| Feedback Window Opened | Participants | In-app |
| New Event Feedback Received | CMB | In-app |
| Post-event Report Due Soon | CMB | Reminder |
| Budget Approved | CMB | In-app |
| Expense Missing Evidence | Treasurer/CMB | Reminder |
| Reconciliation Overdue | CMB + ICPDP | Escalation |
| Periodic Report Due | CMB | Reminder |
| Complaint Submitted | ICPDP | In-app + Email |
| Complaint Triaged | Người khiếu nại | In-app |
| Complaint Forwarded | CMB | In-app + Email |
| Violation Opened | CMB | In-app + Email |
| Leadership Term Near Expiry | CMB + ICPDP | Reminder |
| Evaluation Published | CMB | In-app |

**Kênh Email:** mọi notification có channel Email được gửi qua **Google SMTP Service**
(`Send email request`). Hệ thống phải lưu `EmailDeliveryLog` và retry khi gửi thất bại;
thất bại gửi email không được làm hỏng business transaction đã commit.

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
- Property Booking Decision
- Expense/Evidence Modification
- Complaint Triage Decision
- Violation
- Evaluation
- RBAC Change
- Login qua Google OAuth bị từ chối (sai domain / tài khoản khóa)

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
| BP16 | Property booking có kiểm soát | UC51–53 | CMB/ICPDP | US36–37 | BR33–35 |
| BP17 | Structured event feedback | UC54–55 | Student/CMB | US38–39 | BR36–37 |
| BP18 | Kênh khiếu nại chính thức | UC56–57 | Student/ICPDP | US40 | BR38–39 |
| BP19 | Single sign-on bằng tài khoản trường | UC01 | All | US41 | BR32 |

---

# 22. MVP VS VERSION 2

## 22.1 MVP

MVP nên tập trung khoảng 30–34 UC core trên tổng 57.

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

### Property Booking

- UC51–UC52

### Feedback & Complaint

- UC54
- UC56–UC57

MVP phải chứng minh được ít nhất 5 lifecycle:

```text
Club
Recruitment
Event
Finance
Property Booking
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
- UC53 – Hủy/trả property booking có ràng buộc thời hạn và ghi nhận vi phạm
- UC55 – Dashboard phân tích feedback nâng cao (trend, sentiment)

---

# 23. FEATURE NỔI BẬT CỦA ĐỒ ÁN

## Feature 1 – Configurable Approval Workflow

### Bài toán

Không phải mọi request đều có cùng approval path — nhưng mọi path đều kết thúc ở **ICPDP**.
Điều thay đổi là **cấp thẩm quyền trong ICPDP**, không phải phòng ban nào tham gia.

### Input

- request type;
- amount;
- event risk;
- property/venue;
- club status và lịch sử compliance.

### Processing

Rule-based routing **trong nội bộ ICPDP** (phân cấp bằng RBAC):

```text
Normal Event
→ ICPDP Officer

High-risk / Large Event
→ ICPDP Officer
→ ICPDP Head

Budget ≤ ngưỡng
→ ICPDP Officer

Budget > ngưỡng
→ ICPDP Officer
→ ICPDP Head

Property Booking
→ ICPDP Officer
```

Ý kiến chuyên môn của Finance/Facility/Security được ICPDP thu thập **ngoài hệ thống** và
ghi vào review note của chính quyết định đó, nên không sinh thêm actor hay approval node.

### Output

- approval tasks;
- decision history;
- current approver;
- SLA;
- audit trail.

### Business Value

Giảm hard-code, phản ánh được phân cấp thẩm quyền thực tế mà vẫn giữ **một** điểm chịu
trách nhiệm cuối cùng.

### Related UC

UC03, UC06, UC26, UC29, UC39, UC41, UC52.

---

## Feature 2 – Event Conflict Detection

### Input

- venue/property;
- start time;
- end time;
- status;
- capacity;
- property booking hiện có.

### Processing

```text
Overlap time?
AND same venue/property?
AND existing event hoặc approved booking blocks?
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

UC24, UC25, UC29, UC35, UC51, UC52.

Engine này dùng chung cho cả lịch sự kiện và lịch sử dụng cơ sở vật chất (M11).

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
Event Feedback
Complaints
Property Booking Utilization
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

## Feature 6 – Closed-loop Feedback & Complaint

### Bài toán

Phản hồi và khiếu nại của sinh viên thường dừng ở kênh không chính thức: không ai chịu trách
nhiệm, không có trạng thái, không dùng được làm dữ liệu đánh giá.

### Input

- event feedback (điểm theo tiêu chí + nhận xét, có thể ẩn danh);
- club complaint (loại, mô tả, evidence).

### Processing

```text
Feedback
→ chỉ nhận từ người có finalized attendance
→ aggregate theo sự kiện và theo CLB

Complaint
→ gửi thẳng ICPDP
→ triage: Dismissed / Forwarded / Escalated
→ Escalated → Violation case
```

### Output

- feedback summary cho CMB;
- `Club and event feedback` tổng hợp cho ICPDP;
- trạng thái xử lý trả về người khiếu nại;
- input cho D1, D2 và D6 của evaluation model.

### Business Value

Biến ý kiến rời rạc của sinh viên thành dữ liệu governance có vết xử lý, và đóng vòng lặp
giữa người tham gia — CLB — nhà trường.

### Related UC

UC54–UC57, UC48, UC49.

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
- leadership continuity;
- cấp phát và kiểm soát cơ sở vật chất;
- phản hồi và khiếu nại của sinh viên.

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

## 24.3 3 actor có hợp lý không?

Có, và đây là thay đổi so với bản trước.

Ba actor:

1. **Student** – người tiêu thụ dịch vụ của CLB và là nguồn dữ liệu đầu vào (ứng tuyển, đăng ký, attendance, feedback, khiếu nại).
2. **Club Management Board (Club's Admin)** – người vận hành CLB và là người submit mọi hồ sơ.
3. **ICPDP Officer** – **quyền cao nhất**, đại diện duy nhất của nhà trường, là người quyết định cuối cùng ở mọi luồng phê duyệt.

### Vì sao bỏ School Supporting Reviewer

Bản trước giả định có approval đa phòng ban (Facility, Security, Finance review trực tiếp
trên hệ thống). Context Diagram đã chốt cho thấy giả định đó **không đúng với quy trình thực
tế của trường**: chỉ ICPDP tương tác với hệ thống ở phía nhà trường.

Hệ quả:

- bỏ actor A4 khỏi §4, §11, §18 và §23 Feature 1;
- approval routing chuyển từ **đa phòng ban** sang **đa cấp trong nội bộ ICPDP** (RBAC);
- ý kiến chuyên môn của các phòng ban được ICPDP thu thập ngoài hệ thống và ghi vào review note;
- hệ thống có đúng **một** approval authority, giúp state machine và audit trail đơn giản và chặt hơn.

Hai thực thể ngoài — **Google OAuth** và **Google SMTP Service** — tham gia luồng dữ liệu
nhưng không phải actor: chúng không ra quyết định và không sở hữu business outcome.

---

## 24.4 57 use case có bị artificial không?

Không đáng kể.

Use case được hình thành từ 7 nhóm lifecycle:

```text
Club Governance
Recruitment & Membership
Event
Finance
Property Booking
Feedback & Complaint
Reporting / Compliance / Evaluation
```

UC51–UC57 không phải để tăng số lượng: chúng đến trực tiếp từ các luồng dữ liệu đã chốt trên
Context Diagram (`Property booking request`, `Property booking status`, `Event feedback`,
`Club and event feedback`, `Club complaint`) và mỗi UC đều có state transition hoặc quyết
định riêng.

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
- UC51–UC53 – Property Booking
- UC54–UC57 – Feedback & Complaint

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
UC24
→ UC51
→ UC52
→ UC53
```

```text
UC34
→ UC54
→ UC55
```

```text
UC56
→ UC57
→ UC48
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

**Identity (Google OAuth) + Workflow + Audit**

Vì chỉ có một approval authority (ICPDP), workflow engine không cần parallel approval
node — độ phức tạp dồn vào **phân cấp RBAC** và **state machine**, không vào routing đa bên.

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
Property Booking
→ Approved Resource
→ Event Execution
→ Utilization Metric
→ Evaluation
```

```text
Event Feedback
→ Feedback Summary
→ Post-event Report
→ Evaluation
```

```text
Student Complaint
→ ICPDP Triage
→ Violation
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

1. Approval Workflow Engine (ICPDP đa cấp)
2. Event & Property Conflict Detection
3. Budget Reconciliation
4. Club Performance Evaluation
5. Closed-loop Feedback & Complaint
6. Leadership Transition / Risk Monitoring

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
2. Advanced waitlist.
3. Voluntary suspension workflow.
4. Advanced transition checklist.
5. Recruitment rubric phức tạp.
6. Automated risk scoring.
7. Feedback analytics nâng cao (trend/sentiment).
8. Hủy/trả property booking có ràng buộc phạt (UC53).

Không nên cắt:

- Club Establishment;
- Event Approval;
- Property Booking (UC51–52);
- Attendance;
- Budget/Expense;
- Reporting;
- Complaint intake (UC56–57).

---

## 24.12 Có đủ chiều sâu cho đồ án Software Engineering không?

Có.

Hệ thống có:

- multi-actor workflow;
- state machines;
- RBAC đa cấp trong một authority duy nhất;
- tích hợp external system (Google OAuth, Google SMTP);
- approval routing;
- resource booking với conflict detection;
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
    ┌───────────┬───────┼───────┬───────────┐
    ↓           ↓       ↓       ↓           ↓
Membership   Events  Property Finance   Feedback
    │           │       │       │           │
    ↓           ↓       ↓       ↓           ↓
Engagement  Attendance Booking Evidence  Complaint
    │           │       │       │           │
    └─────┬─────┴───────┴───┬───┴─────┬─────┘
          ↓                 ↓         ↓
       Reports         Compliance   Feedback
                                    Summary
          └────────────┬────────────────┘
                       ↓
                  Evaluation
                       ↓
        Governance Decision (ICPDP – quyền cao nhất)
```

Đây chính là yếu tố biến đề tài từ một website CRUD thành một **Software Engineering Graduation Project có business logic, workflow, state, rule, audit và cross-module data rõ ràng**.
