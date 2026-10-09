import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { appToast } from "@/components/ui/toast/AppToast";
import { useAuth } from "@/hooks/useAuth";
import {
  useClubFields, useCreateClubField, useRemoveClubField, useUpdateClubField,
} from "@/hooks/useClubFields";
import { DuplicateClubFieldError, type ClubFieldInput, type ClubFieldUsage } from "@/services/clubFields";

interface FieldDraft {
  name: string;
  sortOrder: string;
}

function parsed(draft: FieldDraft): ClubFieldInput | null {
  const name = draft.name.trim();
  const sortOrder = Number(draft.sortOrder);
  if (!name || name.length > 100 || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10_000) {
    return null;
  }
  return { name, sortOrder };
}

interface FieldRowProps {
  field: ClubFieldUsage;
  csrfToken: string;
}

function FieldRow({ field, csrfToken }: FieldRowProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<FieldDraft | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateClubField();
  const remove = useRemoveClubField();
  const inUse = field.clubCount + field.applicationCount > 0;
  const counts = { clubs: field.clubCount, applications: field.applicationCount };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const input = parsed(draft);
    if (!input) { setError(t("clubFields.invalid")); return; }
    setError(null);
    try {
      await update.mutateAsync({ id: field.id, input, csrfToken });
      setDraft(null);
      appToast.success(t("clubFields.updated"));
    } catch (failure) {
      setError(failure instanceof DuplicateClubFieldError ? t("clubFields.duplicate")
        : `${t("clubFields.failed")} ${(failure as Error).message}`);
    }
  }

  async function confirmRemove() {
    try {
      const result = await remove.mutateAsync({ id: field.id, csrfToken });
      appToast.success(t(result === "deleted" ? "clubFields.deleted" : "clubFields.deactivated"));
    } catch (failure) {
      setError(`${t("clubFields.failed")} ${(failure as Error).message}`);
    } finally {
      setConfirming(false);
    }
  }

  if (draft) {
    return (
      <li className="py-4">
        <form className="grid items-end gap-3 sm:grid-cols-[1fr_8rem_auto]" onSubmit={(event) => void save(event)}>
          <label className="text-sm">{t("clubFields.name")}
            <AppInput className="mt-1 block w-full" maxLength={100} value={draft.name} autoFocus
              onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label className="text-sm">{t("clubFields.order")}
            <AppInput className="mt-1 block w-full" type="number" min="0" max="10000" value={draft.sortOrder}
              onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} />
          </label>
          <div className="flex flex-wrap gap-2">
            <AppButton type="submit" disabled={update.isPending}>
              {update.isPending ? t("clubFields.saving") : t("clubFields.save")}
            </AppButton>
            <AppButton type="button" variant="ghost" onClick={() => { setDraft(null); setError(null); }}>
              {t("clubFields.cancel")}
            </AppButton>
          </div>
        </form>
        {inUse && <p className="mt-2 text-xs text-muted-app">{t("clubFields.renameHint")}</p>}
        {error && <p role="alert" className="mt-2 text-sm text-danger-app">{error}</p>}
      </li>
    );
  }

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold break-words">{field.name}</p>
            {!field.isActive && <AppBadge tone="warning">{t("clubFields.hidden")}</AppBadge>}
          </div>
          <p className="mt-1 text-sm text-muted-app">
            {t("clubFields.order")}: {field.sortOrder} · {t("clubFields.usage", counts)}
          </p>
          {!field.isActive && <p className="mt-1 text-xs text-muted-app">{t("clubFields.hiddenHint")}</p>}
        </div>
        {field.isActive && !confirming && (
          <div className="flex flex-wrap gap-2">
            <AppButton variant="secondary"
              onClick={() => setDraft({ name: field.name, sortOrder: String(field.sortOrder) })}>
              {t("clubFields.edit")}
            </AppButton>
            <AppButton variant="ghost" onClick={() => setConfirming(true)}>{t("clubFields.delete")}</AppButton>
          </div>
        )}
      </div>
      {confirming && (
        <AppNotice className="mt-3" tone="warning" role="alert"
          title={t("clubFields.confirmDelete", { name: field.name })}>
          <p>{inUse ? t("clubFields.confirmInUse", counts) : t("clubFields.confirmUnused")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <AppButton disabled={remove.isPending} onClick={() => void confirmRemove()}>
              {remove.isPending ? t("clubFields.deleting") : t("clubFields.confirm")}
            </AppButton>
            <AppButton variant="ghost" onClick={() => setConfirming(false)}>{t("clubFields.cancel")}</AppButton>
          </div>
        </AppNotice>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-danger-app">{error}</p>}
    </li>
  );
}

function AddFieldForm({ csrfToken, nextOrder }: { csrfToken: string; nextOrder: number }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<FieldDraft>({ name: "", sortOrder: "" });
  const [error, setError] = useState<string | null>(null);
  const create = useCreateClubField();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = parsed({ ...draft, sortOrder: draft.sortOrder || String(nextOrder) });
    if (!input) { setError(t("clubFields.invalid")); return; }
    setError(null);
    try {
      await create.mutateAsync({ input, csrfToken });
      setDraft({ name: "", sortOrder: "" });
      appToast.success(t("clubFields.created"));
    } catch (failure) {
      setError(failure instanceof DuplicateClubFieldError ? t("clubFields.duplicate")
        : `${t("clubFields.failed")} ${(failure as Error).message}`);
    }
  }

  return (
    <form className="space-y-3 rounded-2xl bg-surface-app p-4 sm:p-5" onSubmit={(event) => void submit(event)}>
      <h2 className="font-heading font-semibold">{t("clubFields.addTitle")}</h2>
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_8rem_auto]">
        <label className="text-sm">{t("clubFields.name")}
          <AppInput className="mt-1 block w-full" maxLength={100} value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </label>
        <label className="text-sm">{t("clubFields.order")}
          <AppInput className="mt-1 block w-full" type="number" min="0" max="10000"
            placeholder={String(nextOrder)} value={draft.sortOrder}
            onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} />
        </label>
        <AppButton type="submit" disabled={create.isPending}>
          <AppIcon name="plus" className="size-4" />
          {create.isPending ? t("clubFields.adding") : t("clubFields.add")}
        </AppButton>
      </div>
      <p className="text-xs text-muted-app">{t("clubFields.orderHint")}</p>
      {error && <p role="alert" className="text-sm text-danger-app">{error}</p>}
    </form>
  );
}

export function ClubFieldsPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const isOfficer = auth.data?.systemRoles.includes("ICPDP_OFFICER") ?? false;
  const fields = useClubFields(isOfficer);
  const csrfToken = auth.data?.csrfToken ?? "";
  const nextOrder = fields.data?.length
    ? Math.min(10_000, Math.max(...fields.data.map((field) => field.sortOrder)) + 10) : 10;

  return (
    <>
      <PageHeader title={t("clubFields.title")} description={t("clubFields.description")} />
      {auth.isPending ? (
        <AppSkeleton className="h-44 w-full" />
      ) : auth.isError ? (
        <AppNotice tone="danger" role="alert" title={auth.error.message}>
          <AppButton onClick={() => void auth.refetch()}>{t("clubFields.retry")}</AppButton>
        </AppNotice>
      ) : !auth.data ? (
        <AppNotice>
          <p>{t("clubFields.signIn")}</p>
          <Link className="font-semibold text-accent-app"
            to="/login?returnTo=%2Fworkspace%2Fclub-fields">{t("clubFields.signInLink")}</Link>
        </AppNotice>
      ) : !isOfficer ? (
        <AppNotice tone="danger" role="alert">{t("clubFields.forbidden")}</AppNotice>
      ) : fields.isPending ? (
        <AppSkeleton className="h-44 w-full" />
      ) : fields.isError ? (
        <AppNotice tone="danger" role="alert" title={`${t("clubFields.loadError")} ${fields.error.message}`}>
          <AppButton onClick={() => void fields.refetch()}>{t("clubFields.retry")}</AppButton>
        </AppNotice>
      ) : (
        <div className="space-y-6">
          {fields.data.length === 0 ? (
            <AppNotice>{t("clubFields.empty")}</AppNotice>
          ) : (
            <ul className="divide-y divide-border-app border-y border-border-app">
              {fields.data.map((field) => (
                <FieldRow key={field.id} field={field} csrfToken={csrfToken} />
              ))}
            </ul>
          )}
          <AddFieldForm csrfToken={csrfToken} nextOrder={nextOrder} />
        </div>
      )}
    </>
  );
}
