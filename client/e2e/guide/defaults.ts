// Stack defaults for the user-guide capture run, applied before setup/env.ts is evaluated so the
// capture never shares a database or ports with `npm run test:e2e` or the dev stack.
// Each value can still be overridden from the shell (E2E_DB_NAME must start with "ucms-e2e").
process.env.E2E_DB_NAME ??= 'ucms-e2e-guide'
process.env.E2E_SERVER_PORT ??= '3400'
process.env.E2E_CLIENT_PORT ??= '5400'

export {}
