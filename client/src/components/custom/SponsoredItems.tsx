import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppMoneyInput } from "@/components/ui/money-input/AppMoneyInput";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useConfirm } from "@/hooks/useConfirm";
import { useInvoiceImage, useSponsoredItemAction, useSponsoredItems } from "@/hooks/useSponsoredItems";
import type { ItemAction, SponsoredItem, SponsoredBudget } from "@/services/sponsoredItems";

function InvoicePreview({ budgetId, clubId, itemId, imageId, name }: {
  budgetId: string; clubId?: string; itemId: string; imageId: string; name: string;
}) {
  const { t } = useTranslation();
  const image = useInvoiceImage(budgetId, clubId, itemId, imageId);
  if (image.isPending) return <AppSkeleton className="h-28 w-full" />;
  if (image.isError) return <p role="alert" className="text-sm text-danger-app">{t("sponsoredItems.imageError")}</p>;
  return <a href={image.data?.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-border-app p-2">
    <img src={image.data?.url} alt={name} className="h-28 w-full object-contain" />
    <span className="mt-1 block break-words text-xs text-primary-app">{t("sponsoredItems.view")}: {name}</span>
  </a>;
}

function ItemCard({ budget, item, clubId, csrfToken }: { budget: SponsoredBudget; item: SponsoredItem; clubId?: string; csrfToken: string }) {
  const { t, i18n } = useTranslation();
  const confirm = useConfirm();
  const mutation = useSponsoredItemAction(budget.id, clubId, csrfToken);
  const [amount, setAmount] = useState(String(item.amount));
  const [description, setDescription] = useState(item.description);
  const [valid, setValid] = useState(String(item.amount));
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");
  const deadline = new Date(new Date(item.eventEndAt).getTime() + 14 * 86400000);
  const now = new Date();
  const active = ["Approved", "Upcoming", "Ongoing", "Completed", "Report Submitted", "Closed"].includes(budget.eventState);
  const editable = Boolean(clubId) && active && ["Draft", "Returned"].includes(item.status) && now <= deadline;
  const expired = ["Draft", "Returned"].includes(item.status) && now > deadline;
  const canSubmit = editable && item.fundingDecision !== "NOT_SPONSORED" && item.images.length > 0 && item.amount > 0
    && (item.fundingDecision === "BEFORE_EVENT" || now >= new Date(item.eventEndAt));
  const dirty = Number(amount) !== item.amount || description !== item.description;
  function money(value: number) { return new Intl.NumberFormat(i18n.language, { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value); }
  async function act(action: ItemAction) {
    setError("");
    try { await mutation.mutateAsync({ itemId: item.id, revision: budget.revision, action }); }
    catch { setError(t("sponsoredItems.error")); }
  }
  async function upload(files: File[]) {
    if (!editable || mutation.isPending) return;
    setError("");
    if (!files.length || item.images.length + files.length > 5
      || files.some((file) => !["image/jpeg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setError(t("sponsoredItems.invalidImages")); return;
    }
    setProgress({ done: 0, total: files.length });
    try { await mutation.mutateAsync({ itemId: item.id, revision: budget.revision, files,
      onProgress: (done) => setProgress({ done, total: files.length }) }); }
    catch { setError(t("sponsoredItems.error")); }
  }
  return <article className="rounded-xl border border-border-app bg-bg-app p-4 sm:p-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h4 className="font-semibold text-text-app">{item.category}</h4><p className="mt-1 text-sm text-primary-app">{t(`sponsoredItems.${item.fundingDecision}`)}</p></div>
      <span className="rounded-full bg-primary-app/10 px-3 py-1 text-sm text-primary-app">{t(`sponsoredItems.${expired ? "Expired" : item.status}`)}</span>
    </header>
    <p className="mt-3 text-sm">{t("sponsoredItems.cap")}: <strong>{money(item.approvedAmount)}</strong></p>
    {item.reason && <p className="mt-1 text-sm text-muted-app">{item.reason}</p>}
    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-app">
      <p>{t("sponsoredItems.opens")}: {new Date(item.fundingDecision === "AFTER_EVENT" ? item.eventEndAt : item.approvedAt).toLocaleString(i18n.language)}</p>
      <p>{t("sponsoredItems.deadline")}: {deadline.toLocaleString(i18n.language)}</p>
    </div>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="text-sm">{t("sponsoredItems.amount")}<AppMoneyInput value={amount} onValueChange={setAmount} disabled={!editable || mutation.isPending} className="mt-1 w-full" /></label>
      <label className="text-sm">{t("sponsoredItems.description")}<AppTextarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={!editable || mutation.isPending} maxLength={2000} className="mt-1 w-full" /></label>
    </div>
    {editable && <AppButton className="mt-3" disabled={mutation.isPending || !dirty || Number(amount) <= 0} onClick={() => void act({ kind: "save", amount: Number(amount), description })}>{t("sponsoredItems.save")}</AppButton>}
    <div className="mt-5 rounded-xl border border-dashed border-border-app p-4" onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); void upload(Array.from(event.dataTransfer.files)); }}>
      <p className="text-sm font-medium">{t("sponsoredItems.images")} · {item.images.length}/5</p>
      <p className="mt-1 text-xs text-muted-app">{t("sponsoredItems.imageHint")}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {item.images.map((image) => <div key={image.id}><InvoicePreview budgetId={budget.id} clubId={clubId} itemId={item.id} imageId={image.id} name={image.fileName} />
          {editable && <AppButton variant="ghost" disabled={mutation.isPending} onClick={() => void act({ kind: "removeImage", imageId: image.id })}>{t("sponsoredItems.remove")}</AppButton>}
        </div>)}
      </div>
      {editable && item.images.length < 5 && <label className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-border-app bg-surface-app px-4 text-sm font-medium text-primary-app hover:bg-surface-strong-app focus-within:outline-2 focus-within:outline-ring-app">
        {t("sponsoredItems.upload")}<input type="file" accept="image/jpeg,image/png" multiple disabled={mutation.isPending}
          className="sr-only" onChange={(event) => { void upload(Array.from(event.target.files ?? [])); event.target.value = ""; }} /></label>}
      {progress.total > 0 && <p role="status" className="mt-2 text-sm text-muted-app">{t("sponsoredItems.progress", progress)}</p>}
    </div>
    {clubId && <AppButton className="mt-4" disabled={!canSubmit || dirty || mutation.isPending}
      onClick={async () => { if (await confirm(t("sponsoredItems.submitConfirm"))) await act({ kind: "submit" }); }}>{t("sponsoredItems.submit")}</AppButton>}
    {item.reviewReason && <p className="mt-4 whitespace-pre-wrap text-sm">{item.reviewReason}</p>}
    {item.payable !== undefined && <p className="mt-3 font-semibold">{t("sponsoredItems.payable")}: {money(item.payable)}</p>}
    {!clubId && active && item.status === "Submitted" && <div className="mt-4 space-y-3">
      <label className="block text-sm">{t("sponsoredItems.valid")}<AppMoneyInput value={valid} onValueChange={setValid} className="mt-1 w-full" /></label>
      <label className="block text-sm">{t("sponsoredItems.reason")}<AppTextarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000} className="mt-1 w-full" /></label>
      <div className="flex flex-wrap gap-2"><AppButton disabled={mutation.isPending || !reason.trim()} onClick={() => void act({ kind: "review", validAmount: Number(valid), reason })}>{t("sponsoredItems.review")}</AppButton>
        <AppButton variant="ghost" disabled={mutation.isPending || !reason.trim() || now >= deadline} onClick={() => void act({ kind: "return", reason })}>{t("sponsoredItems.return")}</AppButton></div>
    </div>}
    {!clubId && active && item.status === "Accepted" && <div className="mt-4 space-y-3">
      <label className="block text-sm">{t("sponsoredItems.reference")}<AppInput value={reference} onChange={(event) => setReference(event.target.value)} maxLength={200} className="mt-1 w-full" /></label>
      <AppButton disabled={mutation.isPending || !reference.trim() || (item.fundingDecision === "AFTER_EVENT" && now < new Date(item.eventEndAt))}
        onClick={async () => { if (await confirm(t("sponsoredItems.payConfirm", { amount: money(item.payable!) })))
          await act({ kind: "pay", amount: item.payable!, paidAt: new Date().toISOString(), paymentReference: reference }); }}>{t("sponsoredItems.pay")}</AppButton>
    </div>}
    {!active && <p className="mt-3 text-sm text-warning-app">{t("sponsoredItems.paused")}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-danger-app">{error}</p>}
  </article>;
}

export function SponsoredItems({ budgetId, clubId, csrfToken, fallback = null }: { budgetId: string; clubId?: string; csrfToken: string; fallback?: ReactNode }) {
  const { t, i18n } = useTranslation();
  const query = useSponsoredItems(budgetId, clubId);
  if (query.isPending) return <AppSkeleton className="mt-5 h-48" />;
  if (query.isError) return <p role="alert" className="mt-4 text-danger-app">{t("sponsoredItems.error")}</p>;
  if (!query.data) return <>{fallback}</>;
  const totals = [
    { label: t("budgets.approved"), amount: query.data.items.reduce((sum, item) => sum + item.approvedAmount, 0) },
    { label: t("accountability.recorded"), amount: query.data.items.reduce((sum, item) => sum + item.amount, 0) },
    { label: t("budgets.transferred"), amount: query.data.items.reduce((sum, item) => sum + (item.status === "Paid" ? item.payable ?? 0 : 0), 0) },
  ];
  return <section className="mt-6 space-y-4"><h3 className="font-heading text-lg font-semibold">{t("sponsoredItems.title")}</h3>
    <p className="text-sm text-muted-app">{t("sponsoredItems.hint")}</p>
    <dl className="grid gap-3 sm:grid-cols-3">{totals.map((total) => <div key={total.label} className="rounded-xl border border-border-app bg-bg-app p-4">
      <dt className="text-sm text-muted-app">{total.label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{new Intl.NumberFormat(i18n.language, { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(total.amount)}</dd>
    </div>)}</dl>
    {query.data.items.map((item) => <ItemCard key={item.id} budget={query.data!} item={item} clubId={clubId} csrfToken={csrfToken} />)}
  </section>;
}
