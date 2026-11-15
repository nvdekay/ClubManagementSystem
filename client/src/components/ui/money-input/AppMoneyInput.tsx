import { useLayoutEffect, useRef, type ComponentProps } from "react";

import { AppInput } from "@/components/ui/input/AppInput";

type Props = Omit<ComponentProps<"input">, "value" | "onChange" | "type" | "ref"> & {
  /** Số tiền nguyên dưới dạng chuỗi chữ số ("" khi rỗng); cũng chấp nhận kiểu number. */
  value: string | number;
  /** Được gọi với chuỗi chữ số thuần, không dấu phân cách và không số 0 đầu ("" khi xoá hết). */
  onValueChange: (digits: string) => void;
};

// Lọc chuỗi nhập về dãy chữ số, bỏ số 0 đầu
/** Chuỗi chữ số không có số 0 đầu: "0500.000" -> "500000", "000" -> "0". */
export function moneyDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits === "" ? "" : digits.replace(/^0+(?=\d)/, "");
}

// Nhóm hàng nghìn bằng dấu chấm
/** Nhóm hàng nghìn bằng dấu chấm như cách viết số tiền ở Việt Nam: "5000000" -> "5.000.000". */
export function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Ô nhập số tiền VND có dấu phân cách hàng nghìn
/** Ô nhập số tiền VND nguyên, hiện dấu phân cách hàng nghìn ngay khi gõ. */
export function AppMoneyInput({ value, onValueChange, ...props }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  // Số chữ số bên trái con trỏ, để con trỏ giữ nguyên vị trí khi dấu phân cách được thêm hoặc bớt.
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
      // Các số 0 đầu bị bỏ cũng được trừ khỏi phía bên trái con trỏ.
      const dropped = raw.replace(/\D/g, "").length - digits.length;
      caretDigits.current = Math.max(0, before - dropped);
      onValueChange(digits);
    }} />;
}
