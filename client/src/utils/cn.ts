import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Base class + conditional override(s), with Tailwind conflicts (e.g. two `px-*`) resolved
// in favor of the later one — never toggle two opposite classes on cond/!cond.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
