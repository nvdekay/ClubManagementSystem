import { proposalDocumentMaxBytes } from "@/utils/proposalFile";
import { documentHref, type DocumentLink } from "@/utils/documentLinks";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const MAX_XML_BYTES = 12 * 1024 * 1024;

export interface WordDocument {
  tables: string[][][];
  paragraphs: string[];
  blocks?: WordBlock[];
}

export interface WordText { text: string; links?: DocumentLink[] }
export interface WordCell extends WordText { columnSpan: number; rowSpan: number }
export type WordBlock = { kind: "paragraph"; text: string; heading: number; links?: DocumentLink[] }
  | { kind: "table"; rows: WordCell[][] };

// Read only document.xml, with bounds checked before accessing ZIP offsets.
async function readDocxPart(buffer: ArrayBuffer, part: string, optional = false): Promise<string> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) {
      end = i;
      break;
    }
  }
  if (end < 0 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw new Error("invalid_docx");
  const entries = view.getUint16(end + 10, true);
  const directoryEnd = view.getUint32(end + 16, true) + view.getUint32(end + 12, true);
  let offset = view.getUint32(end + 16, true);
  if (directoryEnd > end || entries > 10000) throw new Error("invalid_docx");
  for (let i = 0; i < entries; i += 1) {
    if (offset + 46 > directoryEnd || view.getUint32(offset, true) !== 0x02014b50) throw new Error("invalid_docx");
    const nameLength = view.getUint16(offset + 28, true);
    const next = offset + 46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
    if (next > directoryEnd) throw new Error("invalid_docx");
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (name === part) {
      const size = view.getUint32(offset + 24, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const local = view.getUint32(offset + 42, true);
      const method = view.getUint16(offset + 10, true);
      if (view.getUint16(offset + 8, true) & 1 || size > MAX_XML_BYTES || !size || local + 30 > offset) throw new Error("invalid_docx");
      if (view.getUint32(local, true) !== 0x04034b50 || view.getUint16(local + 8, true) !== method) throw new Error("invalid_docx");
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      if (start + compressedSize > offset || compressedSize > proposalDocumentMaxBytes) throw new Error("invalid_docx");
      const compressed = bytes.slice(start, start + compressedSize);
      let xml: Uint8Array;
      if (method === 0) xml = compressed;
      else if (method === 8) {
        const reader = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
        const chunks: Uint8Array[] = [];
        let total = 0;
        try {
          for (;;) {
            const chunk = await reader.read();
            if (chunk.done) break;
            total += chunk.value.length;
            if (total > MAX_XML_BYTES || total > size) throw new Error("invalid_docx");
            chunks.push(chunk.value);
          }
        } finally {
          await reader.cancel();
        }
        xml = new Uint8Array(total);
        let position = 0;
        for (const chunk of chunks) { xml.set(chunk, position); position += chunk.length; }
      } else throw new Error("invalid_docx");
      if (xml.length !== size) throw new Error("invalid_docx");
      return new TextDecoder("utf-8", { fatal: true }).decode(xml);
    }
    offset = next;
  }
  if (optional) return "";
  throw new Error("invalid_docx");
}

export function readDocxXml(buffer: ArrayBuffer): Promise<string> { return readDocxPart(buffer, "word/document.xml"); }
export function readDocxRelationships(buffer: ArrayBuffer): Promise<string> { return readDocxPart(buffer, "word/_rels/document.xml.rels", true); }

function joinText(parts: WordText[], separator: string): WordText {
  let text = "";
  const links: DocumentLink[] = [];
  for (const part of parts) {
    if (text) text += separator;
    const offset = text.length;
    links.push(...(part.links ?? []).map((link) => ({ ...link, start: link.start + offset, end: link.end + offset })));
    text += part.text;
  }
  const padding = text.length - text.trimStart().length;
  const trimmed = text.trim();
  return { text: trimmed, links: links.map((link) => ({ ...link, start: Math.max(0, link.start - padding), end: Math.min(trimmed.length, link.end - padding) })).filter((link) => link.end > link.start) };
}

// Preserve paragraph boundaries and table cells, including vertically merged continuations.
export function parseWordXml(xml: string, relationshipsXml = ""): WordDocument {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml + relationshipsXml)) throw new Error("invalid_docx");
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length || doc.documentElement.namespaceURI !== WORD_NS) throw new Error("invalid_docx");
  const relationships = new Map<string, string>();
  if (relationshipsXml) {
    const rels = new DOMParser().parseFromString(relationshipsXml, "application/xml");
    if (rels.getElementsByTagName("parsererror").length) throw new Error("invalid_docx");
    for (const rel of Array.from(rels.getElementsByTagNameNS("*", "Relationship"))) {
      const href = documentHref(rel.getAttribute("Target") ?? "");
      if (href && rel.getAttribute("Type")?.endsWith("/hyperlink") && rel.getAttribute("TargetMode") === "External") relationships.set(rel.getAttribute("Id") ?? "", href);
    }
  }
  function paragraphData(paragraph: Element): WordText {
    let text = "";
    const links: DocumentLink[] = [];
    function visit(node: Element) {
      if (node.namespaceURI === WORD_NS && node.localName === "t") { text += node.textContent ?? ""; return; }
      if (node.namespaceURI === WORD_NS && ["br", "cr", "tab"].includes(node.localName)) { text += node.localName === "tab" ? "\t" : "\n"; return; }
      const start = text.length;
      for (const child of Array.from(node.children)) visit(child);
      if (node.namespaceURI === WORD_NS && node.localName === "hyperlink") {
        const href = relationships.get(node.getAttributeNS(REL_NS, "id") ?? "");
        if (href && text.length > start) links.push({ start, end: text.length, href });
      }
    }
    visit(paragraph);
    return { text, links };
  }
  function textData(element: Element): WordText { return joinText(Array.from(element.getElementsByTagNameNS(WORD_NS, "p")).map(paragraphData), "\n"); }
  function text(element: Element): string {
    return textData(element).text;
  }
  function attribute(element: Element | undefined, name: string): string {
    return element?.getAttributeNS(WORD_NS, name) ?? "";
  }
  function richTable(table: Element): WordCell[][] {
    const active = new Map<number, WordCell>();
    return Array.from(table.children).filter((row) => row.localName === "tr").map((row) => {
      let column = 0;
      const cells: WordCell[] = [];
      for (const cell of Array.from(row.children).filter((node) => node.localName === "tc")) {
        const span = Math.min(100, Math.max(1, Number(attribute(cell.getElementsByTagNameNS(WORD_NS, "gridSpan")[0], "val")) || 1));
        const merge = cell.getElementsByTagNameNS(WORD_NS, "vMerge")[0];
        const previous = active.get(column);
        if (merge && attribute(merge, "val") !== "restart" && previous) {
          previous.rowSpan += 1;
          const continuation = textData(cell);
          if (continuation.text) Object.assign(previous, joinText([previous, continuation], "\n"));
        } else {
          const value = { ...textData(cell), columnSpan: span, rowSpan: 1 };
          cells.push(value);
          for (let i = 0; i < span; i += 1) {
            if (merge) active.set(column + i, value);
            else active.delete(column + i);
          }
        }
        column += span;
      }
      return cells;
    });
  }
  const body = doc.getElementsByTagNameNS(WORD_NS, "body")[0];
  const blocks: WordBlock[] = [];
  for (const node of Array.from(body?.children ?? [])) {
    if (node.localName === "tbl") blocks.push({ kind: "table", rows: richTable(node) });
    if (node.localName === "p") {
      const value = joinText([paragraphData(node)], "");
      const style = attribute(node.getElementsByTagNameNS(WORD_NS, "pStyle")[0], "val");
      const heading = /heading\s*([1-6])/i.exec(style);
      if (value.text) blocks.push({ kind: "paragraph", ...value, heading: heading ? Number(heading[1]) : 0 });
    }
  }
  return {
    blocks,
    tables: Array.from(doc.getElementsByTagNameNS(WORD_NS, "tbl")).map((table) =>
      Array.from(table.children).filter((row) => row.localName === "tr").map((row) =>
        Array.from(row.children).filter((cell) => cell.localName === "tc").map(text))),
    paragraphs: Array.from(doc.getElementsByTagNameNS(WORD_NS, "p"))
      .map((p) => paragraphData(p).text.trim()).filter(Boolean),
  };
}
