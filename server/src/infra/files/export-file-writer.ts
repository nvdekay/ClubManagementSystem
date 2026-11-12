import { createRequire } from "node:module";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { SEASONS, type Season, type Trend } from "../../domain/annual-report.js";
import type { AnnualReportDocument, ExportCell, ExportFileWriter, ExportTable } from "../../domain/data-export.js";
import type { Classification } from "../../domain/evaluation.js";

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

/** Title, heading lines, then the table with a frozen header; an empty table says so instead of looking broken. */
function tableSheet(sheet: ExcelJS.Worksheet, title: string, heading: string[], table: ExportTable): void {
  sheet.addRow([title]).font = { bold: true, size: 14 };
  for (const line of heading) sheet.addRow([line]).font = { italic: true };
  sheet.addRow([]);
  addTable(sheet, table);
  const header = sheet.lastRow!.number - table.rows.length;
  if (!table.rows.length) sheet.addRow(["Không có dữ liệu khớp bộ lọc"]).font = { italic: true };
  sheet.views = [{ state: "frozen", ySplit: header }];
  table.columns.forEach((column, index) => {
    const widest = Math.max(column.length, ...table.rows.map((row) => String(row[index] ?? "").length));
    sheet.getColumn(index + 1).width = Math.min(60, Math.max(10, widest + 2));
  });
}

async function xlsx(title: string, heading: string[], table: ExportTable): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "UCMS";
  // Excel sheet names: at most 31 characters, none of []:*?/\ (the COMPLIANCE title has a "/").
  tableSheet(workbook.addWorksheet(title.replace(/[[\]:*?/\\]/g, "-").slice(0, 31)), title, heading, table);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function workbookOf(title: string, heading: string[],
  sheets: { name: string; title: string; table: ExportTable }[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "UCMS";
  const info = workbook.addWorksheet("Thông tin");
  info.addRow([title]).font = { bold: true, size: 14 };
  for (const line of heading) info.addRow([line]).font = { italic: true };
  info.addRow([]);
  addTable(info, { columns: ["Sheet", "Nội dung", "Số dòng"],
    rows: sheets.map((sheet) => [sheet.name, sheet.title, sheet.table.rows.length]) });
  info.getColumn(1).width = 24;
  info.getColumn(2).width = 40;
  for (const sheet of sheets) tableSheet(workbook.addWorksheet(sheet.name), sheet.title, [], sheet.table);
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

    drawTable(doc, table);
    doc.end();
  });
}

function drawTable(doc: PDFKit.PDFDocument, table: ExportTable): void {
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
  doc.x = doc.page.margins.left;
}

/** Report text is Vietnamese, like every exported file. */
const CLASSIFICATION_LABEL: Record<Classification, string> = {
  EXCELLENT: "Xuất sắc", GOOD: "Tốt", FAIR: "Khá", NEEDS_IMPROVEMENT: "Cần cải thiện",
};
const TREND_LABEL: Record<Trend, string> = { UP: "Tăng", DOWN: "Giảm", STABLE: "Ổn định" };

function seasonName(season: Season): string {
  return `${season.charAt(0)}${season.slice(1).toLowerCase()}`;
}

function amount(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
}

function names(items: { clubName: string }[]): string {
  return items.length ? items.map((item) => item.clubName).join(", ") : "không có";
}

function score(value: number | null): string {
  return value === null ? "–" : String(value);
}

interface Block {
  heading: string;
  lines: string[];
  table?: ExportTable;
  /** Printed after the table. */
  closing?: string[];
}

/** The six sections (ASM-AR-01) as text blocks and tables, shared by the pdf and the xlsx. */
function annualContent({ report, achievements, remarks }: AnnualReportDocument) {
  const { overview, evaluation, dimensions, finance, compliance } = report;
  const latest = [...report.terms].reverse().find((term) => term.published);
  const ranking: ExportTable = {
    columns: ["CLB", "Lĩnh vực", "Trạng thái", ...SEASONS.flatMap((season) => [`Điểm ${seasonName(season)}`,
      `Xếp loại ${seasonName(season)}`]), "Số kỳ có đánh giá", "Điểm năm", "Xếp loại năm", "Xu hướng", "Ghi chú"],
    rows: evaluation.rows.map((row) => [row.clubName, row.field, row.state,
      ...SEASONS.flatMap((season) => {
        const term = row.terms[season];
        return term ? [term.score, CLASSIFICATION_LABEL[term.classification]] : [null, null];
      }),
      `${row.evaluatedTerms}/3`, row.yearScore, row.yearClassification ? CLASSIFICATION_LABEL[row.yearClassification] : null,
      row.trend ? TREND_LABEL[row.trend] : null, row.evaluatedTerms === 0 ? "Chưa có đánh giá" : null]),
  };
  const classified: Block = {
    heading: "II. Kết quả đánh giá và xếp loại",
    lines: [
      `Số CLB được đánh giá: ${evaluation.evaluatedClubs}`,
      `Theo xếp loại năm: ${(Object.keys(CLASSIFICATION_LABEL) as Classification[])
        .map((value) => `${CLASSIFICATION_LABEL[value]} ${evaluation.byClassification[value]}`).join(", ")}`,
      `Ngưỡng xếp loại: Xuất sắc ≥ ${report.thresholds.excellent}, Tốt ≥ ${report.thresholds.good}, Khá ≥ ${report.thresholds.fair}`,
      `Điểm năm trung bình toàn trường: ${score(evaluation.averageYearScore)}`,
      `Điểm trung bình từng kỳ: ${SEASONS.map((season) => `${seasonName(season)} ${score(evaluation.averageByTerm[season])}`).join(", ")}`,
      `5 CLB điểm năm cao nhất: ${evaluation.top.map((item, index) => `${index + 1}. ${item.clubName} (${item.yearScore})`).join("; ") || "không có"}`,
    ],
    table: ranking,
  };
  const highest = dimensions.averages.find((item) => item.code === dimensions.highest);
  const lowest = dimensions.averages.find((item) => item.code === dimensions.lowest);
  const blocks: Block[] = [
    { heading: "I. Tổng quan phong trào", lines: [
      `Số CLB theo trạng thái: ${Object.entries(overview.clubsByState).map(([state, count]) => `${state} ${count}`).join(", ")}`,
      `Số CLB thành lập trong năm: ${overview.clubsCreated}`,
      `Tổng thành viên active${latest ? ` (học kỳ ${seasonName(latest.season)} ${report.year})` : ""}: ${overview.activeMembers}`,
      `Tổng sự kiện hoàn thành: ${overview.completedEvents}`,
      `Tổng lượt tham gia: ${overview.participations}`,
    ] },
    classified,
    { heading: "III. Kết quả theo tám tiêu chí", lines: [
      `Tiêu chí cao nhất: ${highest ? `${highest.code} ${highest.name} (${highest.average})` : "–"}`,
      `Tiêu chí thấp nhất: ${lowest ? `${lowest.code} ${lowest.name} (${lowest.average})` : "–"}`,
      "Tiêu chí thiếu dữ liệu không được tính vào điểm trung bình.",
    ], table: { columns: ["Tiêu chí", "Tên", "Điểm trung bình năm"],
      rows: dimensions.averages.map((item) => [item.code, item.name, item.average]) } },
    { heading: "IV. Tài chính", lines: finance.hasData ? [
      `Tổng ngân sách được duyệt: ${amount(finance.approvedTotal)}`,
      `Tổng đã giải ngân: ${amount(finance.disbursedTotal)}`,
      `Tỉ lệ giải ngân: ${finance.disbursementRate === null ? "–" : `${finance.disbursementRate}%`}`,
      `Số CLB chưa có báo cáo định kỳ được chấp nhận: ${finance.clubsWithoutAcceptedReport}`,
    ] : ["Chưa có dữ liệu", `Số CLB chưa có báo cáo định kỳ được chấp nhận: ${finance.clubsWithoutAcceptedReport}`] },
    { heading: "V. Tuân thủ và các CLB cần lưu ý", lines: [
      `Tổng vi phạm còn mở: ${compliance.openViolations}`,
      `CLB xếp loại Cần cải thiện: ${names(compliance.needsImprovement)}`,
      `CLB có xu hướng giảm: ${names(compliance.declining)}`,
      `CLB đang Suspended hoặc Dissolving: ${compliance.suspendedOrDissolving.length
        ? compliance.suspendedOrDissolving.map((item) => `${item.clubName} (${item.state})`).join(", ") : "không có"}`,
    ] },
    { heading: "VI. Thành tích nổi bật và kiến nghị", lines: achievements.length ? [] : ["Không có thành tích được chọn."],
      closing: remarks ? [`Nhận xét của ICPDP: ${remarks}`] : [], ...(achievements.length ? { table: { columns: ["CLB", "Thành tích", "Mô tả", "Học kỳ"],
      rows: achievements.map((item) => [item.clubName, item.title, item.description, item.periodCode]) } } : {}) },
  ];
  const criteria: ExportTable = {
    columns: ["CLB", ...dimensions.averages.map((item) => `${item.code} ${item.name}`)],
    rows: evaluation.rows.filter((row) => row.evaluatedTerms > 0)
      .map((row) => [row.clubName, ...dimensions.averages.map((item) => row.dimensions[item.code])]),
  };
  return { blocks, classified, criteria };
}

function annualPdf(title: string, document: AnnualReportDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 32 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.registerFont("regular", regularFont);
    doc.registerFont("bold", boldFont);
    doc.font("bold").fontSize(14).text(title);
    doc.font("regular").fontSize(9);
    for (const line of document.heading) doc.text(line);
    for (const block of annualContent(document).blocks) {
      doc.moveDown();
      doc.font("bold").fontSize(11).text(block.heading);
      doc.font("regular").fontSize(9);
      for (const line of block.lines) doc.text(line);
      if (block.table) {
        doc.moveDown(0.5);
        drawTable(doc, block.table);
      }
      if (block.closing?.length) doc.moveDown(0.5).font("regular").fontSize(9);
      for (const line of block.closing ?? []) doc.text(line);
    }
    doc.end();
  });
}

function addTable(sheet: ExcelJS.Worksheet, table: ExportTable): void {
  const header = sheet.addRow(table.columns);
  header.font = { bold: true };
  header.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF9" } }; });
  for (const row of table.rows) sheet.addRow(row.map((cell) => cell ?? ""));
}

async function annualXlsx(title: string, document: AnnualReportDocument): Promise<Buffer> {
  const { blocks, classified, criteria } = annualContent(document);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "UCMS";
  const overview = workbook.addWorksheet("Tổng quan");
  overview.addRow([title]).font = { bold: true, size: 14 };
  for (const line of document.heading) overview.addRow([line]).font = { italic: true };
  for (const block of blocks.filter((item) => item !== classified)) {
    overview.addRow([]);
    overview.addRow([block.heading]).font = { bold: true, size: 12 };
    for (const line of block.lines) overview.addRow([line]);
    if (block.table) addTable(overview, block.table);
    for (const line of block.closing ?? []) overview.addRow([line]);
  }
  overview.getColumn(1).width = 60;
  const ranking = workbook.addWorksheet("Xếp loại");
  ranking.addRow([classified.heading]).font = { bold: true, size: 12 };
  for (const line of classified.lines) ranking.addRow([line]);
  ranking.addRow([]);
  addTable(ranking, classified.table!);
  ranking.getColumn(1).width = 36;
  const dimensions = workbook.addWorksheet("Tiêu chí");
  dimensions.addRow(["III. Điểm trung bình năm của từng tiêu chí theo CLB"]).font = { bold: true, size: 12 };
  addTable(dimensions, criteria);
  dimensions.getColumn(1).width = 36;
  return Buffer.from(await workbook.xlsx.writeBuffer());
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
    async writeWorkbook(title, heading, sheets) {
      return { bytes: await workbookOf(title, heading, sheets), extension: "xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
    },
    async writeAnnual(format, title, document) {
      return format === "pdf"
        ? { bytes: await annualPdf(title, document), mimeType: "application/pdf", extension: "pdf" }
        : { bytes: await annualXlsx(title, document), extension: "xlsx",
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
    },
  };
}
