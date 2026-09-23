# UCMS — Use Case Model v2 (revised)

> **Status:** revision of §8–§11, §14–§15, §21–§22 of
> [`UCMS_Business_System_Analysis_EN.md`](UCMS_Business_System_Analysis_EN.md).
> Those sections stay in place as history; where the two disagree, **this document wins**.
> Sections not listed here (§1–§7, §12–§13, §16–§20, §23–§24) are unchanged and still apply.

> **Diagrams:** this model is drawn in [`diagrams/UCMS_UseCase_ByActor.drawio`](diagrams/UCMS_UseCase_ByActor.drawio) (draw.io) covering UC01–UC54.
> The system boundary is drawn in [`diagrams/UCMS_Context_Diagram_v2.drawio`](diagrams/UCMS_Context_Diagram_v2.drawio); §15 maps each of its data flows to use cases.

**Total: 54 business use cases** — 45 carried over from the 57 of v1, 9 added.
Actors and modules are unchanged: 3 actors, 2 external systems, 12 modules.

---

## 1. Why the model changed

v1 counted 57 use cases. The count was not the problem; the composition was.

| Defect in v1 | Evidence | Fix in v2 |
|---|---|---|
| One review session split into 3 use cases | UC03+UC04+UC06, UC26+UC27+UC29, UC39+UC41 — same actor, same entity, same screen. UC52 already merged all three for property booking | One `Assess and decide` use case per approval, with `Request Revision` as an outcome of it |
| Resubmission modelled as its own use case | UC05, UC28, UC40 — same actor and same form as the original submission, only a different precondition | Alternative flow of the submit use case |
| A system function counted as a use case | UC25 `Detect event conflicts`, primary actor `System/CMB` | Business rule BR15, invoked inside UC25 and UC47 (v2 numbering) |
| Use cases with two primary actors | UC23, UC25, UC33, UC35, UC45 — violates v1 §1.3 "clearly accountable actor" | One primary actor each; the second becomes a supporting actor or a separate use case |
| Configuration use cases missing | UC51 reads a property catalogue nobody maintains; BR29 validates a scheme nobody configures; Signature Feature 1 has no use case at all | UC04, UC05, UC43, UC46 added |
| Read/entry use cases missing | §3 and §4 make "discover clubs" and "track application status" Student responsibilities; §18 specifies three dashboards — none had a use case | UC02, UC06 added |
| Membership produced nothing | After onboarding, a member's use cases were identical to a non-member's | UC24 added |
| A lifecycle state with no owner | §15.10 sends `Forwarded → Club Responded` to CMB under UC57, but UC57 belongs to ICPDP in §8.7 and §11 | UC54 added |
| States no actor and no system function reaches | Event `Ongoing`/`Completed`, Booking `In Use`/`Completed`; Feedback `Window Open`/`Aggregated` are not states of a feedback record | §10 gives every transition a driver; the feedback lifecycle is corrected |
| MVP broke its own dependencies | A Must use case included a Should one; reconciliation (MVP) needed disbursement (V2); complaint escalation (MVP) needed violation cases (V2); property booking (MVP, "must not be cut") needed release (V2) | §12 release scope grouped by loop; one release, so no use case waits on a deferred one |

## 2. Design rules this model obeys

A use case earns a number only if **all** of the following hold:

1. a **single** primary actor is accountable for it;
2. that actor is a **person**, never "System" — time-driven and rule-driven behaviour is a
   system function (§7) or a business rule (§11), not a use case;
3. it produces a business outcome the actor leaves with;
4. it is not a different **outcome** or a different **precondition** of another use case —
   those are alternative flows;
5. reading data counts, if the read is the business goal (a dashboard, a catalogue, a roster)
   and not a step inside another use case.

Rule 1 forces the dual-actor split. Rule 2 removes v1's UC25. Rule 4 removes v1's split
approvals and resubmissions. Rule 5 restores the dashboards, the club catalogue and the
member workspace that v1 dropped as "CRUD".

## 3. Actors

Unchanged from §4: **Student**, **Club Management Board (CMB)**, **ICPDP Officer**, plus
Google OAuth and Google SMTP as external systems.

Two v1 contradictions around the actor model are resolved here:

- **`ICPDP Head` is not introduced as an actor; multi-level approval stays inside ICPDP.**
  v1 claimed one approval authority (BR31) while BR16 and Signature Feature 1 described a
  second approval node inside ICPDP. Both hold: UC05 routes a request to a second level, and
  every level is exercised by an ICPDP Officer, so ICPDP remains the one approval authority.
  Whether the second level is an RBAC permission or a fourth actor is open decision D1 (§14).
- **"Treasurer" is an RBAC role, not an actor.** v1 UC43 labelled its actor `CMB/Treasurer`;
  v2 says CMB everywhere and leaves the role split to RBAC, as §4 already intended.

## 4. Master use case list

### M01 — Identity, Access & Configuration

| ID | Use case | Actor | Business goal |
|---|---|---|---|
| UC01 | Authenticate via Google OAuth and enter the role workspace | All | Access without in-house passwords |
| UC02 | Open my role dashboard | All | See what needs my action, and the state of what I submitted |
| UC03 | Manage accounts and role assignments | ICPDP | Grant, revoke and lock access |
| UC04 | Configure institutional policy and deadlines | ICPDP | Change the rules without a code change |
| UC05 | Configure the approval routing rules | ICPDP | Route by request type, amount and risk |

### M02 / M03 — Club Lifecycle, Governance & Term

| ID | Use case | Actor | Business goal |
|---|---|---|---|
| UC06 | Discover clubs and open activity | Student | Find a club worth joining |
| UC07 | Submit a club establishment application | Student | Propose a new club |
| UC08 | Assess and decide the club establishment application | ICPDP | Verify, request revision, approve or reject |
| UC09 | Configure the club profile and organization structure | CMB | Set up operating information and internal units |
| UC10 | Nominate the club management board | CMB | Propose leadership for a term |
| UC11 | Confirm the management board | ICPDP | Grant management authority |
| UC12 | Plan the leadership transition | CMB | Prepare the handover with its obligations |
| UC13 | Confirm the leadership transition | ICPDP | Transfer authority safely |
| UC14 | Request club activity suspension | CMB | Pause activity legitimately |
| UC15 | Suspend, reactivate or dissolve a club | ICPDP | Control the club lifecycle |

### M04 — Recruitment & Membership

| ID | Use case | Actor | Business goal |
|---|---|---|---|
| UC16 | Create and publish a recruitment campaign | CMB | Recruit members |
| UC17 | Submit a club membership application | Student | Apply to a campaign |
| UC18 | Screen and decide membership applications | CMB | Shortlist, accept, reject or waitlist |
| UC19 | Record candidate evaluation | CMB | Assess against a rubric |
| UC20 | Onboard accepted candidates | CMB | Create the membership |
| UC21 | Manage membership status | CMB | Keep the roster accurate, including removal |
| UC22 | Request to leave a club | Student | End my own membership |
| UC23 | Assign positions inside the club | CMB | Internal authorization |
| UC24 | Use my member workspace | Student | Get value from being a member |

### M05 — Event & Activity

| ID | Use case | Actor | Business goal |
|---|---|---|---|
| UC25 | Submit an event proposal | CMB | Request permission to hold an event |
| UC26 | Assess and decide the event proposal | ICPDP | Verify, request revision, approve or reject |
| UC27 | Publish the event and open registration | CMB | Allow participation |
| UC28 | Cancel or reschedule an event | CMB | Handle a change with its consequences |

### M06 — Registration & Attendance

| ID | Use case | Actor | Business goal |
|---|---|---|---|
| UC29 | Register for an event | Student | Secure a place |
| UC30 | Manage capacity and the waitlist | CMB | Control headcount beyond the hard cap |
| UC31 | Check in to an event | Student | Prove I attended |
| UC32 | Finalize event attendance | CMB | Produce the official attendance dataset |

### M08 — Event Accountability

| ID | Use case | Actor | Business goal |
|---|---|---|---|
| UC33 | Submit the post-event report | CMB | Close the accountability loop |
| UC34 | Assess and close the event report | ICPDP | End the event lifecycle |

### M07 — Finance & Budget

| ID | Use case | Actor | Business goal |
|---|---|---|---|
| UC35 | Submit a budget request | CMB | Request funding |
| UC36 | Assess and decide the budget request | ICPDP | Verify, revise, approve or reject |
| UC37 | Record disbursement | ICPDP | Track funds actually released |
| UC38 | Record an expense with its evidence | CMB | Track and substantiate spending |
| UC39 | Reconcile budget and spending | ICPDP | Establish accountability |

### M08 — Reporting & Compliance

| ID | Use case | Actor | Business goal |
|---|---|---|---|
| UC40 | Submit the periodic activity report | CMB | Fulfil the reporting obligation |
| UC41 | Assess the periodic activity report | ICPDP | Validate it as evaluation input |
| UC42 | Manage violation and compliance cases | ICPDP | Control compliance with a trail |

### M09 — Performance Evaluation

| ID | Use case | Actor | Business goal |
|---|---|---|---|
| UC43 | Configure the evaluation scheme | ICPDP | Define dimensions, weights and thresholds |
| UC44 | Generate the club performance evaluation draft | ICPDP | Turn operational data into governance data |
| UC45 | Review, finalize and publish the evaluation | ICPDP | Publish an official result |

### M11 — Property & Facility Booking

| ID | Use case | Actor | Business goal |
|---|---|---|---|
| UC46 | Manage the property catalogue | ICPDP | Define what can be booked |
| UC47 | Submit a property booking request | CMB | Request a room or equipment |
| UC48 | Assess and decide the property booking request | ICPDP | Allocate resources under control |
| UC49 | Track and cancel or release a booked property | CMB | Free what is no longer needed |

### M12 — Feedback & Complaint

| ID | Use case | Actor | Business goal |
|---|---|---|---|
| UC50 | Submit post-event feedback | Student | Report the participant experience |
| UC51 | Review event feedback | CMB | Improve activity quality |
| UC52 | Submit a complaint about a club | Student | Escalate outside the club |
| UC53 | Triage a complaint | ICPDP | Dismiss, forward or escalate, with reasons |
| UC54 | Respond to a forwarded complaint | CMB | Answer the concern on the record |

**Count:** 5 + 10 + 9 + 4 + 4 + 2 + 5 + 3 + 3 + 4 + 5 = **54**.

## 5. v1 → v2 mapping

Every v1 ID is accounted for.

| v1 | v2 | Change |
|---|---|---|
| UC01 | UC01 | — |
| UC02 | UC07 | absorbs UC05 as "resubmit after revision" |
| UC03, UC04, UC06 | UC08 | merged into one assess-and-decide |
| UC05 | UC07 | alternative flow |
| UC07, UC08 | UC09 | merged (same actor, same entity, same setup session) |
| UC09 | UC10 | — |
| UC10 | UC11 | — |
| UC11 | UC12 | — |
| UC12 | UC13 | — |
| UC13 | UC14 | — |
| UC14 | UC15 | — |
| UC15 | UC16 | — |
| UC16 | UC17 | — |
| UC17, UC19 | UC18 | merged (screening and decision are one session) |
| UC18 | UC19 | — |
| UC20 | UC20 | — |
| UC21 | UC21 | absorbs the CMB-initiated removal half of UC23 |
| UC22 | UC23 | — |
| UC23 | UC21 + UC22 | split by actor: CMB removal (UC21) vs Student withdrawal (UC22) |
| UC24 | UC25 | absorbs UC28; conflict check becomes BR15 |
| UC25 | — | deleted; becomes BR15, invoked by UC25 and UC47 |
| UC26, UC27, UC29 | UC26 | merged into one assess-and-decide |
| UC28 | UC25 | alternative flow |
| UC30 | UC27 | — |
| UC31 | UC29 | — |
| UC32 | UC30 | — |
| UC33 | UC31 | primary actor is now Student only; CMB manual check-in is an alternative flow |
| UC34 | UC32 | — |
| UC35 | UC28 | primary actor is now CMB only; an ICPDP-forced cancellation runs through UC15 or UC42 |
| UC36 | UC33 | — |
| UC37 | UC34 | — |
| UC38 | UC35 | absorbs UC40 |
| UC39, UC41 | UC36 | merged into one assess-and-decide |
| UC40 | UC35 | alternative flow |
| UC42 | UC37 | — |
| UC43, UC44 | UC38 | merged (evidence always references an expense) |
| UC45 | UC39 | primary actor is now ICPDP only; CMB reads the same figures through UC02 |
| UC46 | UC40 | — |
| UC47 | UC41 | — |
| UC48 | UC42 | — |
| UC49 | UC44 | — |
| UC50 | UC45 | — |
| UC51 | UC47 | absorbs "revise and resubmit the booking" as an alternative flow |
| UC52 | UC48 | — |
| UC53 | UC49 | — |
| UC54 | UC50 | feedback window now opens at check-in, not after finalization (BR36) |
| UC55 | UC51 | renamed: CMB reviews; recording the lesson happens in UC33 |
| UC56 | UC52 | — |
| UC57 | UC53 | the CMB response half becomes UC54 |
| *new* | UC02 | Open my role dashboard (§18 had no use case) |
| *new* | UC03 | Manage accounts and role assignments (UC01's "account locked" had no owner) |
| *new* | UC04 | Configure institutional policy and deadlines (~20 rules say "configurable") |
| *new* | UC05 | Configure the approval routing rules (Signature Feature 1) |
| *new* | UC06 | Discover clubs and open activity (§4 Student responsibility) |
| *new* | UC24 | Use my member workspace (membership had no consumer) |
| *new* | UC43 | Configure the evaluation scheme (BR29) |
| *new* | UC46 | Manage the property catalogue (v1 UC51 read a catalogue nobody maintained) |
| *new* | UC54 | Respond to a forwarded complaint (§15.10 state with no actor) |

## 6. Detailed specification — condensed

> **Full specification:** [`UCMS_UseCase_Specification_v2.md`](UCMS_UseCase_Specification_v2.md)
> holds all 54 use cases in the §9 template of the analysis — actor, goal, trigger,
> preconditions, input, main flow, alternative flows, exceptions, postconditions, business rules,
> output, related use cases, pain point. The entries below are the condensed view; where
> the two differ, the specification document wins.

Format: **Actor** · **Goal** · **Flow** · **Rules** · **Related**. Where v1 already
specified a use case fully and nothing changed, the entry is deliberately short — the v1 text
still applies.

### M01 — Identity, Access & Configuration

#### UC01 — Authenticate via Google OAuth and enter the role workspace
- **Actor:** All · **Supporting:** Google OAuth (ES1)
- **Goal:** Access matching the caller's role, with no password stored in-house.
- **Flow:** request to Google → user authenticates → Google returns email, name, avatar →
  check the email domain against policy (UC04) → map to a User, creating User + StudentProfile
  on first sign-in → load roles and permissions → route to the workspace.
- **Alternative:** a user holding several contexts (Student and CMB of a club) picks a workspace.
- **Exception:** domain not allowed → denied; account locked by UC03 → denied and audited;
  Google unreachable → error, no session.
- **Rules:** BR32. No password is ever stored.
- **Related:** UC02, UC03, UC04

#### UC02 — Open my role dashboard
- **Actor:** All
- **Goal:** One screen per role answering "what needs me, and what happened to what I submitted".
- **Flow:** the system resolves the caller's role and club context → loads the pending items,
  the deadlines and the states owned by that role → the user opens any item into its own use case.
- **Content (from §18):**
  - *ICPDP:* pending approvals by type and age, clubs by state, overdue reports,
    unreconciled budgets, open cases.
  - *CMB:* our submissions and their states, upcoming deadlines, event and booking calendar,
    roster size, budget position.
  - *Student:* my applications and their states, my registrations, my check-in history,
    my memberships, my complaints.
- **Rules:** read-only; no state transition happens here. Every figure is a live query over the
  owning module, never a second copy of the data.
- **Answers:** BP01 (which clubs are Active), BP14 (deadline visibility), and the "track
  application status" responsibility in §4.
- **Related:** all

#### UC03 — Manage accounts and role assignments
- **Actor:** ICPDP
- **Goal:** Control who may act, independently of who may sign in.
- **Flow:** find the user → view current roles and club contexts → grant or revoke an ICPDP or
  CMB role → lock or unlock the account with a reason → the system audits the change.
- **Rules:** a locked account is refused at UC01; a CMB role granted here is subordinate to the
  board confirmed in UC11 and is revoked automatically when a term closes (UC13); the
  hierarchy inside ICPDP is expressed as permissions, not as a new actor (§3).
- **Related:** UC01, UC11, UC13

#### UC04 — Configure institutional policy and deadlines
- **Actor:** ICPDP
- **Goal:** Change a business rule without a release.
- **Data:** allowed email domain; minimum founding members (BR03); mandatory application
  documents (BR02); report deadlines and reminder offsets (BR20, §19); the conflict threshold
  (BR15); the feedback window and the minimum respondent count (BR36, BR40); overbooking policy (BR33); enforcement switches (BR21);
  the academic calendar (semester start and end dates).
- **Rules:** every change is versioned and audited; a change never rewrites a decision already
  made under the previous value. **The configuration screen exposes only this list** — every other
  "configurable" rule in §14 ships as a constant in a single policy document and becomes
  editable only when a real need appears (§14, open decision D2).
- **Related:** UC01, UC07, UC25, UC33, UC40, UC47, UC50

#### UC05 — Configure the approval routing rules
- **Actor:** ICPDP
- **Goal:** Decide which requests need a second level of approval inside ICPDP.
- **Data:** request type, amount threshold, event risk category, property class, club
  compliance history → required approval level and SLA.
- **Rules:** this is the use case Signature Feature 1 lacked. It is what makes BR16 enforceable:
  a request that matches no rule is decided at a single level.
- **Related:** UC08, UC26, UC36, UC48

### M02 / M03 — Club Lifecycle, Governance & Term

#### UC06 — Discover clubs and open activity
- **Actor:** Student
- **Goal:** Find a club and an open campaign or event worth joining.
- **Flow:** browse or search active clubs by field and keyword → open a club page (profile,
  board, activity history, open campaigns, upcoming public events) → continue into UC17 or UC29.
- **Rules:** only `Active` clubs are listed; a `Suspended` club is visible but marked and shows
  no open campaign (BR09); a `Dissolved` club is not listed.
- **Related:** UC17, UC29, UC16, UC27

#### UC07 — Submit a club establishment application
- **Actor:** Student
- **Goal:** Propose a new club through a standard process.
- **Flow:** enter name, field and objectives → declare founding members → upload the mandatory
  documents (BR02) → the system validates → confirm → the system creates version 1 →
  `Submitted` → ICPDP receives a review task.
- **Alternative — resubmit (v1 UC05):** from `Revision Requested`, the applicant edits and
  resubmits; the system creates a **new version** and returns the application to `Submitted`.
- **Alternative:** save as `Draft`.
- **Exception:** a mandatory document is missing; fewer founding members than BR03 allows.
- **Rules:** BR02, BR03, BR04 — a submitted version is never overwritten.
- **Related:** UC08 · **Pain point:** BP04

#### UC08 — Assess and decide the club establishment application
- **Actor:** ICPDP
- **Goal:** One review session ending in one of three outcomes.
- **Precondition:** the application is `Submitted`.
- **Flow:** open the application → check the club information, the founding members, the
  documents and the version history → choose an outcome:
  1. **Request revision** — mark the sections that fall short, enter structured comments, set a
     deadline → `Revision Requested`, the applicant is notified;
  2. **Approve** → `Approved`, a Club is created in `Pending Setup` and the applicant receives
     a temporary founding CMB permission, limited to UC09 and UC10 while the club is
     `Pending Setup`;
  3. **Reject** — reason mandatory → `Rejected`, no Club is created.
- **Rules:** BR05 — actor, timestamp and reason are stored for every outcome. ICPDP never edits
  the applicant's data on their behalf. The decision history stays attached to the application
  and is visible here (this is what satisfies BP15 — no separate audit use case exists).
- **Related:** UC07, UC09, UC10

#### UC09 — Configure the club profile and organization structure
- **Actor:** CMB
- **Goal:** Complete the operating information and the internal units of a recognized club.
- **Data:** description, contact, charter, channels, operating scope; boards, departments and
  the positions each may hold.
- **Rules:** institutional fields are editable by ICPDP only; the structure may be constrained
  by a university template; a position in use by an active membership cannot be deleted.
- **Related:** UC10, UC23

#### UC10 — Nominate the club management board
- **Actor:** CMB · **Goal:** Propose leadership for a term.
- **Flow:** pick a member → position → term → submit → `Pending Confirmation`.
- **Rules:** BR06, BR07. A founding application approved in UC08 nominates its first board here.
- **Related:** UC11

#### UC11 — Confirm the management board
- **Actor:** ICPDP · **Goal:** Grant management authority.
- **Flow:** check eligibility, conflicts and term → approve or reject → on approval the matching
  permissions take effect and the club may leave `Pending Setup`.
- **Rules:** BR05, BR07. Permissions are granted by this confirmation, not by UC03. For a
  founding board, this confirmation replaces the temporary founding permission granted in UC08.
- **Related:** UC10, UC03

#### UC12 — Plan the leadership transition
- **Actor:** CMB · **Goal:** Prepare a handover that carries its obligations.
- **Data:** the new term, candidates, outstanding events, outstanding budget, incomplete
  reports, assets and responsibilities to hand over → `Pending Confirmation`.
- **Related:** UC13

#### UC13 — Confirm the leadership transition
- **Actor:** ICPDP · **Goal:** Transfer authority without losing accountability.
- **Flow:** on approval — close the old term, activate the new one, revoke the previous
  permissions, grant the new ones, persist the history.
- **Rules:** BR08. Outstanding obligations listed in UC12 remain attached to the club, not to
  the departing board.
- **Related:** UC12, UC03

#### UC14 — Request club activity suspension
- **Actor:** CMB · **Input:** reason, expected duration, obligations, recovery plan.
- **Related:** UC15

#### UC15 — Suspend, reactivate or dissolve a club
- **Actor:** ICPDP · **Goal:** Control the club lifecycle.
- **Trigger:** a request (UC14), inactivity, a case outcome (UC42), or policy.
- **Rules:** BR09, BR10, BR34 — a `Suspended` club opens no campaign, submits no event proposal
  and receives no new booking; suspension cancels its approved future events and bookings through
  UC28 (A1) and UC49.
- **Dissolution is scheduled, not immediate**, whoever triggers it:
  - at the decision, anything that would end after the `Dissolving` semester is cancelled
    through UC28 (A1) and UC49, and nothing new may end after it (BR45);
  - the semester of the decision runs normally — the club keeps operating and may still create
    work;
  - at the start of the next semester the club becomes `Dissolving`: nothing new is created, and
    CMB keeps its access only to finish the outstanding work;
  - everything must be closed before the following semester starts. Since every event fits in
    one semester (BR44) and none may end later (BR45), no event is left running then: the
    scheduler cancels proposals still undecided, records unfinished obligations in the archive,
    archives the governance history, revokes management access, and sets `Dissolved`.
- **Related:** UC14, UC42, UC28, UC49 · **Pain point:** BP01

### M04 — Recruitment & Membership

#### UC16 — Create and publish a recruitment campaign
- **Actor:** CMB · **Precondition:** club is `Active` (BR01)
- **Input:** positions, criteria, application window, capacity, selection steps → `Published`.
- **Related:** UC17 · **Pain point:** BP11

#### UC17 — Submit a club membership application
- **Actor:** Student
- **Flow:** pick a campaign (from UC06) → fill in the form → submit → `Submitted`.
- **Validation:** eligibility, the application window (BR11), no duplicate application (BR12),
  no `Banned` membership in this club (BR46).
- **Related:** UC18, UC02

#### UC18 — Screen and decide membership applications
- **Actor:** CMB
- **Goal:** Take a campaign's applications from `Submitted` to a decision in one session.
- **Flow:** filter and review applications → `Screening` → shortlist or reject → for shortlisted
  candidates, optionally attach an evaluation (UC19) → decide: `Accepted`, `Rejected` or
  `Waitlisted`.
- **Rules:** a rejection reason may be mandatory by policy; a decision is notified to the
  candidate and visible in their UC02.
- **Related:** UC17, UC19, UC20

#### UC19 — Record candidate evaluation
- **Actor:** CMB · **Data:** interview result, rubric score, reviewer comment.
- **Rules:** the rubric is configured per campaign. · **Related:** UC18

#### UC20 — Onboard accepted candidates
- **Actor:** CMB
- **Flow:** confirm acceptance → create the ClubMembership with a default role and a join date.
- **Rules:** BR13, BR46; no duplicate active membership for the same student and club.
- **Related:** UC18, UC21, UC24

#### UC21 — Manage membership status
- **Actor:** CMB
- **Goal:** Keep the roster true, including ending a membership.
- **States:** `Active` ⇄ `Inactive` (stopped participating); `Active` / `Inactive` → `Left`
  (the student's UC22 request is accepted) or `Banned` (CMB forces the member out). `Left` and
  `Banned` are final; a `Banned` student may not rejoin the club (BR46).
- **Flow:** change a member's status with an effective date and, for a ban, a mandatory
  reason → the system audits it and revokes any position held (UC23). Each semester the club
  re-registers its active members; the unconfirmed ones become `Inactive`.
- **Rules:** every change carries an effective date; a ban is always attributable.
  A withdrawal requested by the student (UC22) is executed here as `Left`.
- **Related:** UC22, UC23 · **Pain point:** BP02

#### UC22 — Request to leave a club
- **Actor:** Student
- **Flow:** open my membership → request withdrawal with a reason → CMB executes it in UC21.
- **Rules:** a member holding a confirmed board position must be replaced through UC10/UC11
  before the withdrawal takes effect.
- **Related:** UC21, UC24

#### UC23 — Assign positions inside the club
- **Actor:** CMB · **Rules:** the member must be `Active`; a position defined in UC09; a
  sensitive position requires confirmation through UC11.
- **Related:** UC09, UC11, UC21

#### UC24 — Use my member workspace
- **Actor:** Student (as a member)
- **Goal:** Give membership a reason to exist inside the system.
- **Flow:** open a club I belong to → see my membership record and position, the club roster and
  board, the club's upcoming events with my registration state, my attendance history, and my
  outstanding obligations (unsubmitted feedback, a pending withdrawal).
- **Rules:** read-only, scoped to clubs where the caller has an active membership; it introduces
  no new entity and no new data — every field is already produced by another use case. Internal
  messaging, chat and file sharing stay out of scope (§5.2).
- **Related:** UC20, UC22, UC29, UC31, UC50

### M05 — Event & Activity

#### UC25 — Submit an event proposal
- **Actor:** CMB · **Precondition:** club is `Active` (BR10) and the caller holds the permission
- **Input:** objective, time, venue, audience, capacity, plan, risk, budget estimate, facility need.
- **Flow:** validate → the system evaluates the conflict rule BR15 and shows
  `No Conflict` / `Warning` / `Blocking Conflict` → optionally attach a property booking
  request (UC47) → submit → `Pending Approval`.
- **Alternative — resubmit (v1 UC28):** from `Revision Requested`, edit and resubmit; a new
  revision is created and the proposal returns to `Pending Approval`.
- **Exception:** a blocking conflict while policy forbids overlap; a mandatory report is overdue
  and BR21 enforcement is on.
- **Rules:** BR10, BR15, BR21, BR44, BR45. A revision never overwrites the previous one.
- **Related:** UC26, UC47 · **Pain points:** BP05, BP06

#### UC26 — Assess and decide the event proposal
- **Actor:** ICPDP
- **Precondition:** the proposal is `Pending Approval`.
- **Flow:** review compliance, venue, time, budget estimate, risk, overdue obligations and the
  attached booking → choose: **request revision** (structured comments mandatory) →
  `Revision Requested`; **approve** → `Approved`; **reject** (reason mandatory) → `Rejected`.
- **Rules:** BR05, BR14, BR31 — ICPDP is the single approval authority; Facility, Security and
  Finance opinions are gathered outside the system and recorded in the review note. Approving a
  proposal that carries a booking request does **not** approve the booking; UC48 decides it.
- **Related:** UC25, UC27, UC48

#### UC27 — Publish the event and open registration
- **Actor:** CMB · **Precondition:** the event is `Approved` (BR14)
- **Flow:** set the registration window and the public details → publish → `Upcoming`.
- **Related:** UC29, UC06

#### UC28 — Cancel or reschedule an event
- **Actor:** CMB
- **Goal:** Change an approved event without losing its trail or leaking resources.
- **Flow:** enter a reason → for a reschedule, re-evaluate BR15 and re-submit for decision when
  policy requires it → update or release the linked property booking (UC49) → notify registrants
  → recompute the report and budget obligations.
- **Rules:** BR35 — cancelling an event releases its approved booking. A cancellation inside the
  configured notice period is recorded as a compliance signal for UC42.
- **ICPDP-forced cancellation** is alternative flow A1: the system cancels the event as a
  consequence of UC15 (suspension, dissolution) or UC42 (case outcome). ICPDP is not an actor of
  UC28, which is what removes v1 UC35's dual actor.
- **Related:** UC27, UC49, UC42, UC15

### M06 — Registration & Attendance

#### UC29 — Register for an event
- **Actor:** Student
- **Validation:** the registration window, eligibility, no duplicate registration, capacity.
- **Outcome:** `Confirmed`, or `Waitlisted` when the waitlist is enabled; promotion is UC30.
- **Rules:** BR17 — confirmed registrations never exceed capacity unless policy allows
  overbooking. When the event has no waitlist, reaching capacity closes registration.
- **Related:** UC27, UC30, UC31 · **Pain point:** BP07

#### UC30 — Manage capacity and the waitlist
- **Actor:** CMB · **Rules:** when a place frees up, promotion follows the configured policy.
- **Related:** UC29

#### UC31 — Check in to an event
- **Actor:** Student · **Supporting:** CMB
- **Flow:** the student presents or scans the event code at the venue → the system verifies the
  registration and the time window → an attendance record is created.
- **Alternative:** a CMB member with the permission checks a participant in manually, and the
  record stores who did it.
- **Rules:** BR18 — one attendance record per participant per event; a duplicate check-in never
  creates a second record.
- **Related:** UC29, UC32, UC50

#### UC32 — Finalize event attendance
- **Actor:** CMB
- **Flow:** review abnormal check-ins → finalize → the dataset is locked.
- **Rules:** BR19 — only a special role may unlock it. Finalizing does **not** control the
  feedback window; BR36 opens that at check-in.
- **Related:** UC31, UC33, UC44

### M08 — Event Accountability

#### UC33 — Submit the post-event report
- **Actor:** CMB
- **Preloaded:** the approved proposal, the finalized attendance, the budget and expenses, the
  feedback summary when UC51 exists.
- **Manual:** actual result, evidence, incidents, lessons learned.
- **Rules:** BR20 — the deadline is configured in UC04; an overdue report feeds BR21.
- **Related:** UC32, UC34, UC38 · **Pain point:** BP08

#### UC34 — Assess and close the event report
- **Actor:** ICPDP
- **Flow:** compare plan against actual → accept → `Closed`; or return for correction; or record a
  finding, which opens a case in UC42.
- **Rules:** BR05.
- **Related:** UC33, UC42, UC44

### M07 — Finance & Budget

#### UC35 — Submit a budget request
- **Actor:** CMB · **Can link to:** an event, a semester plan, an approved activity
- **Input:** category, amount, purpose, expected expenses.
- **Alternative — revise and resubmit (v1 UC40):** from `Revision Requested`, edit and resubmit;
  a new version is created, the request returns to `Submitted`, and both the version history
  and the approval history are preserved.
- **Rules:** BR22. · **Related:** UC36 · **Pain point:** BP09

#### UC36 — Assess and decide the budget request
- **Actor:** ICPDP
- **Flow:** review eligibility, the available allocation, duplication and the state of the
  related activity → request revision, approve (possibly with a reduced amount) or reject.
- **Rules:** BR05 mandatory audit; the approved amount may differ from the requested amount
  where policy allows.
- **Related:** UC35, UC37

#### UC37 — Record disbursement
- **Actor:** ICPDP · **Data:** approved amount, disbursed amount, date, reference.
- **Rules:** BR23 — the disbursed amount never exceeds the approved amount without an
  amendment. Tracking only; this is not an accounting ERP (§5.2). UC39 cannot compute
  anything without it.
- **Related:** UC36, UC39

#### UC38 — Record an expense with its evidence
- **Actor:** CMB
- **Input:** category, amount, date, the related budget or event, description, and the invoice,
  receipt or proof of payment.
- **Rules:** BR24 — an expense outside the approved category is flagged as an exception;
  BR25 — the evidence required per category is configurable; every piece of evidence references
  exactly one expense, which is why v1's UC43 and UC44 are one use case here.
- **Related:** UC37, UC39

#### UC39 — Reconcile budget and spending
- **Actor:** ICPDP
- **System computes:** approved, disbursed, recorded expenses, supported expenses, unsupported
  expenses, remaining balance, variance.
- **Outcome:** `Reconciled` or `Exception`.
- **Rules:** BR26 — reconciliation must complete before a budget case closes. CMB does not
  co-own this decision; it reads the same figures through UC02, which is what removes v1 UC45's
  dual actor.
- **Related:** UC37, UC38, UC44 · **Pain point:** BP10

### M08 — Reporting & Compliance

#### UC40 — Submit the periodic activity report
- **Actor:** CMB · **Period:** semester, academic year or a configured period
- **Auto-preloaded:** events, membership, attendance, finance. **Manual:** narrative and
  evidence the system does not hold.
- **Rules:** BR20; the deadline and its reminders come from UC04 and §19.
- **Related:** UC41 · **Pain point:** BP14

#### UC41 — Assess the periodic activity report
- **Actor:** ICPDP · **Outcome:** accept — the report becomes evaluation input — or return for
  correction. · **Related:** UC40, UC44

#### UC42 — Manage violation and compliance cases
- **Actor:** ICPDP
- **Trigger:** an escalated complaint (UC53), a report finding (UC34), an overdue report, a
  financial exception (UC39), an unauthorized event, a late booking cancellation (UC49).
- **Lifecycle:** `Open` → `Under Investigation` → `Awaiting Club Response` → `Decision Issued` →
  `Corrective Action` → `Resolved`.
- **Rules:** BR27, BR28 — every case records its origin, and a case opened from a complaint
  links back to it. A decision carries a reason and evidence.
- **Related:** UC53, UC34, UC39, UC15, UC44 · **Pain point:** BP12

### M09 — Performance Evaluation

#### UC43 — Configure the evaluation scheme
- **Actor:** ICPDP
- **Data:** the dimensions of §17 (D1–D6), their weights, the thresholds per classification,
  the period, and the active/inactive state.
- **Rules:** BR29 — a scheme cannot be activated unless the total weight is valid; an active
  scheme used by a published evaluation is never edited in place, a new version is created.
- **Related:** UC44

#### UC44 — Generate the club performance evaluation draft
- **Actor:** ICPDP
- **Input:** activity (UC26–UC34), attendance (UC32), membership (UC21), finance (UC39),
  reports (UC41), violations (UC42), feedback (UC50), complaint outcomes (UC53), booking
  compliance (UC48, UC49).
- **Processing:** apply the active scheme from UC43 → `Evaluation Draft` with a score and the
  evidence behind each dimension.
- **Related:** UC43, UC45 · **Pain point:** BP13

#### UC45 — Review, finalize and publish the evaluation
- **Actor:** ICPDP
- **Flow:** review the source data → handle anomalies → add the permitted manual dimensions →
  finalize → publish.
- **Rules:** BR30 — a published evaluation is never edited in place; a new revision or snapshot
  is created. · **Related:** UC44

### M11 — Property & Facility Booking

#### UC46 — Manage the property catalogue
- **Actor:** ICPDP
- **Goal:** Define what clubs may book — the missing precondition of v1 UC51.
- **Data:** property code and name, type (room, hall, equipment), capacity, location, attached
  equipment, bookable hours, blackout periods, active state.
- **Rules:** a property with approved future bookings cannot be deleted, only deactivated;
  changing bookable hours never invalidates a decision already made. UCMS holds only the
  properties released to club activity and does not replace the university's own room booking
  system (§5.2).
- **Related:** UC47, UC48

#### UC47 — Submit a property booking request
- **Actor:** CMB · **Precondition:** club is `Active` (BR34) and the caller holds the permission
- **Input:** property, purpose, start and end date-time, expected headcount, attached equipment,
  the related event if any.
- **Flow:** pick a property from the catalogue (UC46) → the system shows availability → enter
  the usage details → the system evaluates BR15 → submit → `Requested`.
- **Alternative:** save as `Draft`; attach the request to an event proposal being drafted
  (UC25); **revise and resubmit** from `Revision Requested` — the symmetric flow v1 offered in
  UC52 step 3 but never gave a use case.
- **Exception:** the slot is taken and policy forbids overbooking (BR33); the booking ends after
  the club's `Dissolving` semester (BR45).
- **Related:** UC25, UC46, UC48 · **Pain point:** BP16

#### UC48 — Assess and decide the property booking request
- **Actor:** ICPDP
- **Flow:** open the request → check the club state, the purpose, conflicts and overdue
  obligations → request revision, approve or reject with a reason → the system audits it,
  updates the state and notifies CMB.
- **Rules:** BR33, BR34, BR35 — an approved booking locks the slot; a suspended club receives
  no new booking; only ICPDP decides.
- **Related:** UC47, UC49, UC26

#### UC49 — Track and cancel or release a booked property
- **Actor:** CMB
- **Trigger:** the event is cancelled or rescheduled (UC28), or the club no longer needs the
  property.
- **Flow:** open an `Approved` booking → cancel with a reason → the slot is freed → ICPDP is
  notified.
- **Rules:** BR35 — a booking whose event is cancelled is released automatically; a cancellation
  inside the configured notice period is recorded as a compliance signal for UC42.
  Without it, an approved booking locks a room forever.
- **Related:** UC28, UC48, UC42

### M12 — Feedback & Complaint

#### UC50 — Submit post-event feedback
- **Actor:** Student · **Precondition:** the caller holds an attendance record for the event
- **Input:** a score per criterion, a free-text comment, optional anonymity.
- **Flow:** open an event I attended → fill in the form → submit → the aggregate is updated.
- **Rules:** BR36 — one feedback per participant per event, accepted from **check-in** until the
  configured window closes; BR37 — feedback is never edited or deleted, and CMB sees it only in
  aggregate; BR40 — no aggregate is shown below the minimum respondent count.
- **Why the window moved:** v1 opened it after UC32 finalization, so a late-finalizing club — the
  exact behaviour BP08 describes — pushed the response rate to zero and starved D1 and D2 of the
  evaluation model.
- **Related:** UC31, UC51, UC44 · **Pain point:** BP17

#### UC51 — Review event feedback
- **Actor:** CMB
- **Flow:** open the aggregated view for an event → read the per-criterion average, the
  distribution and the comments → carry the conclusion into the post-event report (UC33).
- **Rules:** BR37, BR40. Recording the lesson learned belongs to UC33, not here.
- **Related:** UC50, UC33, UC44

#### UC52 — Submit a complaint about a club
- **Actor:** Student
- **Input:** the club, the related event if any, the complaint type, the description, evidence.
- **Flow:** select the club or event → choose a type → describe and attach evidence → submit →
  `Submitted`, ICPDP receives a task.
- **Rules:** BR38 — the complaint goes straight to ICPDP; the club gains access only after
  UC53 forwards it. The complainant tracks progress through UC02.
- **Related:** UC53 · **Pain point:** BP18

#### UC53 — Triage a complaint
- **Actor:** ICPDP
- **Flow:** open the complaint → classify severity and validity → choose: `Dismissed` (reason
  recorded), `Forwarded` (handed to the club for a response through UC54), or `Escalated`
  (a case is opened in UC42 and linked back).
- **Rules:** BR39 — every decision carries a reason and is audited; only ICPDP dismisses or
  escalates. `Escalated` requires UC42.
- **Related:** UC52, UC54, UC42

#### UC54 — Respond to a forwarded complaint
- **Actor:** CMB
- **Goal:** Let the club answer on the record — the owner v1's `Forwarded → Club Responded`
  transition never had.
- **Flow:** open the forwarded complaint (the complainant's identity is shown only as policy
  allows) → enter the response and attach evidence → submit → `Club Responded`; ICPDP closes it
  or escalates it through UC53.
- **Rules:** a response is due within the configured period; an overdue response is a compliance
  signal for UC42. CMB never edits or closes the complaint itself.
- **Related:** UC53, UC42

## 7. Deliberately not use cases

These behaviours exist, are specified elsewhere, and are excluded from the count on the
strength of §2 rule 2. v1 counted the first one and forgot the rest.

| Behaviour | Where it lives |
|---|---|
| Event and booking conflict detection | BR15, evaluated inside UC25 and UC47 (v1 counted it as UC25) |
| Deadline reminders and escalation | §19 + the values configured in UC04; a scheduler, no actor |
| `Upcoming → Ongoing → Completed` for an event | Scheduler, driven by the event's own times (§10) |
| `Approved → In Use → Completed` for a booking | Scheduler, driven by the booking's own times (§10) |
| `Dissolving → Dissolved` for a club, and entering `Dissolving` | Scheduler, driven by the academic calendar (UC04) after a UC15 dissolution decision |
| Closing the feedback window | Scheduler, from the window configured in UC04 |
| Notification delivery and retry, incl. Google SMTP | §19, M10; an outbox, not an actor's goal |
| Audit writing | BR05, cross-cutting; the decision history is *read* inside each assess-and-decide use case |
| Aggregating feedback | A view over UC50 data, not a state of a record |

## 8. Relationship map

```text
UC01 Authenticate
 └─ UC02 Dashboard ── every use case is opened from here

Club:        UC07 Submit ⇄ UC08 Assess&Decide → UC09 Profile/Structure
                                              → UC10 Nominate → UC11 Confirm
                                              → UC15 Suspend/Reactivate/Dissolve
Recruitment: UC06 Discover → UC17 Apply → UC18 Screen&Decide → UC20 Onboard → UC21 Status
                                             ├─ UC19 Evaluation
                                             └─ UC24 Member workspace
                                                UC22 Leave → UC21
                                                UC23 Positions
Event:       UC25 Propose ⇄ UC26 Assess&Decide → UC27 Publish → UC29 Register → UC31 Check-in
                │  include BR15 conflict                          └─ UC30 Waitlist
                └─ extend  UC47 Booking                        → UC32 Finalize
             UC28 Cancel/Reschedule affects UC27–UC33 and calls UC49
                                                               → UC33 Report → UC34 Close
Finance:     UC35 Request ⇄ UC36 Assess&Decide → UC37 Disburse → UC38 Expense+Evidence
                                                               → UC39 Reconcile
Booking:     UC46 Catalogue → UC47 Request ⇄ UC48 Assess&Decide → UC49 Track/Release
Reporting:   UC40 Submit → UC41 Assess
Feedback:    UC31 Check-in → UC50 Feedback → UC51 CMB Review → UC33 Report
Complaint:   UC52 Submit → UC53 Triage ─┬─ Dismissed
                                        ├─ Forwarded → UC54 Club Responds
                                        └─ Escalated → UC42 Case → UC15
Evaluation:  UC43 Scheme → UC44 Draft → UC45 Publish
             UC44 consumes UC21, UC32, UC34, UC39, UC41, UC42, UC48, UC49, UC50, UC53
Config:      UC03 Accounts · UC04 Policy&Deadlines · UC05 Routing
             feed UC01, UC08, UC26, UC36, UC48
```

`⇄` marks a submit/assess pair whose revision loop is an alternative flow of the submit use
case, not a separate use case.

## 9. Actor → use case matrix

| Actor | Use cases |
|---|---|
| **Student** | UC01, UC02, UC06, UC07, UC17, UC22, UC24, UC29, UC31, UC50, UC52 |
| **Club Management Board** | UC01, UC02, UC09, UC10, UC12, UC14, UC16, UC18, UC19, UC20, UC21, UC23, UC25, UC27, UC28, UC30, UC32, UC33, UC35, UC38, UC40, UC47, UC49, UC51, UC54 |
| **ICPDP Officer** | UC01, UC02, UC03, UC04, UC05, UC08, UC11, UC13, UC15, UC26, UC34, UC36, UC37, UC39, UC41, UC42, UC43, UC44, UC45, UC46, UC48, UC53 |

Shared: UC01 and UC02 (all three, different content). UC31 is Student-primary with CMB as a
supporting actor. No use case has two primary actors.

## 10. Entity lifecycles

Every transition names its driver. A driver is a use case, or a scheduler — never "System"
with no explanation.

### 10.1 Club Application
| From → To | Driver |
|---|---|
| Draft → Submitted | UC07 |
| Submitted → Under Review | UC08 |
| Under Review → Revision Requested | UC08 |
| Revision Requested → Submitted (new version) | UC07 alt |
| Under Review → Approved / Rejected | UC08 |

### 10.2 Club
`Pending Setup → Active → Suspended ⇄ Active → Dissolving → Dissolved`
| From → To | Driver |
|---|---|
| Pending Setup → Active | UC11 (board confirmed) |
| Active → Suspended | UC15 |
| Suspended → Active | UC15 |
| Active / Suspended → Dissolving | **Scheduler**, at the start of the semester after the UC15 dissolution decision |
| Dissolving → Dissolved | **Scheduler**, at the end of that semester, before the next one starts |

A dissolution decided in UC15 changes no state at once: the club keeps its state until the next
semester, so the work of the current semester runs to its end.

`Inactive` is **not** added: v1 left it optional, and nothing in the model distinguishes it from
`Suspended`. A club that stops operating is `Suspended` with an inactivity reason.

### 10.3 Recruitment Campaign
`Draft → Published → Accepting Applications → Screening → Completed`, or `→ Cancelled`.
Drivers: UC16 for Draft → Published; the scheduler for the window opening and closing
(Accepting Applications, Screening); UC18 for Completed; UC16 for Cancelled.

### 10.4 Recruitment Application
`Draft → Submitted → Screening → Shortlisted → Accepted / Rejected / Waitlisted → Onboarded`.
Drivers: UC17, then UC18 up to the decision, then UC20 for Onboarded.

### 10.5 Event
| From → To | Driver |
|---|---|
| Draft → Pending Approval | UC25 |
| Pending Approval → Under Review | UC26 |
| Under Review → Revision Requested | UC26 |
| Revision Requested → Pending Approval (new revision) | UC25 alt |
| Under Review → Approved / Rejected | UC26 |
| Approved → Upcoming | UC27 |
| Upcoming → Ongoing | **Scheduler** (start time) |
| Ongoing → Completed | **Scheduler** (end time) |
| Completed → Report Submitted | UC33 |
| Report Submitted → Closed | UC34 |
| Report Submitted → Completed (report returned for correction) | UC34 |
| Approved / Upcoming / Ongoing → Cancelled | UC28, or UC15 / UC42 on the club |
| Draft / Pending Approval / Under Review / Revision Requested → Cancelled | UC15 (BR45), or the **Scheduler** when the club becomes `Dissolved` |

`Upcoming` covers the whole time between publication and the start, whether registration is open,
closed, or not used at all (UC27 A2). `Registration Open` and `Registration Closed` are derived
from the registration window set in UC27, not states of the event — the same approach as the
feedback window in §10.11.

### 10.6 Budget Request
`Draft → Submitted → Under Review → (Revision Requested → Submitted, new version) → Approved / Rejected → Disbursed → Reconciliation Pending → Reconciled → Closed`.
Drivers: UC35, UC36, UC35 alt, UC36, UC37, UC39, UC39.

### 10.7 Violation
`Open → Under Investigation → Awaiting Club Response → Decision Issued → Corrective Action → Resolved`.
Driver: UC42 throughout; `Awaiting Club Response → Decision Issued` is unblocked by the club's
response recorded in UC42 or UC54.

### 10.8 Evaluation
`Draft → Data Ready → Under Review → Finalized → Published`.
Drivers: UC44 up to Data Ready, UC45 from Under Review.

### 10.9 Property Booking
| From → To | Driver |
|---|---|
| Draft → Requested | UC47 |
| Requested → Under Review | UC48 |
| Under Review → Revision Requested | UC48 |
| Revision Requested → Requested (new version) | UC47 alt |
| Under Review → Approved / Rejected | UC48 |
| Approved → In Use | **Scheduler** (start time) |
| In Use → Completed | **Scheduler** (end time) |
| Requested / Approved → Cancelled | UC49 |
| Approved → Released | UC28 via BR35, or UC49 |

### 10.10 Complaint
| From → To | Driver |
|---|---|
| — → Submitted | UC52 |
| Submitted → Under Triage | UC53 |
| Under Triage → Dismissed / Forwarded / Escalated | UC53 |
| Forwarded → Club Responded | **UC54** |
| Club Responded → Closed / Escalated | UC53 |
| Escalated → Violation Open | UC42 |

### 10.11 Event Feedback
`Submitted` — and nothing else.

```text
(no record)  --UC50-->  Submitted   [immutable]
```

v1's `Window Open` and `Window Closed` are states of the **event**, derived from the check-in
time and the configured window (BR36), and `Aggregated` is a view over submitted records, not a
state of one. The record itself has a single state because BR37 forbids editing and deleting.

## 11. Business rules — changes only

§14's BR01–BR39 stand, with these amendments:

| Rule | Change |
|---|---|
| BR15 | Restated as the conflict rule itself (it was v1's UC25): *an overlap in time on the same property, where an existing approved event or booking blocks it, yields `Blocking Conflict`; a soft overlap yields `Warning`; the threshold is configured in UC04.* Evaluated inside UC25 and UC47. |
| BR16 | **Changed.** Multi-level approval follows the routing rules of UC05; a request that matches no rule is decided at a single level. Every level is exercised by an ICPDP Officer, which keeps BR31 true without contradiction. |
| BR19 | Unchanged, but the "special role" is granted in UC03. |
| BR23 | Unchanged — and it is why UC37 exists: without a disbursed amount, UC39 computes nothing. |
| BR35 | Unchanged — and it is why UC49 exists: without a release, an approved booking locks a room forever. |
| BR36 | **Changed.** The feedback window opens at the participant's **check-in** (UC31) and closes at the configured offset after the event ends — not after attendance is finalized (v1 UC54). |
| BR37 | Unchanged. |
| **BR40** | **New.** A feedback aggregate is shown only when the number of respondents reaches the configured minimum; below it, only the fact that feedback exists is shown. Without this, "anonymous" feedback on a ten-person event is not anonymous. |
| **BR41** | **New.** A property may not be deleted while it holds approved future bookings; it is deactivated instead (UC46). |
| **BR42** | **New.** The configuration screen covers only the values listed in UC04. Every other rule marked "configurable" in §14 ships as a constant in one policy document. |
| **BR43** | **Withdrawn.** It kept a first release independent of deferred use cases; every use case now ships in one release. The number is not reused. |
| **BR44** | **New.** An event starts and ends within one semester of the academic calendar (UC04). |
| **BR45** | **New.** Once a dissolution is recorded for a club (UC15), no event, event proposal or property booking of that club may end after its `Dissolving` semester. UC25 and UC47 refuse such a submission; UC15 cancels what already exists. |
| **BR46** | **New.** A student whose membership of a club is `Banned` may not apply to (UC17) or be onboarded into (UC20) that club again. |

## 12. Release scope

All 54 use cases ship in one release. The v1 MVP (§22) named 30–34 use cases but included flows
whose dependencies it had deferred; grouping by loop avoids that.

| Loop | Use cases |
|---|---|
| Access & configuration | UC01, UC02, UC03, UC04, UC05 |
| Club establishment & governance | UC06, UC07, UC08, UC09, UC10, UC11, UC12, UC13, UC14, UC15 |
| Recruitment → membership | UC16, UC17, UC18, UC19, UC20, UC21, UC22, UC23, UC24 |
| Event approval → publication | UC25, UC26, UC27, UC28 |
| Registration → attendance | UC29, UC30, UC31, UC32 |
| Event accountability | UC33, UC34 |
| Finance | UC35, UC36, UC37, UC38, UC39 |
| Periodic reporting | UC40, UC41 |
| Governance intelligence | UC42, UC43, UC44, UC45 |
| Property booking | UC46, UC47, UC48, UC49 |
| Feedback & complaint | UC50, UC51, UC52, UC53, UC54 |

Every loop closes: nothing ends in a state no use case can leave.

### If scope must be cut

Cut whole loops, never halves of one. In order: Governance intelligence (UC42–UC45, which also
takes UC53's escalation, so Feedback & complaint goes with it) → Periodic reporting (UC40, UC41)
→ Finance (UC35–UC39) → Property booking (UC46–UC49). Anything above that line leaves the event
loop broken, which is the system's reason to exist.

## 13. Traceability — pain point → use case

| BP | Use cases | Coverage |
|---|---|---|
| BP01 club state not centralized | UC02, UC15 | full — the dashboard is the answer, not the suspension command |
| BP02 member count inaccurate | UC20, UC21, UC24 | full |
| BP03 board and term history | UC10, UC11, UC12, UC13 | full — history is recorded; UC12 and UC13 carry the transition |
| BP04 establishment scattered | UC07, UC08 | full |
| BP05 no event workflow | UC25, UC26, UC27 | full |
| BP06 no clash detection | BR15 inside UC25 and UC47 | full — it is a rule, always on, not a deferrable use case |
| BP07 registration detached | UC29, UC31, UC32 | full |
| BP08 did the event happen | UC33, UC34 | full |
| BP09 budget not linked end-to-end | UC35–UC39 | full |
| BP10 overspend undetectable | UC37, UC38, UC39 | full |
| BP11 recruitment not linked | UC16, UC17, UC18, UC20 | full |
| BP12 no compliance history | UC34, UC42 | full — a finding on the report opens a case |
| BP13 manual evaluation | UC43, UC44, UC45 | full — the first evaluation needs a full period of data |
| BP14 manual deadline reminders | UC04 + the scheduler (§19), shown in UC02 | full |
| BP15 no audit trail | BR05 cross-cutting; read inside UC08, UC26, UC36, UC48 | full, with no dedicated use case |
| BP16 facilities by email | UC46, UC47, UC48, UC49 | full |
| BP17 feedback unstructured | UC50, UC51 | full |
| BP18 no complaint channel | UC52, UC53, UC54 | full |
| BP19 separate credentials | UC01 | full |

Every pain point is covered. v1 traced BP03, BP06, BP12 and BP13 to use cases it had already
moved to V2.

## 14. Open decisions for the team

| # | Decision | Why it cannot be defaulted here |
|---|---|---|
| D1 | Is the second approval level an RBAC permission or a fourth actor (`ICPDP Head`)? | It changes the actor diagram and §11. BR31 as written forbids the fourth actor; Signature Feature 1 as written requires the second level. |
| D2 | Which values from §14 become editable beyond UC04's list? | Every added value costs a screen, a schema and a validation path; the list should come from the real ICPDP process. |
| D3 | The initial minimum respondent count for BR40 (ICPDP can change it later in UC04). | A policy number, not an engineering one. Five is a common floor. |
| D4 | Does a rescheduled event need a fresh decision from UC26, or only a notification? | Depends on how ICPDP actually treats a time change. |
| D5 | Does UC54 show CMB the complainant's identity? | A privacy rule the university must set; the model supports either. |

## 15. Context diagram — data flow → use case

[`diagrams/UCMS_Context_Diagram_v2.drawio`](diagrams/UCMS_Context_Diagram_v2.drawio) obeys one
rule: every flow is produced or consumed by at least one use case, and every use case that moves
data across the system boundary appears in at least one flow. One flow groups data of the same
kind, so the use cases behind it are listed here, not on the diagram.

| From → To | Data flow | Use cases |
|---|---|---|
| Student → System | Club establishment application | UC07 |
| Student → System | Recruitment application | UC17 |
| Student → System | Leave club request | UC22 |
| Student → System | Event registration | UC29 |
| Student → System | Event check-in | UC31 |
| Student → System | Event feedback | UC50 |
| Student → System | Club complaint | UC52 |
| System → Student | Clubs & events information | UC06, UC24 |
| System → Student | Student profile information | UC01, UC02 |
| System → Student | Application results & revision requests | UC08, UC18 |
| CMB → System | Club profile & structure setup | UC09 |
| CMB → System | Board nomination | UC10 |
| CMB → System | Leadership transition plan | UC12 |
| CMB → System | Suspension request | UC14 |
| CMB → System | Recruitment configuration | UC16 |
| CMB → System | Candidate decisions | UC18, UC19, UC20 |
| CMB → System | Member management | UC21, UC23 |
| CMB → System | Event proposal | UC25 |
| CMB → System | Event publishment | UC27 |
| CMB → System | Event cancellation / reschedule | UC28 |
| CMB → System | Waitlist & attendance finalization | UC30, UC32 |
| CMB → System | Post-event report | UC33 |
| CMB → System | Budget request | UC35 |
| CMB → System | Expense & evidence | UC38 |
| CMB → System | Periodic report | UC40 |
| CMB → System | Property booking request / cancellation | UC47, UC49 |
| CMB → System | Complaint response | UC54 |
| System → CMB | Membership applications | UC17 → UC18 |
| System → CMB | Review decisions & revision requests | UC11, UC13, UC26, UC34, UC36, UC41, UC48 |
| System → CMB | Event feedback | UC51 |
| System → CMB | Forwarded complaint | UC53 → UC54 |
| System → CMB | Deadline reminder | UC04 |
| System → CMB | Club evaluation result | UC45 |
| ICPDP → System | Accounts, policy & routing config | UC03, UC04, UC05 |
| ICPDP → System | Review decisions | UC08, UC11, UC13, UC26, UC34, UC36, UC41, UC48 |
| ICPDP → System | Club status action | UC15 |
| ICPDP → System | Disbursement & reconciliation | UC37, UC39 |
| ICPDP → System | Property catalogue | UC46 |
| ICPDP → System | Complaint triage | UC53 |
| ICPDP → System | Violation cases | UC42 |
| ICPDP → System | Evaluation scheme & scoring | UC43, UC45 |
| System → ICPDP | Club establishment application | UC07 → UC08 |
| System → ICPDP | Board nomination | UC10 → UC11 |
| System → ICPDP | Leadership transition plan | UC12 → UC13 |
| System → ICPDP | Suspension request | UC14 → UC15 |
| System → ICPDP | Event proposal | UC25 → UC26 |
| System → ICPDP | Post-event report | UC33 → UC34 |
| System → ICPDP | Budget request & expenses | UC35 → UC36, UC38 → UC39 |
| System → ICPDP | Periodic reports | UC40 → UC41 |
| System → ICPDP | Property booking request | UC47 → UC48 |
| System → ICPDP | Club complaint | UC52 → UC53 |
| System → ICPDP | Evaluation draft | UC44 |
| System → Google OAuth | Authentication request | UC01 |
| Google OAuth → System | Authentication data | UC01 |
| System → Google SMTP | Send email request | every notification (deadline reminders, decisions, forwarded complaints) |

`A → B` in the last column means the flow carries what use case A submits to the actor of use
case B.
