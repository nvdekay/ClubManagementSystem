# tests/

`unit/` runs with no DB and no network; `integration/` needs a real Mongo
(skipped without `MONGO_URI`, auto-loaded from `.env`).
