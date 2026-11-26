/**
 * Shape a translation must have to match the English source: same keys at every level, string
 * leaves. Use with `satisfies` so a missing or extra key fails `tsc`.
 */
export type Messages<T> = {
  [K in keyof T]: T[K] extends string ? string : Messages<T[K]>
}
