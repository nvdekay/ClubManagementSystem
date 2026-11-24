import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Ghép class điều kiện và gộp xung đột class Tailwind
// Class gốc + class ghi đè có điều kiện, với xung đột Tailwind (vd hai `px-*`) được giải quyết
// theo class đứng sau — đừng bật/tắt hai class đối nghịch theo cond/!cond.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
