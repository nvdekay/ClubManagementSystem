# UNIVERSITY CLUB MANAGEMENT SYSTEM
## University Club Management System (UCMS)

> **Document type:** Business & System Analysis / Requirement Baseline  
> **Purpose:** Serve as the baseline for the SRS, Use Case Diagram, Use Case Specification, Activity Diagram, Sequence Diagram, ERD, Database Design, API Design, UI/UX, Test Cases, Product Backlog and Sprint Backlog.  
> **Design principle:** Business Problem → Business Process → Actor → Requirement → Use Case.  
> **Target scale:** 3 primary actors, 2 external systems, 12 business modules, 57 business use cases linked end-to-end.  
> **Scope baseline:** the Context Diagram agreed by the team (Student, ICPDP Officer, Club's Admin, Google OAuth, Google SMTP Service).
>
> **Language note:** this is the English edition. The Vietnamese edition
> (`UCMS_Business_System_Analysis.md`) is kept in sync and both carry the same IDs
> (BP, UC, US, AC, BR, M), so either file can be cited interchangeably.

---

# TABLE OF CONTENTS

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
23. [Signature Features](#23-signature-features)
24. [Final Review](#24-final-review)

---

# 1. EXECUTIVE SUMMARY

## 1.1 The problem the system solves

**University Club Management System – UCMS** is a centralized governance platform for all
student club activity inside a university.

The core problem is **not** building a CRUD website that stores a list of clubs.

The real problem is:

> **Standardizing, digitizing and controlling the entire club governance lifecycle across
> students, Club Management Boards, ICPDP and the university's supporting units.**

The club lifecycle is managed along this path:

```text
Establishment
→ Review & Approval
→ Operation
→ Member Recruitment
→ Activity Execution
→ Financial Management
→ Reporting
→ Compliance
→ Evaluation
→ Leadership Transition
→ Suspension / Dissolution
```

## 1.2 Core value

The system targets three goals:

1. **Single Source of Truth**  
   Establish the authoritative data source for clubs, members, terms, events, budgets,
   reports, violations and evaluations.

2. **Workflow Governance**  
   Every significant record has a state, an accountable owner, a processing history and an
   explicit approval flow.

3. **Cross-module Data**  
   Data produced by one module becomes the input of the next business process.

Examples:

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

## 1.3 Use case design principle

CRUD operations are **not** split into use cases such as:

- Create Club
- Update Club
- Delete Club
- View Club

purely to inflate the count.

Every use case must:

- solve a business problem;
- have a clearly accountable actor;
- produce a business outcome;
- link to at least one other business process where relevant;
- have defined input/output data;
- have a state transition if the entity owns a lifecycle.

---

# 2. BUSINESS PROBLEMS

## 2.1 As-Is – assumed current state

> **Assumption:** the university does not yet have a complete centralized platform for the
> club lifecycle; the process is currently carried out with several disconnected tools.

A typical event process today:

```text
Club drafts a plan
→ fills in a Word file / Google Form
→ emails ICPDP
→ receives feedback
→ edits the file
→ resends it
→ gets approved by email
→ opens a Google Form for registration
→ takes attendance in Excel
→ stores receipts on Drive
→ writes a Word report
→ sends it to ICPDP
→ ICPDP consolidates everything in Excel at end of term
```

The main weakness is that **business context is broken apart**.

Event A may exist in:

- a Word file;
- a Google Form;
- an attendance spreadsheet;
- a Drive folder;
- an approval email;
- yet another report file.

None of these carry a formal data relationship to each other.

---

## 2.2 Pain Points

| ID | Business problem |
|---|---|
| BP01 | ICPDP has no centralized data source telling which clubs are Active, Suspended or no longer operating. |
| BP02 | The real number of active members per club at a given point in time cannot be determined accurately. |
| BP03 | Management board history and term history are not managed in a structured way. |
| BP04 | Club establishment applications and their revision/approval history are scattered across files and emails. |
| BP05 | Event registration and approval lack a unified workflow. |
| BP06 | There is no centralized mechanism to detect event time or venue clashes. |
| BP07 | Event registration and attendance are detached from the event record itself. |
| BP08 | It is hard to tell whether an approved event actually took place and whether its report was completed. |
| BP09 | Budget Request, Expense and Financial Evidence are not linked end-to-end. |
| BP10 | Overspending against budget, or expenses without supporting evidence, are hard to detect. |
| BP11 | Recruitment is usually run through standalone forms that are not linked to Membership. |
| BP12 | Club violations and warnings have no structured compliance history. |
| BP13 | End-of-term club evaluation depends on manual data consolidation. |
| BP14 | Reporting deadlines, budget reconciliation and leadership transition rely on manual reminders. |
| BP15 | There is no audit trail to establish who approved, rejected or changed an important decision. |
| BP16 | Rooms and facilities for club activity are requested by email or on paper, are not linked to the event record, and clashing usage cannot be detected. |
| BP17 | Participant feedback after an event is not collected in a structured way, so it cannot be used as activity quality data. |
| BP18 | Students have no official channel to complain about a club; concerns travel through informal channels and leave no processing trail. |
| BP19 | Each internal system manages its own accounts, forcing students to remember another credential beyond their university account. |

---

## 2.3 Root Causes

### RC01 – Fragmented Data

Data lives in Excel, Google Forms, Drive, Email, Messenger and paper records.

### RC02 – No Standard Workflow

There is no unified state machine for:

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

An approval decision is not consistently bound to:

- the approver;
- the timestamp;
- the document version;
- the reason;
- the evidence;
- the before/after state.

### RC04 – Lack of Cross-Module Data Model

Membership, Attendance, Event, Finance and Violation are not connected by a shared data model.

### RC05 – Manual Evaluation

ICPDP must gather and consolidate several sources before it can evaluate a club.

### RC06 – Decentralized Deadline Management

Deadlines live in emails, spreadsheets or personal calendars.

---

## 2.4 Business Impact

### For ICPDP

- higher administrative workload;
- hard to track pending requests;
- hard to control compliance;
- hard to audit;
- hard to make data-driven decisions;
- hard to produce consolidated reporting.

### For Club Management Boards

- time lost sending and revising documents;
- hard to know what state a request is in;
- hard to manage budget;
- hard to consolidate attendance;
- hard to hand over between terms.

### For students

- hard to find a suitable club;
- hard to know which clubs are recruiting;
- hard to track an application;
- fragmented event experience;
- no official channel for feedback or complaints.

### For the university

- weak governance capability;
- no data on club quality;
- higher financial/compliance risk;
- hard to plan student activity;
- facilities double-booked, or allocated and never used, with nobody noticing.

---

## 2.5 To-Be

UCMS becomes the **system of record** for the entire club lifecycle.

### Event flow

```text
Event Proposal
→ Approval
→ Event
→ Registration
→ Attendance
→ Post-event Report
→ Evaluation Input
```

### Financial flow

```text
Budget Request
→ Approval
→ Disbursement
→ Expense
→ Evidence
→ Reconciliation
→ Financial Compliance Score
```

### Membership flow

```text
Recruitment
→ Application
→ Screening
→ Decision
→ Membership
→ Participation
→ Engagement Metric
```

### Facility flow

```text
Property Booking Request
→ Availability & Conflict Check
→ ICPDP Review
→ Approved / Rejected
→ Booking Status
→ Event Execution
```

### Feedback and complaint flow

```text
Event Feedback / Club Complaint
→ Routing
→ Club Response or Compliance Case
→ Resolution
→ Evaluation Input
```

---

# 3. STAKEHOLDER ANALYSIS

| Stakeholder | Interest | Influence | Interaction |
|---|---|---:|---|
| University leadership | Governance, risk, quality of student activity | High | Consumes reports/KPIs |
| ICPDP | Governs all club activity; **the sole representative of the university inside the system** | Very high | Direct |
| Club Management Board | Runs the club | High | Direct |
| Club members | Take part in activities | Medium | Direct |
| All students | Discover clubs, apply, register for events | Medium | Direct |
| Supporting departments (Finance, Facility, Security) | Funding, facilities, event safety | Medium | **Indirect** – their input is consolidated by ICPDP outside the system |
| IT/System Admin | Technical operation | Medium | Technical |
| Google (OAuth, SMTP) | Provides authentication and email delivery | Low | External system |

---

# 4. ACTOR ANALYSIS

## A1 – Student

Covers:

- students not yet in any club;
- recruitment candidates;
- ordinary members when using student-side features.

### Responsibilities

- discover clubs;
- apply for membership;
- track application status;
- register for events;
- check in;
- view membership and request to leave a club;
- submit post-event feedback;
- submit a complaint about a club.

### Data produced

- RecruitmentApplication
- EventRegistration
- Attendance
- EventFeedback
- Complaint
- ClubApplication (if a founding student)

### Data consumed

- Club
- RecruitmentCampaign
- Event
- ApplicationStatus
- Membership status
- StudentProfile (synced from Google OAuth)

---

## A2 – Club Management Board (Club's Admin)

Represents the **club's management/executive board**. On the Context Diagram this actor is
labelled **Club's Admin**.

The following roles are **not** split into separate actors:

- President
- Vice President
- Department Head
- Treasurer
- Event Coordinator

They are handled through **RBAC**.

### Responsibilities

- maintain the club profile;
- manage the organization structure;
- recruit members;
- manage membership;
- submit events;
- submit property booking requests;
- manage attendance;
- submit budget requests;
- record expenses;
- submit reports;
- review and act on event feedback;
- respond to compliance cases;
- prepare the leadership transition.

---

## A3 – ICPDP Officer

The **sole representative of the university** inside the system, holding the **highest authority**.

Every final governance decision — establishing, suspending or dissolving a club, approving
events, approving budgets, allocating facilities, handling violations, finalizing evaluations
— terminates at ICPDP. No other actor can override or veto an ICPDP decision.

### Why no additional university-side actor

Departments such as the Finance Office, Facility Management, Security or a Faculty Advisor
**do not interact directly** with UCMS. When a request needs their expert opinion, ICPDP
gathers that opinion **outside the system** and records the outcome in its own decision.
Design consequences:

- the system has exactly **one** approval authority on the university side;
- approval routing is **multi-level inside ICPDP** (by request type / value threshold / risk
  level), not multi-department;
- the hierarchy inside ICPDP (officer, senior officer, head) is handled by **RBAC**, not by
  creating new actors.

### Responsibilities

- review club establishment applications;
- manage the club lifecycle (active/suspend/reactivate/dissolve);
- confirm management boards and leadership transitions;
- approve events;
- review budgets and record disbursements;
- approve property booking requests;
- manage compliance;
- receive student complaints and handle violations;
- track periodic and post-event reports;
- review aggregated club/event feedback;
- score and publish club evaluations;
- configure policy, deadlines, the evaluation scheme and RBAC.

### Data produced

- ApprovalDecision (club, event, budget, property booking)
- Violation, CorrectiveAction
- Evaluation, EvaluationScheme
- Policy/Configuration

### Data consumed

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

Two external systems take part in the data flows but are **not business actors** — they make
no decisions and own no business outcome.

### ES1 – Google OAuth

- **Role:** identity provider. UCMS stores no passwords of its own.
- **Inbound flow:** UCMS sends `Authentication request`.
- **Outbound flow:** Google OAuth returns `Authentication data` (email, full name, avatar).
- **Consequence:** accounts are identified by university email; the accepted domain is a
  configurable business rule.

### ES2 – Google SMTP Service

- **Role:** email delivery channel.
- **Inbound flow:** UCMS sends `Send email request` for every notification whose channel is Email.
- **Consequence:** in-app notifications are stored by UCMS itself; email notifications depend
  on an external service and therefore need retry and delivery-status logging.

---

## Actor conclusion

**3 actors:**

1. Student
2. Club Management Board (Club's Admin)
3. ICPDP Officer

**2 external systems:** Google OAuth, Google SMTP Service.

> **Change from the previous version:** the `School Supporting Reviewer` actor has been
> **removed**. The university's actual process is handled end-to-end by ICPDP; ICPDP holds
> the highest authority and represents the university. Input from Finance/Facility/Security
> is gathered by ICPDP outside the system and reflected in ICPDP's own final decision.

---

# 5. SYSTEM SCOPE

## 5.1 In Scope

- Authentication via **Google OAuth**
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
- **Property booking for club activity** (request → ICPDP approval → status)
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
- Notification (in-app + email via **Google SMTP**)
- Deadline reminder
- Audit log
- Dashboard

## 5.2 Out of Scope

To keep the system from turning into an ERP:

- full accounting ERP;
- payroll;
- tuition/payment;
- a dedicated social network or chat;
- LMS;
- a university-wide room booking engine (UCMS only manages bookings serving **club activity**
  and does not replace the university's general room booking system);
- inventory ERP;
- payment gateway;
- sponsorship marketplace;
- native mobile app;
- facial recognition attendance;
- a mandatory AI chatbot;
- a home-grown authentication mechanism (internal username/password) — replaced by Google OAuth;
- a dedicated mail server — Google SMTP is used instead;
- multi-department approval (Finance/Facility/Security reviewing directly in the system) —
  ICPDP is the single approval point.

---

# 6. MODULE DECOMPOSITION

| Module | Goal | Actor | Key data | Links |
|---|---|---|---|---|
| M01 Identity & RBAC | Authenticate via Google OAuth, control accounts and permissions | All | User, StudentProfile, Role, Permission | All |
| M02 Club Lifecycle & Governance | Manage the club lifecycle | CMB, ICPDP | Club, ClubApplication | M03, M04, M09 |
| M03 Leadership & Term | Manage terms | CMB, ICPDP | ClubTerm, Position | M01, M02 |
| M04 Recruitment & Membership | Recruit and manage members | Student, CMB | Campaign, Application, Membership | M06, M09 |
| M05 Event & Activity | Govern events | CMB, ICPDP | EventProposal, Event | M06, M07, M08, M11 |
| M06 Registration & Attendance | Registration and check-in | Student, CMB | Registration, Attendance | M05, M08, M09 |
| M07 Finance & Budget | Govern budget and spending | CMB, ICPDP | BudgetRequest, Expense, Evidence | M05, M09 |
| M08 Reporting & Compliance | Reporting and compliance | CMB, ICPDP | Report, Violation | M05, M07, M09, M12 |
| M09 Performance Evaluation | Evaluate clubs | ICPDP | Evaluation, Criteria | M02–M08, M11, M12 |
| M10 Workflow, Notification & Audit | Cross-module governance | All | ApprovalTask, Notification, AuditLog | All |
| M11 Property & Facility Booking | Request and allocate facilities for club activity | CMB, ICPDP | Property, PropertyBooking | M05, M09 |
| M12 Feedback & Complaint | Collect event feedback and club complaints | Student, CMB, ICPDP | EventFeedback, Complaint | M06, M08, M09 |

Modules M11 and M12 were added from the agreed Context Diagram
(`Property booking request` / `Property booking status`, `Event feedback`, `Club complaint`).

---

# 7. CORE BUSINESS FLOWS

## Flow 1 – Club Establishment

```text
Student
→ Submit Club Application
→ ICPDP Review
→ Revision Requested (if needed)
→ Student Resubmit
→ ICPDP Approve/Reject
→ Club created
→ Operational setup
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
→ Property Booking Request (if facilities are needed)
→ ICPDP Review
→ Revision if needed
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

or

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
→ Booking Status returned to CMB
→ Used during the Event
→ Release / Cancel
```

## Flow 10 – Feedback

```text
Event Closed or Attendance Finalized
→ Feedback Window opens
→ Student Submit Event Feedback
→ Aggregate
→ CMB reviews the result
→ ICPDP reviews aggregated Club and Event Feedback
→ Evaluation Input
```

## Flow 11 – Authentication

```text
User chooses to sign in
→ UCMS sends Authentication request → Google OAuth
→ Google OAuth returns Authentication data
→ UCMS maps email → User + StudentProfile
→ Load role/permission
→ Corresponding workspace
```

---

# 8. MASTER USE CASE LIST

## 8.1 Club Lifecycle & Governance

| ID | Use Case | Actor | Module | Business Goal | Related UC | Priority |
|---|---|---|---|---|---|---|
| UC01 | Authenticate via Google OAuth and access the workspace by permission | All | M01 | Secure access | All | Must |
| UC02 | Submit a club establishment application | Student | M02 | Propose a new club | UC03 | Must |
| UC03 | Assess the club establishment application | ICPDP | M02 | Verify the application | UC04, UC06 | Must |
| UC04 | Request additions/corrections to the application | ICPDP | M02 | Complete the application | UC05 | Must |
| UC05 | Resubmit the application after revision | Student | M02 | Respond to the revision request | UC03 | Must |
| UC06 | Approve/Reject club establishment | ICPDP | M02 | Formal decision | UC07 | Must |
| UC07 | Configure the club operating profile | CMB | M02 | Set up operating information | UC08 | Must |
| UC08 | Configure the club organization structure | CMB | M03 | Define the internal structure | UC09 | Should |
| UC09 | Nominate the club management board | CMB | M03 | Establish leadership | UC10 | Must |
| UC10 | Confirm the management board | ICPDP | M03 | Confirm authority | UC09 | Must |
| UC11 | Plan the leadership transition | CMB | M03 | Prepare the handover | UC12 | Should |
| UC12 | Confirm the leadership transition | ICPDP | M03 | Transfer authority safely | UC11 | Should |
| UC13 | Request club activity suspension | CMB | M02 | Valid voluntary pause | UC14 | Could |
| UC14 | Suspend/Reactivate/Dissolve a club | ICPDP | M02 | Control the lifecycle | UC48–50 | Must |

## 8.2 Recruitment & Membership

| ID | Use Case | Actor | Module | Business Goal | Related UC | Priority |
|---|---|---|---|---|---|---|
| UC15 | Create and publish a recruitment campaign | CMB | M04 | Recruit members | UC16 | Must |
| UC16 | Submit a club membership application | Student | M04 | Apply | UC17 | Must |
| UC17 | Screen membership applications | CMB | M04 | Shortlist | UC18 | Must |
| UC18 | Record candidate evaluation | CMB | M04 | Structured assessment | UC19 | Should |
| UC19 | Decide on a membership application | CMB | M04 | Accept/Reject | UC20 | Must |
| UC20 | Onboard accepted candidates | CMB | M04 | Create membership | UC21 | Must |
| UC21 | Manage member status | CMB | M04 | Keep the roster accurate | UC22 | Must |
| UC22 | Assign positions inside the club | CMB | M03/M04 | Internal authorization | UC09 | Should |
| UC23 | Leave a club / Remove a member | Student/CMB | M04 | End a membership | UC21 | Should |

## 8.3 Event

| ID | Use Case | Actor | Module | Business Goal | Related UC | Priority |
|---|---|---|---|---|---|---|
| UC24 | Submit an event proposal | CMB | M05 | Request permission to hold an event | UC25–29, UC51 | Must |
| UC25 | Detect event conflicts | System/CMB | M05 | Avoid time/venue clashes | UC24, UC29 | Should |
| UC26 | Assess the event proposal | ICPDP | M05 | Verify the proposal | UC27, UC29 | Must |
| UC27 | Request event proposal revisions | ICPDP | M05 | Complete the proposal | UC28 | Must |
| UC28 | Resubmit the event proposal | CMB | M05 | Respond to the review | UC26 | Must |
| UC29 | Approve/Reject the event | ICPDP | M05 | Authorize the event | UC30 | Must |
| UC30 | Publish the event and open registration | CMB | M05 | Allow participation | UC31 | Must |
| UC31 | Register for an event | Student | M06 | Record participants | UC32 | Must |
| UC32 | Manage capacity and waitlist | CMB | M06 | Control headcount | UC31 | Should |
| UC33 | Check in participants | Student/CMB | M06 | Verify attendance | UC34 | Must |
| UC34 | Finalize event attendance | CMB | M06 | Produce official attendance | UC36 | Must |
| UC35 | Cancel/Reschedule an event | CMB/ICPDP | M05 | Handle changes | UC29–34 | Should |
| UC36 | Submit the post-event report | CMB | M08 | Complete accountability | UC37 | Must |
| UC37 | Assess and close the event report | ICPDP | M08 | Close the event lifecycle | UC49 | Must |

## 8.4 Finance

| ID | Use Case | Actor | Module | Business Goal | Related UC | Priority |
|---|---|---|---|---|---|---|
| UC38 | Submit a budget request | CMB | M07 | Request funding | UC39 | Must |
| UC39 | Assess the budget request | ICPDP | M07 | Verify the funding request | UC40, UC41 | Must |
| UC40 | Revise and resubmit the budget request | CMB | M07 | Amend the request | UC39 | Should |
| UC41 | Approve/Reject the budget request | ICPDP | M07 | Funding decision | UC42 | Must |
| UC42 | Record disbursement | ICPDP | M07 | Track funds released | UC43 | Should |
| UC43 | Record an expense | CMB | M07 | Track actual spending | UC44 | Must |
| UC44 | Submit financial evidence | CMB | M07 | Substantiate the spending | UC45 | Must |
| UC45 | Reconcile budget and spending | ICPDP/CMB | M07 | Ensure accountability | UC49 | Must |

## 8.5 Reporting, Compliance & Evaluation

| ID | Use Case | Actor | Module | Business Goal | Related UC | Priority |
|---|---|---|---|---|---|---|
| UC46 | Submit the periodic activity report | CMB | M08 | Fulfil the reporting obligation | UC47 | Must |
| UC47 | Assess the periodic activity report | ICPDP | M08 | Validate the report | UC49 | Must |
| UC48 | Manage violation/compliance cases | ICPDP | M08 | Control compliance | UC49, UC57 | Must |
| UC49 | Generate the club performance evaluation draft | ICPDP | M09 | Consolidate performance data | UC50 | Should |
| UC50 | Review, finalize and publish the evaluation | ICPDP | M09 | Official evaluation | UC49 | Should |

## 8.6 Property & Facility Booking

| ID | Use Case | Actor | Module | Business Goal | Related UC | Priority |
|---|---|---|---|---|---|---|
| UC51 | Submit a property booking request | CMB | M11 | Request rooms/equipment for club activity | UC24, UC52 | Must |
| UC52 | Approve/Reject the property booking request | ICPDP | M11 | Controlled resource allocation | UC51, UC53 | Must |
| UC53 | Track and cancel/release a booked property | CMB | M11 | Free unused resources | UC35, UC52 | Should |

## 8.7 Feedback & Complaint

| ID | Use Case | Actor | Module | Business Goal | Related UC | Priority |
|---|---|---|---|---|---|---|
| UC54 | Submit post-event feedback | Student | M12 | Collect participant assessment | UC34, UC55 | Should |
| UC55 | Review and act on event feedback | CMB | M12 | Improve activity quality | UC54, UC36 | Should |
| UC56 | Submit a complaint about a club | Student | M12 | Official escalation channel | UC57 | Should |
| UC57 | Receive, triage and escalate a complaint into a compliance case | ICPDP | M12 | Handle complaints with a trail | UC48, UC56 | Should |

**Total: 57 business use cases** (UC01–UC50 keep their numbering from the previous version;
UC51–UC57 were added from the Context Diagram).

> **Superseded:** the use case model in §8–§11, §14–§15 and §21–§22 has been revised in
> [`UCMS_UseCase_Model_v2.md`](UCMS_UseCase_Model_v2.md) (54 use cases). Where the two
> disagree, that document wins; the text below is kept as history.

---

# 9. DETAILED USE CASE SPECIFICATION

## UC01 – Authenticate via Google OAuth and access the workspace by permission

- **Primary Actor:** All
- **Supporting System:** Google OAuth (ES1)
- **Business Goal:** Grant each user access only to the data/features matching their role, without managing passwords in-house.
- **Trigger:** The user chooses to sign in.
- **Preconditions:** The user has a Google account in a domain the university allows.
- **Main Flow:**
  1. The system sends an `Authentication request` to Google OAuth.
  2. The user authenticates with Google.
  3. Google OAuth returns `Authentication data` (email, full name, avatar).
  4. The system checks the email domain against policy.
  5. The system maps the email to a User; on first sign-in it creates the User + StudentProfile.
  6. The system loads the current role/permission set.
  7. The system routes the user to the matching workspace (Student / Club's Admin / ICPDP).
- **Alternative:** A user may hold several contexts (Student and Club's Admin of a club at the same time) and pick a workspace.
- **Exception:**
  - email outside the allowed domain → access denied;
  - account locked → denied and audited;
  - Google OAuth unreachable → error returned, no session created.
- **Postcondition:** A valid session is created; `StudentProfile` is synced.
- **Rule:** The system stores **no** user passwords.
- **Pain Point:** BP19.
- **Priority:** Must.

## UC02 – Submit a club establishment application

- **Primary Actor:** Student
- **Business Goal:** Let students propose a new club through a standard process.
- **Trigger:** The student chooses to create an establishment application.
- **Preconditions:** Signed in and eligible under policy.
- **Main Flow:**
  1. Enter the club name, field and objectives.
  2. Declare the founding members.
  3. Upload the mandatory documents.
  4. The system validates.
  5. The student confirms.
  6. The system creates a version.
  7. Status moves to `Submitted`.
  8. ICPDP receives a review task.
- **Alternative:** Save as Draft.
- **Exception:** Mandatory documents missing.
- **Postcondition:** The application is in Submitted state.
- **Related:** UC03, UC04, UC05, UC06.
- **Pain Point:** BP04.

## UC03 – Assess the club establishment application

- **Primary Actor:** ICPDP
- **Goal:** Verify that the application is complete and valid.
- **Preconditions:** The application is Submitted/Resubmitted.
- **Main Flow:**
  1. ICPDP opens the application.
  2. Check the club information.
  3. Check the founding members.
  4. Check the documents.
  5. Check the version history.
  6. Choose Approve / Revision / Reject.
- **Alternative:** Escalate to a higher level inside ICPDP if the request exceeds the handling officer's authority (RBAC, not another actor).
- **Postcondition:** The review result is recorded.
- **Related:** UC04, UC06.

## UC04 – Request additions/corrections to the application

- **Primary Actor:** ICPDP
- **Goal:** Allow the application to be fixed instead of rejected outright.
- **Main Flow:**
  1. ICPDP selects the sections that fall short.
  2. Enter specific comments.
  3. Set a deadline if needed.
  4. Move the state to `Revision Requested`.
  5. The student receives a notification.
- **Rule:** ICPDP does not edit data on the applicant's behalf.

## UC05 – Resubmit the application after revision

- **Primary Actor:** Student
- **Precondition:** The application is in `Revision Requested`.
- **Main Flow:** Edit the data → create a new version → Resubmit.
- **Rule:** The previous version is never overwritten.
- **Related:** UC03.

## UC06 – Approve/Reject club establishment

- **Primary Actor:** ICPDP
- **Main Flow:**
  1. Review the assessment result.
  2. Choose Approve or Reject.
  3. Enter a reason where required.
  4. The system writes the audit record.
- **If Approved:**
  - Application → Approved.
  - A Club is created.
  - Club → Pending Setup or Active depending on policy.
- **If Rejected:** No Club is created.

## UC07 – Configure the club operating profile

- **Primary Actor:** CMB
- **Goal:** Complete the operating information once the club is recognized.
- **Data:** Description, contact, charter, communication channels, operating scope.
- **Rule:** Some institutional fields are editable by ICPDP only.

## UC08 – Configure the club organization structure

- **Primary Actor:** CMB
- **Goal:** Model Board, Department and Position.
- **Rule:** May be constrained by a university template.
- **Priority:** Should.

## UC09 – Nominate the club management board

- **Primary Actor:** CMB
- **Main Flow:** Pick a member → position → term → submit the nomination.
- **Postcondition:** Nomination is `Pending Confirmation`.

## UC10 – Confirm the management board

- **Primary Actor:** ICPDP
- **Main Flow:** Check eligibility → conflicts → term → approve/reject.
- **If approved:** the corresponding management permissions take effect.

## UC11 – Plan the leadership transition

- **Primary Actor:** CMB
- **Data:**
  - the new term;
  - leadership candidates;
  - outstanding events;
  - outstanding budget;
  - incomplete reports;
  - assets/responsibilities to hand over.
- **Postcondition:** Transition is `Pending Confirmation`.

## UC12 – Confirm the leadership transition

- **Primary Actor:** ICPDP
- **On approval:**
  - close the old term;
  - activate the new term;
  - revoke the previous permissions;
  - grant the new permissions;
  - persist the history.

## UC13 – Request club activity suspension

- **Primary Actor:** CMB
- **Input:** reason, expected duration, obligations, recovery plan.
- **Related:** UC14.
- **Priority:** Could.

## UC14 – Suspend/Reactivate/Dissolve a club

- **Primary Actor:** ICPDP
- **Trigger:** A request, inactivity, a serious violation, or policy.
- **Rule:** A Suspended Club is blocked from new events/recruitment.
- **Dissolution:** archive the governance history and revoke management access.

## UC15 – Create and publish a recruitment campaign

- **Primary Actor:** CMB
- **Precondition:** Club is Active.
- **Input:** positions, criteria, application window, capacity, selection process.
- **Postcondition:** Campaign Published/Open.

## UC16 – Submit a club membership application

- **Primary Actor:** Student
- **Main Flow:** Pick a campaign → fill in the form → submit.
- **Validation:** eligibility, window, duplicate application.
- **Postcondition:** Application Submitted.

## UC17 – Screen membership applications

- **Primary Actor:** CMB
- **Flow:** Submitted → Screening → Shortlisted/Rejected.
- **Rule:** A rejection reason may be mandatory depending on policy.

## UC18 – Record candidate evaluation

- **Primary Actor:** CMB
- **Data:** interview result, rubric score, reviewer comment.
- **Rule:** The rubric is configurable per campaign.

## UC19 – Decide on a membership application

- **Primary Actor:** CMB
- **Outcome:** Accepted / Rejected / Waitlisted.
- **Accepted:** eligible to proceed to UC20.

## UC20 – Onboard accepted candidates

- **Primary Actor:** CMB
- **Flow:** Confirm acceptance → create ClubMembership → default role → join date.
- **Rule:** No duplicate active membership is created.

## UC21 – Manage member status

- **Primary Actor:** CMB
- **State:** Active → On Leave → Inactive → Ended.
- **Rule:** Every change carries an effective date.

## UC22 – Assign positions inside the club

- **Primary Actor:** CMB
- **Rule:** The member must be active.
- **Sensitive Position:** May require UC10.

## UC23 – Leave a club / Remove a member

- **Primary Actor:** Student/CMB
- **Student:** Request withdrawal.
- **CMB:** Initiate removal under the business rules.
- **Rule:** A sensitive removal requires a reason and an audit record.

## UC24 – Submit an event proposal

- **Primary Actor:** CMB
- **Precondition:** Club is Active and the user holds the permission.
- **Input:** objective, time, venue, audience, capacity, plan, risk, budget estimate, facility needs.
- **Flow:** Validate → UC25 conflict check → (optional) UC51 property booking request → Submitted/Pending Approval.
- **Related:** UC25, UC26, UC51.

## UC25 – Detect event conflicts

- **Actor:** System/CMB
- **Input:** venue/property, start time, end time, event status, booking status.
- **Output:** No Conflict / Warning / Blocking Conflict.
- **Rule:** Does not auto-reject when policy is warning-only.
- **Scope:** Shared by both Event (UC24) and Property Booking (UC51).

## UC26 – Assess the event proposal

- **Primary Actor:** ICPDP
- **Review:** compliance, venue, time, budget, safety, overdue obligations, the attached property booking.
- **Rule:** ICPDP is the single approval point. Facility/Security/Finance opinions, where needed, are gathered by ICPDP outside the system and recorded in the review note.
- **Outcome:** Revision or UC29.

## UC27 – Request event proposal revisions

- **Primary Actor:** ICPDP
- **Status:** Under Review → Revision Requested.
- **Requirement:** Structured comments are mandatory.

## UC28 – Resubmit the event proposal

- **Primary Actor:** CMB
- **Rule:** Creates a new revision version; never overwrites.

## UC29 – Approve/Reject the event

- **Primary Actor:** ICPDP
- **Rule:** Only an Approved Event may be published through UC30.
- **Audit:** actor, timestamp, decision, reason.

## UC30 – Publish the event and open registration

- **Primary Actor:** CMB
- **State:** Approved → Open for Registration.
- **Rule:** Enforce the registration window and capacity.

## UC31 – Register for an event

- **Primary Actor:** Student
- **Validation:** window, eligibility, duplicate, capacity.
- **Outcome:** Confirmed or Waitlisted.

## UC32 – Manage capacity and waitlist

- **Primary Actor:** CMB
- **Rule:** When a slot frees up, promote under a configurable policy.

## UC33 – Check in participants

- **Primary Actor:** Student/CMB
- **Method:** QR / code / authorized manual lookup.
- **Rule:** A duplicate check-in does not create a second attendance record.

## UC34 – Finalize event attendance

- **Primary Actor:** CMB
- **Flow:** Review abnormal check-ins → finalize → lock.
- **Output:** Official Attendance dataset.

## UC35 – Cancel/Reschedule an event

- **Primary Actor:** CMB/ICPDP
- **Flow:** enter a reason → conflict check when rescheduling → update/cancel the linked property booking (UC53) → notify registrants → update deadline/report/budget impact.

## UC36 – Submit the post-event report

- **Primary Actor:** CMB
- **Preloaded Data:** approved proposal, attendance, budget/expense.
- **Manual Data:** actual result, evidence, incidents, lessons learned.
- **Postcondition:** Report Submitted.

## UC37 – Assess and close the event report

- **Primary Actor:** ICPDP
- **Flow:** compare plan vs actual → accept / request correction / raise a violation.
- **Outcome:** Event Closed once the report is accepted.

## UC38 – Submit a budget request

- **Primary Actor:** CMB
- **Can Link To:** an event, a semester plan, an approved activity.
- **Input:** category, amount, purpose, expected expense.

## UC39 – Assess the budget request

- **Primary Actor:** ICPDP
- **Review:** eligibility, available allocation, duplication, status of the related activity.

## UC40 – Revise and resubmit the budget request

- **Primary Actor:** CMB
- **Rule:** Preserve both version history and approval history.

## UC41 – Approve/Reject the budget request

- **Primary Actor:** ICPDP
- **Rule:** The approved amount may differ from the requested amount where policy allows.
- **Audit:** Mandatory.

## UC42 – Record disbursement

- **Primary Actor:** ICPDP
- **Data:** approved amount, disbursed amount, date, reference.
- **Scope:** Tracking only; not a replacement for an accounting ERP.

## UC43 – Record an expense

- **Primary Actor:** CMB/Treasurer
- **Input:** category, amount, date, related budget/event, description.

## UC44 – Submit financial evidence

- **Primary Actor:** CMB
- **Evidence:** invoice, receipt, proof of payment.
- **Rule:** Every piece of evidence must reference an Expense.

## UC45 – Reconcile budget and spending

- **Primary Actor:** ICPDP/CMB
- **System Calculates:**
  - approved;
  - disbursed;
  - recorded expenses;
  - supported expenses;
  - unsupported expenses;
  - remaining balance.
- **Outcome:** Reconciled/Exception.

## UC46 – Submit the periodic activity report

- **Primary Actor:** CMB
- **Period:** Semester / Academic Year / a configured period.
- **Auto Preload:** events, membership, attendance, finance.
- **Manual:** narrative/evidence the system does not already hold.

## UC47 – Assess the periodic activity report

- **Primary Actor:** ICPDP
- **Outcome:** Accept / Return for correction.
- **Accepted Report:** becomes Evaluation Input.

## UC48 – Manage violation/compliance cases

- **Primary Actor:** ICPDP
- **Trigger:** a student complaint (UC57), a manual report, an overdue report, a financial issue, an unauthorized event, a policy breach.
- **Lifecycle:** Open → Investigation → Club Response → Decision → Corrective Action → Resolved.
- **Rule:** Every case records its origin; a case raised from a complaint must link back to the originating Complaint.

## UC49 – Generate the club performance evaluation draft

- **Primary Actor:** ICPDP
- **Input:** activity, attendance, membership, finance, reports, violations, event feedback, complaint history, property booking compliance.
- **Processing:** Apply the active evaluation scheme.
- **Output:** Evaluation Draft.

## UC50 – Review, finalize and publish the evaluation

- **Primary Actor:** ICPDP
- **Flow:** Review the source data → handle anomalies → add manual dimensions where permitted → finalize → publish.
- **Rule:** A Published Evaluation is never edited in place; a new revision/snapshot is created instead.

## UC51 – Submit a property booking request

- **Primary Actor:** CMB
- **Business Goal:** Request rooms/equipment for club activity through a traceable process.
- **Trigger:** The club needs a venue or equipment for an event or a recurring activity.
- **Preconditions:** Club is Active; the user holds the permission.
- **Input:** property, purpose of use, start/end date-time, expected headcount, attached equipment, related event (if any).
- **Main Flow:**
  1. CMB picks a property from the catalogue ICPDP maintains.
  2. The system shows availability.
  3. CMB enters the usage details.
  4. The system runs the conflict check (UC25).
  5. CMB submits.
  6. Status → `Requested`; ICPDP receives a review task.
- **Alternative:** Save as Draft; attach the booking to an Event Proposal being drafted.
- **Exception:** The property is already booked in that time slot and policy forbids overbooking.
- **Postcondition:** The PropertyBooking is in `Requested` state.
- **Related:** UC24, UC25, UC52.
- **Pain Point:** BP16.
- **Priority:** Must.

## UC52 – Approve/Reject the property booking request

- **Primary Actor:** ICPDP
- **Business Goal:** Allocate university resources under control.
- **Preconditions:** The booking is in `Requested` state.
- **Main Flow:**
  1. ICPDP opens the request.
  2. Check club status, purpose, conflicts and overdue obligations.
  3. Choose Approve / Reject / Request Revision.
  4. Enter a reason for Reject or Revision.
  5. The system writes the audit record and updates the state.
  6. The system sends `Property booking status` to CMB.
- **Rule:**
  - only ICPDP may decide;
  - an Approved booking locks that property's time slot;
  - a Suspended club receives no new bookings.
- **Postcondition:** Booking → `Approved` or `Rejected`.
- **Related:** UC51, UC53, UC26.
- **Priority:** Must.

## UC53 – Track and cancel/release a booked property

- **Primary Actor:** CMB
- **Business Goal:** Free resources that are no longer needed so other clubs can book them.
- **Trigger:** The event is cancelled or rescheduled (UC35), or the club no longer needs the property.
- **Main Flow:**
  1. CMB opens an `Approved` booking.
  2. Choose Cancel and enter a reason.
  3. The system frees the time slot.
  4. ICPDP receives a notification.
- **Rule:** A last-minute cancellation may be recorded as a violation under policy (links to UC48).
- **Postcondition:** Booking → `Cancelled` or `Released`.
- **Related:** UC35, UC52, UC48.
- **Priority:** Should.

## UC54 – Submit post-event feedback

- **Primary Actor:** Student
- **Business Goal:** Collect participant assessment as improvement and evaluation data.
- **Trigger:** The feedback window opens once attendance is finalized.
- **Preconditions:** The student holds a valid attendance record for that event.
- **Input:** per-criterion score, free-text comment, optional anonymity.
- **Main Flow:**
  1. The student opens an event they attended.
  2. Fill in the feedback form.
  3. Submit.
  4. The system stores it and updates the aggregate statistics.
- **Rule:**
  - one feedback per student per event;
  - feedback is accepted only inside the feedback window (configurable);
  - anonymous feedback hides the identity from CMB but keeps an internal link for anti-spam purposes.
- **Postcondition:** An EventFeedback record is created.
- **Related:** UC34, UC55, UC49.
- **Pain Point:** BP17.
- **Priority:** Should.

## UC55 – Review and act on event feedback

- **Primary Actor:** CMB
- **Business Goal:** Use feedback to improve activity quality.
- **Main Flow:**
  1. CMB opens the aggregated feedback view for an event.
  2. Review the per-criterion average and distribution.
  3. Read the comments.
  4. Record lessons learned in the post-event report (UC36).
- **Rule:** CMB may not edit or delete participant feedback.
- **Output:** Feedback summary; input to UC36 and UC49.
- **Related:** UC54, UC36, UC49.
- **Priority:** Should.

## UC56 – Submit a complaint about a club

- **Primary Actor:** Student
- **Business Goal:** Give students an official escalation channel with a processing trail.
- **Trigger:** A student has an issue with a club or one of its activities.
- **Input:** the club concerned, the related event (if any), complaint type, description, attached evidence.
- **Main Flow:**
  1. The student selects the club/event.
  2. Choose the complaint type.
  3. Describe the issue and attach evidence.
  4. Submit.
  5. Status → `Submitted`; ICPDP receives a task.
- **Rule:** Complaints go straight to **ICPDP**, never through the club being complained about.
- **Postcondition:** The Complaint is in `Submitted` state; the student can track its progress.
- **Related:** UC57, UC48.
- **Pain Point:** BP18.
- **Priority:** Should.

## UC57 – Receive, triage and escalate a complaint into a compliance case

- **Primary Actor:** ICPDP
- **Business Goal:** Filter complaints and open a compliance case only when there are grounds.
- **Preconditions:** The complaint is in `Submitted` state.
- **Main Flow:**
  1. ICPDP opens the complaint.
  2. Classify severity and validity.
  3. Choose one of:
     - `Dismissed` – no grounds, reason recorded;
     - `Forwarded` – handed to the club to handle and respond;
     - `Escalated` – open a Violation case through UC48.
  4. The system writes the audit record and notifies the complainant.
- **Rule:**
  - every decision requires a reason;
  - only ICPDP may dismiss or escalate.
- **Postcondition:** Complaint → `Dismissed` / `Forwarded` / `Escalated`; on Escalated a Violation is created and linked back to the Complaint.
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

UC35 can affect anything from UC30 through UC36, and pulls in UC53 when a property booking exists.

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

> The system has **3 actors**. The `School Supporting Reviewer` actor has been removed — all
> university-side authority sits with the ICPDP Officer.

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

ICPDP holds the **highest authority**: every approve/reject/suspend/dissolve/finalize decision
in the system belongs to this actor, with no other actor reviewing in parallel or holding a veto.

## External Systems

Not actors — they only take part in data flows:

| System | Related use cases | Flow |
|---|---|---|
| Google OAuth | UC01 | Authentication request → / ← Authentication data |
| Google SMTP Service | Every UC with an Email notification channel (§19) | Send email request → |

---

# 12. USER STORIES

## US01
**As a Student,**  
I want to submit a club establishment application digitally,  
**so that** I don't have to juggle files and emails while applying to found a club.

## US02
**As an ICPDP Officer,**  
I want to review all versions of a club application,  
**so that** I know exactly what the applicant changed before I approve it.

## US03
**As an ICPDP Officer,**  
I want to request corrections on specific sections,  
**so that** the applicant knows exactly what to fix instead of receiving vague feedback.

## US04
**As a Club Leader,**  
I want to maintain the club organization structure,  
**so that** authority and responsibility inside the club are transparent.

## US05
**As an ICPDP Officer,**  
I want leadership terms to be formally recorded,  
**so that** the university can tell who represents a club at any point in time.

## US06
**As an outgoing Club Leader,**  
I want to create a structured transition plan,  
**so that** outstanding work is not lost between two terms.

## US07
**As a Club Leader,**  
I want to publish recruitment campaigns,  
**so that** student applications are collected through one consistent process.

## US08
**As a Student,**  
I want to track my recruitment application status,  
**so that** I don't have to chase the club manually for a result.

## US09
**As a Club Leader,**  
I want to evaluate candidates using a defined process,  
**so that** recruitment decisions are more consistent.

## US10
**As a Club Leader,**  
I want accepted candidates to become members without duplicate data entry,  
**so that** the member roster stays in sync.

## US11
**As a Club Leader,**  
I want to submit event proposals online,  
**so that** ICPDP can review them through a unified workflow.

## US12
**As a Club Leader,**  
I want the system to warn about event conflicts,  
**so that** venue/time clashes surface before the event is approved.

## US13
**As an ICPDP Officer,**  
I want to request event revisions instead of immediately rejecting,  
**so that** a viable proposal gets a chance to be completed.

## US14
**As a Student,**  
I want to register for approved events,  
**so that** my participation is recorded centrally.

## US15
**As a Club Leader,**  
I want to manage capacity and waiting lists,  
**so that** attendance does not exceed what we can host.

## US16
**As a Club Leader,**  
I want attendance linked to registrations,  
**so that** post-event statistics are trustworthy.

## US17
**As a Club Leader,**  
I want post-event reports to reuse registration and attendance data,  
**so that** I don't have to consolidate it by hand.

## US18
**As an ICPDP Officer,**  
I want events to remain incomplete until required reports are submitted,  
**so that** clubs stay accountable after being granted permission to run an event.

## US19
**As a Club Treasurer,**  
I want to submit structured budget requests,  
**so that** funding decisions are traceable.

## US20
**As an ICPDP Officer,**  
I want budget requests linked to events/activities,  
**so that** I understand clearly what the funding is for.

## US21
**As a Club Treasurer,**  
I want each expense linked to evidence,  
**so that** reconciliation is fast and transparent.

## US22
**As an ICPDP Officer,**  
I want to compare approved funding with supported expenses,  
**so that** I can assess financial compliance.

## US23
**As a Club Leader,**  
I want periodic reports pre-populated with system data,  
**so that** I only enter what the system does not already know.

## US24
**As an ICPDP Officer,**  
I want overdue obligations to be visible,  
**so that** I can intervene before the problem becomes serious.

## US25
**As an ICPDP Officer,**  
I want violations stored as structured cases,  
**so that** warnings and decisions rest on evidence.

## US26
**As a Club Leader,**  
I want to respond to compliance cases,  
**so that** the club gets a chance to explain and provide evidence.

## US27
**As an ICPDP Officer,**  
I want evaluation data collected automatically from other modules,  
**so that** evaluation does not depend on manual spreadsheet consolidation.

## US28
**As an ICPDP Officer,**  
I want evaluation dimensions and weights configurable,  
**so that** a policy change does not require a code change.

## US29
**As an ICPDP Officer,**  
I want to review evaluation drafts before publication,  
**so that** anomalous data can be checked.

## US30
**As a Club Leader,**  
I want to see reporting and finance deadlines,  
**so that** the club avoids violations caused by forgetting a deadline.

## US31
**As an ICPDP Officer,**  
I want a dashboard of pending approvals,  
**so that** no request is forgotten.

## US32
**As an ICPDP Officer,**  
I want every approval decision audited,  
**so that** disputes can be investigated objectively.

## US33
**As a Student,**  
I want to see only active clubs and valid recruitment campaigns,  
**so that** I don't apply to a club that no longer operates.

## US34
**As an ICPDP Officer,**  
I want suspension to immediately restrict prohibited operations,  
**so that** the governance decision is actually enforced.

## US35
**As an ICPDP Officer,**  
I want evaluation history by semester/year,  
**so that** I can follow how a club develops over time.

## US36
**As a Club Leader,**  
I want to request rooms and equipment inside the same system as my event proposal,  
**so that** I don't have to request facilities by email, detached from the event record.

## US37
**As an ICPDP Officer,**  
I want to see property booking conflicts before approving,  
**so that** two clubs are never granted the same room in the same time slot.

## US38
**As a Student,**  
I want to give feedback after an event I attended,  
**so that** my opinion is recorded instead of only being said out loud.

## US39
**As a Club Leader,**  
I want to see aggregated event feedback,  
**so that** I know what to improve at the next event.

## US40
**As a Student,**  
I want to send a complaint about a club directly to ICPDP,  
**so that** my concern cannot be blocked by the very club I am complaining about.

## US41
**As any user,**  
I want to log in with my school Google account,  
**so that** I don't have to remember another password for this system.

---

# 13. ACCEPTANCE CRITERIA

## AC01 – Submit Club Application

**Given** the student has completed every mandatory field  
**When** the student submits the application  
**Then** the application state becomes `Submitted`  
**And** ICPDP receives a review task  
**And** the submitted version cannot be edited in place.

## AC02 – Request Revision

**Given** the application is `Under Review`  
**When** ICPDP requests a revision  
**Then** at least one revision reason must be entered  
**And** the state becomes `Revision Requested`.

## AC03 – Approve Club

**Given** the application is `Under Review`  
**When** ICPDP approves it  
**Then** the application → `Approved`  
**And** exactly one Club record is created.

## AC04 – Recruitment Duplicate

**Given** a campaign is open  
**When** an eligible student submits for the first time  
**Then** the application is created.

**When** the same student submits again to the same campaign  
**Then** the system rejects the duplicate application.

## AC05 – Event Proposal

**Given** the Club is Active  
**When** CMB submits a valid event proposal  
**Then** the event proposal → `Pending Approval`  
**And** the conflict analysis is stored.

## AC06 – Event Approval

**Given** the event proposal is `Under Review`  
**When** ICPDP approves it  
**Then** the status → `Approved`  
**And** the event is not public until UC30.

## AC07 – Event Capacity

**Given** capacity = 100 and 100 confirmed registrations already exist  
**When** the next student registers  
**Then** the status → `Waitlisted` if the waitlist is enabled.

## AC08 – Check-in

**Given** the student has a valid registration  
**When** a valid check-in token is processed  
**Then** one Attendance record is created  
**And** a duplicate check-in does not create a second record.

## AC09 – Attendance Finalization

**Given** the event has ended  
**When** CMB finalizes attendance  
**Then** the attendance dataset is locked  
**And** any later change requires a special permission.

## AC10 – Post-event Report

**Given** the event is Completed  
**When** CMB opens the report form  
**Then** the finalized attendance statistics are pre-populated.

## AC11 – Budget Approval

**Given** the budget request is `Under Review`  
**When** ICPDP approves it  
**Then** the approved amount is stored  
**And** actor + timestamp + decision are audited.

## AC12 – Financial Evidence

**Given** an Expense exists  
**When** CMB uploads evidence  
**Then** the evidence must reference that Expense  
**And** the uploader and time are stored.

## AC13 – Reconciliation

**Given** the budget has expenses  
**When** reconciliation runs  
**Then** the system shows Approved / Disbursed / Recorded / Supported / Unsupported / Remaining separately.

## AC14 – Suspension

**Given** the Club is Active  
**When** ICPDP suspends it  
**Then** the Club → Suspended  
**And** no new recruitment can be published  
**And** no new event proposal can be submitted.

## AC15 – Evaluation

**Given** the evaluation period is configured  
**When** ICPDP generates a draft  
**Then** every dimension must be traceable back to its source data.

## AC16 – Property Booking Conflict

**Given** property P already has an `Approved` booking from 14:00–16:00 on day D  
**When** another club submits a booking for P from 15:00–17:00 on day D  
**Then** the system returns a Blocking Conflict  
**And** the booking cannot move to `Approved` if policy forbids overbooking.

## AC17 – Property Booking Authority

**Given** a booking is `Requested`  
**When** a non-ICPDP user attempts to approve it  
**Then** the system rejects the operation  
**And** the unauthorized attempt is audited.

## AC18 – Event Feedback

**Given** the student has finalized attendance for event E and the feedback window is open  
**When** the student submits feedback for the first time  
**Then** one EventFeedback record is created.

**When** the same student submits a second time for E  
**Then** the system rejects the duplicate feedback.

**Given** the feedback window has closed  
**When** the student submits feedback  
**Then** the system rejects it.

## AC19 – Complaint Routing

**Given** a student submits a complaint about club X  
**When** the complaint is created  
**Then** only ICPDP can see the original content  
**And** club X does not receive the complaint until ICPDP selects `Forwarded`  
**And** when ICPDP selects `Escalated`, a Violation is created pointing back to the Complaint.

## AC20 – Google OAuth Login

**Given** the user authenticates successfully with Google  
**When** the returned email is **not** in the configured domain  
**Then** the system refuses to create a session  
**And** no User record is created.

**When** the email is in a valid domain and no User exists yet  
**Then** exactly one User + StudentProfile is created.

---

# 14. BUSINESS RULES

| Rule | Statement |
|---|---|
| BR01 | Only an Active Club may create a new recruitment campaign or event proposal. |
| BR02 | A Club Application must carry the mandatory documents ICPDP configures. |
| BR03 | The minimum number of founding members is a configurable business rule. |
| BR04 | A submitted application version is never overwritten. |
| BR05 | Approve/Reject must store the actor, timestamp and, where applicable, the reason. |
| BR06 | There must be no overlapping President in the same period unless policy allows it. |
| BR07 | Eligibility to hold a leadership position is configurable. |
| BR08 | New permissions take effect only once the leadership transition is confirmed. |
| BR09 | A Suspended Club may not open a new recruitment campaign. |
| BR10 | A Suspended Club may not submit a new event proposal. |
| BR11 | Recruitment accepts applications only inside the application window. |
| BR12 | A student may not submit a duplicate application to the same campaign. |
| BR13 | Membership is created only from an accepted candidate or an authorized manual onboarding. |
| BR14 | An event may only be made public after it is Approved. |
| BR15 | The conflict threshold is configurable. |
| BR16 | An event whose risk category exceeds the configured threshold must be approved at a higher ICPDP level (internal ICPDP RBAC), never handed to another actor. |
| BR17 | Confirmed registrations do not exceed capacity unless policy allows overbooking. |
| BR18 | A participant has exactly one official attendance record per event. |
| BR19 | Finalized attendance may only be unlocked by a special role. |
| BR20 | The post-event report deadline is configurable. |
| BR21 | A club overdue on a mandatory report may be blocked from new events when policy enables enforcement. |
| BR22 | A Budget Request must be tied to a valid business purpose. |
| BR23 | The Disbursed Amount may not exceed the Approved Amount without an amendment. |
| BR24 | An expense outside the approved category must be flagged as an exception. |
| BR25 | Evidence requirements per expense category are configurable. |
| BR26 | Reconciliation must be complete before a budget case can be closed. |
| BR27 | The violation severity taxonomy is configured by ICPDP. |
| BR28 | A violation decision must carry a reason and evidence. |
| BR29 | Total evaluation weight must be valid before a scheme can be activated. |
| BR30 | A Published Evaluation is never edited in place; a new revision/snapshot must be created. |
| BR31 | ICPDP is the only approval authority; no decision in the system is approved by another actor. |
| BR32 | The system accepts sign-in only through Google OAuth with an email in the configured domain. |
| BR33 | A property may not hold two `Approved` bookings in overlapping time slots unless policy allows overbooking. |
| BR34 | A Suspended Club receives no new property booking. |
| BR35 | A property booking is `Approved` only by ICPDP and is released automatically when the related event is cancelled. |
| BR36 | A participant may submit exactly one event feedback per event, inside a configurable feedback window. |
| BR37 | CMB may not edit or delete event feedback; it is visible only in aggregate. |
| BR38 | Student complaints go directly to ICPDP; the club complained about gains access only after ICPDP forwards it. |
| BR39 | Every complaint decision (dismiss/forward/escalate) must carry a reason and be audited. |

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

An `Inactive` state may be added if the business confirms it needs to be distinguished from `Suspended`.

## 15.3 Recruitment Campaign

```text
Draft
→ Published
→ Accepting Applications
→ Screening
→ Completed

or → Cancelled
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
→ Released (when the related event is cancelled)
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

or → Forwarded → Club Responded → Closed

or → Escalated → Violation (15.7)
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

Feedback has no approval step: once submitted it is neither editable nor deletable (BR37).

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

Do not hard-code a fixed scoring formula before the university has a real policy.

Build a **configurable Evaluation Framework** instead.

## D1 – Activity Execution

**Input:**

- approved events;
- completed events;
- cancelled events;
- post-event reports;
- property bookings granted vs. actually used;
- average event feedback score.

**Business Question:**

> Does the club actually deliver the activities it registered and committed to?

## D2 – Member Engagement

**Input:**

- active members;
- attendance;
- retention;
- participation rate;
- feedback response rate.

**Business Question:**

> Do members actually take part, or do they only exist on a list?

## D3 – Reporting Discipline

**Input:**

- report completion;
- due date;
- overdue days;
- number of revisions.

**Business Question:**

> Does the club meet its reporting obligations?

## D4 – Financial Compliance

**Input:**

- approved budget;
- disbursed amount;
- expenses;
- evidence;
- reconciliation.

**Business Question:**

> Does the club use its budget transparently and by the book?

## D5 – Governance

**Input:**

- a valid management board;
- leadership term;
- transition;
- membership records.

**Business Question:**

> Does the club have a working structure and good continuity?

## D6 – Compliance & Risk

**Input:**

- violation count;
- severity;
- unresolved cases;
- corrective actions;
- complaints escalated by ICPDP;
- last-minute property booking cancellations.

**Business Question:**

> Does the club create governance/compliance risk for the university?

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

ICPDP configures the weights.

Do not assume 10%, 20%, 30% before a policy exists.

## Data Lineage

Every result must be traceable:

```text
Dimension Result
→ Metric
→ Source Entity
→ Source Period
```

Example:

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
| Active/Suspended Clubs | How many clubs are legitimately operating right now? |
| Pending Approvals | Which requests are waiting on ICPDP? |
| Approval Aging | Which requests have been waiting too long? |
| Upcoming Events | Which events are coming up? |
| Conflict Alerts | Are any events clashing in time or venue? |
| Budget Exposure | What is the total approved/disbursed/reconciled? |
| Property Booking Queue | Which facility requests are awaiting approval? |
| Property Utilization | Which rooms/equipment were granted but never used? |
| Overdue Reports | Which clubs have not met their obligations? |
| Open Complaints | Which student complaints have not been triaged? |
| Open Violations | Which compliance cases are unresolved? |
| Club Health | Which clubs show risk signals? |
| Feedback Summary | What is the average club/event feedback score this period? |
| Evaluation Distribution | What is the overall club quality this period? |

## 18.2 Club Management Dashboard

Answers:

- How many active members does the club have?
- Which campaign is running?
- Which events are coming up?
- Which proposals are Pending/Revision Requested?
- How much budget is left?
- Which expenses are missing evidence?
- Which reports are close to their deadline?
- Which property bookings are pending or approved?
- What did the most recent event feedback look like?
- Are there open violations?
- How long is left in the term?
- Which transition tasks are unfinished?

## 18.3 Student Dashboard

- Which clubs am I in?
- Which clubs are recruiting?
- What state is my application in?
- Which events can I register for?
- Which events have I registered for?
- What are my upcoming events?
- Attendance history?
- Which events have I not given feedback on yet?
- What state is my complaint in?

> **Note:** the `School Supporting Reviewer` dashboard from the previous version has been
> **removed** along with that actor. The entire approval queue lives in the ICPDP Dashboard (§18.1).

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
| Complaint Triaged | Complainant | In-app |
| Complaint Forwarded | CMB | In-app + Email |
| Violation Opened | CMB | In-app + Email |
| Leadership Term Near Expiry | CMB + ICPDP | Reminder |
| Evaluation Published | CMB | In-app |

**Email channel:** every notification whose channel is Email is sent through the **Google SMTP
Service** (`Send email request`). The system must store an `EmailDeliveryLog` and retry on
failure; a failed email must never break a business transaction that has already committed.

## Configurable Deadline Escalation

```text
T - X days → Reminder
T          → Due
T + Y days → Overdue
T + Z days → Escalate ICPDP
```

X, Y and Z are configurable business rules.

---

# 20. AUDIT REQUIREMENTS

Minimum audit record:

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

Strong auditing is mandatory for:

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
- Rejected Google OAuth sign-in (wrong domain / locked account)

Example:

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
| BP16 | Controlled property booking | UC51–53 | CMB/ICPDP | US36–37 | BR33–35 |
| BP17 | Structured event feedback | UC54–55 | Student/CMB | US38–39 | BR36–37 |
| BP18 | Official complaint channel | UC56–57 | Student/ICPDP | US40 | BR38–39 |
| BP19 | Single sign-on with the university account | UC01 | All | US41 | BR32 |

---

# 22. MVP VS VERSION 2

## 22.1 MVP

The MVP should focus on roughly 30–34 core use cases out of 57.

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

The MVP must demonstrate at least 5 lifecycles:

```text
Club
Recruitment
Event
Finance
Property Booking
```

## 22.2 Version 2

Can be deferred:

- UC08 – advanced organization customization
- UC11–12 – leadership transition automation
- UC13 – voluntary suspension
- UC18 – candidate evaluation rubric
- UC22 – advanced role assignment
- UC23 – complex member removal
- UC25 – advanced conflict engine
- UC32 – advanced waitlist
- UC35 – complex reschedule workflow
- UC40 – budget revision versioning
- UC42 – detailed disbursement tracking
- UC48 – full compliance case management
- UC49–50 – fully configurable performance evaluation
- UC53 – property booking cancellation with time limits and violation recording
- UC55 – advanced feedback analytics (trend, sentiment)

---

# 23. SIGNATURE FEATURES

## Feature 1 – Configurable Approval Workflow

### The problem

Not every request follows the same approval path — but every path ends at **ICPDP**. What
varies is the **level of authority inside ICPDP**, not which department takes part.

### Input

- request type;
- amount;
- event risk;
- property/venue;
- club status and compliance history.

### Processing

Rule-based routing **inside ICPDP** (levels handled by RBAC):

```text
Normal Event
→ ICPDP Officer

High-risk / Large Event
→ ICPDP Officer
→ ICPDP Head

Budget ≤ threshold
→ ICPDP Officer

Budget > threshold
→ ICPDP Officer
→ ICPDP Head

Property Booking
→ ICPDP Officer
```

Expert opinions from Finance/Facility/Security are gathered by ICPDP **outside the system**
and recorded in the review note of that same decision, so they add neither an actor nor an
approval node.

### Output

- approval tasks;
- decision history;
- current approver;
- SLA;
- audit trail.

### Business Value

Less hard-coding, a faithful model of the real authority hierarchy, and still **one** party
accountable for the final decision.

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
- existing property bookings.

### Processing

```text
Overlap time?
AND same venue/property?
AND does an existing event or approved booking block it?
```

### Output

- No Conflict
- Warning
- Blocking Conflict

### Business Value

Fewer schedule clashes and venue conflicts.

### AI?

Not needed. Deterministic business logic is the better fit.

### Related UC

UC24, UC25, UC29, UC35, UC51, UC52.

This engine is shared by the event calendar and the facility usage calendar (M11).

---

## Feature 3 – Budget & Financial Reconciliation

### The problem

Approved Budget does not mean Actual Spend, and Actual Spend does not mean Supported Spend.

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

Higher accountability and auditability.

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

Evaluation Scheme + dimensions + weights + rules.

### Output

- score per dimension;
- evidence;
- trend;
- classification;
- historical result.

### Business Value

Turns operational data into governance data.

### Related UC

UC49–UC50.

---

## Feature 5 – Club Health / Risk Monitoring

> May be deferred to Version 2.

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

Not needed initially.

Once enough historical data exists, ML could later be considered for predicting the risk of a
club going inactive or breaching policy.

---

## Feature 6 – Closed-loop Feedback & Complaint

### The problem

Student feedback and complaints usually stop at an informal channel: nobody is accountable,
there is no state, and none of it can be used as evaluation data.

### Input

- event feedback (per-criterion score + comment, optionally anonymous);
- club complaint (type, description, evidence).

### Processing

```text
Feedback
→ accepted only from someone with finalized attendance
→ aggregated per event and per club

Complaint
→ goes straight to ICPDP
→ triage: Dismissed / Forwarded / Escalated
→ Escalated → Violation case
```

### Output

- feedback summary for CMB;
- aggregated `Club and event feedback` for ICPDP;
- processing status returned to the complainant;
- input to D1, D2 and D6 of the evaluation model.

### Business Value

Turns scattered student opinion into governance data with a processing trail, and closes the
loop between participant — club — university.

### Related UC

UC54–UC57, UC48, UC49.

---

# 24. FINAL REVIEW

## 24.1 What problem is the system solving?

The system addresses:

- club governance;
- fragmented data;
- approval workflow;
- membership;
- event lifecycle;
- attendance;
- budget accountability;
- reporting;
- compliance;
- evaluation;
- leadership continuity;
- facility allocation and control;
- student feedback and complaints.

This is not a club directory website.

---

## 24.2 Why a system instead of Excel + Google Forms?

Excel and Forms can collect data, but they cannot enforce:

- lifecycle/state;
- authorization;
- referential integrity;
- versioning;
- approval;
- audit;
- deadlines;
- cross-module relationships;
- historical governance;
- automated evaluation.

For example:

```text
Event A
→ must be Approved
→ before it can be Published
→ Registration must belong to Event A
→ Attendance must belong to a Registration
→ the Report must use the finalized Attendance
→ the Evaluation must trace back to that Event/Report
```

That is the value a standalone spreadsheet cannot provide.

---

## 24.3 Are 3 actors reasonable?

Yes, and this is the change from the previous version.

Three actors:

1. **Student** – consumes the club's services and is a source of input data (applications, registrations, attendance, feedback, complaints).
2. **Club Management Board (Club's Admin)** – runs the club and submits every record.
3. **ICPDP Officer** – the **highest authority**, the university's sole representative, and the final decision-maker in every approval flow.

### Why School Supporting Reviewer was removed

The previous version assumed multi-department approval (Facility, Security, Finance reviewing
directly in the system). The agreed Context Diagram shows that assumption **does not match the
university's real process**: on the university side, only ICPDP interacts with the system.

Consequences:

- actor A4 removed from §4, §11, §18 and §23 Feature 1;
- approval routing moves from **multi-department** to **multi-level inside ICPDP** (RBAC);
- departmental expert opinion is gathered by ICPDP outside the system and recorded in the review note;
- the system has exactly **one** approval authority, which keeps the state machine and the audit trail simpler and tighter.

The two external entities — **Google OAuth** and **Google SMTP Service** — take part in the
data flows but are not actors: they make no decisions and own no business outcome.

---

## 24.4 Are 57 use cases artificial?

Not meaningfully.

The use cases come from 7 lifecycle groups:

```text
Club Governance
Recruitment & Membership
Event
Finance
Property Booking
Feedback & Complaint
Reporting / Compliance / Evaluation
```

UC51–UC57 are not padding: they come straight from data flows already agreed on the Context
Diagram (`Property booking request`, `Property booking status`, `Event feedback`,
`Club and event feedback`, `Club complaint`), and each one owns a state transition or a
decision of its own.

Use cases such as Request Revision, Resubmit and Approve are kept separate because they differ in:

- actor;
- responsibility;
- state transition;
- audit requirement.

---

## 24.5 Core Use Cases

The most important groups:

- UC02–UC06 – Club Establishment
- UC15–UC20 – Recruitment
- UC24–UC30 – Event Approval
- UC31–UC37 – Event Execution
- UC38–UC45 – Finance
- UC46–UC50 – Reporting & Evaluation
- UC51–UC53 – Property Booking
- UC54–UC57 – Feedback & Complaint

---

## 24.6 Key dependencies

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

## 24.7 The central module

### In business terms

**Club Lifecycle & Governance**

### In architectural terms

**Identity (Google OAuth) + Workflow + Audit**

Because there is only one approval authority (ICPDP), the workflow engine needs no parallel
approval nodes — the complexity concentrates in **RBAC levels** and the **state machine**,
not in multi-party routing.

### In differentiation terms

**Performance Evaluation**

---

## 24.8 Cross-module data flow

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

This is the single most important property keeping the system from degenerating into a set of
independent CRUD modules.

---

## 24.9 Features that create depth

Priority order:

1. Approval Workflow Engine (multi-level ICPDP)
2. Event & Property Conflict Detection
3. Budget Reconciliation
4. Club Performance Evaluation
5. Closed-loop Feedback & Complaint
6. Leadership Transition / Risk Monitoring

---

## 24.10 Is this feasible for 4 students over 4–6 months?

Yes, provided the scope is controlled.

Do not attempt all 57 use cases at production level in a single release.

Strategy:

- 30–34 use cases as a complete MVP;
- the rest simplified or deferred to V2;
- modular monolith;
- REST API;
- no microservices without a reason;
- no full ERP;
- no forced AI;
- no native app unless genuinely needed.

---

## 24.11 If scope must be cut, what goes first?

1. AI/Predictive Club Health.
2. Advanced waitlist.
3. Voluntary suspension workflow.
4. Advanced transition checklist.
5. Complex recruitment rubric.
6. Automated risk scoring.
7. Advanced feedback analytics (trend/sentiment).
8. Property booking cancellation with penalty constraints (UC53).

What must not be cut:

- Club Establishment;
- Event Approval;
- Property Booking (UC51–52);
- Attendance;
- Budget/Expense;
- Reporting;
- Complaint intake (UC56–57).

---

## 24.12 Is there enough depth for a Software Engineering capstone?

Yes.

The system involves:

- multi-actor workflow;
- state machines;
- multi-level RBAC inside a single authority;
- external system integration (Google OAuth, Google SMTP);
- approval routing;
- resource booking with conflict detection;
- transactional business rules;
- versioning;
- conflict detection;
- budget reconciliation;
- audit log;
- notification/deadlines;
- cross-domain data;
- configurable evaluation;
- historical lifecycle.

Executed well, the topic provides enough foundation to continue into:

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

# CONCLUSION

The single most important idea to hold on to throughout the project:

> **UCMS is not a "club information management" system. UCMS governs the lifecycle,
> accountability, compliance and effectiveness of student clubs.**

The overall model:

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
      Governance Decision (ICPDP – highest authority)
```

This is what turns the topic from a CRUD website into a **Software Engineering capstone with
real business logic, workflow, state, rules, audit and cross-module data**.
