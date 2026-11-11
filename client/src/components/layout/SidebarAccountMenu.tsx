import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/ui/icon/AppIcon";
import { useTheme } from "@/hooks/useTheme";
import type { AuthUser } from "@/services/auth";
import { cn } from "@/utils/cn";

interface SidebarAccountMenuProps {
  user: AuthUser;
  /** Sidebar collapsed to its icon column: show only the avatar and open the menu to the right. */
  compact: boolean;
  signingOut: boolean;
  onSignOut: () => void;
}

const itemClass = "flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring-app";

/** Sidebar footer account button: the avatar opens a menu with theme, language and sign-out. */
export function SidebarAccountMenu({ user, compact, signingOut, onSignOut }: SidebarAccountMenuProps) {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = t("common.accountMenu", { name: user.displayName });
  return (
    <div ref={root} className={cn("relative min-w-0", { "flex-1": !compact })}>
      <button ref={trigger} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId}
        aria-label={label} title={compact ? `${user.displayName} · ${user.email}` : undefined} onClick={() => setOpen(!open)}
        className={cn("flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition-colors hover:bg-surface-strong-app focus-visible:outline-2 focus-visible:outline-ring-app", {
          "bg-surface-strong-app": open, "justify-center": compact,
        })}>
        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mint-soft-app text-sm font-bold text-mint-app">
          {user.displayName.trim().charAt(0).toUpperCase()}
        </span>
        {!compact && <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{user.displayName}</span>
            <span className="block truncate text-xs text-muted-app">{user.email}</span>
          </span>
          <AppIcon name="chevronRight" className={cn("size-4 shrink-0 -rotate-90 text-muted-app transition-transform", { "rotate-90": open })} />
        </>}
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label={label}
          className={cn("absolute z-40 w-60 rounded-2xl border border-border-app bg-bg-app p-1.5 shadow-xl transition-[opacity,translate] duration-150 ease-out starting:translate-y-1 starting:opacity-0",
            compact ? "bottom-0 left-full ml-2" : "bottom-full left-0 mb-2")}>
          <button role="menuitem" type="button" onClick={toggleTheme} className={cn(itemClass, "text-text-app hover:bg-surface-app")}>
            <AppIcon name={theme === "dark" ? "sun" : "moon"} className="size-4.5 text-muted-app" />
            <span className="min-w-0 flex-1">{theme === "dark" ? t("common.lightMode") : t("common.darkModeLabel")}</span>
          </button>
          <button role="menuitem" type="button" onClick={() => void i18n.changeLanguage(i18n.language === "vi" ? "en" : "vi")}
            className={cn(itemClass, "text-text-app hover:bg-surface-app")}>
            <span aria-hidden="true" className="flex size-4.5 items-center justify-center text-[0.65rem] font-bold text-muted-app">
              {i18n.language === "vi" ? "EN" : "VI"}
            </span>
            <span className="min-w-0 flex-1">{t("common.switchLanguage")}</span>
          </button>
          <div className="mx-2 my-1 border-t border-border-app" />
          <button role="menuitem" type="button" disabled={signingOut} onClick={onSignOut}
            className={cn(itemClass, "font-semibold text-danger-app hover:bg-danger-app/10 disabled:opacity-50")}>
            <AppIcon name="logout" className="size-4.5" />
            <span className="min-w-0 flex-1">{t("auth.logout")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
