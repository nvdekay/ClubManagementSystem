import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { UniversityLogo } from "@/components/custom/UniversityLogo";
import { googleLoginUrl } from "@/services/auth";
import { cn } from "@/utils/cn";

interface LoginPageProps {
  authError: string | null;
  isPending: boolean;
  lockedReason?: string | null;
  returnTo: string;
}

export function LoginPage({ authError, isPending, lockedReason, returnTo }: LoginPageProps) {
  const { t } = useTranslation();
  const [loginBusy, setLoginBusy] = useState(false);

  return (
    <main className="flex min-h-full flex-wrap bg-auth-page-bg-app font-auth-body text-auth-page-text-app">
      <section className="relative m-3 flex min-h-70 flex-[1_1_420px] flex-col justify-between gap-12 overflow-hidden rounded-[2rem] bg-primary-soft-app p-[clamp(24px,5vw,64px)]">
        <span aria-hidden="true" className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-auth-orb-large-app opacity-80 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-24 left-1/3 size-48 rounded-full bg-auth-orb-small-app opacity-70 blur-2xl" />
        <UniversityLogo alt={t("auth.schoolLogo")} priority className="relative w-66 sm:w-76" />
        <div className="relative flex max-w-110 flex-col gap-3">
          <span className="font-auth-heading text-[clamp(30px,4vw,44px)] leading-[1.15] font-extrabold tracking-[-0.025em]">
            {t("auth.brand")}
          </span>
          <span className="text-[17px] text-pretty text-muted-app">{t("auth.systemDescription")}</span>
        </div>
      </section>

      <section className="flex flex-[1_1_420px] items-center p-[clamp(24px,5vw,64px)]">
        <div className="flex w-full max-w-100 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="m-0 font-auth-heading text-4xl leading-[1.2] font-bold tracking-[-0.025em]">
              {t("auth.signInTitle")}
            </h1>
            <p className="m-0 text-auth-page-muted-app">{t("auth.signInDescription")}</p>
          </div>

          {authError && (
            <div role="alert" className="flex items-start gap-3 rounded-xl border-l-4 border-danger-app bg-auth-danger-surface-app p-4 text-danger-app">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 size-5 shrink-0 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z" />
                <path d="M12 9v4" /><path d="M12 17h.01" />
              </svg>
              <span className="text-[15px] text-pretty">{authError} {lockedReason}</span>
            </div>
          )}

          <a
            href={googleLoginUrl(returnTo)}
            aria-disabled={isPending || loginBusy}
            onClick={(event) => {
              if (isPending || loginBusy) event.preventDefault();
              else setLoginBusy(true);
            }}
            className={cn("flex min-h-13 items-center justify-center gap-3 rounded-full border border-auth-button-border-app bg-auth-page-bg-app px-6 text-base font-semibold text-auth-page-text-app no-underline shadow-sm transition-colors hover:border-primary-app hover:bg-auth-button-hover-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app", {
              "pointer-events-none opacity-50": isPending || loginBusy,
            })}
          >
            {loginBusy ? (
              <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
            ) : (
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24">
                <path className="fill-google-blue-app" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path className="fill-google-green-app" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path className="fill-google-yellow-app" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path className="fill-google-red-app" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            <span>{loginBusy ? t("auth.signingInGoogle") : t("auth.signInGoogle")}</span>
          </a>

          <p className="m-0 flex items-center gap-2 text-sm text-auth-page-muted-app">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
            </svg>
            {t("auth.allowedDomain")}
          </p>
          <Link to="/" className="inline-flex min-h-11 items-center gap-2 self-start rounded-full font-semibold text-accent-app hover:underline focus-visible:outline-2 focus-visible:outline-ring-app">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            {t("auth.continueAsGuest")}
          </Link>
        </div>
      </section>
    </main>
  );
}
