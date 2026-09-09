import { type InputHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export function AppInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("rounded border border-border-app px-2 py-1", className)} {...props} />;
}
