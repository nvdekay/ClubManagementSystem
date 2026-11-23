import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchEventProposalPreviewFile } from "@/services/clubEvents";

const access = { fileName: "Proposal.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", url: "https://documents.example/proposal.docx" };

afterEach(() => vi.unstubAllGlobals());

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
