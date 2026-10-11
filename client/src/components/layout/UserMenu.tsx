import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { AppIcon } from "@/components/ui/icon/AppIcon";
import { useLogout } from "@/hooks/useAuth";
import type { AuthUser } from "@/services/auth";
import { cn } from "@/utils/cn";

interface UserMenuProps {
  user: AuthUser;
  csrfToken: string;
}

/** Header avatar that opens the account menu: go to the workspace, or sign out. */
export function UserMenu({ user, csrfToken }: UserMenuProps) {
  const { t } = useTranslation();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(user.avatarUrl) && failedUrl !== user.avatarUrl;

  /** Google profile photo, or the first letter of the name when there is none or it fails to load. */
  function avatar(className?: string) {
    return (
      <span aria-hidden="true" className={cn("flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-mint-soft-app text-sm font-bold text-mint-app", className)}>
        {showImage && user.avatarUrl
          ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-full object-cover" onError={() => setFailedUrl(user.avatarUrl ?? null)} />
          : user.displayName.trim().charAt(0).toUpperCase()}
      </span>
    );
  }

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

  async function signOut() {
    try {
      await logout.mutateAsync(csrfToken);
      sessionStorage.removeItem("workspace");
    } catch {
      // logout.isError is shown inside the menu.
    }
  }

  return (
    <div ref={root} className="relative">
      <button ref={trigger} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId}
        aria-label={t("common.accountMenu", { name: user.displayName })} onClick={() => setOpen(!open)}
        className={cn("flex min-h-11 items-center gap-1.5 rounded-full border border-border-app bg-bg-app p-1 pr-2.5 transition-colors hover:border-primary-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app", {
          "border-primary-app": open,
        })}>
        {avatar()}
        <AppIcon name="chevronRight" className={cn("size-4 rotate-90 text-muted-app transition-transform", { "-rotate-90": open })} />
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label={t("common.accountMenu", { name: user.displayName })}
          className="absolute top-full right-0 z-40 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-border-app bg-bg-app p-2 shadow-xl">
          <div className="flex items-center gap-3 px-3 pt-2 pb-3">
            {avatar("size-11 text-base")}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold break-words text-text-app">{user.displayName}</span>
              <span className="block text-xs break-all text-muted-app">{user.email}</span>
            </span>
          </div>
          <div className="mx-1 border-t border-border-app" />
          <Link role="menuitem" to="/workspace" onClick={() => setOpen(false)}
            className="mt-1 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-text-app no-underline transition-colors hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app">
            <AppIcon name="briefcase" className="size-4.5 text-primary-app" />
            <span className="min-w-0 flex-1">{t("common.myWorkspace")}</span>
          </Link>
          <button role="menuitem" type="button" disabled={logout.isPending} onClick={() => void signOut()}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-danger-app transition-colors hover:bg-danger-app/10 focus-visible:outline-2 focus-visible:outline-ring-app disabled:opacity-50">
            <AppIcon name="logout" className="size-4.5" />
            <span className="min-w-0 flex-1">{t("auth.logout")}</span>
          </button>
          {logout.isError && <p role="alert" className="px-3 pt-1 pb-2 text-xs text-danger-app">{t("auth.logoutError")}</p>}
        </div>
      )}
    </div>
  );
}
