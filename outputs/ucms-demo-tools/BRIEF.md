# Brief: seed data + rehearsal video for one presenter

You own one presenter `<n>` of the UCMS defense (see your prompt for `n` and the flows). Deliver a
seeded demo and a recorded rehearsal video, like the existing one for presenter 1 in
`outputs/ucms-demo-flow-123/` (read its README; look at a few frames with
`ffmpeg -ss <t> -i <mp4> -frames:v 1 x.png` + Read to see the look you must match).

Read first: `outputs/ucms-demo-tools/README.md` and `rec.mjs` (harness, already proven),
`docs/08-defense-scripts/flow-<NN>-*.md` for your flows (business, "Chuẩn bị demo", "Thao tác
demo", spoken script), `docs/UC_FLOW_GROUPS.md` (your section), `docs/05-implementation/UC_CODE_MAPPING.md`
(UC → route → page), and `.rules/README.md` + `.rules/backend.md` before writing the seed.
Code is the source of truth: when a doc disagrees with the code, follow the code and note it.

## Deliverables

1. `server/src/infra/db/seed-defense-p<n>.ts` (npm script `seed:defense:p<n>` already exists in
   `server/package.json`). Pattern: `seed-sponsored-payments.ts` (`loadConfig()` for env, `ucmsModels`).
   - Idempotent and self-contained: keyed on the demo cast emails and fixed names; creates the cast
     and club if they are missing so it also works on a teammate's database; never deletes or
     rewrites data it did not create.
   - Prepares records in exactly the states the demo needs (dates relative to now), so no step
     waits for a scheduler, a deadline or an event date. Prefer calling existing usecases/repositories
     over raw inserts where that is cheap, so the data satisfies the real invariants.
   - No Cloudinary and no other outside request. Where a flow needs a stored file, look at how the
     flow 1–3 database stores document metadata and seed the metadata; otherwise skip that step.
   - English only in code and comments. Must pass `npm run lint -w server` and `npm run typecheck -w server`.
   - Do not change any other application source. If the demo seems to need an app change, stop
     working around it and report it instead.
2. `outputs/ucms-demo-tools/record-p<n>.mjs`: the scenario, using `rec.mjs` unchanged (it is shared
   with three other agents; put any extra helper in your own file).
3. `outputs/ucms-demo-flow-<flows>/` (your prompt names it): one MP4 per flow, one combined MP4
   with a chapter per flow, and a Vietnamese `README.md` shaped like presenter 1's: table of
   videos with durations, scope per flow, what was prepared by seed versus done on the UI, the
   final database state you verified, any place where the recording deviates from the doc script,
   and how to rehearse. Delete `scenes/` leftovers you do not link.

## Recording rules

- Your stack is already up: server `:310<n>`, client `:518<n>`, database `ucms_video_p<n>`.
  Use only your own stack and database. Never touch ports 3000/5173, the `ucms` database or other
  presenters' stacks. `stack.sh <n> reset` + seed before every full take.
- Show both sides of each flow (submitter and decision maker) with one scene per actor sitting;
  the scene card names the role. Decisions and submissions happen through the real UI; the seed
  only prepares starting states and things that cannot happen live.
- Caption text is what the presenter says: natural Vietnamese, first person ("Em …"), one or two
  short sentences, at most ~120 characters so it fits two lines. Heading `Flow <N> · <bước>`,
  badge `<NN> / <MM> · <ROLE>` like the existing video. Keep UC codes and status names verbatim.
- Pace for a viewer: move with `click`/`type`, `say` before the action it explains, hold on the
  resulting state (status badge, toast, new row) long enough to read. Pre-fill long forms by seed
  and type only a field or two live.
- Target the durations in `docs/08-defense-scripts/README.md` (about 4 minutes per presenter,
  hard range 3–5.5). Cover the main path; exception branches belong to Q&A, not the video.
- The UI must be Vietnamese (the harness sets it). Use stable locators (role/name, labels).

## Verify before you report

- Run the whole thing from `reset` at least once end to end with no `-FAILED` scene.
- Extract a frame every ~10 s of the final videos and actually look at them: no error toast, no
  English UI, no blank or loading frame held on screen, caption not clipped, cursor visible, the
  state the caption claims is really on screen.
- Query the database for the final states and put them in the README.
- `npm run lint -w server` and `npm run typecheck -w server` pass.
- Do not commit, push, or run `npm run check` (it runs integration tests against the shared Mongo).

## Report back

Files written, video durations, what the seed creates, final verified states, every deviation
from the doc script and every thing you could not show (with the reason), lint/typecheck result.
State plainly anything unfinished or unverified.
