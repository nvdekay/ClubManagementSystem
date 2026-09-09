# infra/config/

The ONLY place that reads `process.env`. Validates it with zod at boot into a typed
`Config`; invalid env = `process.exit(1)`.
