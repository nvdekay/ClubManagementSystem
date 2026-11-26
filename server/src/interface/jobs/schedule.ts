/** Stops the timer, then resolves once a tick that is still running has finished. */
export type StopJob = () => Promise<void>

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Shared timer for every background job: runs once now and then every `intervalMs`, never
 * overlaps a slow tick with the next one, logs a failed tick (and hands it to `onError`), and
 * returns a stop function that waits for the in-flight tick so shutdown can disconnect Mongo
 * without cutting a write in half.
 */
export function scheduleJob(
  name: string,
  intervalMs: number,
  run: () => Promise<void>,
  onError?: (message: string) => Promise<void>,
): StopJob {
  let inFlight: Promise<void> | null = null
  async function tick(): Promise<void> {
    try {
      await run()
    } catch (error) {
      const message = errorMessage(error)
      console.error(JSON.stringify({ job: name, error: message }))
      await onError?.(message).catch(() => undefined)
    }
  }
  function start() {
    if (inFlight) {
      return
    } // a slow tick never overlaps the next one
    inFlight = tick().finally(() => {
      inFlight = null
    })
  }
  start()
  const timer = setInterval(start, intervalMs)
  timer.unref()
  return async function stop() {
    clearInterval(timer)
    await inFlight
  }
}
