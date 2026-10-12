import { useId, useState } from "react";

import { AppIcon } from "@/components/ui/icon/AppIcon";
import { cn } from "@/utils/cn";

interface AppStarRatingProps {
  value: number;
  onChange: (value: number) => void;
  /** Group label, e.g. "Overall rating". */
  label: string;
  /** Accessible name for each star, e.g. (3) => "3 stars". */
  starLabel: (value: number) => string;
  max?: number;
  required?: boolean;
  disabled?: boolean;
}

/** 1–N star picker built on native radios: arrow keys move, Space selects, screen readers announce "n stars". */
export function AppStarRating({ value, onChange, label, starLabel, max = 5, required, disabled }: AppStarRatingProps) {
  const name = useId();
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value;
  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="sr-only">{label}</legend>
      <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
        {Array.from({ length: max }, (_, index) => index + 1).map((star) => (
          <label key={star} title={starLabel(star)} onMouseEnter={() => setHovered(star)}
            className="rounded-lg p-0.5 has-focus-visible:outline-2 has-focus-visible:outline-ring-app">
            <input type="radio" name={name} value={star} checked={value === star} required={required}
              onChange={() => onChange(star)} className="peer sr-only" aria-label={starLabel(star)} />
            <AppIcon name="star" className={cn("size-9 transition-colors duration-150 sm:size-8", star <= shown
              ? "fill-current text-warning-app" : "text-border-app")} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
