# Feature: UC18 Recruitment screening and decisions

## Goal
Let authorized club reviewers process applications for a published recruitment campaign, record decisions and reasons, notify applicants, and complete a campaign once all applications have a terminal outcome.

## Scope
- List/filter a campaign's applications and inspect applicant answers/attachments.
- Transition Submitted → Screening → Shortlisted/Rejected; decide Shortlisted → Accepted/Rejected/Waitlisted.
- Support bulk shortlist/reject with a shared reason, waitlist promotion when capacity allows, and closing withdrawn applications without a decision.
- Enforce `club.application.review` within the club, campaign capacity, transactional audit/notifications, and state conflict checks.
- Add reviewer UI and API while reusing the existing schema. No diagram or database schema edits.

## Locked behavior
- Capacity counts Accepted and Onboarded applications; exceeding capacity is rejected with a waitlist suggestion.
- A Waitlisted applicant may be promoted only when capacity is free.
- Rejection requires a reason; other decisions accept an optional reason.
- A campaign becomes Completed when all applications are in Accepted, Rejected, Waitlisted, Withdrawn, Onboarded, or Declined. Waitlisted remains a decision but does not block completion.
- Notifications are in-app and transactional with each state change.

## Out of scope
UC19 rubric/evaluation, UC20 membership onboarding, campaign editing, schema and diagrams.

## Acceptance
- Unauthorized access is rejected; reviewers only access their club's campaign applications.
- State transitions, capacity, bulk actions, audit trail, notifications, and auto-completion are covered by unit/integration tests.
- `npm run check` and production builds pass.
