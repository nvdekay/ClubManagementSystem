import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { cn } from "@/utils/cn";

interface AppSelectOption<T> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface AppSelectProps<T> {
  value: T;
  options: AppSelectOption<T>[];
  onChange: (value: T) => void;
  /** Accessible name for the trigger — it only displays the selected label. */
  label: string;
  disabled?: boolean;
  /** Marks the trigger as required / in error (red border), like `aria-invalid` on AppInput. */
  required?: boolean;
  invalid?: boolean;
  /** Sits on the positioning wrapper, so a width utility lands where it can take effect. */
  className?: string;
  /** Keep the option list exactly as wide as the trigger and wrap long labels (inside dialogs). */
  fitWidth?: boolean;
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/**
 * Select-only combobox (WAI-ARIA APG). DOM focus stays on the list while it is open and
 * the highlighted option is reported through aria-activedescendant — the alternative,
 * moving focus onto each <li>, fights the browser's own focus restoration on close.
 */
export function AppSelect<T extends string | number>({
  value,
  options,
  onChange,
  label,
  disabled,
  required,
  invalid,
  className,
  fitWidth,
}: AppSelectProps<T>) {
  const [open, setOpen] = useState(false);
  // Where the list fits: below the trigger by default, above it when the space under it is too short.
  const [placement, setPlacement] = useState({ up: false, right: false, maxHeight: 240, maxWidth: 480 });
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  // Type-to-jump like a native <select>: letters typed within a short pause form one search string.
  const typed = useRef({ text: "", at: 0 });

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    // pointerdown, not click: a click that started outside must close the list even if
    // the pointer is released somewhere else (drag, text selection).
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keeps the highlighted option visible once the list is long enough to scroll.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  /** Measures the room around the trigger so the list never runs off the bottom of the screen. */
  function place() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const up = below < 200 && above > below;
    // A trigger in the right half grows its list leftwards, so a wide list never leaves the screen.
    const right = rect.left > window.innerWidth / 2;
    setPlacement({ up, right, maxHeight: Math.max(120, Math.min(240, up ? above : below)),
      maxWidth: Math.max(rect.width, (right ? rect.right : window.innerWidth - rect.left) - 12) });
  }

  function openList() {
    place();
    setActiveIndex(selectedIndex < 0 ? 0 : selectedIndex);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function select(index: number) {
    if (!options[index] || options[index].disabled) return;
    onChange(options[index].value);
    close();
  }

  /** Highlights the next option whose label starts with the typed text; true when the key was consumed. */
  function typeahead(event: KeyboardEvent, from: number): boolean {
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return false;
    const now = event.timeStamp; // ms since page load; only differences between keys matter
    // A space only searches while a word is being typed; on its own it keeps selecting the option.
    if (event.key === " " && now - typed.current.at > 700) return false;
    const text = (now - typed.current.at > 700 ? "" : typed.current.text) + fold(event.key);
    typed.current = { text, at: now };
    // A fresh single letter steps past the current option, so repeating it cycles through matches.
    const start = text.length === 1 ? from + 1 : from;
    for (let step = 0; step < options.length; step++) {
      const index = (start + step) % options.length;
      const option = options[index]!;
      if (!option.disabled && fold(option.label).startsWith(text)) {
        setActiveIndex(index);
        break;
      }
    }
    event.preventDefault();
    return true;
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey) {
      place();
      setOpen(true);
      typeahead(event, selectedIndex < 0 ? -1 : selectedIndex);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault(); // both would scroll the page instead
    openList();
  }

  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (typeahead(event, activeIndex)) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, options.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        select(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "Tab":
        setOpen(false); // let focus move on; don't yank it back to the trigger
        break;
    }
  }

  return (
    <div ref={rootRef} className={cn("relative inline-block", className)}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        disabled={disabled}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onTriggerKeyDown}
        className="inline-flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-border-app bg-bg-app px-3 text-sm text-text-app shadow-xs transition-colors hover:bg-surface-app focus-visible:border-ring-app focus-visible:ring-3 focus-visible:ring-ring-app/20 focus-visible:outline-none disabled:opacity-50 sm:h-9 aria-[invalid=true]:border-danger-app aria-[invalid=true]:focus-visible:ring-danger-app"
      >
        <span className="min-w-0 truncate text-left">{options[selectedIndex]?.label ?? ""}</span>
        <ChevronDownIcon />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          aria-activedescendant={`${listId}-${activeIndex}`}
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          style={{ maxHeight: placement.maxHeight, maxWidth: fitWidth ? undefined : placement.maxWidth }}
          className={cn("absolute z-20 mt-1 overflow-auto rounded-lg border border-border-app bg-bg-app p-1 shadow-lg transition-[opacity,translate] duration-150 ease-out focus:outline-none starting:-translate-y-1 starting:opacity-0",
            fitWidth ? "w-full" : "w-max max-w-[calc(100vw-2rem)] min-w-full",
            { "bottom-full mt-0 mb-1 starting:translate-y-1": placement.up, "right-0": placement.right })}
        >
          {options.map((option, index) => (
            <li
              key={String(option.value)}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              data-active={index === activeIndex}
              onPointerEnter={() => setActiveIndex(index)}
              onClick={() => select(index)}
              className={cn("flex items-center justify-between gap-3 rounded-md px-2.5 py-2 text-sm", {
                "bg-surface-app text-text-app": index === activeIndex,
                "text-muted-app opacity-50": option.disabled,
              })}
            >
              <span className="min-w-0 break-words">{option.label}</span>
              {option.value === value && <CheckIcon />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Lower-cased and without Vietnamese diacritics, so typing "nguy" finds "Nguyễn". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
}
