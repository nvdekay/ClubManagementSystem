# hooks/

Reusable React hooks, one `use<Name>.ts` per hook — data fetching, shared stateful
logic. Native React state only (no state library); call `services/` for API access,
never `fetch` directly in components.
