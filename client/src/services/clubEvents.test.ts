import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchEventProposalPreviewFile } from "@/services/clubEvents";
import { fetchReviewProposalPreviewFile } from "@/services/eventProposalReviews";

const access = { fileName: "Proposal.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", url: "https://documents.example/proposal.docx" };

afterEach(() => vi.unstubAllGlobals());

describe("submitted proposal review preview", () => {
  it("downloads the requested immutable revision without sending cookies to storage", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: access })))
      .mockResolvedValueOnce(new Response("submitted document"));
    vi.stubGlobal("fetch", fetch);
    const signal = new AbortController().signal;
    const file = await fetchReviewProposalPreviewFile("event/id", 2, signal);
    expect(fetch.mock.calls[0]?.[0]).toBe("/api/v1/admin/event-proposals/event%2Fid/document/access?inline=false&revisionNo=2");
    expect(fetch).toHaveBeenLastCalledWith(access.url, { signal, credentials: "omit" });
    expect(file.name).toBe(access.fileName);
    expect(file.type).toBe(access.mimeType);
    expect(await file.text()).toBe("submitted document");
  });
  it("rejects oversized files even when storage omits the content length", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: access })))
      .mockResolvedValueOnce(new Response(new Uint8Array(10 * 1024 * 1024 + 1))));
    await expect(fetchReviewProposalPreviewFile("event", 2, new AbortController().signal)).rejects.toThrow("Document too large");
  });
  it("reports storage access errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: access })))
      .mockResolvedValueOnce(new Response("Expired", { status: 403 })));
    await expect(fetchReviewProposalPreviewFile("event", 2, new AbortController().signal)).rejects.toThrow("HTTP 403");
  });
});

describe("saved proposal document preview", () => {
  it("retrieves the original file through the signed access URL with cancellation", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: access })))
      .mockResolvedValueOnce(new Response("document content"));
    vi.stubGlobal("fetch", fetch);
    const signal = new AbortController().signal;
    const file = await fetchEventProposalPreviewFile("club", "event", signal);
    expect(file.name).toBe(access.fileName);
    expect(file.type).toBe(access.mimeType);
    expect(await file.text()).toBe("document content");
    expect(fetch).toHaveBeenLastCalledWith(access.url, { signal, credentials: "omit" });
  });
  it("reports failed document downloads rather than rendering an error response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: access })))
      .mockResolvedValueOnce(new Response("Access denied", { status: 403 })));
    await expect(fetchEventProposalPreviewFile("club", "event", new AbortController().signal)).rejects.toThrow("HTTP 403");
  });
  it("rejects an oversized saved file before reading its body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: access })))
      .mockResolvedValueOnce(new Response("", { headers: { "content-length": String(10 * 1024 * 1024 + 1) } })));
    await expect(fetchEventProposalPreviewFile("club", "event", new AbortController().signal)).rejects.toThrow("Document too large");
  });
});
