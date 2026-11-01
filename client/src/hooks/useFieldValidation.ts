import { useCallback, useState } from "react";

/** Field name → message, or null when the value is fine. Computed fresh from form state each render. */
export type FieldErrors<K extends string> = Partial<Record<K, string | null>>;

/**
 * Shows a field's error once the user has left it (`touch`) or tried to submit (`touchAll`),
 * so required fields are flagged as they are filled in rather than only after submit.
 */
export function useFieldValidation<K extends string>(errors: FieldErrors<K>) {
  const [touched, setTouched] = useState<ReadonlySet<K>>(() => new Set());
  const [submitted, setSubmitted] = useState(false);

  const touch = useCallback((name: K) => {
    setTouched((current) => (current.has(name) ? current : new Set(current).add(name)));
  }, []);

  /** Reveals every error; returns true when the form may be sent. */
  function touchAll(): boolean {
    setSubmitted(true);
    return !Object.values(errors).some(Boolean);
  }

  function reset() {
    setTouched(new Set());
    setSubmitted(false);
  }

  function error(name: K): string | null {
    return submitted || touched.has(name) ? errors[name] ?? null : null;
  }

  /** Spread onto AppInput/AppTextarea: required flag, blur tracking and aria-invalid. */
  function control(name: K, required = true) {
    return { required, onBlur: () => touch(name), "aria-invalid": error(name) ? true : undefined };
  }

  return { touch, touchAll, reset, error, control, isValid: !Object.values(errors).some(Boolean) };
}
