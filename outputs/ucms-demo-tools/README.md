# UCMS demo video tools

Tooling used to seed data and record the defense rehearsal videos for presenters 2–5
(presenter 1's video is `../ucms-demo-flow-123/`; match its look and its README).

## Pieces

- `stack.sh <n> reset|up|down|env` — one isolated stack per presenter `n` (2–5): database
  `ucms_video_p<n>` cloned from `ucms_video_demo_20261114` (the end state of the flow 1–3 video),
  server on `:310<n>`, client on `:518<n>`. Cloudinary is blank, so upload endpoints are not
  mounted and nothing leaves the machine. Logs: `/tmp/ucms-video-p<n>-{server,client}.log`.
- `mint-session.ts` — issues `ucms_session` cookies through the app's session service.
  `cd server && MONGO_URI=... node --env-file=../.env --import tsx ../outputs/ucms-demo-tools/mint-session.ts a@x b@y`
  prints `{ "email": "cookie" }`.
- `rec.mjs` — `openRecorder({ baseURL, outDir })` → `scene(meta, run)` records one actor sitting
  to `outDir/scenes/<id>.mp4` (1920×1080, H.264, 30 fps); `buildVideo(outFile, chapters)` joins
  scenes and writes chapters. Read the file: it is short and is the API reference.
  The app lives in an iframe, so use `app` (a Playwright `Frame`) for `goto`/locators and the
  helpers `say`, `click`, `type`, `pause` for anything the viewer should see.
- `record-p<n>.mjs` — the scenario of presenter `n` (one per presenter).
- Seeds live in the app: `server/src/infra/db/seed-defense-p<n>.ts`, run with
  `cd server && MONGO_URI=... npm run seed:defense:p<n>`.

## Base data (after `reset`)

Cast (all `@fpt.edu.vn`): `an.demo` Nguyễn Minh An — Leader of "CLB Sáng tạo Công nghệ FPTU";
`bao.demo` Trần Gia Bảo — vice leader; `chi.demo` Lê Ngọc Chi and `duy.demo` Phạm Hoàng Duy —
members; `officer.demo` — ICPDP officer. Plus 49 public clubs and 21 past events without users.
No rooms/properties, evaluation schemes or periodic reports: seed what the flow needs.

## Full take

```bash
T=outputs/ucms-demo-tools
$T/stack.sh <n> reset && $T/stack.sh <n> up && eval "$($T/stack.sh <n> env)"
(cd server && MONGO_URI="$MONGO_URI" npm run seed:defense:p<n>)
node $T/record-p<n>.mjs
```

Recording changes data, so every full take starts from `reset` + seed.
