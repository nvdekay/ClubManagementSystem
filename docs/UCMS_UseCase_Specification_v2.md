# UCMS — Detailed Use Case Specification v2

> **Scope:** the full specification of all 54 use cases of
> [`UCMS_UseCase_Model_v2.md`](UCMS_UseCase_Model_v2.md). It replaces §9 of
> [`UCMS_Business_System_Analysis_EN.md`](UCMS_Business_System_Analysis_EN.md) (UC01–UC57) and
> expands §6 of the model document. The model document keeps the use case list, the v1 → v2
> mapping, the lifecycles, the business rules and the phase plan; this document holds the specs.
> Diagrams: [`diagrams/UCMS_UseCase_ByActor.drawio`](diagrams/UCMS_UseCase_ByActor.drawio).

Every entry uses the same template, in this order:

```text
Primary Actor · Supporting · Module · Business Goal · Trigger · Preconditions · Input
Main Flow · Alternative Flows · Exceptions · Postconditions · Business Rules · Output
Related UC · Pain Point · Phase
```

A field is omitted only when the use case genuinely has nothing for it (no external system, no
pain point of its own). `Phase 1` is the first release; `Phase 2` is deferred — see model §12.

---

## Index

| UC | Name | Primary actor | Module | Phase |
|---|---|---|---|---|
| UC01 | Authenticate via Google OAuth and enter the role workspace | All | M01 | 1 |
| UC02 | Open my role dashboard | All | M01 | 1 |
| UC03 | Manage accounts and role assignments | ICPDP | M01 | 1 |
| UC04 | Configure institutional policy and deadlines | ICPDP | M01 | 1 |
| UC05 | Configure the approval routing rules | ICPDP | M01 | 2 |
| UC06 | Discover clubs and open activity | Student | M02 | 1 |
| UC07 | Submit a club establishment application | Student | M02 | 1 |
| UC08 | Assess and decide the club establishment application | ICPDP | M02 | 1 |
| UC09 | Configure the club profile and organization structure | CMB | M02/M03 | 1 |
| UC10 | Nominate the club management board | CMB | M03 | 1 |
| UC11 | Confirm the management board | ICPDP | M03 | 1 |
| UC12 | Plan the leadership transition | CMB | M03 | 2 |
| UC13 | Confirm the leadership transition | ICPDP | M03 | 2 |
| UC14 | Request club activity suspension | CMB | M02 | 2 |
| UC15 | Suspend, reactivate or dissolve a club | ICPDP | M02 | 1 |
| UC16 | Create and publish a recruitment campaign | CMB | M04 | 1 |
| UC17 | Submit a club membership application | Student | M04 | 1 |
| UC18 | Screen and decide membership applications | CMB | M04 | 1 |
| UC19 | Record candidate evaluation | CMB | M04 | 2 |
| UC20 | Onboard accepted candidates | CMB | M04 | 1 |
| UC21 | Manage membership status | CMB | M04 | 1 |
| UC22 | Request to leave a club | Student | M04 | 2 |
| UC23 | Assign positions inside the club | CMB | M03/M04 | 2 |
| UC24 | Use my member workspace | Student | M04 | 1 |
| UC25 | Submit an event proposal | CMB | M05 | 1 |
| UC26 | Assess and decide the event proposal | ICPDP | M05 | 1 |
| UC27 | Publish the event and open registration | CMB | M05 | 1 |
| UC28 | Cancel or reschedule an event | CMB | M05 | 1 |
| UC29 | Register for an event | Student | M06 | 1 |
| UC30 | Manage capacity and the waitlist | CMB | M06 | 2 |
| UC31 | Check in to an event | Student | M06 | 1 |
| UC32 | Finalize event attendance | CMB | M06 | 1 |
| UC33 | Submit the post-event report | CMB | M08 | 1 |
| UC34 | Assess and close the event report | ICPDP | M08 | 1 |
| UC35 | Submit a budget request | CMB | M07 | 1 |
| UC36 | Assess and decide the budget request | ICPDP | M07 | 1 |
| UC37 | Record disbursement | ICPDP | M07 | 1 |
| UC38 | Record an expense with its evidence | CMB | M07 | 1 |
| UC39 | Reconcile budget and spending | ICPDP | M07 | 1 |
| UC40 | Submit the periodic activity report | CMB | M08 | 1 |
| UC41 | Assess the periodic activity report | ICPDP | M08 | 1 |
| UC42 | Manage violation and compliance cases | ICPDP | M08 | 2 |
| UC43 | Configure the evaluation scheme | ICPDP | M09 | 2 |
| UC44 | Generate the club performance evaluation draft | ICPDP | M09 | 2 |
| UC45 | Review, finalize and publish the evaluation | ICPDP | M09 | 2 |
| UC46 | Manage the property catalogue | ICPDP | M11 | 1 |
| UC47 | Submit a property booking request | CMB | M11 | 1 |
| UC48 | Assess and decide the property booking request | ICPDP | M11 | 1 |
| UC49 | Track and cancel or release a booked property | CMB | M11 | 1 |
| UC50 | Submit post-event feedback | Student | M12 | 2 |
| UC51 | Review event feedback | CMB | M12 | 2 |
| UC52 | Submit a complaint about a club | Student | M12 | 2 |
| UC53 | Triage a complaint | ICPDP | M12 | 2 |
| UC54 | Respond to a forwarded complaint | CMB | M12 | 2 |

---

# M01 — Identity, Access & Configuration

## UC01 – Authenticate via Google OAuth and enter the role workspace

- **Primary Actor:** All (Student, CMB, ICPDP Officer)
- **Supporting System:** Google OAuth (ES1)
- **Module:** M01
- **Business Goal:** Give each user access to exactly the data and features their role allows,
  without UCMS managing any password.
- **Trigger:** The user chooses to sign in.
- **Preconditions:** The user holds a Google account in a domain the university allows (UC04).
- **Input:** The OAuth authorization code returned by Google.
- **Main Flow:**
  1. The system sends an `Authentication request` to Google OAuth.
  2. The user authenticates with Google.
  3. Google OAuth returns `Authentication data` — email, full name, avatar.
  4. The system checks the email domain against the policy configured in UC04.
  5. The system maps the email to a User; on first sign-in it creates the User and its
     StudentProfile.
  6. The system loads the current role and permission set, including club contexts.
  7. The system creates the session and routes the user to the matching workspace
     (Student / Club's Admin / ICPDP).
- **Alternative Flows:**
  - **A1 Several contexts:** a user who is both a Student and a CMB member of one or more clubs
    picks a workspace; the choice is remembered and can be switched at any time.
  - **A2 Returning user:** the StudentProfile is re-synced from the OAuth payload, and a changed
    display name or avatar is updated without touching the role set.
- **Exceptions:**
  - **E1** email outside the allowed domain → access denied, nothing is created;
  - **E2** the account is locked in UC03 → denied, and the attempt is audited;
  - **E3** Google OAuth is unreachable or returns an error → an error is shown, no session is
    created, no partial User is written.
- **Postconditions:** A valid session exists; the StudentProfile is in sync; the sign-in is
  audited.
- **Business Rules:** BR32. UCMS stores no password of its own, and no local sign-in path exists.
- **Output:** Session, User, StudentProfile, audit record.
- **Related UC:** UC02, UC03, UC04
- **Pain Point:** BP19
- **Phase:** 1

## UC02 – Open my role dashboard

- **Primary Actor:** All
- **Module:** M01 (reads M02–M12)
- **Business Goal:** One screen per role answering two questions — what needs my action, and
  what happened to what I submitted.
- **Trigger:** The user lands in a workspace after UC01, or returns to it.
- **Preconditions:** A valid session (UC01).
- **Main Flow:**
  1. The system resolves the caller's role and club context.
  2. The system loads the items owned by that role: pending actions, deadlines, states.
  3. The system renders the role-specific content:
     - **ICPDP:** pending approvals by type and age, clubs by state, overdue reports,
       unreconciled budgets, open cases, upcoming bookings;
     - **CMB:** our submissions and their states, upcoming deadlines, the event and booking
       calendar, roster size, budget position, feedback awaiting review;
     - **Student:** my applications and their states, my registrations, my check-in history,
       my memberships, my complaints.
  4. The user opens any item, which continues into that item's own use case.
- **Alternative Flows:**
  - **A1 Empty state:** a user with nothing pending sees the entry points for their role
    (UC06 for a student, UC25/UC47 for CMB) instead of an empty list.
  - **A2 Context switch:** a user holding several club contexts switches club without
    re-authenticating.
- **Exceptions:** **E1** a source module is unavailable → that panel reports the failure; the
  rest of the dashboard still renders.
- **Postconditions:** None. No state transition happens here.
- **Business Rules:** Read-only. Every figure is a live query against the owning module, never a
  second copy of the data. A user sees only the clubs and records their role grants.
- **Output:** The rendered dashboard; no persisted data.
- **Related UC:** all — every use case is reached from here
- **Pain Point:** BP01, BP14, and the "track application status" responsibility of §4
- **Phase:** 1

## UC03 – Manage accounts and role assignments

- **Primary Actor:** ICPDP Officer
- **Module:** M01
- **Business Goal:** Control who may act in the system, independently of who may sign in to it.
- **Trigger:** A new officer joins, a role must be revoked, or an account must be locked.
- **Preconditions:** The caller holds the account-administration permission.
- **Input:** The target user, the role to grant or revoke, the club context where the role is
  club-scoped, the reason for a lock or an unlock.
- **Main Flow:**
  1. The officer searches for the user by email or name.
  2. The system shows the user's current roles, club contexts and account state.
  3. The officer grants or revokes an ICPDP or CMB role, or locks or unlocks the account.
  4. The officer enters a reason where the change is a lock, an unlock or a revocation.
  5. The system applies the change, invalidates the affected sessions and writes the audit record.
- **Alternative Flows:**
  - **A1 Emergency lock:** an account is locked without a role change when a case (UC42) requires
    it; the lock and the case are linked.
- **Exceptions:**
  - **E1** the officer attempts to revoke their own last administrative role → refused;
  - **E2** the target holds a confirmed board position → the system warns that UC10/UC11 is the
    correct path, and records the override if the officer proceeds.
- **Postconditions:** The role set or the account state is changed and audited; a locked account
  is refused at UC01 (E2 there).
- **Business Rules:** A CMB role granted here is subordinate to the board confirmed in UC11 and
  is revoked automatically when a term closes (UC13). The hierarchy inside ICPDP is expressed as
  permissions, never as a new actor. BR19's "special role" is granted here.
- **Output:** Role assignment, account state, audit record.
- **Related UC:** UC01, UC11, UC13, UC42
- **Phase:** 1

## UC04 – Configure institutional policy and deadlines

- **Primary Actor:** ICPDP Officer
- **Module:** M01
- **Business Goal:** Change a business rule without a release.
- **Trigger:** A university regulation changes, or a new academic period starts.
- **Preconditions:** The caller holds the policy-configuration permission.
- **Input:**
  - the allowed email domain (BR32);
  - the minimum number of founding members (BR03);
  - the mandatory establishment documents (BR02);
  - report deadlines and reminder offsets (BR20, §19);
  - the conflict threshold (BR15);
  - the feedback window and the minimum respondent count (BR36, BR40);
  - the overbooking policy (BR33);
  - the enforcement switches (BR21).
- **Main Flow:**
  1. The officer opens the policy set for the current period.
  2. The officer edits one or more values.
  3. The system validates each value and rejects an inconsistent combination.
  4. The officer confirms.
  5. The system stores a new policy version, effective from a stated date, and audits it.
- **Alternative Flows:**
  - **A1 Scheduled change:** a value is given a future effective date and takes effect then.
- **Exceptions:** **E1** a value would invalidate a decision already taken → refused, with the
  affected records listed.
- **Postconditions:** A new policy version is active; decisions already made keep the values
  they were made under.
- **Business Rules:** BR42 — Phase 1 exposes only the list above. Every other rule marked
  "configurable" in §14 ships as a constant in a single policy document and becomes editable
  only when a real need appears (model §14, D2).
- **Output:** Policy version, audit record.
- **Related UC:** UC01, UC07, UC25, UC33, UC40, UC47, UC50
- **Pain Point:** BP14
- **Phase:** 1

## UC05 – Configure the approval routing rules

- **Primary Actor:** ICPDP Officer
- **Module:** M01
- **Business Goal:** Decide which requests need a second level of approval inside ICPDP, without
  hard-coding the thresholds.
- **Trigger:** ICPDP changes its internal delegation of authority.
- **Preconditions:** The caller holds the routing-configuration permission.
- **Input:** Request type, amount threshold, event risk category, property class, club
  compliance history → the required approval level and its SLA.
- **Main Flow:**
  1. The officer opens the routing rule set.
  2. The officer adds or edits a rule: a condition and the approval level it requires.
  3. The system validates that the rules are total and unambiguous — every request matches
     exactly one rule.
  4. The officer activates the rule set.
  5. The system versions and audits it; new requests route through it.
- **Alternative Flows:**
  - **A1 Simulation:** the officer runs the draft rules against the last N decided requests and
    sees which would have needed a second level.
- **Exceptions:** **E1** two rules overlap or a request type has no rule → activation refused.
- **Postconditions:** An active routing rule set exists; UC08, UC26, UC36 and UC48 consult it.
- **Business Rules:** This is the use case Signature Feature 1 lacked in v1. Until it ships,
  every decision in the system is single-level and BR16 is inactive (model §11). Whether the
  second level is a permission or a fourth actor is open decision D1.
- **Output:** Routing rule set, audit record.
- **Related UC:** UC08, UC26, UC36, UC48
- **Phase:** 2

---

# M02 / M03 — Club Lifecycle, Governance & Term

## UC06 – Discover clubs and open activity

- **Primary Actor:** Student
- **Module:** M02
- **Business Goal:** Let a student find a club, a campaign or an event worth joining — the entry
  point of the whole product.
- **Trigger:** The student wants to join a club or attend an activity.
- **Preconditions:** A valid session (UC01).
- **Input:** Search keyword, field, activity type.
- **Main Flow:**
  1. The student browses or searches the active clubs by field or keyword.
  2. The system lists the matching clubs with their state and a summary.
  3. The student opens a club page: profile, board, activity history, open campaigns, upcoming
     public events.
  4. The student continues into UC17 (apply) or UC29 (register).
- **Alternative Flows:**
  - **A1 Event-first:** the student browses upcoming public events across all clubs and reaches
    the club from the event.
- **Exceptions:** **E1** no club matches → the system suggests removing filters and shows the
  newest active clubs.
- **Postconditions:** None; no state changes.
- **Business Rules:** Only `Active` clubs are listed. A `Suspended` club is visible but marked
  and shows no open campaign (BR09). A `Dissolved` club is not listed.
- **Output:** None persisted.
- **Related UC:** UC16, UC17, UC27, UC29
- **Phase:** 1

## UC07 – Submit a club establishment application

- **Primary Actor:** Student
- **Module:** M02
- **Business Goal:** Let students propose a new club through one standard, traceable process.
- **Trigger:** A group of students wants to found a club.
- **Preconditions:** Signed in, and eligible under the policy configured in UC04.
- **Input:** Club name, field, objectives; the founding members; the mandatory documents.
- **Main Flow:**
  1. The student enters the club name, field and objectives.
  2. The student declares the founding members.
  3. The student uploads the mandatory documents (BR02).
  4. The system validates completeness and the minimum founding headcount (BR03).
  5. The student confirms.
  6. The system creates version 1 of the application.
  7. The state moves to `Submitted`.
  8. ICPDP receives a review task, visible in UC02.
- **Alternative Flows:**
  - **A1 Draft:** the student saves the application as `Draft` and continues later.
  - **A2 Resubmit after revision (v1 UC05):** from `Revision Requested`, the student edits the
    flagged sections and resubmits; the system creates a **new version** and returns the
    application to `Under Review`. The previous version stays readable.
- **Exceptions:**
  - **E1** a mandatory document is missing → submission refused, the application stays `Draft`;
  - **E2** fewer founding members than BR03 allows → refused;
  - **E3** a club with the same name is already active → warning, and the officer decides in UC08.
- **Postconditions:** The application is `Submitted`, with an immutable version and a review task.
- **Business Rules:** BR02, BR03, BR04 — a submitted version is never overwritten.
- **Output:** ClubApplication, ApplicationVersion, ApprovalTask, notification.
- **Related UC:** UC08, UC02
- **Pain Point:** BP04
- **Phase:** 1

## UC08 – Assess and decide the club establishment application

- **Primary Actor:** ICPDP Officer
- **Module:** M02
- **Business Goal:** One review session that ends in one of three outcomes, with the reasoning
  on the record.
- **Trigger:** A review task from UC07.
- **Preconditions:** The application is `Submitted`; the caller holds the review permission.
- **Input:** The officer's assessment notes, the flagged sections, the decision and its reason.
- **Main Flow:**
  1. The officer opens the application; the state moves to `Under Review`.
  2. The officer checks the club information, the founding members, the documents and the
     version history.
  3. The officer records the assessment note, including any opinion gathered outside the system.
  4. The officer chooses one outcome:
     - **Request revision** — mark the sections that fall short, enter structured comments, set a
       deadline → `Revision Requested`, the applicant is notified;
     - **Approve** → `Approved`; a Club is created in `Pending Setup`;
     - **Reject** — a reason is mandatory → `Rejected`; no Club is created.
  5. The system writes the audit record and notifies the applicant.
- **Alternative Flows:**
  - **A1 Second level (Phase 2):** when the routing rules of UC05 require it, the decision is
    escalated inside ICPDP before it takes effect.
- **Exceptions:**
  - **E1** the applicant withdraws while the application is under review → the review closes as
    `Withdrawn`;
  - **E2** the revision deadline passes with no resubmission → the application is closed as
    `Expired`, and the applicant may start a new one.
- **Postconditions:** The application is `Revision Requested`, `Approved` or `Rejected`; on
  approval a Club exists in `Pending Setup` and its founding board can be nominated in UC10.
- **Business Rules:** BR05 — actor, timestamp and, where applicable, the reason are stored for
  every outcome. ICPDP never edits the applicant's data on their behalf. The decision history
  stays attached to the application and is read here, which is what satisfies BP15 without a
  dedicated audit use case. BR31 — ICPDP is the only approval authority.
- **Output:** ApprovalDecision, Club (on approval), audit record, notification.
- **Related UC:** UC07, UC09, UC10, UC05
- **Pain Point:** BP04, BP15
- **Phase:** 1

## UC09 – Configure the club profile and organization structure

- **Primary Actor:** CMB
- **Module:** M02 / M03
- **Business Goal:** Complete the operating information of a recognized club and model its
  internal units.
- **Trigger:** The club is created in `Pending Setup`, or its structure changes.
- **Preconditions:** The club exists; the caller holds the club-administration permission.
- **Input:** Description, contact, charter, communication channels, operating scope; boards,
  departments, and the positions each may hold.
- **Main Flow:**
  1. The CMB member opens the club profile.
  2. The member completes or edits the operating information.
  3. The member defines the internal structure — boards, departments, positions.
  4. The system validates against the university template where one applies.
  5. The member saves; the system audits the change.
- **Alternative Flows:**
  - **A1 Template:** the club adopts the university's default structure and edits from there.
- **Exceptions:**
  - **E1** an institutional field is edited → refused; those fields belong to ICPDP;
  - **E2** a position held by an active membership is deleted → refused until UC23 reassigns it.
- **Postconditions:** The club profile and structure are current; the club can leave
  `Pending Setup` once UC11 confirms its board.
- **Business Rules:** Institutional fields are editable by ICPDP only. The structure may be
  constrained by a university template.
- **Output:** Club profile, Position and Department records, audit record.
- **Related UC:** UC10, UC23, UC11
- **Phase:** 1

## UC10 – Nominate the club management board

- **Primary Actor:** CMB
- **Module:** M03
- **Business Goal:** Propose the leadership of a term for confirmation.
- **Trigger:** A club is newly approved, a term begins, or a board seat falls vacant.
- **Preconditions:** The club exists; the nominees are members (or founding members, for the
  first board).
- **Input:** Member, position, term start and end.
- **Main Flow:**
  1. The member opens the board nomination for a term.
  2. For each seat, the member picks a member and a position defined in UC09.
  3. The system checks eligibility (BR07) and overlap (BR06).
  4. The member submits the nomination.
  5. The state moves to `Pending Confirmation`; ICPDP receives a task.
- **Alternative Flows:**
  - **A1 Partial board:** only the vacant seats are nominated; the confirmed seats are untouched.
- **Exceptions:**
  - **E1** a nominee is ineligible under BR07 → the seat is refused;
  - **E2** the nominee already holds an overlapping President term → refused unless policy allows
    it (BR06).
- **Postconditions:** The nomination is `Pending Confirmation`.
- **Business Rules:** BR06, BR07. A founding application approved in UC08 nominates its first
  board here.
- **Output:** Board nomination, ApprovalTask, notification.
- **Related UC:** UC11, UC09
- **Pain Point:** BP03
- **Phase:** 1

## UC11 – Confirm the management board

- **Primary Actor:** ICPDP Officer
- **Module:** M03
- **Business Goal:** Grant management authority to a named board for a named term.
- **Trigger:** A nomination task from UC10.
- **Preconditions:** The nomination is `Pending Confirmation`.
- **Input:** The decision and its reason.
- **Main Flow:**
  1. The officer opens the nomination.
  2. The officer checks eligibility, conflicts of interest and the term dates.
  3. The officer approves or rejects, with a reason where required.
  4. On approval the system activates the board, grants the matching permissions and lets the
     club leave `Pending Setup`.
  5. The system audits the decision and notifies the club.
- **Alternative Flows:**
  - **A1 Partial confirmation:** individual seats are confirmed and others returned for
    re-nomination.
- **Exceptions:** **E1** the nominee's membership ended between nomination and confirmation →
  the seat is returned to UC10.
- **Postconditions:** The board is active for the term; permissions are in force; the club is
  `Active` if this was its founding board.
- **Business Rules:** BR05, BR07. Permissions come from this confirmation, not from UC03.
- **Output:** ClubTerm, Position assignments, permissions, audit record.
- **Related UC:** UC10, UC03, UC13
- **Pain Point:** BP03
- **Phase:** 1

## UC12 – Plan the leadership transition

- **Primary Actor:** CMB
- **Module:** M03
- **Business Goal:** Prepare a handover that carries its obligations instead of dropping them.
- **Trigger:** The term is approaching its end.
- **Preconditions:** An active term exists.
- **Input:** The new term; the leadership candidates; outstanding events; outstanding budget;
  incomplete reports; assets and responsibilities to hand over.
- **Main Flow:**
  1. The outgoing board opens the transition plan.
  2. The system preloads the outstanding obligations from M05, M07 and M08.
  3. The board names the candidates for the new term and completes the handover list.
  4. The board submits the plan → `Pending Confirmation`.
- **Alternative Flows:**
  - **A1 Early transition:** the plan is submitted before the term ends, with a stated reason.
- **Exceptions:** **E1** an obligation has no owner in the new board → the plan cannot be
  submitted until one is named.
- **Postconditions:** The transition plan is `Pending Confirmation`.
- **Business Rules:** Obligations stay attached to the club, never to the departing individuals.
- **Output:** Transition plan, ApprovalTask.
- **Related UC:** UC13, UC10
- **Pain Point:** BP03
- **Phase:** 2

## UC13 – Confirm the leadership transition

- **Primary Actor:** ICPDP Officer
- **Module:** M03
- **Business Goal:** Transfer authority without losing accountability.
- **Trigger:** A transition task from UC12.
- **Preconditions:** The transition plan is `Pending Confirmation`.
- **Main Flow:**
  1. The officer reviews the plan and the outstanding obligations.
  2. The officer approves or returns the plan.
  3. On approval the system closes the old term, activates the new one, revokes the previous
     permissions, grants the new ones and persists the history.
  4. The system audits the transfer and notifies both boards.
- **Alternative Flows:**
  - **A1 Conditional approval:** the transition is approved with obligations flagged for
    follow-up, which appear on the new board's UC02.
- **Exceptions:** **E1** the club is `Suspended` → the transition is held until UC15 reactivates
  the club.
- **Postconditions:** The new term is active; the old term is closed and readable; permissions
  reflect the new board.
- **Business Rules:** BR08 — new permissions take effect only once the transition is confirmed.
- **Output:** ClubTerm history, permissions, audit record.
- **Related UC:** UC12, UC03, UC11
- **Pain Point:** BP03
- **Phase:** 2

## UC14 – Request club activity suspension

- **Primary Actor:** CMB
- **Module:** M02
- **Business Goal:** Let a club pause legitimately instead of going quiet.
- **Trigger:** The club cannot operate for a period.
- **Preconditions:** The club is `Active`.
- **Input:** Reason, expected duration, outstanding obligations, recovery plan.
- **Main Flow:**
  1. The board opens the suspension request.
  2. The board states the reason, the period and how the outstanding obligations will be handled.
  3. The board submits; ICPDP receives a task.
- **Exceptions:** **E1** an approved event or booking falls inside the requested period → it must
  first be cancelled through UC28 or UC49.
- **Postconditions:** The request awaits the decision in UC15.
- **Output:** Suspension request, ApprovalTask.
- **Related UC:** UC15
- **Phase:** 2

## UC15 – Suspend, reactivate or dissolve a club

- **Primary Actor:** ICPDP Officer
- **Module:** M02
- **Business Goal:** Control the club lifecycle from one place, with the reason on the record.
- **Trigger:** A request (UC14), inactivity, a case outcome (UC42), or policy.
- **Preconditions:** The club exists; the caller holds the lifecycle permission.
- **Input:** The target state, the reason, the effective date, the period for a suspension.
- **Main Flow:**
  1. The officer opens the club and reviews its state, obligations and history.
  2. The officer chooses `Suspend`, `Reactivate` or `Dissolve` and enters the reason.
  3. The system applies the state change and its consequences:
     - **Suspend** — new campaigns, event proposals and bookings are blocked; approved future
       events and bookings are cancelled through UC28 and UC49;
     - **Reactivate** — the club returns to `Active` with its history intact;
     - **Dissolve** — the governance history is archived and management access is revoked.
  4. The system audits the decision and notifies the club.
- **Alternative Flows:**
  - **A1 From a case:** the decision is taken as the corrective action of a case (UC42) and
    linked to it.
- **Exceptions:** **E1** dissolution is requested while a budget is unreconciled → the officer is
  warned and the reconciliation obligation is recorded before the archive.
- **Postconditions:** The club is `Suspended`, `Active` or `Dissolved`; the reason and the actor
  are stored.
- **Business Rules:** BR09, BR10, BR34 — a `Suspended` club opens no campaign, submits no event
  proposal and receives no new booking.
- **Output:** Club state, audit record, notifications, cancelled events and bookings.
- **Related UC:** UC14, UC42, UC28, UC49, UC02
- **Pain Point:** BP01
- **Phase:** 1

---

# M04 — Recruitment & Membership

## UC16 – Create and publish a recruitment campaign

- **Primary Actor:** CMB
- **Module:** M04
- **Business Goal:** Recruit members through one linked process instead of a standalone form.
- **Trigger:** The club needs members for a term or a department.
- **Preconditions:** The club is `Active` (BR01); the caller holds the recruitment permission.
- **Input:** Positions sought, criteria, application window, capacity, selection steps, the
  application form fields.
- **Main Flow:**
  1. The member creates the campaign and states the positions and criteria.
  2. The member sets the application window and the capacity.
  3. The member defines the selection steps and the application form.
  4. The system validates the window against the academic calendar policy.
  5. The member publishes → `Published`; the campaign appears in UC06.
- **Alternative Flows:**
  - **A1 Draft:** the campaign is saved as `Draft` and published later.
  - **A2 Cancel:** a published campaign with no application is cancelled; with applications, it
    is closed and the applicants are notified.
- **Exceptions:**
  - **E1** the club is `Suspended` → refused (BR09);
  - **E2** an overlapping campaign for the same positions already exists → warning, and the
    member confirms or merges.
- **Postconditions:** The campaign is `Published` and accepts applications inside its window.
- **Business Rules:** BR01, BR09, BR11.
- **Output:** RecruitmentCampaign, notification to followers.
- **Related UC:** UC06, UC17, UC18
- **Pain Point:** BP11
- **Phase:** 1

## UC17 – Submit a club membership application

- **Primary Actor:** Student
- **Module:** M04
- **Business Goal:** Apply to a club through a channel that is linked to the membership it leads to.
- **Trigger:** The student finds an open campaign in UC06.
- **Preconditions:** The campaign is inside its application window; the student is eligible.
- **Input:** The campaign, the position applied for, the form answers, attachments.
- **Main Flow:**
  1. The student picks a campaign.
  2. The student fills in the form and attaches what the campaign asks for.
  3. The system validates eligibility, the window (BR11) and duplication (BR12).
  4. The student submits → `Submitted`.
  5. The club receives the application; the student tracks it in UC02.
- **Alternative Flows:**
  - **A1 Draft:** the application is saved and completed before the window closes.
  - **A2 Withdraw:** the student withdraws an application that has not been decided.
- **Exceptions:**
  - **E1** the window has closed → refused;
  - **E2** the student already applied to this campaign → refused (BR12);
  - **E3** the student already holds an active membership of this club → refused (BR13).
- **Postconditions:** The application is `Submitted` and visible to the club.
- **Business Rules:** BR11, BR12, BR13.
- **Output:** RecruitmentApplication, notification.
- **Related UC:** UC18, UC02, UC06
- **Pain Point:** BP11
- **Phase:** 1

## UC18 – Screen and decide membership applications

- **Primary Actor:** CMB
- **Module:** M04
- **Business Goal:** Take a campaign's applications from `Submitted` to a decision in one
  session, with the reasoning kept.
- **Trigger:** The application window closes, or applications accumulate.
- **Preconditions:** The campaign has applications; the caller holds the recruitment permission.
- **Input:** The screening outcome per application, the decision and its reason.
- **Main Flow:**
  1. The member opens the campaign's applications and filters them.
  2. The member reviews an application against the criteria → `Screening`.
  3. The member shortlists or rejects it.
  4. For a shortlisted candidate, an evaluation may be attached (UC19).
  5. The member decides: `Accepted`, `Rejected` or `Waitlisted`.
  6. The system records the decision, notifies the candidate and shows it in their UC02.
- **Alternative Flows:**
  - **A1 Bulk action:** several applications are rejected or shortlisted at once, with one shared
    reason.
  - **A2 Promote from waitlist:** a waitlisted candidate is accepted when a place frees up.
- **Exceptions:**
  - **E1** acceptances exceed the campaign capacity → the system blocks the surplus and offers
    the waitlist;
  - **E2** the candidate withdrew (UC17 A2) → the application is closed without a decision.
- **Postconditions:** Every application carries a decision; the accepted ones are eligible for
  UC20.
- **Business Rules:** A rejection reason may be mandatory by policy. Screening and the decision
  are one use case because they are one session on one entity — v1 split them into UC17 and UC19.
- **Output:** Application decisions, notifications.
- **Related UC:** UC17, UC19, UC20
- **Pain Point:** BP11
- **Phase:** 1

## UC19 – Record candidate evaluation

- **Primary Actor:** CMB
- **Module:** M04
- **Business Goal:** Make the selection defensible with a structured assessment.
- **Trigger:** A shortlisted candidate is interviewed or tested.
- **Preconditions:** The application is `Shortlisted`.
- **Input:** Interview result, rubric score per criterion, reviewer comment.
- **Main Flow:**
  1. The reviewer opens the shortlisted application.
  2. The reviewer scores each rubric criterion and adds a comment.
  3. The system stores the evaluation against the application and the reviewer.
  4. The aggregate score is shown in UC18.
- **Alternative Flows:**
  - **A1 Several reviewers:** each reviewer files their own evaluation and the system shows the
    spread.
- **Exceptions:** **E1** the campaign has no rubric → a free-text assessment is recorded instead.
- **Postconditions:** The evaluation is attached to the application and is immutable once the
  decision is taken.
- **Business Rules:** The rubric is configured per campaign.
- **Output:** CandidateEvaluation.
- **Related UC:** UC18
- **Phase:** 2

## UC20 – Onboard accepted candidates

- **Primary Actor:** CMB
- **Module:** M04
- **Business Goal:** Turn an acceptance into a real membership record.
- **Trigger:** The candidate accepts the offer, or the club confirms the acceptance.
- **Preconditions:** The application is `Accepted`.
- **Input:** Join date, default role, department.
- **Main Flow:**
  1. The member opens the accepted candidates of the campaign.
  2. The member confirms the acceptance.
  3. The system creates the ClubMembership with a default role and a join date → `Active`.
  4. The application moves to `Onboarded`.
  5. The new member gains access to UC24.
- **Alternative Flows:**
  - **A1 Manual onboarding:** an authorized member creates a membership without a campaign, with
    a reason recorded (BR13).
  - **A2 Declined offer:** the candidate declines; the application is closed and the place returns
    to the waitlist.
- **Exceptions:** **E1** an active membership already exists for that student and club → refused.
- **Postconditions:** An active ClubMembership exists; the roster count changes.
- **Business Rules:** BR13 — a membership comes only from an accepted candidate or an authorized
  manual onboarding; no duplicate active membership.
- **Output:** ClubMembership, notification.
- **Related UC:** UC18, UC21, UC24
- **Pain Point:** BP02, BP11
- **Phase:** 1

## UC21 – Manage membership status

- **Primary Actor:** CMB
- **Module:** M04
- **Business Goal:** Keep the roster true at any point in time, including ending a membership.
- **Trigger:** A member goes on leave, stops participating, is removed, or asked to leave (UC22).
- **Preconditions:** The membership exists; the caller holds the membership permission.
- **Input:** The new status, the effective date, the reason for a removal.
- **Main Flow:**
  1. The member opens the roster.
  2. The member changes a membership's status — `Active`, `On Leave`, `Inactive`, `Ended`.
  3. The member enters the effective date and, for a removal, a mandatory reason.
  4. The system applies the change, revokes any position held (UC23) and audits it.
  5. The affected member is notified and sees the change in UC24.
- **Alternative Flows:**
  - **A1 Execute a withdrawal:** the change carries out the request the student filed in UC22 and
    links to it.
  - **A2 Bulk end of term:** memberships that were not renewed are ended together with one reason.
- **Exceptions:**
  - **E1** the member holds a confirmed board position → the status cannot be ended until
    UC10/UC11 replaces them;
  - **E2** a backdated effective date would change an already finalized attendance or evaluation
    → refused.
- **Postconditions:** The membership carries the new status with its effective date, and the
  history is readable.
- **Business Rules:** Every change carries an effective date; a removal is always attributable.
  Ending a membership lives here whoever initiated it — this is what removes v1 UC23's two
  primary actors.
- **Output:** Membership status history, audit record, notification.
- **Related UC:** UC20, UC22, UC23
- **Pain Point:** BP02
- **Phase:** 1

## UC22 – Request to leave a club

- **Primary Actor:** Student
- **Module:** M04
- **Business Goal:** Let a member end their membership on the record instead of disappearing.
- **Trigger:** The member no longer wants to take part.
- **Preconditions:** An active membership.
- **Input:** Reason, requested effective date.
- **Main Flow:**
  1. The student opens the membership in UC24.
  2. The student requests withdrawal with a reason and a date.
  3. The club is notified and executes it in UC21.
  4. The student tracks the request in UC02.
- **Exceptions:** **E1** the student holds a confirmed board position → the request is accepted
  but takes effect only once UC10/UC11 replaces them.
- **Postconditions:** A withdrawal request is pending; the membership changes only in UC21.
- **Business Rules:** The student initiates, the club executes — one actor per use case.
- **Output:** Withdrawal request, notification.
- **Related UC:** UC21, UC24
- **Pain Point:** BP02
- **Phase:** 2

## UC23 – Assign positions inside the club

- **Primary Actor:** CMB
- **Module:** M03 / M04
- **Business Goal:** Give internal authority to members below board level.
- **Trigger:** The club fills a department head, treasurer or coordinator seat.
- **Preconditions:** The member is `Active`; the position is defined in UC09.
- **Input:** Member, position, effective period.
- **Main Flow:**
  1. The member opens the organization structure.
  2. The member assigns a position to an active member.
  3. The system applies the permissions attached to that position.
  4. The change is audited and visible in UC24.
- **Alternative Flows:**
  - **A1 Sensitive position:** a position marked sensitive is submitted for confirmation through
    UC11 before it takes effect.
- **Exceptions:** **E1** the member is not `Active` → refused; **E2** the position is already
  occupied and is single-holder → refused.
- **Postconditions:** The member holds the position and its permissions.
- **Business Rules:** A position exists only if UC09 defined it; a sensitive position requires
  UC11.
- **Output:** Position assignment, permissions, audit record.
- **Related UC:** UC09, UC11, UC21
- **Phase:** 2

## UC24 – Use my member workspace

- **Primary Actor:** Student (as a member)
- **Module:** M04 (reads M05, M06, M07, M12)
- **Business Goal:** Give membership a reason to exist inside the system — v1 gave a member
  exactly the same use cases as a non-member.
- **Trigger:** The member opens a club they belong to.
- **Preconditions:** An active membership in that club.
- **Main Flow:**
  1. The student opens a club where they hold a membership.
  2. The system shows: the membership record and position; the club roster and board; the club's
     upcoming events with the student's registration state; their attendance history; their
     outstanding obligations — feedback not yet submitted, a pending withdrawal.
  3. The student continues into UC29 (register), UC31 (check in), UC50 (feedback) or UC22
     (leave).
- **Alternative Flows:**
  - **A1 Several clubs:** the student switches between the clubs they belong to.
- **Exceptions:** **E1** the membership ends → access drops back to the public view of UC06.
- **Postconditions:** None; read-only.
- **Business Rules:** Scoped to clubs with an active membership. It introduces no new entity and
  no new data — every field is already produced by another use case. Internal messaging, chat and
  file sharing stay out of scope (§5.2).
- **Output:** None persisted.
- **Related UC:** UC20, UC22, UC29, UC31, UC50
- **Pain Point:** BP02
- **Phase:** 1

---

# M05 — Event & Activity

## UC25 – Submit an event proposal

- **Primary Actor:** CMB
- **Module:** M05
- **Business Goal:** Request permission to hold an event through one traceable workflow.
- **Trigger:** The club plans an activity.
- **Preconditions:** The club is `Active` (BR10) and the caller holds the event permission.
- **Input:** Objective, time, venue, audience, capacity, plan, risk category, budget estimate,
  facility needs.
- **Main Flow:**
  1. The member enters the proposal.
  2. The system validates completeness and the lead time required by policy.
  3. The system evaluates the conflict rule BR15 and shows `No Conflict`, `Warning` or
     `Blocking Conflict`.
  4. The member optionally attaches a property booking request (UC47).
  5. The member submits → `Pending Approval`.
  6. ICPDP receives a review task.
- **Alternative Flows:**
  - **A1 Draft:** the proposal is saved as `Draft`.
  - **A2 Resubmit after revision (v1 UC28):** from `Revision Requested`, the member edits and
    resubmits; the system creates a **new revision** and returns the proposal to `Under Review`.
    The previous revision is never overwritten.
  - **A3 Recurring activity:** a series is submitted as one proposal with its occurrences listed.
- **Exceptions:**
  - **E1** a blocking conflict while policy forbids overlap → submission refused;
  - **E2** a mandatory report is overdue and BR21 enforcement is on → refused, with the
    obligation named;
  - **E3** the club is `Suspended` → refused (BR10).
- **Postconditions:** The proposal is `Pending Approval` with an immutable revision; a review
  task exists.
- **Business Rules:** BR10, BR15, BR21. Conflict detection is a rule evaluated here, not a use
  case (v1 counted it as UC25 with `System` as its actor).
- **Output:** EventProposal, revision, ApprovalTask, optional PropertyBooking request.
- **Related UC:** UC26, UC47, UC04
- **Pain Point:** BP05, BP06
- **Phase:** 1

## UC26 – Assess and decide the event proposal

- **Primary Actor:** ICPDP Officer
- **Module:** M05
- **Business Goal:** One review session ending in one of three outcomes, with the university's
  reasoning on the record.
- **Trigger:** A review task from UC25.
- **Preconditions:** The proposal is `Pending Approval`.
- **Input:** The review note, the structured comments, the decision and its reason.
- **Main Flow:**
  1. The officer opens the proposal → `Under Review`.
  2. The officer reviews compliance, the venue, the time, the budget estimate, the risk
     category, the club's overdue obligations and the attached booking request.
  3. The officer records the review note, including any Facility, Security or Finance opinion
     gathered outside the system.
  4. The officer chooses one outcome:
     - **Request revision** — structured comments are mandatory → `Revision Requested`;
     - **Approve** → `Approved`;
     - **Reject** — a reason is mandatory → `Rejected`.
  5. The system audits the decision and notifies the club.
- **Alternative Flows:**
  - **A1 Second level (Phase 2):** a high-risk or large event routes to a second ICPDP level per
    UC05 and BR16.
  - **A2 Approve with conditions:** the approval carries conditions that the club must meet; they
    are checked again in UC34.
- **Exceptions:**
  - **E1** the club is suspended between submission and decision → the proposal is closed;
  - **E2** the revision deadline passes → the proposal expires and must be resubmitted as new.
- **Postconditions:** The proposal is `Revision Requested`, `Approved` or `Rejected`; only an
  approved event can be published in UC27.
- **Business Rules:** BR05, BR14, BR31. Approving a proposal that carries a booking request does
  **not** approve the booking — UC48 decides it separately.
- **Output:** ApprovalDecision, audit record, notification.
- **Related UC:** UC25, UC27, UC48, UC05
- **Pain Point:** BP05, BP15
- **Phase:** 1

## UC27 – Publish the event and open registration

- **Primary Actor:** CMB
- **Module:** M05
- **Business Goal:** Let the audience see the event and take part.
- **Trigger:** The event is approved.
- **Preconditions:** The event is `Approved` (BR14).
- **Input:** Registration window, public description, audience scope, capacity.
- **Main Flow:**
  1. The member opens the approved event.
  2. The member sets the registration window, the audience scope and the public details.
  3. The member publishes → `Open for Registration`.
  4. The event appears in UC06 and UC24; the registration window is enforced in UC29.
- **Alternative Flows:**
  - **A1 Members-only event:** the audience scope is limited to club members, and only UC24 shows
    it.
  - **A2 No registration:** an open-attendance event is published without a registration window;
    check-in still applies.
- **Exceptions:** **E1** the event is not `Approved` → refused (BR14); **E2** the registration
  window ends after the event starts → refused.
- **Postconditions:** The event is `Open for Registration` and publicly visible.
- **Business Rules:** BR14, BR17. The scheduler moves the event to `Ongoing` and `Completed` from
  its own times (model §7).
- **Output:** Published Event, notifications.
- **Related UC:** UC26, UC29, UC06, UC24
- **Pain Point:** BP05
- **Phase:** 1

## UC28 – Cancel or reschedule an event

- **Primary Actor:** CMB
- **Module:** M05
- **Business Goal:** Change an approved event without losing its trail or leaking a booked room.
- **Trigger:** The club cannot hold the event as approved.
- **Preconditions:** The event is `Approved`, `Open for Registration` or `Ongoing`.
- **Input:** The reason; for a reschedule, the new time and venue.
- **Main Flow:**
  1. The member opens the event and chooses `Cancel` or `Reschedule`.
  2. The member enters the reason.
  3. For a reschedule, the system re-evaluates BR15 and, where policy requires it, returns the
     event to UC26 for a fresh decision.
  4. The system updates or releases the linked property booking (UC49).
  5. The system notifies every registrant.
  6. The system recomputes the report and budget obligations.
- **Alternative Flows:**
  - **A1 Cancelled by a lifecycle decision:** the cancellation is the consequence of UC15
    (suspension) or UC42 (case outcome), and is linked to it. This is what removes v1 UC35's
    second primary actor.
- **Exceptions:**
  - **E1** the event already has finalized attendance → cancellation is refused; the event is
    closed through UC33 and UC34 instead;
  - **E2** the cancellation falls inside the configured notice period → it is recorded as a
    compliance signal for UC42.
- **Postconditions:** The event is `Cancelled`, or rescheduled with its booking and registrants
  updated; the reason is audited.
- **Business Rules:** BR35 — cancelling an event releases its approved booking. Open decision D4
  governs whether a reschedule needs a fresh UC26 decision.
- **Output:** Event state, released booking, notifications, audit record.
- **Related UC:** UC27, UC49, UC42, UC15
- **Phase:** 1

---

# M06 — Registration & Attendance

## UC29 – Register for an event

- **Primary Actor:** Student
- **Module:** M06
- **Business Goal:** Record participants against the event itself, not in a separate form.
- **Trigger:** The student finds a published event in UC06 or UC24.
- **Preconditions:** The event is `Open for Registration` and inside its window.
- **Input:** The event, and any answer the event's registration form asks for.
- **Main Flow:**
  1. The student opens the event and chooses to register.
  2. The system validates the window, eligibility, duplication and capacity.
  3. The system creates the registration → `Confirmed`.
  4. The student sees it in UC02 and UC24 and receives a confirmation.
- **Alternative Flows:**
  - **A1 Waitlist (Phase 2):** the event is full and the waitlist is enabled → `Waitlisted`
    (UC30).
  - **A2 Cancel registration:** the student cancels before the event starts, which frees the
    place.
- **Exceptions:**
  - **E1** the window has closed → refused;
  - **E2** capacity is reached and no waitlist exists → registration closes and the student is
    told;
  - **E3** the student is not in the event's audience scope → refused.
- **Postconditions:** A registration exists in `Confirmed` or `Waitlisted`.
- **Business Rules:** BR17 — confirmed registrations never exceed capacity unless policy allows
  overbooking. Without UC30, reaching capacity simply closes registration.
- **Output:** EventRegistration, notification.
- **Related UC:** UC27, UC30, UC31
- **Pain Point:** BP07
- **Phase:** 1

## UC30 – Manage capacity and the waitlist

- **Primary Actor:** CMB
- **Module:** M06
- **Business Goal:** Fill the room when registrations churn.
- **Trigger:** A place frees up, or the club changes the capacity.
- **Preconditions:** The event is `Open for Registration` and has a waitlist.
- **Main Flow:**
  1. The member opens the event's registration list.
  2. The member adjusts the capacity or promotes a waitlisted student.
  3. The system applies the configured promotion policy and notifies those affected.
- **Alternative Flows:**
  - **A1 Automatic promotion:** a cancellation promotes the first waitlisted student without
    manual action.
- **Exceptions:** **E1** the capacity is reduced below the confirmed count → the system refuses
  and names the registrations that would have to be cancelled.
- **Postconditions:** The confirmed list matches the capacity; the waitlist order is preserved.
- **Business Rules:** BR17. Promotion follows the configured policy, never manual preference
  without a record.
- **Output:** Registration states, notifications.
- **Related UC:** UC29
- **Phase:** 2

## UC31 – Check in to an event

- **Primary Actor:** Student
- **Supporting Actor:** CMB (manual check-in)
- **Module:** M06
- **Business Goal:** Prove attendance at the event where it happens.
- **Trigger:** The participant arrives at the venue.
- **Preconditions:** The event is `Ongoing` or inside the configured check-in window; the student
  holds a confirmed registration, or the event is open-attendance.
- **Input:** The event check-in code or QR, or the participant's identity for a manual check-in.
- **Main Flow:**
  1. The student opens the event and scans or enters the check-in code.
  2. The system verifies the registration and the time window.
  3. The system creates the attendance record with its timestamp.
  4. The feedback window opens for that participant (BR36).
- **Alternative Flows:**
  - **A1 Manual check-in:** a CMB member with the permission checks a participant in by lookup;
    the record stores who performed it.
  - **A2 Walk-in:** an unregistered student is checked in where the event allows it, and a
    registration is created alongside the attendance.
- **Exceptions:**
  - **E1** duplicate check-in → no second record is created, and the first stands (BR18);
  - **E2** outside the check-in window → refused, and a manual check-in with a reason is the only
    route;
  - **E3** no registration for a registration-only event → refused.
- **Postconditions:** Exactly one attendance record exists for that participant and event.
- **Business Rules:** BR18. Student is the primary actor — CMB is supporting, which is what
  removes v1 UC33's two primary actors.
- **Output:** Attendance, feedback window opened.
- **Related UC:** UC29, UC32, UC50
- **Pain Point:** BP07
- **Phase:** 1

## UC32 – Finalize event attendance

- **Primary Actor:** CMB
- **Module:** M06
- **Business Goal:** Produce the official attendance dataset the report and the evaluation rely on.
- **Trigger:** The event has ended.
- **Preconditions:** The event is `Completed`; attendance is not yet finalized.
- **Input:** Corrections to abnormal check-ins, with reasons.
- **Main Flow:**
  1. The member opens the event's attendance list.
  2. The system flags the abnormal records — no-shows, walk-ins, manual check-ins, out-of-window
     entries.
  3. The member corrects or confirms each flagged record, with a reason.
  4. The member finalizes; the system locks the dataset.
- **Alternative Flows:**
  - **A1 Unlock:** a holder of the special role unlocks the dataset with a reason, and the unlock
    is audited (BR19).
- **Exceptions:** **E1** the event was cancelled → there is nothing to finalize.
- **Postconditions:** The official attendance dataset is locked and is an input to UC33 and UC44.
- **Business Rules:** BR18, BR19. Finalization does **not** control the feedback window — BR36
  opened it at check-in, which is the v2 correction to v1 UC54.
- **Output:** Official Attendance dataset, audit record.
- **Related UC:** UC31, UC33, UC44
- **Pain Point:** BP07
- **Phase:** 1

---

# M08 — Event Accountability

## UC33 – Submit the post-event report

- **Primary Actor:** CMB
- **Module:** M08
- **Business Goal:** Close the accountability loop on an approved event.
- **Trigger:** The event is `Completed`, or its report deadline approaches.
- **Preconditions:** Attendance is finalized (UC32).
- **Input:** Actual result against the objective, evidence, incidents, lessons learned.
- **Main Flow:**
  1. The system preloads the approved proposal, the finalized attendance, the budget and the
     expenses, and the feedback summary where UC51 exists.
  2. The member enters the actual result, the incidents and the lessons learned.
  3. The member attaches evidence.
  4. The member submits → `Report Submitted`; ICPDP receives a task.
- **Alternative Flows:**
  - **A1 Draft:** the report is saved and completed before the deadline.
  - **A2 Correction:** a report returned by UC34 is edited and resubmitted as a new version.
- **Exceptions:**
  - **E1** attendance is not finalized → submission refused;
  - **E2** the deadline has passed → the report is still accepted but flagged late, which feeds
    BR21 and the evaluation.
- **Postconditions:** The report is `Report Submitted` with its preloaded figures frozen.
- **Business Rules:** BR20 — the deadline comes from UC04; an overdue report feeds BR21.
- **Output:** Post-event report, ApprovalTask.
- **Related UC:** UC32, UC34, UC38, UC51
- **Pain Point:** BP08
- **Phase:** 1

## UC34 – Assess and close the event report

- **Primary Actor:** ICPDP Officer
- **Module:** M08
- **Business Goal:** Establish whether the approved event actually happened as approved, and end
  its lifecycle.
- **Trigger:** A report task from UC33.
- **Preconditions:** The report is `Report Submitted`.
- **Input:** The assessment note, the decision, the correction request or the finding.
- **Main Flow:**
  1. The officer opens the report and compares plan against actual — attendance, budget,
     objective, conditions attached in UC26.
  2. The officer chooses one outcome:
     - **Accept** → the event is `Closed`;
     - **Return for correction** → the report goes back to UC33;
     - **Record a finding** → the report is accepted with a finding, which opens a case in UC42
       once that ships.
  3. The system audits the decision and notifies the club.
- **Alternative Flows:**
  - **A1 No report filed:** the officer records the failure to report, which feeds BR21 and the
    evaluation.
- **Exceptions:** **E1** the figures contradict the finalized attendance → the officer returns
  the report rather than accepting it.
- **Postconditions:** The event is `Closed`, or the report is back with the club.
- **Business Rules:** BR05, BR21. Until UC42 ships, a serious finding is recorded on the report
  and surfaces in UC02 rather than becoming a case (BR43).
- **Output:** Report decision, event `Closed`, audit record, finding.
- **Related UC:** UC33, UC42, UC44
- **Pain Point:** BP08, BP15
- **Phase:** 1

---

# M07 — Finance & Budget

## UC35 – Submit a budget request

- **Primary Actor:** CMB
- **Module:** M07
- **Business Goal:** Request funding against a stated business purpose.
- **Trigger:** The club needs money for an event, a semester plan or an approved activity.
- **Preconditions:** The club is `Active`; the caller holds the finance permission.
- **Input:** Category, amount, purpose, expected expense lines, the related event or plan.
- **Main Flow:**
  1. The member creates the request and links it to its purpose (BR22).
  2. The member enters the categories, the amounts and the expected expense lines.
  3. The system validates the total and the link to a valid purpose.
  4. The member submits → `Submitted`; ICPDP receives a task.
- **Alternative Flows:**
  - **A1 Draft:** the request is saved and completed later.
  - **A2 Revise and resubmit (v1 UC40):** from `Revision Requested`, the member edits and
    resubmits; **both the version history and the approval history are preserved**.
- **Exceptions:**
  - **E1** no valid purpose is linked → refused (BR22);
  - **E2** a request for the same event and category already exists → warning, and the officer
    decides on duplication in UC36.
- **Postconditions:** The request is `Submitted` with an immutable version.
- **Business Rules:** BR22.
- **Output:** BudgetRequest, version, ApprovalTask.
- **Related UC:** UC36, UC25
- **Pain Point:** BP09
- **Phase:** 1

## UC36 – Assess and decide the budget request

- **Primary Actor:** ICPDP Officer
- **Module:** M07
- **Business Goal:** One funding decision per request, with the amount and the reasoning on the
  record.
- **Trigger:** A task from UC35.
- **Preconditions:** The request is `Submitted`.
- **Input:** The review note, the approved amount, the decision and its reason.
- **Main Flow:**
  1. The officer opens the request → `Under Review`.
  2. The officer reviews eligibility, the available allocation, duplication and the state of the
     related activity.
  3. The officer chooses one outcome:
     - **Request revision** → `Revision Requested`;
     - **Approve** — possibly with an amount lower than requested → `Approved`;
     - **Reject** — a reason is mandatory → `Rejected`.
  4. The system audits the decision and notifies the club.
- **Alternative Flows:**
  - **A1 Second level (Phase 2):** an amount above the threshold routes to a second ICPDP level
    per UC05 and BR16.
  - **A2 Partial approval per category:** individual lines are approved and others rejected, each
    with its reason.
- **Exceptions:**
  - **E1** the related event was rejected or cancelled → the request is closed;
  - **E2** the allocation for the period is exhausted → the officer rejects or defers, with the
    reason recorded.
- **Postconditions:** The request is `Revision Requested`, `Approved` with an approved amount, or
  `Rejected`.
- **Business Rules:** BR05 audit mandatory; the approved amount may differ from the requested
  amount where policy allows.
- **Output:** ApprovalDecision, approved amount, audit record.
- **Related UC:** UC35, UC37, UC05
- **Pain Point:** BP09
- **Phase:** 1

## UC37 – Record disbursement

- **Primary Actor:** ICPDP Officer
- **Module:** M07
- **Business Goal:** Track what was actually released against what was approved.
- **Trigger:** Funds are released to the club.
- **Preconditions:** The request is `Approved`.
- **Input:** Approved amount, disbursed amount, date, payment reference.
- **Main Flow:**
  1. The officer opens the approved request.
  2. The officer records the disbursed amount, the date and the reference.
  3. The system checks the amount against the approval (BR23).
  4. The state moves to `Disbursed`; the club is notified.
- **Alternative Flows:**
  - **A1 Partial disbursement:** several disbursements accumulate against one approval, each
    recorded separately.
- **Exceptions:** **E1** the disbursed total would exceed the approved amount → refused without
  an amendment (BR23).
- **Postconditions:** The disbursed total is known and is an input to UC39.
- **Business Rules:** BR23. Tracking only — this is not an accounting ERP (§5.2). **Phase 1**,
  because without it UC39 computes nothing (BR43).
- **Output:** Disbursement record.
- **Related UC:** UC36, UC39
- **Pain Point:** BP10
- **Phase:** 1

## UC38 – Record an expense with its evidence

- **Primary Actor:** CMB
- **Module:** M07
- **Business Goal:** Track actual spending and substantiate it in the same act.
- **Trigger:** The club spends money.
- **Preconditions:** A related budget or event exists; the caller holds the finance permission.
- **Input:** Category, amount, date, the related budget or event, description; the invoice,
  receipt or proof of payment.
- **Main Flow:**
  1. The member records the expense against its budget line or event.
  2. The member attaches the evidence the category requires (BR25).
  3. The system validates the category against the approval and flags an out-of-category expense
     as an exception (BR24).
  4. The system stores the expense with its evidence.
- **Alternative Flows:**
  - **A1 Evidence later:** the expense is recorded without evidence and appears as *unsupported*
    in UC39 until the evidence arrives.
  - **A2 Correction:** an expense is corrected before reconciliation closes; the change is audited.
- **Exceptions:**
  - **E1** the expense exceeds the remaining approved amount → recorded and flagged as an
    exception;
  - **E2** the evidence does not reference an expense → impossible by construction, which is why
    v1's UC43 and UC44 are one use case here.
- **Postconditions:** The expense exists, supported or unsupported, and feeds UC39.
- **Business Rules:** BR24, BR25. Every piece of evidence references exactly one expense.
- **Output:** Expense, FinancialEvidence.
- **Related UC:** UC37, UC39, UC33
- **Pain Point:** BP09, BP10
- **Phase:** 1

## UC39 – Reconcile budget and spending

- **Primary Actor:** ICPDP Officer
- **Module:** M07
- **Business Goal:** Establish that approved, disbursed, spent and supported are the same story.
- **Trigger:** The activity ends, or the reconciliation deadline arrives.
- **Preconditions:** The request is `Disbursed`; expenses have been recorded.
- **Main Flow:**
  1. The officer opens the budget case.
  2. The system computes: approved, disbursed, recorded expenses, supported expenses,
     unsupported expenses, remaining balance, variance.
  3. The officer reviews the exceptions flagged by UC38.
  4. The officer marks the case `Reconciled`, or `Exception` with the discrepancy stated.
  5. The system audits the outcome; the club sees it in UC02.
- **Alternative Flows:**
  - **A1 Return for evidence:** the officer requests the missing evidence, and the case waits in
    `Reconciliation Pending`.
- **Exceptions:** **E1** the disbursed amount exceeds the approved amount → the case cannot be
  reconciled until an amendment exists (BR23).
- **Postconditions:** The case is `Reconciled` or `Exception`, and can then be `Closed` (BR26).
- **Business Rules:** BR23, BR24, BR26. ICPDP is the only primary actor; CMB reads the same
  figures through UC02, which is what removes v1 UC45's two primary actors.
- **Output:** Reconciliation result, audit record; input to UC44.
- **Related UC:** UC37, UC38, UC44
- **Pain Point:** BP10
- **Phase:** 1

---

# M08 — Reporting & Compliance

## UC40 – Submit the periodic activity report

- **Primary Actor:** CMB
- **Module:** M08
- **Business Goal:** Fulfil the reporting obligation from the data the system already holds.
- **Trigger:** The reporting period ends, or its deadline approaches.
- **Preconditions:** The club is `Active` or `Suspended` with obligations; the period is defined
  in UC04.
- **Input:** The narrative and the evidence the system does not already hold.
- **Main Flow:**
  1. The member opens the report for the period — semester, academic year or a configured period.
  2. The system preloads the events, the membership figures, the attendance and the finance
     position.
  3. The member adds the narrative, the plan for the next period and any external evidence.
  4. The member submits → `Submitted`; ICPDP receives a task.
- **Alternative Flows:**
  - **A1 Draft:** saved and completed before the deadline.
  - **A2 Correction:** a report returned by UC41 is resubmitted as a new version.
- **Exceptions:** **E1** the deadline has passed → still accepted, flagged late, feeding BR21 and
  the evaluation.
- **Postconditions:** The report is `Submitted` with its preloaded figures frozen.
- **Business Rules:** BR20 — deadlines and reminders come from UC04 and §19.
- **Output:** Periodic report, ApprovalTask.
- **Related UC:** UC41, UC04
- **Pain Point:** BP14
- **Phase:** 1

## UC41 – Assess the periodic activity report

- **Primary Actor:** ICPDP Officer
- **Module:** M08
- **Business Goal:** Validate the report so it can serve as evaluation input.
- **Trigger:** A task from UC40.
- **Preconditions:** The report is `Submitted`.
- **Main Flow:**
  1. The officer opens the report and checks it against the system's own figures.
  2. The officer accepts it, or returns it for correction with structured comments.
  3. The system audits the outcome and notifies the club.
- **Alternative Flows:**
  - **A1 Accept with observation:** the report is accepted with an observation recorded for the
    evaluation.
- **Exceptions:** **E1** no report was filed by the deadline → the officer records the failure,
  which feeds BR21 and the evaluation.
- **Postconditions:** An accepted report becomes evaluation input for UC44.
- **Business Rules:** BR05, BR21.
- **Output:** Report decision, audit record.
- **Related UC:** UC40, UC44
- **Pain Point:** BP14
- **Phase:** 1

## UC42 – Manage violation and compliance cases

- **Primary Actor:** ICPDP Officer
- **Module:** M08
- **Business Goal:** Handle a breach as a case with a state, an owner and a trail.
- **Trigger:** An escalated complaint (UC53), a report finding (UC34), an overdue report, a
  financial exception (UC39), an unauthorized event, or a late booking cancellation (UC49).
- **Preconditions:** The caller holds the compliance permission.
- **Input:** Origin, severity, description, evidence, the club concerned, the corrective action.
- **Main Flow:**
  1. The officer opens a case and records its origin and severity (BR27).
  2. The case moves to `Under Investigation`; the officer gathers evidence.
  3. The officer asks the club to respond → `Awaiting Club Response`.
  4. The club responds, in this use case or through UC54 when the origin was a complaint.
  5. The officer issues a decision with a reason and evidence (BR28) → `Decision Issued`.
  6. The officer records the corrective action and its deadline → `Corrective Action`.
  7. Once the action is verified, the case is `Resolved`.
- **Alternative Flows:**
  - **A1 Escalate to the lifecycle:** the corrective action is a suspension or a dissolution,
    taken in UC15 and linked to the case.
  - **A2 Close without action:** the investigation finds no breach; the case closes with the
    reason recorded.
- **Exceptions:** **E1** the club does not respond by the deadline → the officer proceeds and
  records the non-response.
- **Postconditions:** The case is `Resolved` or closed; its history feeds UC44.
- **Business Rules:** BR27, BR28. Every case records its origin, and a case opened from a
  complaint links back to it.
- **Output:** Violation, CorrectiveAction, audit record.
- **Related UC:** UC53, UC34, UC39, UC49, UC15, UC44
- **Pain Point:** BP12
- **Phase:** 2

---

# M09 — Performance Evaluation

## UC43 – Configure the evaluation scheme

- **Primary Actor:** ICPDP Officer
- **Module:** M09
- **Business Goal:** Define how clubs are scored, before anything is scored.
- **Trigger:** A new evaluation period, or a change to the scoring policy.
- **Preconditions:** The caller holds the evaluation-configuration permission.
- **Input:** The dimensions of §17 (D1–D6), their weights, the thresholds per classification, the
  period, the active state.
- **Main Flow:**
  1. The officer creates or opens a scheme version.
  2. The officer sets the dimensions, the weights and the classification thresholds.
  3. The system validates the total weight (BR29).
  4. The officer activates the scheme for a period.
  5. The system versions and audits it.
- **Alternative Flows:**
  - **A1 Clone:** the previous period's scheme is cloned and adjusted.
- **Exceptions:** **E1** the total weight is invalid → activation refused (BR29); **E2** the
  scheme is already used by a published evaluation → a new version is created instead of an edit.
- **Postconditions:** Exactly one scheme is active per period.
- **Business Rules:** BR29, BR30. v1 validated a scheme that no use case configured.
- **Output:** EvaluationScheme version, audit record.
- **Related UC:** UC44
- **Pain Point:** BP13
- **Phase:** 2

## UC44 – Generate the club performance evaluation draft

- **Primary Actor:** ICPDP Officer
- **Module:** M09
- **Business Goal:** Turn a period of operational data into governance data, without manual
  consolidation.
- **Trigger:** The evaluation period closes.
- **Preconditions:** An active scheme (UC43); the period's reports are assessed (UC41).
- **Input:** The period and the clubs in scope.
- **Main Flow:**
  1. The officer starts the generation for a period.
  2. The system collects the inputs: activity (UC26–UC34), attendance (UC32), membership (UC21),
     finance (UC39), reports (UC41), violations (UC42), feedback (UC50), complaint outcomes
     (UC53), booking compliance (UC48, UC49).
  3. The system applies the active scheme and computes a score per dimension with the evidence
     behind each.
  4. The state moves to `Data Ready`.
- **Alternative Flows:**
  - **A1 Single club:** the draft is regenerated for one club after a late correction.
- **Exceptions:** **E1** a data source is incomplete → the dimension is marked
  `Insufficient data` rather than scored as zero.
- **Postconditions:** An evaluation draft exists per club with its evidence and its data lineage.
- **Business Rules:** BR29. The draft is never published without UC45.
- **Output:** Evaluation draft, data lineage.
- **Related UC:** UC43, UC45, UC41, UC39, UC42
- **Pain Point:** BP13
- **Phase:** 2

## UC45 – Review, finalize and publish the evaluation

- **Primary Actor:** ICPDP Officer
- **Module:** M09
- **Business Goal:** Publish an official result that the club can read and contest.
- **Trigger:** A draft is `Data Ready`.
- **Preconditions:** The draft exists for the period.
- **Input:** Anomaly resolutions, the permitted manual dimensions, the final classification.
- **Main Flow:**
  1. The officer reviews the draft and its source data.
  2. The officer handles the anomalies and the `Insufficient data` dimensions.
  3. The officer adds the manual dimensions the scheme permits, with a justification.
  4. The officer finalizes → `Finalized`.
  5. The officer publishes → `Published`; the clubs are notified and see the result.
- **Alternative Flows:**
  - **A1 Revision after publication:** a new revision or snapshot is created; the published one
    is never edited (BR30).
- **Exceptions:** **E1** a club contests the result → the contest is handled as a case (UC42),
  and any correction becomes a new revision.
- **Postconditions:** A published evaluation exists per club for the period, with its history.
- **Business Rules:** BR30.
- **Output:** Published Evaluation, notification, audit record.
- **Related UC:** UC44
- **Pain Point:** BP13
- **Phase:** 2

---

# M11 — Property & Facility Booking

## UC46 – Manage the property catalogue

- **Primary Actor:** ICPDP Officer
- **Module:** M11
- **Business Goal:** Define what clubs may book — the missing precondition of v1 UC51.
- **Trigger:** The university releases a room or equipment to club activity, or its details
  change.
- **Preconditions:** The caller holds the property-administration permission.
- **Input:** Property code and name, type (room, hall, equipment), capacity, location, attached
  equipment, bookable hours, blackout periods, the active state.
- **Main Flow:**
  1. The officer adds a property or opens an existing one.
  2. The officer sets its capacity, location, bookable hours and blackout periods.
  3. The officer activates it; it becomes selectable in UC47.
- **Alternative Flows:**
  - **A1 Deactivate:** a property that may no longer be booked is deactivated; existing approved
    bookings stand.
  - **A2 Blackout:** a period is blocked for maintenance, and conflicting requests are surfaced.
- **Exceptions:** **E1** deletion is attempted while approved future bookings exist → refused;
  deactivation is the only route (BR41).
- **Postconditions:** The catalogue reflects what can be booked, and from when.
- **Business Rules:** BR41. Changing bookable hours never invalidates a decision already taken.
  UCMS holds only the properties released to club activity and does not replace the university's
  own room booking system (§5.2).
- **Output:** Property records, audit record.
- **Related UC:** UC47, UC48
- **Pain Point:** BP16
- **Phase:** 1

## UC47 – Submit a property booking request

- **Primary Actor:** CMB
- **Module:** M11
- **Business Goal:** Request a room or equipment through a traceable process linked to the event.
- **Trigger:** The club needs a venue or equipment for an event or a recurring activity.
- **Preconditions:** The club is `Active` (BR34); the caller holds the permission; the property is
  active in UC46.
- **Input:** Property, purpose of use, start and end date-time, expected headcount, attached
  equipment, the related event if any.
- **Main Flow:**
  1. The member picks a property from the catalogue ICPDP maintains (UC46).
  2. The system shows its availability.
  3. The member enters the usage details.
  4. The system evaluates the conflict rule BR15.
  5. The member submits → `Requested`; ICPDP receives a review task.
- **Alternative Flows:**
  - **A1 Draft:** saved as `Draft`.
  - **A2 Attach to a proposal:** the request is attached to an event proposal being drafted (UC25).
  - **A3 Revise and resubmit:** from `Revision Requested`, the member edits and resubmits — the
    symmetric flow v1 offered in UC52 step 3 but never gave a use case.
- **Exceptions:**
  - **E1** the slot is taken and policy forbids overbooking → refused (BR33);
  - **E2** the requested time falls in a blackout period → refused;
  - **E3** the headcount exceeds the property's capacity → warning, and the officer decides in
    UC48.
- **Postconditions:** The booking is `Requested`.
- **Business Rules:** BR15, BR33, BR34.
- **Output:** PropertyBooking, ApprovalTask.
- **Related UC:** UC25, UC46, UC48
- **Pain Point:** BP16
- **Phase:** 1

## UC48 – Assess and decide the property booking request

- **Primary Actor:** ICPDP Officer
- **Module:** M11
- **Business Goal:** Allocate university resources under control, with the reason on the record.
- **Trigger:** A task from UC47.
- **Preconditions:** The booking is `Requested`.
- **Input:** The review note, the decision and its reason.
- **Main Flow:**
  1. The officer opens the request → `Under Review`.
  2. The officer checks the club's state, the purpose, the conflicts and the overdue obligations.
  3. The officer chooses: **request revision**, **approve**, or **reject** — a reason is mandatory
     for the last two outcomes.
  4. The system audits the decision, updates the state and sends `Property booking status` to CMB.
- **Alternative Flows:**
  - **A1 Approve a different slot:** the officer proposes an alternative time or property, which
    the club accepts through UC47 A3.
- **Exceptions:** **E1** another booking was approved for the same slot in the meantime → the
  request is returned as conflicting.
- **Postconditions:** The booking is `Approved`, `Rejected` or `Revision Requested`; an approved
  booking locks the slot.
- **Business Rules:** BR33, BR34, BR35, BR31 — only ICPDP decides; a `Suspended` club receives no
  new booking.
- **Output:** ApprovalDecision, locked slot, audit record, notification.
- **Related UC:** UC47, UC49, UC26
- **Pain Point:** BP16
- **Phase:** 1

## UC49 – Track and cancel or release a booked property

- **Primary Actor:** CMB
- **Module:** M11
- **Business Goal:** Free a resource that is no longer needed so another club can book it.
- **Trigger:** The event is cancelled or rescheduled (UC28), or the club no longer needs the
  property.
- **Preconditions:** The booking is `Requested` or `Approved`.
- **Input:** The reason for the cancellation.
- **Main Flow:**
  1. The member opens the booking.
  2. The member chooses `Cancel` and enters the reason.
  3. The system frees the time slot.
  4. ICPDP is notified; the slot becomes available in UC47.
- **Alternative Flows:**
  - **A1 Automatic release:** the related event is cancelled in UC28, and the system releases the
    booking without manual action (BR35).
- **Exceptions:** **E1** the booking is already `In Use` or `Completed` → cancellation is refused;
  **E2** the cancellation falls inside the configured notice period → it is recorded as a
  compliance signal for UC42.
- **Postconditions:** The booking is `Cancelled` or `Released`; the slot is free.
- **Business Rules:** BR35. **Phase 1**, because without it an approved booking locks a room
  forever (BR43).
- **Output:** Booking state, freed slot, notification; compliance signal.
- **Related UC:** UC28, UC48, UC42
- **Pain Point:** BP16
- **Phase:** 1

---

# M12 — Feedback & Complaint

## UC50 – Submit post-event feedback

- **Primary Actor:** Student
- **Module:** M12
- **Business Goal:** Collect the participant's assessment as improvement and evaluation data.
- **Trigger:** The feedback window opens at the participant's check-in (BR36).
- **Preconditions:** The student holds an attendance record for that event.
- **Input:** A score per criterion, a free-text comment, optional anonymity.
- **Main Flow:**
  1. The student opens an event they attended, from UC02 or UC24.
  2. The student fills in the feedback form.
  3. The student submits.
  4. The system stores it and updates the aggregate statistics.
- **Alternative Flows:**
  - **A1 Anonymous:** the identity is hidden from CMB; an internal link is kept for anti-spam
    purposes only.
- **Exceptions:**
  - **E1** feedback was already submitted for that event → refused (BR36);
  - **E2** the window has closed → refused;
  - **E3** no attendance record → the form is not offered.
- **Postconditions:** An EventFeedback record exists and is immutable.
- **Business Rules:** BR36 — one feedback per participant per event, accepted from **check-in**
  until the configured window closes. This is the v2 correction: v1 opened the window after UC32
  finalization, so a late-finalizing club — the exact behaviour BP08 describes — drove the
  response rate to zero and starved dimensions D1 and D2. BR37 — never edited or deleted, and
  visible to CMB only in aggregate. BR40 — no aggregate below the minimum respondent count.
- **Output:** EventFeedback, updated aggregate.
- **Related UC:** UC31, UC51, UC44
- **Pain Point:** BP17
- **Phase:** 2

## UC51 – Review event feedback

- **Primary Actor:** CMB
- **Module:** M12
- **Business Goal:** Use the participants' assessment to improve the next activity.
- **Trigger:** The feedback window closes, or the club prepares the post-event report.
- **Preconditions:** The event has feedback, and the respondent count reaches the BR40 minimum.
- **Main Flow:**
  1. The member opens the aggregated view for an event.
  2. The member reads the per-criterion average, the distribution and the comments.
  3. The member carries the conclusion into the post-event report (UC33).
- **Alternative Flows:**
  - **A1 Across events:** the club compares the aggregate across its own events over a period.
- **Exceptions:** **E1** fewer respondents than BR40 requires → only the fact that feedback
  exists is shown, never the content.
- **Postconditions:** None; read-only. The lesson learned is recorded in UC33.
- **Business Rules:** BR37, BR40. CMB may not edit or delete participant feedback.
- **Output:** Feedback summary; input to UC33 and UC44.
- **Related UC:** UC50, UC33, UC44
- **Pain Point:** BP17
- **Phase:** 2

## UC52 – Submit a complaint about a club

- **Primary Actor:** Student
- **Module:** M12
- **Business Goal:** Give students an official escalation channel with a processing trail.
- **Trigger:** A student has an issue with a club or one of its activities.
- **Preconditions:** A valid session (UC01).
- **Input:** The club concerned, the related event if any, the complaint type, the description,
  the evidence.
- **Main Flow:**
  1. The student selects the club, and the event where one applies.
  2. The student chooses the complaint type.
  3. The student describes the issue and attaches evidence.
  4. The student submits → `Submitted`; ICPDP receives a task.
  5. The student tracks the progress in UC02.
- **Alternative Flows:**
  - **A1 Withdraw:** the student withdraws a complaint that has not been decided.
- **Exceptions:** **E1** the same student files a duplicate complaint on the same facts → the
  complaints are linked and triaged together.
- **Postconditions:** The complaint is `Submitted` and trackable.
- **Business Rules:** BR38 — the complaint goes straight to ICPDP; the club gains access only
  after UC53 forwards it.
- **Output:** Complaint, ApprovalTask, notification.
- **Related UC:** UC53, UC02
- **Pain Point:** BP18
- **Phase:** 2

## UC53 – Triage a complaint

- **Primary Actor:** ICPDP Officer
- **Module:** M12
- **Business Goal:** Filter complaints and open a case only where there are grounds.
- **Trigger:** A task from UC52.
- **Preconditions:** The complaint is `Submitted`.
- **Input:** The severity, the validity assessment, the decision and its reason.
- **Main Flow:**
  1. The officer opens the complaint → `Under Triage`.
  2. The officer classifies its severity and validity.
  3. The officer chooses one outcome:
     - **Dismissed** — no grounds, the reason is recorded;
     - **Forwarded** — handed to the club to answer through UC54;
     - **Escalated** — a case is opened in UC42 and linked back to the complaint.
  4. The system audits the decision and notifies the complainant.
- **Alternative Flows:**
  - **A1 Close after a response:** a forwarded complaint whose club response satisfies the
    officer is closed; otherwise it is escalated.
- **Exceptions:** **E1** the complaint concerns a dissolved club → it is recorded and closed,
  with the history kept.
- **Postconditions:** The complaint is `Dismissed`, `Forwarded`, `Escalated` or `Closed`; on
  escalation a Violation exists and links back.
- **Business Rules:** BR39 — every decision carries a reason and is audited; only ICPDP dismisses
  or escalates. Escalation needs UC42, which is why the whole group ships in one phase (BR43) —
  v1 put UC56/UC57 in the MVP and UC48 in V2, so an escalated complaint had nowhere to go.
- **Output:** Complaint decision, Violation (on escalation), audit record, notification.
- **Related UC:** UC52, UC54, UC42, UC44
- **Pain Point:** BP18
- **Phase:** 2

## UC54 – Respond to a forwarded complaint

- **Primary Actor:** CMB
- **Module:** M12
- **Business Goal:** Let the club answer on the record — the owner v1's
  `Forwarded → Club Responded` transition never had.
- **Trigger:** ICPDP forwards a complaint in UC53.
- **Preconditions:** The complaint is `Forwarded`.
- **Input:** The response, the evidence, the action the club has taken or will take.
- **Main Flow:**
  1. The board opens the forwarded complaint; the complainant's identity is shown only as policy
     allows (open decision D5).
  2. The board enters its response and attaches evidence.
  3. The board submits → `Club Responded`.
  4. ICPDP closes or escalates it in UC53.
- **Alternative Flows:**
  - **A1 Action taken:** the response names a concrete action, which ICPDP may verify before
    closing.
- **Exceptions:** **E1** the response deadline passes → the non-response is recorded as a
  compliance signal for UC42.
- **Postconditions:** The complaint is `Club Responded` and back with ICPDP.
- **Business Rules:** CMB never edits or closes the complaint itself. A response is due within
  the configured period.
- **Output:** Club response, audit record, notification.
- **Related UC:** UC53, UC42
- **Pain Point:** BP18
- **Phase:** 2

---

## Appendix — coverage check

| Check | Result |
|---|---|
| Use cases specified | 54 of 54 (UC01–UC54) |
| Use cases with exactly one primary actor | 54 of 54 — UC31 is the only one with a supporting actor |
| Use cases with a Main Flow | 54 of 54 |
| Use cases whose entity owns a lifecycle, with the state named | UC07, UC08, UC15, UC16, UC17, UC18, UC20, UC21, UC25, UC26, UC27, UC28, UC29, UC31, UC32, UC33, UC34, UC35, UC36, UC37, UC39, UC40, UC41, UC42, UC43, UC44, UC45, UC47, UC48, UC49, UC50, UC52, UC53, UC54 |
| Phase 1 use cases depending on a Phase 2 use case | none (BR43) |
| Pain points with at least one use case | 19 of 19; BP12, BP13, BP17 and BP18 land in Phase 2 by design (model §13) |
