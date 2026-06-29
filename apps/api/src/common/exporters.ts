import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

export interface SheetColumn {
  header: string;
  key: string;
  width?: number;
}

// Génère un classeur Excel réel (.xlsx) côté serveur.
export async function buildXlsx(
  sheetName: string,
  columns: SheetColumn[],
  rows: Record<string, unknown>[],
  title?: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Soozey SARL — PAOSITRA (DÉMONSTRATION)";
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName);
  if (title) {
    ws.mergeCells(1, 1, 1, columns.length);
    const c = ws.getCell(1, 1);
    c.value = title;
    c.font = { bold: true, size: 13 };
    ws.addRow([]);
  }
  ws.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width ?? 22
  }));
  const headerRow = ws.getRow(title ? 3 : 1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F4E79" }
  };
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  for (const row of rows) ws.addRow(row);
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

// Génère un PDF réel côté serveur.
export function buildPdf(
  title: string,
  subtitle: string,
  lines: string[][],
  headers: string[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];
      doc.on("data", (d: Buffer) => chunks.push(d));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(8).fillColor("#8b1427")
        .text("DOCUMENT DE DÉMONSTRATION — Données non contractuelles — KCI / Soozey SARL", { align: "right" });
      doc.moveDown(0.5);
      doc.fillColor("#000").fontSize(16).text(title, { align: "left" });
      doc.fontSize(10).fillColor("#555").text(subtitle);
      doc.moveDown(0.8);

      doc.fillColor("#000").fontSize(9);
      const colW = (doc.page.width - 80) / headers.length;
      let y = doc.y;
      doc.font("Helvetica-Bold");
      headers.forEach((h, i) => doc.text(h, 40 + i * colW, y, { width: colW - 4 }));
      doc.moveDown(0.3);
      doc.font("Helvetica");
      doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke("#ccc");
      doc.moveDown(0.2);
      for (const row of lines) {
        y = doc.y;
        if (y > doc.page.height - 60) {
          doc.addPage();
          y = doc.y;
        }
        row.forEach((cell, i) =>
          doc.text(String(cell), 40 + i * colW, y, { width: colW - 4 })
        );
        doc.moveDown(0.2);
      }
      doc.moveDown(1);
      doc.fontSize(8).fillColor("#777")
        .text("Généré le " + new Date().toISOString().slice(0, 19).replace("T", " "));
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
