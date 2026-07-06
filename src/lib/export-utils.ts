import PDFDocument from "pdfkit";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
} from "docx";
import type { ArchiveRecord } from "@/lib/records";
import type { ReadingListItemRow, ReadingListRow } from "@/src/lib/member-workspace";
import {
  buildReadingListExportText,
  formatRecordCitation,
  safeExportFilename,
} from "@/src/lib/citations";

type ExportItem = ReadingListItemRow & { record?: Partial<ArchiveRecord> | null };

export { buildReadingListExportText, formatRecordCitation, safeExportFilename };

export function formatReadingListAsText(
  list: ReadingListRow,
  items: ExportItem[],
  style = "apa7",
) {
  return buildReadingListExportText(list, items, { style });
}

export function sanitizeFilename(title: string, extension = "txt") {
  return safeExportFilename(title, extension).replace(/\.[^.]+$/, "");
}

export async function formatReadingListAsPDF(
  list: ReadingListRow,
  items: ExportItem[],
  style = "apa7",
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 54 });
    const chunks: Buffer[] = [];
    const exportedOn = new Date().toISOString().slice(0, 10);

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fillColor("#111111");
    doc.font("Helvetica-Bold").fontSize(18).text("Decolonising Archive Reading List");
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").fontSize(14).text(list.title);
    if (list.description) {
      doc.moveDown(0.25);
      doc.font("Helvetica").fontSize(10).text(list.description);
    }

    doc.moveDown(0.5);
    doc.fillColor("#666666").fontSize(9).text(`Exported on ${exportedOn}`);
    doc.text("Citation style: APA 7");
    doc.fillColor("#111111");

    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(12).text("Citations");
    doc.moveDown(0.4);

    if (!items.length) {
      doc.font("Helvetica").fontSize(10).text("This reading list has no records to export yet.");
    } else {
      doc.font("Helvetica").fontSize(10);
      items.forEach((item, index) => {
        doc.text(`${index + 1}. ${formatRecordCitation(item.record, style)}`, {
          width: 480,
          continued: false,
        });
        doc.moveDown(0.35);
      });

      doc.moveDown(0.7);
      doc.font("Helvetica-Bold").fontSize(12).text("Records");
      doc.font("Helvetica").fontSize(10);
      items.forEach((item, index) => {
        const record = item.record;
        doc.moveDown(0.35);
        doc.font("Helvetica-Bold").text(`${index + 1}. ${record?.title || "Record unavailable."}`);
        if (record) {
          doc.font("Helvetica").text(`Type: ${record.type || "Unknown"}`);
          doc.text(`Source: ${record.source || record.institution || record.collection || "Decolonising Archive"}`);
          if (record.sourceUrl) doc.text(`URL: ${record.sourceUrl}`);
        }
      });
    }

    doc.font("Helvetica").fontSize(8).fillColor("#777777");
    doc.text("Generated from Decolonising Archive", 54, doc.page.height - 44, {
      align: "center",
      width: doc.page.width - 108,
    });

    doc.end();
  });
}

export async function formatReadingListAsDOCX(
  list: ReadingListRow,
  items: ExportItem[],
  style = "apa7",
): Promise<Buffer> {
  const exportedOn = new Date().toISOString().slice(0, 10);
  const children: Paragraph[] = [
    new Paragraph({
      text: "Decolonising Archive Reading List",
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      text: list.title,
      heading: HeadingLevel.HEADING_2,
    }),
  ];

  if (list.description) children.push(new Paragraph({ text: list.description }));
  children.push(new Paragraph({ text: `Exported on ${exportedOn}` }));
  children.push(new Paragraph({ text: "Citation style: APA 7" }));
  children.push(new Paragraph({ text: "Citations", heading: HeadingLevel.HEADING_3 }));

  if (!items.length) {
    children.push(new Paragraph({ text: "This reading list has no records to export yet." }));
  } else {
    items.forEach((item, index) => {
      children.push(new Paragraph({ text: `${index + 1}. ${formatRecordCitation(item.record, style)}` }));
    });

    children.push(new Paragraph({ text: "Records", heading: HeadingLevel.HEADING_3 }));
    items.forEach((item, index) => {
      const record = item.record;
      children.push(
        new Paragraph({
          text: `${index + 1}. ${record?.title || "Record unavailable."}`,
          heading: HeadingLevel.HEADING_4,
        }),
      );
      if (record) {
        children.push(new Paragraph({ text: `Type: ${record.type || "Unknown"}` }));
        children.push(
          new Paragraph({
            text: `Source: ${record.source || record.institution || record.collection || "Decolonising Archive"}`,
          }),
        );
        if (record.sourceUrl) children.push(new Paragraph({ text: `URL: ${record.sourceUrl}` }));
      }
    });
  }

  children.push(
    new Paragraph({
      text: "Generated from Decolonising Archive",
      alignment: AlignmentType.CENTER,
    }),
  );

  const document = new Document({ sections: [{ children }] });
  return Packer.toBuffer(document);
}
