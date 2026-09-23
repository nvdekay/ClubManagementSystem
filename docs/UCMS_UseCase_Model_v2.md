# UCMS — Use Case Model v2 (revised)

> **Status:** revision of §8–§11, §14–§15, §21–§22 of
> [`UCMS_Business_System_Analysis_EN.md`](UCMS_Business_System_Analysis_EN.md).
> Those sections stay in place as history; where the two disagree, **this document wins**.
> Sections not listed here (§1–§7, §12–§13, §16–§20, §23–§24) are unchanged and still apply.

> **Diagrams:** this model is drawn in [`diagrams/UCMS_UseCase_ByActor.drawio`](diagrams/UCMS_UseCase_ByActor.drawio) (draw.io) covering UC01–UC54.

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
| MVP broke its own dependencies | A Must use case included a Should one; reconciliation (MVP) needed disbursement (V2); complaint escalation (MVP) needed violation cases (V2); property booking (MVP, "must not be cut") needed release (V2) | §12 phase plan with an explicit dependency invariant |

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

- **`ICPDP Head` is not introduced as an actor, so multi-level approval leaves Phase 1.**
  v1 claimed one approval authority (BR31) while BR16 and Signature Feature 1 described a
  second approval node inside ICPDP. In Phase 1 every decision is single-level. Multi-level
  routing ships with UC05 in Phase 2, and the team must then decide whether the second level
  is an RBAC permission or a fourth actor (§14, open decision D1).
- **"Treasurer" is an RBAC role, not an actor.** v1 UC43 labelled its actor `CMB/Treasurer`;
  v2 says CMB everywhere and leaves the role split to RBAC, as §4 already intended.

## 4. Master use case list

`Phase` replaces v1's `Priority`: **1** = first release (§12), **2** = deferred. Every
Phase 1 use case depends only on Phase 1 use cases.

### M01 — Identity, Access & Configuration

| ID | Use case | Actor | Business goal | Phase |
|---|---|---|---|---|
| UC01 | Authenticate via Google OAuth and enter the role workspace | All | Access without in-house passwords | 1 |
| UC02 | Open my role dashboard | All | See what needs my action, and the state of what I submitted | 1 |
| UC03 | Manage accounts and role assignments | ICPDP | Grant, revoke and lock access | 1 |
| UC04 | Configure institutional policy and deadlines | ICPDP | Change the rules without a code change | 1 |
| UC05 | Configure the approval routing rules | ICPDP | Route by request type, amount and risk | 2 |

### M02 / M03 — Club Lifecycle, Governance & Term

| ID | Use case | Actor | Business goal | Phase |
|---|---|---|---|---|
| UC06 | Discover clubs and open activity | Student | Find a club worth joining | 1 |
| UC07 | Submit a club establishment application | Student | Propose a new club | 1 |
| UC08 | Assess and decide the club establishment application | ICPDP | Verify, request revision, approve or reject | 1 |
| UC09 | Configure the club profile and organization structure | CMB | Set up operating information and internal units | 1 |
| UC10 | Nominate the club management board | CMB | Propose leadership for a term | 1 |
| UC11 | Confirm the management board | ICPDP | Grant management authority | 1 |
| UC12 | Plan the leadership transition | CMB | Prepare the handover with its obligations | 2 |
| UC13 | Confirm the leadership transition | ICPDP | Transfer authority safely | 2 |
| UC14 | Request club activity suspension | CMB | Pause activity legitimately | 2 |
| UC15 | Suspend, reactivate or dissolve a club | ICPDP | Control the club lifecycle | 1 |

### M04 — Recruitment & Membership

| ID | Use case | Actor | Business goal | Phase |
|---|---|---|---|---|
| UC16 | Create and publish a recruitment campaign | CMB | Recruit members | 1 |
| UC17 | Submit a club membership application | Student | Apply to a campaign | 1 |
| UC18 | Screen and decide membership applications | CMB | Shortlist, accept, reject or waitlist | 1 |
| UC19 | Record candidate evaluation | CMB | Assess against a rubric | 2 |
| UC20 | Onboard accepted candidates | CMB | Create the membership | 1 |
| UC21 | Manage membership status | CMB | Keep the roster accurate, including removal | 1 |
| UC22 | Request to leave a club | Student | End my own membership | 2 |
| UC23 | Assign positions inside the club | CMB | Internal authorization | 2 |
| UC24 | Use my member workspace | Student | Get value from being a member | 1 |

### M05 — Event & Activity

| ID | Use case | Actor | Business goal | Phase |
|---|---|---|---|---|
| UC25 | Submit an event proposal | CMB | Request permission to hold an event | 1 |
| UC26 | Assess and decide the event proposal | ICPDP | Verify, request revision, approve or reject | 1 |
| UC27 | Publish the event and open registration | CMB | Allow participation | 1 |
| UC28 | Cancel or reschedule an event | CMB | Handle a change with its consequences | 1 |

### M06 — Registration & Attendance

| ID | Use case | Actor | Business goal | Phase |
|---|---|---|---|---|
| UC29 | Register for an event | Student | Secure a place | 1 |
| UC30 | Manage capacity and the waitlist | CMB | Control headcount beyond the hard cap | 2 |
| UC31 | Check in to an event | Student | Prove I attended | 1 |
| UC32 | Finalize event attendance | CMB | Produce the official attendance dataset | 1 |

### M08 — Event Accountability

| ID | Use case | Actor | Business goal | Phase |
|---|---|---|---|---|
| UC33 | Submit the post-event report | CMB | Close the accountability loop | 1 |
| UC34 | Assess and close the event report | ICPDP | End the event lifecycle | 1 |

### M07 — Finance & Budget

| ID | Use case | Actor | Business goal | Phase |
|---|---|---|---|---|
| UC35 | Submit a budget request | CMB | Request funding | 1 |
| UC36 | Assess and decide the budget request | ICPDP | Verify, revise, approve or reject | 1 |
| UC37 | Record disbursement | ICPDP | Track funds actually released | 1 |
| UC38 | Record an expense with its evidence | CMB | Track and substantiate spending | 1 |
| UC39 | Reconcile budget and spending | ICPDP | Establish accountability | 1 |

### M08 — Reporting & Compliance

| ID | Use case | Actor | Business goal | Phase |
|---|---|---|---|---|
| UC40 | Submit the periodic activity report | CMB | Fulfil the reporting obligation | 1 |
| UC41 | Assess the periodic activity report | ICPDP | Validate it as evaluation input | 1 |
| UC42 | Manage violation and compliance cases | ICPDP | Control compliance with a trail | 2 |

### M09 — Performance Evaluation

| ID | Use case | Actor | Business goal | Phase |
|---|---|---|---|---|
| UC43 | Configure the evaluation scheme | ICPDP | Define dimensions, weights and thresholds | 2 |
| UC44 | Generate the club performance evaluation draft | ICPDP | Turn operational data into governance data | 2 |
| UC45 | Review, finalize and publish the evaluation | ICPDP | Publish an official result | 2 |

### M11 — Property & Facility Booking

| ID | Use case | Actor | Business goal | Phase |
|---|---|---|---|---|
| UC46 | Manage the property catalogue | ICPDP | Define what can be booked | 1 |
| UC47 | Submit a property booking request | CMB | Request a room or equipment | 1 |
| UC48 | Assess and decide the property booking request | ICPDP | Allocate resources under control | 1 |
| UC49 | Track and cancel or release a booked property | CMB | Free what is no longer needed | 1 |

### M12 — Feedback & Complaint

| ID | Use case | Actor | Business goal | Phase |
|---|---|---|---|---|
| UC50 | Submit post-event feedback | Student | Report the participant experience | 2 |
| UC51 | Review event feedback | CMB | Improve activity quality | 2 |
| UC52 | Submit a complaint about a club | Student | Escalate outside the club | 2 |
| UC53 | Triage a complaint | ICPDP | Dismiss, forward or escalate, with reasons | 2 |
| UC54 | Respond to a forwarded complaint | CMB | Answer the concern on the record | 2 |

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
> output, related use cases, pain point, phase. The entries below are the condensed view; where
> the two differ, the specification document wins.

Format: **Actor** · **Goal** · **Flow** · **Rules** · **Related** · **Phase**. Where v1 already
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
- **Related:** UC02, UC03, UC04 · **Phase:** 1

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
- **Related:** all · **Phase:** 1

#### UC03 — Manage accounts and role assignments
- **Actor:** ICPDP
- **Goal:** Control who may act, independently of who may sign in.
- **Flow:** find the user → view current roles and club contexts → grant or revoke an ICPDP or
  CMB role → lock or unlock the account with a reason → the system audits the change.
- **Rules:** a locked account is refused at UC01; a CMB role granted here is subordinate to the
  board confirmed in UC11 and is revoked automatically when a term closes (UC13); the
  hierarchy inside ICPDP is expressed as permissions, not as a new actor (§3).
- **Related:** UC01, UC11, UC13 · **Phase:** 1

#### UC04 — Configure institutional policy and deadlines
- **Actor:** ICPDP
- **Goal:** Change a business rule without a release.
- **Data:** allowed email domain; minimum founding members (BR03); mandatory application
  documents (BR02); report deadlines and reminder offsets (BR20, §19); the conflict threshold
  (BR15); the feedback window (BR36); overbooking policy (BR33); enforcement switches (BR21).
- **Rules:** every change is versioned and audited; a change never rewrites a decision already
  made under the previous value. **Phase 1 exposes only this list** — every other
  "configurable" rule in §14 ships as a constant in a single policy document and becomes
  editable only when a real need appears (§14, open decision D2).
- **Related:** UC01, UC07, UC25, UC33, UC40, UC47, UC50 · **Phase:** 1

#### UC05 — Configure the approval routing rules
- **Actor:** ICPDP
- **Goal:** Decide which requests need a second level of approval inside ICPDP.
- **Data:** request type, amount threshold, event risk category, property class, club
  compliance history → required approval level and SLA.
- **Rules:** this is the use case Signature Feature 1 lacked. Until it ships, every decision in
  the system is single-level and BR16 is inactive.
- **Related:** UC08, UC26, UC36, UC48 · **Phase:** 2

### M02 / M03 — Club Lifecycle, Governance & Term

#### UC06 — Discover clubs and open activity
- **Actor:** Student
- **Goal:** Find a club and an open campaign or event worth joining.
- **Flow:** browse or search active clubs by field and keyword → open a club page (profile,
  board, activity history, open campaigns, upcoming public events) → continue into UC17 or UC29.
- **Rules:** only `Active` clubs are listed; a `Suspended` club is visible but marked and shows
  no open campaign (BR09); a `Dissolved` club is not listed.
- **Related:** UC17, UC29, UC16, UC27 · **Phase:** 1

#### UC07 — Submit a club establishment application
- **Actor:** Student
- **Goal:** Propose a new club through a standard process.
- **Flow:** enter name, field and objectives → declare founding members → upload the mandatory
  documents (BR02) → the system validates → confirm → the system creates version 1 →
  `Submitted` → ICPDP receives a review task.
- **Alternative — resubmit (v1 UC05):** from `Revision Requested`, the applicant edits and
  resubmits; the system creates a **new version** and returns the application to `Under Review`.
- **Alternative:** save as `Draft`.
- **Exception:** a mandatory document is missing; fewer founding members than BR03 allows.
- **Rules:** BR02, BR03, BR04 — a submitted version is never overwritten.
- **Related:** UC08 · **Pain point:** BP04 · **Phase:** 1

#### UC08 — Assess and decide the club establishment application
- **Actor:** ICPDP
- **Goal:** One review session ending in one of three outcomes.
- **Precondition:** the application is `Submitted`.
- **Flow:** open the application → check the club information, the founding members, the
  documents and the version history → choose an outcome:
  1. **Request revision** — mark the sections that fall short, enter structured comments, set a
     deadline → `Revision Requested`, the applicant is notified;
  2. **Approve** → `Approved`, a Club is created in `Pending Setup`;
  3. **Reject** — reason mandatory → `Rejected`, no Club is created.
- **Rules:** BR05 — actor, timestamp and reason are stored for every outcome. ICPDP never edits
  the applicant's data on their behalf. The decision history stays attached to the application
  and is visible here (this is what satisfies BP15 — no separate audit use case exists).
- **Related:** UC07, UC09, UC10 · **Phase:** 1

#### UC09 — Configure the club profile and organization structure
- **Actor:** CMB
- **Goal:** Complete the operating information and the internal units of a recognized club.
- **Data:** description, contact, charter, channels, operating scope; boards, departments and
  the positions each may hold.
- **Rules:** institutional fields are editable by ICPDP only; the structure may be constrained
  by a university template; a position in use by an active membership cannot be deleted.
- **Related:** UC10, UC23 · **Phase:** 1

#### UC10 — Nominate the club management board
- **Actor:** CMB · **Goal:** Propose leadership for a term.
- **Flow:** pick a member → position → term → submit → `Pending Confirmation`.
- **Rules:** BR06, BR07. A founding application approved in UC08 nominates its first board here.
- **Related:** UC11 · **Phase:** 1

#### UC11 — Confirm the management board
- **Actor:** ICPDP · **Goal:** Grant management authority.
- **Flow:** check eligibility, conflicts and term → approve or reject → on approval the matching
  permissions take effect and the club may leave `Pending Setup`.
- **Rules:** BR05, BR07. Permissions are granted by this confirmation, not by UC03.
- **Related:** UC10, UC03 · **Phase:** 1

#### UC12 — Plan the leadership transition
- **Actor:** CMB · **Goal:** Prepare a handover that carries its obligations.
- **Data:** the new term, candidates, outstanding events, outstanding budget, incomplete
  reports, assets and responsibilities to hand over → `Pending Confirmation`.
- **Related:** UC13 · **Phase:** 2

#### UC13 — Confirm the leadership transition
- **Actor:** ICPDP · **Goal:** Transfer authority without losing accountability.
- **Flow:** on approval — close the old term, activate the new one, revoke the previous
  permissions, grant the new ones, persist the history.
- **Rules:** BR08. Outstanding obligations listed in UC12 remain attached to the club, not to
  the departing board.
- **Related:** UC12, UC03 · **Phase:** 2

#### UC14 — Request club activity suspension
- **Actor:** CMB · **Input:** reason, expected duration, obligations, recovery plan.
- **Related:** UC15 · **Phase:** 2

#### UC15 — Suspend, reactivate or dissolve a club
- **Actor:** ICPDP · **Goal:** Control the club lifecycle.
- **Trigger:** a request (UC14), inactivity, a case outcome (UC42), or policy.
- **Rules:** BR09, BR10, BR34 — a `Suspended` club opens no campaign, submits no event proposal
  and receives no new booking. Dissolution archives the governance history and revokes
  management access. Existing approved events and bookings are cancelled through UC28 and UC49.
- **Related:** UC14, UC42, UC28, UC49 · **Pain point:** BP01 · **Phase:** 1

### M04 — Recruitment & Membership

#### UC16 — Create and publish a recruitment campaign
- **Actor:** CMB · **Precondition:** club is `Active` (BR01)
- **Input:** positions, criteria, application window, capacity, selection steps → `Published`.
- **Related:** UC17 · **Pain point:** BP11 · **Phase:** 1

#### UC17 — Submit a club membership application
- **Actor:** Student
- **Flow:** pick a campaign (from UC06) → fill in the form → submit → `Submitted`.
- **Validation:** eligibility, the application window (BR11), no duplicate application (BR12).
- **Related:** UC18, UC02 · **Phase:** 1

#### UC18 — Screen and decide membership applications
- **Actor:** CMB
- **Goal:** Take a campaign's applications from `Submitted` to a decision in one session.
- **Flow:** filter and review applications → `Screening` → shortlist or reject → for shortlisted
  candidates, optionally attach an evaluation (UC19) → decide: `Accepted`, `Rejected` or
  `Waitlisted`.
- **Rules:** a rejection reason may be mandatory by policy; a decision is notified to the
  candidate and visible in their UC02.
- **Related:** UC17, UC19, UC20 · **Phase:** 1

#### UC19 — Record candidate evaluation
- **Actor:** CMB · **Data:** interview result, rubric score, reviewer comment.
- **Rules:** the rubric is configured per campaign. · **Related:** UC18 · **Phase:** 2

#### UC20 — Onboard accepted candidates
- **Actor:** CMB
- **Flow:** confirm acceptance → create the ClubMembership with a default role and a join date.
- **Rules:** BR13; no duplicate active membership for the same student and club.
- **Related:** UC18, UC21, UC24 · **Phase:** 1

#### UC21 — Manage membership status
- **Actor:** CMB
- **Goal:** Keep the roster true, including ending a membership.
- **States:** `Active` → `On Leave` → `Inactive` → `Ended`.
- **Flow:** change a member's status with an effective date and, for a removal, a mandatory
  reason → the system audits it and revokes any position held (UC23).
- **Rules:** every change carries an effective date; a removal is always attributable.
  A withdrawal requested by the student (UC22) is executed here.
- **Related:** UC22, UC23 · **Pain point:** BP02 · **Phase:** 1

#### UC22 — Request to leave a club
- **Actor:** Student
- **Flow:** open my membership → request withdrawal with a reason → CMB executes it in UC21.
- **Rules:** a member holding a confirmed board position must be replaced through UC10/UC11
  before the withdrawal takes effect.
- **Related:** UC21, UC24 · **Phase:** 2

#### UC23 — Assign positions inside the club
- **Actor:** CMB · **Rules:** the member must be `Active`; a position defined in UC09; a
  sensitive position requires confirmation through UC11.
- **Related:** UC09, UC11, UC21 · **Phase:** 2

#### UC24 — Use my member workspace
- **Actor:** Student (as a member)
- **Goal:** Give membership a reason to exist inside the system.
- **Flow:** open a club I belong to → see my membership record and position, the club roster and
  board, the club's upcoming events with my registration state, my attendance history, and my
  outstanding obligations (unsubmitted feedback, a pending withdrawal).
- **Rules:** read-only, scoped to clubs where the caller has an active membership; it introduces
  no new entity and no new data — every field is already produced by another use case. Internal
  messaging, chat and file sharing stay out of scope (§5.2).
- **Related:** UC20, UC29, UC31, UC50 · **Phase:** 1

### M05 — Event & Activity

#### UC25 — Submit an event proposal
- **Actor:** CMB · **Precondition:** club is `Active` (BR10) and the caller holds the permission
- **Input:** objective, time, venue, audience, capacity, plan, risk, budget estimate, facility need.
- **Flow:** validate → the system evaluates the conflict rule BR15 and shows
  `No Conflict` / `Warning` / `Blocking Conflict` → optionally attach a property booking
  request (UC47) → submit → `Pending Approval`.
- **Alternative — resubmit (v1 UC28):** from `Revision Requested`, edit and resubmit; a new
  revision is created and the proposal returns to `Under Review`.
- **Exception:** a blocking conflict while policy forbids overlap; a mandatory report is overdue
  and BR21 enforcement is on.
- **Rules:** BR10, BR15, BR21. A revision never overwrites the previous one.
- **Related:** UC26, UC47 · **Pain points:** BP05, BP06 · **Phase:** 1

#### UC26 — Assess and decide the event proposal
- **Actor:** ICPDP
- **Precondition:** the proposal is `Pending Approval`.
- **Flow:** review compliance, venue, time, budget estimate, risk, overdue obligations and the
  attached booking → choose: **request revision** (structured comments mandatory) →
  `Revision Requested`; **approve** → `Approved`; **reject** (reason mandatory) → `Rejected`.
- **Rules:** BR05, BR14, BR31 — ICPDP is the single approval authority; Facility, Security and
  Finance opinions are gathered outside the system and recorded in the review note. Approving a
  proposal that carries a booking request does **not** approve the booking; UC48 decides it.
- **Related:** UC25, UC27, UC48 · **Phase:** 1

#### UC27 — Publish the event and open registration
- **Actor:** CMB · **Precondition:** the event is `Approved` (BR14)
- **Flow:** set the registration window and the public details → publish →
  `Open for Registration`.
- **Related:** UC29, UC06 · **Phase:** 1

#### UC28 — Cancel or reschedule an event
- **Actor:** CMB
- **Goal:** Change an approved event without losing its trail or leaking resources.
- **Flow:** enter a reason → for a reschedule, re-evaluate BR15 and re-submit for decision when
  policy requires it → update or release the linked property booking (UC49) → notify registrants
  → recompute the report and budget obligations.
- **Rules:** BR35 — cancelling an event releases its approved booking. A cancellation inside the
  configured notice period is recorded as a compliance signal (UC42, Phase 2).
- **ICPDP-forced cancellation** is not modelled here: it happens through UC15 (suspension) or
  UC42 (case outcome), which is what removes v1 UC35's dual actor.
- **Related:** UC27, UC49, UC42 · **Phase:** 1

### M06 — Registration & Attendance

#### UC29 — Register for an event
- **Actor:** Student
- **Validation:** the registration window, eligibility, no duplicate registration, capacity.
- **Outcome:** `Confirmed`, or `Waitlisted` when the waitlist is enabled (UC30).
- **Rules:** BR17 — confirmed registrations never exceed capacity unless policy allows
  overbooking. Without UC30, reaching capacity simply closes registration.
- **Related:** UC27, UC30, UC31 · **Pain point:** BP07 · **Phase:** 1

#### UC30 — Manage capacity and the waitlist
- **Actor:** CMB · **Rules:** when a place frees up, promotion follows the configured policy.
- **Related:** UC29 · **Phase:** 2

#### UC31 — Check in to an event
- **Actor:** Student · **Supporting:** CMB
- **Flow:** the student presents or scans the event code at the venue → the system verifies the
  registration and the time window → an attendance record is created.
- **Alternative:** a CMB member with the permission checks a participant in manually, and the
  record stores who did it.
- **Rules:** BR18 — one attendance record per participant per event; a duplicate check-in never
  creates a second record.
- **Related:** UC29, UC32, UC50 · **Phase:** 1

#### UC32 — Finalize event attendance
- **Actor:** CMB
- **Flow:** review abnormal check-ins → finalize → the dataset is locked.
- **Rules:** BR19 — only a special role may unlock it. Finalizing does **not** control the
  feedback window; BR36 opens that at check-in.
- **Related:** UC31, UC33, UC44 · **Phase:** 1

### M08 — Event Accountability

#### UC33 — Submit the post-event report
- **Actor:** CMB
- **Preloaded:** the approved proposal, the finalized attendance, the budget and expenses, the
  feedback summary when UC51 exists.
- **Manual:** actual result, evidence, incidents, lessons learned.
- **Rules:** BR20 — the deadline is configured in UC04; an overdue report feeds BR21.
- **Related:** UC32, UC34, UC38 · **Pain point:** BP08 · **Phase:** 1

#### UC34 — Assess and close the event report
- **Actor:** ICPDP
- **Flow:** compare plan against actual → accept → `Closed`; or return for correction; or, in
  Phase 2, open a case through UC42.
- **Rules:** BR05. Until UC42 ships, a serious finding is recorded on the report and surfaces
  in UC02 rather than becoming a case.
- **Related:** UC33, UC42, UC44 · **Phase:** 1

### M07 — Finance & Budget

#### UC35 — Submit a budget request
- **Actor:** CMB · **Can link to:** an event, a semester plan, an approved activity
- **Input:** category, amount, purpose, expected expenses.
- **Alternative — revise and resubmit (v1 UC40):** from `Revision Requested`, edit and resubmit;
  both the version history and the approval history are preserved.
- **Rules:** BR22. · **Related:** UC36 · **Pain point:** BP09 · **Phase:** 1

#### UC36 — Assess and decide the budget request
- **Actor:** ICPDP
- **Flow:** review eligibility, the available allocation, duplication and the state of the
  related activity → request revision, approve (possibly with a reduced amount) or reject.
- **Rules:** BR05 mandatory audit; the approved amount may differ from the requested amount
  where policy allows.
- **Related:** UC35, UC37 · **Phase:** 1

#### UC37 — Record disbursement
- **Actor:** ICPDP · **Data:** approved amount, disbursed amount, date, reference.
- **Rules:** BR23 — the disbursed amount never exceeds the approved amount without an
  amendment. Tracking only; this is not an accounting ERP (§5.2). **Phase 1**, because UC39
  cannot compute anything without it.
- **Related:** UC36, UC39 · **Phase:** 1

#### UC38 — Record an expense with its evidence
- **Actor:** CMB
- **Input:** category, amount, date, the related budget or event, description, and the invoice,
  receipt or proof of payment.
- **Rules:** BR24 — an expense outside the approved category is flagged as an exception;
  BR25 — the evidence required per category is configurable; every piece of evidence references
  exactly one expense, which is why v1's UC43 and UC44 are one use case here.
- **Related:** UC37, UC39 · **Phase:** 1

#### UC39 — Reconcile budget and spending
- **Actor:** ICPDP
- **System computes:** approved, disbursed, recorded expenses, supported expenses, unsupported
  expenses, remaining balance, variance.
- **Outcome:** `Reconciled` or `Exception`.
- **Rules:** BR26 — reconciliation must complete before a budget case closes. CMB does not
  co-own this decision; it reads the same figures through UC02, which is what removes v1 UC45's
  dual actor.
- **Related:** UC37, UC38, UC44 · **Pain point:** BP10 · **Phase:** 1

### M08 — Reporting & Compliance

#### UC40 — Submit the periodic activity report
- **Actor:** CMB · **Period:** semester, academic year or a configured period
- **Auto-preloaded:** events, membership, attendance, finance. **Manual:** narrative and
  evidence the system does not hold.
- **Rules:** BR20; the deadline and its reminders come from UC04 and §19.
- **Related:** UC41 · **Pain point:** BP14 · **Phase:** 1

#### UC41 — Assess the periodic activity report
- **Actor:** ICPDP · **Outcome:** accept — the report becomes evaluation input — or return for
  correction. · **Related:** UC40, UC44 · **Phase:** 1

#### UC42 — Manage violation and compliance cases
- **Actor:** ICPDP
- **Trigger:** an escalated complaint (UC53), a report finding (UC34), an overdue report, a
  financial exception (UC39), an unauthorized event, a late booking cancellation (UC49).
- **Lifecycle:** `Open` → `Under Investigation` → `Awaiting Club Response` → `Decision Issued` →
  `Corrective Action` → `Resolved`.
- **Rules:** BR27, BR28 — every case records its origin, and a case opened from a complaint
  links back to it. A decision carries a reason and evidence.
- **Related:** UC53, UC34, UC39, UC15, UC44 · **Pain point:** BP12 · **Phase:** 2

### M09 — Performance Evaluation

#### UC43 — Configure the evaluation scheme
- **Actor:** ICPDP
- **Data:** the dimensions of §17 (D1–D6), their weights, the thresholds per classification,
  the period, and the active/inactive state.
- **Rules:** BR29 — a scheme cannot be activated unless the total weight is valid; an active
  scheme used by a published evaluation is never edited in place, a new version is created.
- **Related:** UC44 · **Phase:** 2

#### UC44 — Generate the club performance evaluation draft
- **Actor:** ICPDP
- **Input:** activity (UC26–UC34), attendance (UC32), membership (UC21), finance (UC39),
  reports (UC41), violations (UC42), feedback (UC50), complaint outcomes (UC53), booking
  compliance (UC48, UC49).
- **Processing:** apply the active scheme from UC43 → `Evaluation Draft` with a score and the
  evidence behind each dimension.
- **Related:** UC43, UC45 · **Pain point:** BP13 · **Phase:** 2

#### UC45 — Review, finalize and publish the evaluation
- **Actor:** ICPDP
- **Flow:** review the source data → handle anomalies → add the permitted manual dimensions →
  finalize → publish.
- **Rules:** BR30 — a published evaluation is never edited in place; a new revision or snapshot
  is created. · **Related:** UC44 · **Phase:** 2

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
- **Related:** UC47, UC48 · **Phase:** 1

#### UC47 — Submit a property booking request
- **Actor:** CMB · **Precondition:** club is `Active` (BR34) and the caller holds the permission
- **Input:** property, purpose, start and end date-time, expected headcount, attached equipment,
  the related event if any.
- **Flow:** pick a property from the catalogue (UC46) → the system shows availability → enter
  the usage details → the system evaluates BR15 → submit → `Requested`.
- **Alternative:** save as `Draft`; attach the request to an event proposal being drafted
  (UC25); **revise and resubmit** from `Revision Requested` — the symmetric flow v1 offered in
  UC52 step 3 but never gave a use case.
- **Exception:** the slot is taken and policy forbids overbooking (BR33).
- **Related:** UC25, UC46, UC48 · **Pain point:** BP16 · **Phase:** 1

#### UC48 — Assess and decide the property booking request
- **Actor:** ICPDP
- **Flow:** open the request → check the club state, the purpose, conflicts and overdue
  obligations → request revision, approve or reject with a reason → the system audits it,
  updates the state and notifies CMB.
- **Rules:** BR33, BR34, BR35 — an approved booking locks the slot; a suspended club receives
  no new booking; only ICPDP decides.
- **Related:** UC47, UC49, UC26 · **Phase:** 1

#### UC49 — Track and cancel or release a booked property
- **Actor:** CMB
- **Trigger:** the event is cancelled or rescheduled (UC28), or the club no longer needs the
  property.
- **Flow:** open an `Approved` booking → cancel with a reason → the slot is freed → ICPDP is
  notified.
- **Rules:** BR35 — a booking whose event is cancelled is released automatically; a cancellation
  inside the configured notice period is recorded as a compliance signal for UC42.
  **Phase 1**, because without it an approved booking locks a room forever.
- **Related:** UC28, UC48, UC42 · **Phase:** 1

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
- **Related:** UC31, UC51, UC44 · **Pain point:** BP17 · **Phase:** 2

#### UC51 — Review event feedback
- **Actor:** CMB
- **Flow:** open the aggregated view for an event → read the per-criterion average, the
  distribution and the comments → carry the conclusion into the post-event report (UC33).
- **Rules:** BR37, BR40. Recording the lesson learned belongs to UC33, not here.
- **Related:** UC50, UC33, UC44 · **Phase:** 2

#### UC52 — Submit a complaint about a club
- **Actor:** Student
- **Input:** the club, the related event if any, the complaint type, the description, evidence.
- **Flow:** select the club or event → choose a type → describe and attach evidence → submit →
  `Submitted`, ICPDP receives a task.
- **Rules:** BR38 — the complaint goes straight to ICPDP; the club gains access only after
  UC53 forwards it. The complainant tracks progress through UC02.
- **Related:** UC53 · **Pain point:** BP18 · **Phase:** 2

#### UC53 — Triage a complaint
- **Actor:** ICPDP
- **Flow:** open the complaint → classify severity and validity → choose: `Dismissed` (reason
  recorded), `Forwarded` (handed to the club for a response through UC54), or `Escalated`
  (a case is opened in UC42 and linked back).
- **Rules:** BR39 — every decision carries a reason and is audited; only ICPDP dismisses or
  escalates. `Escalated` requires UC42, which is why both sit in the same phase.
- **Related:** UC52, UC54, UC42 · **Phase:** 2

#### UC54 — Respond to a forwarded complaint
- **Actor:** CMB
- **Goal:** Let the club answer on the record — the owner v1's `Forwarded → Club Responded`
  transition never had.
- **Flow:** open the forwarded complaint (the complainant's identity is shown only as policy
  allows) → enter the response and attach evidence → submit → `Club Responded`; ICPDP closes it
  or escalates it through UC53.
- **Rules:** a response is due within the configured period; an overdue response is a compliance
  signal for UC42. CMB never edits or closes the complaint itself.
- **Related:** UC53, UC42 · **Phase:** 2

## 7. Deliberately not use cases

These behaviours exist, are specified elsewhere, and are excluded from the count on the
strength of §2 rule 2. v1 counted the first one and forgot the rest.

| Behaviour | Where it lives |
|---|---|
| Event and booking conflict detection | BR15, evaluated inside UC25 and UC47 (v1 counted it as UC25) |
| Deadline reminders and escalation | §19 + the values configured in UC04; a scheduler, no actor |
| `Open for Registration → Ongoing → Completed` for an event | Scheduler, driven by the event's own times (§10) |
| `Approved → In Use → Completed` for a booking | Scheduler, driven by the booking's own times (§10) |
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
                                             ├─ UC19 Evaluation (2)
                                             └─ UC24 Member workspace
                                                UC22 Leave (2) → UC21
                                                UC23 Positions (2)
Event:       UC25 Propose ⇄ UC26 Assess&Decide → UC27 Publish → UC29 Register → UC31 Check-in
                │  include BR15 conflict                          └─ UC30 Waitlist (2)
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
Config:      UC03 Accounts · UC04 Policy&Deadlines · UC05 Routing (2)
             feed UC01, UC08, UC26, UC36, UC48
```

`⇄` marks a submit/assess pair whose revision loop is an alternative flow of the submit use
case, not a separate use case. `(2)` marks Phase 2.

## 9. Actor → use case matrix

| Actor | Use cases |
|---|---|
| **Student** | UC01, UC02, UC06, UC07, UC17, UC22, UC24, UC29, UC31, UC50, UC52 |
| **Club Management Board** | UC01, UC02, UC09, UC10, UC12, UC14, UC16, UC18, UC19, UC20, UC21, UC23, UC25, UC27, UC28, UC30, UC33, UC35, UC38, UC40, UC47, UC49, UC51, UC54 |
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
| Revision Requested → Under Review (new version) | UC07 alt |
| Under Review → Approved / Rejected | UC08 |

### 10.2 Club
`Pending Setup → Active → Suspended ⇄ Active → Dissolved`
| From → To | Driver |
|---|---|
| Pending Setup → Active | UC11 (board confirmed) |
| Active → Suspended | UC15 |
| Suspended → Active | UC15 |
| Active / Suspended → Dissolved | UC15 |

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
| Revision Requested → Under Review (new revision) | UC25 alt |
| Under Review → Approved / Rejected | UC26 |
| Approved → Open for Registration | UC27 |
| Open for Registration → Ongoing | **Scheduler** (start time) |
| Ongoing → Completed | **Scheduler** (end time) |
| Completed → Report Submitted | UC33 |
| Report Submitted → Closed | UC34 |
| Approved / Open / Ongoing → Cancelled | UC28, or UC15 / UC42 on the club |

### 10.6 Budget Request
`Draft → Submitted → Under Review → (Revision Requested → Under Review) → Approved / Rejected → Disbursed → Reconciliation Pending → Reconciled → Closed`.
Drivers: UC35, UC36, UC35 alt, UC36, UC37, UC39, UC39.

### 10.7 Violation *(Phase 2)*
`Open → Under Investigation → Awaiting Club Response → Decision Issued → Corrective Action → Resolved`.
Driver: UC42 throughout; `Awaiting Club Response → Decision Issued` is unblocked by the club's
response recorded in UC42 or UC54.

### 10.8 Evaluation *(Phase 2)*
`Draft → Data Ready → Under Review → Finalized → Published`.
Drivers: UC44 up to Data Ready, UC45 from Under Review.

### 10.9 Property Booking
| From → To | Driver |
|---|---|
| Draft → Requested | UC47 |
| Requested → Under Review | UC48 |
| Under Review → Revision Requested | UC48 |
| Revision Requested → Requested | UC47 alt |
| Under Review → Approved / Rejected | UC48 |
| Approved → In Use | **Scheduler** (start time) |
| In Use → Completed | **Scheduler** (end time) |
| Requested / Approved → Cancelled | UC49 |
| Approved → Released | UC28 via BR35, or UC49 |

### 10.10 Complaint *(Phase 2)*
| From → To | Driver |
|---|---|
| — → Submitted | UC52 |
| Submitted → Under Triage | UC53 |
| Under Triage → Dismissed / Forwarded / Escalated | UC53 |
| Forwarded → Club Responded | **UC54** |
| Club Responded → Closed / Escalated | UC53 |
| Escalated → Violation Open | UC42 |

### 10.11 Event Feedback *(Phase 2)*
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
| BR16 | **Inactive in Phase 1.** Multi-level approval inside ICPDP requires UC05; until then every decision is single-level, which keeps BR31 true without contradiction. |
| BR19 | Unchanged, but the "special role" is granted in UC03. |
| BR23 | Unchanged — and it is why UC37 is Phase 1: without a disbursed amount, UC39 computes nothing. |
| BR35 | Unchanged — and it is why UC49 is Phase 1: without a release, an approved booking locks a room forever. |
| BR36 | **Changed.** The feedback window opens at the participant's **check-in** (UC31) and closes at the configured offset after the event ends — not after attendance is finalized (v1 UC54). |
| BR37 | Unchanged. |
| **BR40** | **New.** A feedback aggregate is shown only when the number of respondents reaches the configured minimum; below it, only the fact that feedback exists is shown. Without this, "anonymous" feedback on a ten-person event is not anonymous. |
| **BR41** | **New.** A property may not be deleted while it holds approved future bookings; it is deactivated instead (UC46). |
| **BR42** | **New.** Phase 1 exposes a configuration screen only for the values listed in UC04. Every other rule marked "configurable" in §14 ships as a constant in one policy document. |
| **BR43** | **New.** No Phase 1 use case may depend on a Phase 2 use case; a rule whose enforcement needs a Phase 2 use case is inactive until that phase (BR16 is the only current instance). |

## 12. Phase plan

The v1 MVP (§22) named 30–34 use cases but included flows whose dependencies it had deferred.
This plan applies BR43 instead of a target number.

### Phase 1 — 37 use cases, seven complete loops

| Loop | Use cases |
|---|---|
| Access & configuration | UC01, UC02, UC03, UC04 |
| Club establishment & governance | UC06, UC07, UC08, UC09, UC10, UC11, UC15 |
| Recruitment → membership | UC16, UC17, UC18, UC20, UC21, UC24 |
| Event approval → publication | UC25, UC26, UC27, UC28 |
| Registration → attendance | UC29, UC31, UC32 |
| Event accountability | UC33, UC34 |
| Finance | UC35, UC36, UC37, UC38, UC39 |
| Periodic reporting | UC40, UC41 |
| Property booking | UC46, UC47, UC48, UC49 |

Every loop closes: nothing in Phase 1 ends in a state no Phase 1 use case can leave.

### Phase 2 — 17 use cases

| Group | Use cases | Why it waits |
|---|---|---|
| Governance intelligence | UC42, UC43, UC44, UC45 | The evaluation engine consumes a full period of operational data. Built before Phase 1 has run, it scores empty history. UC42 lands with it because it is what a finding turns into. |
| Feedback & complaint loop | UC50, UC51, UC52, UC53, UC54 | The complaint loop is only complete with UC42; feedback is only useful once events actually run. All five ship together — v1's error was shipping UC52/UC53 without UC42. |
| Refinements | UC05, UC12, UC13, UC14, UC19, UC22, UC23, UC30 | Each has a working Phase 1 substitute: single-level approval, a board re-nomination in place of a transition workflow, a suspension decided by ICPDP alone, a decision without a rubric, removal by CMB, a default position set, and a hard capacity cap without a waitlist. |

### If scope must be cut further

Cut whole loops, never halves of one. In order: Periodic reporting (UC40, UC41) → Finance
(UC35–UC39) → Property booking (UC46–UC49). Anything above that line leaves the event loop
broken, which is the system's reason to exist.

## 13. Traceability — pain point → use case

| BP | Use cases | Phase 1 coverage |
|---|---|---|
| BP01 club state not centralized | UC02, UC15 | full — the dashboard is the answer, not the suspension command |
| BP02 member count inaccurate | UC20, UC21, UC24 | full |
| BP03 board and term history | UC10, UC11 (+ UC12, UC13) | partial — history is recorded; the transition workflow is Phase 2 |
| BP04 establishment scattered | UC07, UC08 | full |
| BP05 no event workflow | UC25, UC26, UC27 | full |
| BP06 no clash detection | BR15 inside UC25 and UC47 | full — it is a rule, always on, not a deferrable use case |
| BP07 registration detached | UC29, UC31, UC32 | full |
| BP08 did the event happen | UC33, UC34 | full |
| BP09 budget not linked end-to-end | UC35–UC39 | full |
| BP10 overspend undetectable | UC37, UC38, UC39 | full |
| BP11 recruitment not linked | UC16, UC17, UC18, UC20 | full |
| BP12 no compliance history | UC42 | **none in Phase 1** — findings are recorded on the report (UC34) and surface in UC02 |
| BP13 manual evaluation | UC43, UC44, UC45 | **none in Phase 1** — by design; the data must exist first |
| BP14 manual deadline reminders | UC04 + the scheduler (§19), shown in UC02 | full |
| BP15 no audit trail | BR05 cross-cutting; read inside UC08, UC26, UC36, UC48 | full, with no dedicated use case |
| BP16 facilities by email | UC46, UC47, UC48, UC49 | full |
| BP17 feedback unstructured | UC50, UC51 | **none in Phase 1** |
| BP18 no complaint channel | UC52, UC53, UC54 | **none in Phase 1** |
| BP19 separate credentials | UC01 | full |

Four pain points have no Phase 1 coverage and this is stated instead of implied — v1 traced
BP03, BP06, BP12 and BP13 to use cases it had already moved to V2.

## 14. Open decisions for the team

| # | Decision | Why it cannot be defaulted here |
|---|---|---|
| D1 | When UC05 ships, is the second approval level an RBAC permission or a fourth actor (`ICPDP Head`)? | It changes the actor diagram and §11. BR31 as written forbids the fourth actor; Signature Feature 1 as written requires the second level. |
| D2 | Which values from §14 become editable in Phase 1 beyond UC04's list? | Every added value costs a screen, a schema and a validation path; the list should come from the real ICPDP process. |
| D3 | The minimum respondent count for BR40. | A policy number, not an engineering one. Five is a common floor. |
| D4 | Does a rescheduled event need a fresh decision from UC26, or only a notification? | Depends on how ICPDP actually treats a time change. |
| D5 | Does UC54 show CMB the complainant's identity? | A privacy rule the university must set; the model supports either. |
