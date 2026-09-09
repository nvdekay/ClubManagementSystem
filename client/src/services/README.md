# services/

API layer: plain `fetch` wrappers for `/api/v1`, one file per resource. Components and
hooks call these — never `fetch` directly. No axios, no query library.
