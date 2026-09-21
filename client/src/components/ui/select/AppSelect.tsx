import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { cn } from "@/utils/cn";

interface AppSelectOption<T> {
  value: T;
  label: string;
}

interface AppSelectProps<T> {
  value: T;
  options: AppSelectOption<T>[];
  onChange: (value: T) => void;
  /** Accessible name for the trigger — it only displays the selected label. */
  label: string;
  disabled?: boolean;
  /** Sits on the positioning wrapper, so a width utility lands where it can take effect. */
  className?: string;
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
  className,
}: AppSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

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

  function openList() {
    setActiveIndex(selectedIndex < 0 ? 0 : selectedIndex);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function select(index: number) {
    onChange(options[index].value);
    close();
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault(); // both would scroll the page instead
    openList();
  }

  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
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
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onTriggerKeyDown}
        className="inline-flex h-11 w-full items-center justify-between gap-2 rounded-md border border-border-app bg-surface-app pr-2 pl-3 text-sm text-text-app transition-colors hover:border-muted-app focus-visible:border-ring-app focus-visible:ring-1 focus-visible:ring-ring-app focus-visible:outline-none disabled:opacity-50 sm:h-9"
      >
        <span>{options[selectedIndex]?.label ?? ""}</span>
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
          className="absolute z-20 mt-1 max-h-60 w-max min-w-full overflow-auto rounded-lg border border-border-app bg-surface-app p-1 shadow-lg focus:outline-none"
        >
          {options.map((option, index) => (
            <li
              key={String(option.value)}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              data-active={index === activeIndex}
              onPointerEnter={() => setActiveIndex(index)}
              onClick={() => select(index)}
              className={cn("flex items-center justify-between gap-3 rounded px-3 py-2 text-sm", {
                "bg-primary-app text-on-primary-app": index === activeIndex,
              })}
            >
              {option.label}
              {option.value === value && <CheckIcon />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
