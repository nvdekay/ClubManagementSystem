import { createRequire } from "node:module";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { ExportCell, ExportFileWriter, ExportTable } from "../../domain/data-export.js";

const require = createRequire(import.meta.url);
// DejaVu covers Vietnamese diacritics; PDFKit's built-in fonts do not.
const regularFont = require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans.ttf");
const boldFont = require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf");

function csvCell(value: ExportCell): string {
  const raw = value === null ? "" : String(value);
  // Quote when needed, and neutralise spreadsheet formulas (CSV injection).
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll("\"", "\"\"")}"` : safe;
}

function csv(heading: string[], table: ExportTable): Buffer {
  const lines = [...heading.map((line) => csvCell(line)), "",
    table.columns.map(csvCell).join(","), ...table.rows.map((row) => row.map(csvCell).join(","))];
  // BOM so Excel opens UTF-8 Vietnamese text correctly.
  return Buffer.from(`\uFEFF${lines.join("\r\n")}\r\n`, "utf8");
}

async function xlsx(title: string, heading: string[], table: ExportTable): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "UCMS";
  const sheet = workbook.addWorksheet(title.slice(0, 31));
  sheet.addRow([title]).font = { bold: true, size: 14 };
  for (const line of heading) sheet.addRow([line]).font = { italic: true };
  sheet.addRow([]);
  const header = sheet.addRow(table.columns);
  header.font = { bold: true };
  header.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF9" } }; });
  for (const row of table.rows) sheet.addRow(row.map((cell) => cell ?? ""));
  sheet.views = [{ state: "frozen", ySplit: header.number }];
  table.columns.forEach((column, index) => {
    const widest = Math.max(column.length, ...table.rows.map((row) => String(row[index] ?? "").length));
    sheet.getColumn(index + 1).width = Math.min(60, Math.max(10, widest + 2));
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function pdf(title: string, heading: string[], table: ExportTable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 32 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.registerFont("regular", regularFont);
    doc.registerFont("bold", boldFont);
    doc.font("bold").fontSize(14).text(title);
    doc.font("regular").fontSize(8);
    for (const line of heading) doc.text(line);
    doc.moveDown();

    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const columnWidth = width / table.columns.length;
    function drawRow(cells: ExportCell[], font: "regular" | "bold"): void {
      doc.font(font).fontSize(7);
      const texts = cells.map((cell) => (cell === null ? "" : String(cell)));
      const height = Math.max(...texts.map((value) => doc.heightOfString(value, { width: columnWidth - 4 }))) + 6;
      if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        if (font === "regular") drawRow(table.columns, "bold");
        doc.font(font).fontSize(7);
      }
      const top = doc.y;
      texts.forEach((value, index) => {
        const left = doc.page.margins.left + index * columnWidth;
        doc.rect(left, top, columnWidth, height).stroke("#c9d1df");
        doc.fillColor("#111111").text(value, left + 2, top + 3, { width: columnWidth - 4 });
      });
      doc.y = top + height;
    }
    drawRow(table.columns, "bold");
    for (const row of table.rows) drawRow(row, "regular");
    doc.end();
  });
}

export function exportFileWriter(): ExportFileWriter {
  return {
    async write(format, title, heading, table) {
      switch (format) {
        case "csv": return { bytes: csv(heading, table), mimeType: "text/csv; charset=utf-8", extension: "csv" };
        case "xlsx": return { bytes: await xlsx(title, heading, table), extension: "xlsx",
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
        case "pdf": return { bytes: await pdf(title, heading, table), mimeType: "application/pdf", extension: "pdf" };
      }
    },
  };
}
