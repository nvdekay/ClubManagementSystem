# interface/http/

Express adapter. Fixed wiring: `server.ts` (app), `middleware.ts` (logging + error
mapping), `response.ts` (response contract — the ONLY place that calls `res.json()`),
`openapi.ts` (/docs). Routes grow as one `<resource>-routes.ts` per resource, mounted
under `/api/v1`. Translate HTTP ↔ usecase calls only; no business logic.
