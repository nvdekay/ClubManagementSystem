# Feature: UC20 Recruitment onboarding

## Goal
Convert an accepted recruitment application into one active club membership, grant the existing default Members role, and record candidate declines.

## Scope
- Authorized reviewers list accepted applications and onboard one candidate with a join date and optional department.
- In one transaction, create membership with source application/default role, set application Onboarded, audit, and notify candidate.
- Record Accepted → Declined with an audit and notification.
- Reject duplicate active membership, banned membership, missing default Members role, and invalid department.
- Reuse existing Mongo schema, indexes, and role structure; no diagram/schema edits.

## Locked behavior
- Only applications in Accepted can be onboarded or declined.
- Membership is Active and `defaultRole` is the code of the club's `isDefaultMemberRole` position.
- A banned membership blocks onboarding; an existing Active membership is a conflict.
- Join date defaults to today if omitted; department is optional but must belong to that club when provided.

## Acceptance
- Permission `club.application.review` is checked per club.
- Membership creation, application transition, audit, and in-app notification are atomic.
- Idempotency/conflicts, authorization, and banned/active membership rules have tests.
