import { useEffect, useState } from 'react'

// Current time in ms, refreshed every `intervalMs` so time-window checks do not freeze at first render.
// Pass `enabled: false` to stop ticking when no check on screen depends on the clock.
export function useNow(intervalMs = 60_000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) {
      return
    }
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs, enabled])
  return now
}
