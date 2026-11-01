interface AppFieldErrorProps {
  /** Nothing renders while null, so call sites pass `field.error("name")` straight through. */
  message: string | null | undefined;
  id?: string;
}

/** Inline message under a control; link it with `aria-describedby={id}` on the control. */
export function AppFieldError({ message, id }: AppFieldErrorProps) {
  if (!message) return null;
  return <span id={id} role="alert" className="mt-1 block text-xs font-normal text-danger-app">{message}</span>;
}
