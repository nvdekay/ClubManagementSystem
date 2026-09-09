import { useEffect, useState, type InputHTMLAttributes } from "react";

import { AppInput } from "@/components/ui/input/AppInput";

interface AppSearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  /** Called with the trimmed value, debounced. Must be referentially stable (e.g. a useState setter). */
  onSearch: (value: string) => void;
  delayMs?: number;
}

export function AppSearchInput({ onSearch, delayMs = 300, ...props }: AppSearchInputProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const id = setTimeout(() => onSearch(value.trim()), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs, onSearch]);

  return <AppInput type="search" value={value} onChange={(e) => setValue(e.target.value)} {...props} />;
}
