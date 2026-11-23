import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";

interface EventProposalDocumentProps { file: File }
interface PreviewStatus { id: string; state: "loading" | "ready" | "error"; pages: number; page: number; zoom: number }

// A separate document realm keeps Word styles and pagination away from the application theme.
export function EventProposalDocument({ file }: EventProposalDocumentProps) {
  const { t } = useTranslation();
  const frame = useRef<HTMLIFrameElement>(null);
  const id = useMemo(() => `${file.name}-${crypto.randomUUID()}`, [file]);
  const [result, setResult] = useState<PreviewStatus>({ id, state: "loading", pages: 0, page: 1, zoom: 100 });
  const status: PreviewStatus = result.id === id ? result : { id, state: "loading", pages: 0, page: 1, zoom: 100 };
  const pdfUrl = useMemo(() => file.type === "application/pdf" ? URL.createObjectURL(file) : null, [file]);

  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);
  useEffect(() => {
    if (pdfUrl) return;
    let sent = false;
    function colors() {
      const style = getComputedStyle(document.documentElement);
      return { canvas: style.getPropertyValue("--color-surface-app"), paper: style.getPropertyValue("--color-document-paper-app"),
        ink: style.getPropertyValue("--color-document-ink-app"), shadow: style.getPropertyValue("--color-document-shadow-app") };
    }
    function message(event: MessageEvent<unknown>) {
      if (event.source !== frame.current?.contentWindow || event.origin !== window.location.origin || !event.data || typeof event.data !== "object") return;
      const data = event.data as Record<string, unknown>;
      if (data.channel !== "proposal-preview") return;
      if (data.type === "ready" && !sent) {
        sent = true;
        frame.current?.contentWindow?.postMessage({ channel: "proposal-preview", type: "render", id, file,
          colors: colors() }, window.location.origin);
      }
      if (data.id !== id) return;
      if (data.type === "rendered" && typeof data.pages === "number") setResult((old) => ({ id, state: "ready", pages: data.pages as number, page: 1, zoom: old.id === id ? old.zoom : 100 }));
      if (data.type === "error") setResult({ id, state: "error", pages: 0, page: 1, zoom: 100 });
      if (data.type === "page" && typeof data.page === "number") setResult((old) => old.id === id ? { ...old, page: data.page as number } : old);
      if (data.type === "zoom" && typeof data.zoom === "number") setResult((old) => ({ ...(old.id === id ? old : { id, state: "loading", pages: 0, page: 1, zoom: 100 }), zoom: data.zoom as number }));
    }
    window.addEventListener("message", message);
    frame.current?.contentWindow?.postMessage({ channel: "proposal-preview", type: "initialize" }, window.location.origin);
    const theme = new MutationObserver(() => frame.current?.contentWindow?.postMessage({ channel: "proposal-preview", type: "theme", id, colors: colors() }, window.location.origin));
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const timeout = window.setTimeout(() => setResult((old) => old.id === id && old.state === "ready" ? old : { id, state: "error", pages: 0, page: 1, zoom: 100 }), 60_000);
    return () => { window.removeEventListener("message", message); theme.disconnect(); window.clearTimeout(timeout); };
  }, [file, id, pdfUrl]);

  function command(type: string, extra: Record<string, unknown> = {}) {
    frame.current?.contentWindow?.postMessage({ channel: "proposal-preview", id, type, ...extra }, window.location.origin);
  }

  return <section aria-label={t("clubEvents.documentViewer")} className="overflow-hidden rounded-2xl border border-border-app bg-surface-app shadow-xs">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-app bg-bg-app px-4 py-3">
      <div className="min-w-0 flex-1 basis-44">
        <h2 className="font-heading font-semibold">{t("clubEvents.documentViewer")}</h2>
        <p className="break-words text-xs text-muted-app">{file.name}</p>
      </div>
      {!pdfUrl && <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label={t("clubEvents.documentViewer")}>
        <AppButton type="button" variant="ghost" aria-label={t("clubEvents.documentPrevious")} disabled={status.state !== "ready" || status.page <= 1} onClick={() => command("page", { page: status.page - 1 })}>‹</AppButton>
        <span className="text-sm tabular-nums" aria-live="polite">{t("clubEvents.documentPage", { page: status.page, total: status.pages || "…" })}</span>
        <AppButton type="button" variant="ghost" aria-label={t("clubEvents.documentNext")} disabled={status.state !== "ready" || status.page >= status.pages} onClick={() => command("page", { page: status.page + 1 })}>›</AppButton>
        <span className="mx-1 h-5 border-l border-border-app" aria-hidden="true" />
        <AppButton type="button" variant="ghost" aria-label={t("clubEvents.documentZoomOut")} disabled={status.state !== "ready" || status.zoom <= 25} onClick={() => command("zoom", { value: (status.zoom - 10) / 100 })}>−</AppButton>
        <span className="text-xs tabular-nums">{status.zoom}%</span>
        <AppButton type="button" variant="ghost" aria-label={t("clubEvents.documentZoomIn")} disabled={status.state !== "ready" || status.zoom >= 200} onClick={() => command("zoom", { value: (status.zoom + 10) / 100 })}>+</AppButton>
        <AppButton type="button" variant="ghost" disabled={status.state !== "ready"} onClick={() => command("zoom", { value: "fit" })}>{t("clubEvents.documentFit")}</AppButton>
        <AppButton type="button" variant="secondary" disabled={status.state !== "ready"} onClick={() => command("print")}>{t("clubEvents.documentPrint")}</AppButton>
      </div>}
    </div>
    {!pdfUrl && status.state === "loading" && <p role="status" className="px-5 py-4 text-sm text-muted-app">{t("clubEvents.documentLoading")}</p>}
    {!pdfUrl && status.state === "error" && <div className="p-4"><AppNotice tone="danger" role="alert">{t("clubEvents.documentError")}</AppNotice></div>}
    {(pdfUrl || status.state !== "error") && <iframe key={id} ref={frame} src={pdfUrl ?? `${import.meta.env.BASE_URL}proposal-preview.html`} title={t("clubEvents.documentViewer")}
      onLoad={() => command("initialize")}
      sandbox="allow-scripts allow-same-origin allow-modals allow-popups allow-popups-to-escape-sandbox" className="h-[76vh] min-h-[420px] w-full border-0" />}
  </section>;
}
