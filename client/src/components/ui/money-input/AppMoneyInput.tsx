import { useLayoutEffect, useRef, type ComponentProps } from "react";

import { AppInput } from "@/components/ui/input/AppInput";

type Props = Omit<ComponentProps<"input">, "value" | "onChange" | "type" | "ref"> & {
  /** Whole amount as plain digits ("" when empty); a number is accepted too. */
  value: string | number;
  /** Called with plain digits, no separators and no leading zeros ("" when cleared). */
  onValueChange: (digits: string) => void;
};

/** Plain digits without leading zeros: "0500.000" -> "500000", "000" -> "0". */
export function moneyDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits === "" ? "" : digits.replace(/^0+(?=\d)/, "");
}

/** Groups thousands with dots, as amounts are written in Vietnamese: "5000000" -> "5.000.000". */
export function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Text input for a whole VND amount that shows thousand separators while typing. */
export function AppMoneyInput({ value, onValueChange, ...props }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  // Digits left of the caret, so the caret stays put when separators are added or removed.
  const caretDigits = useRef<number | null>(null);
  const shown = groupThousands(moneyDigits(String(value)));

  useLayoutEffect(() => {
    const input = ref.current;
    if (!input || caretDigits.current === null || document.activeElement !== input) return;
    let seen = 0;
    let position = 0;
    while (position < shown.length && seen < caretDigits.current) {
      if (/\d/.test(shown[position]!)) seen += 1;
      position += 1;
    }
    input.setSelectionRange(position, position);
    caretDigits.current = null;
  }, [shown]);

  return <AppInput ref={ref} type="text" inputMode="numeric" autoComplete="off" {...props} value={shown}
    onChange={(event) => {
      const { value: raw, selectionStart } = event.target;
      const digits = moneyDigits(raw);
      const before = raw.slice(0, selectionStart ?? raw.length).replace(/\D/g, "").length;
      // Leading zeros that were dropped also leave the caret's left side.
      const dropped = raw.replace(/\D/g, "").length - digits.length;
      caretDigits.current = Math.max(0, before - dropped);
      onValueChange(digits);
    }} />;
}
