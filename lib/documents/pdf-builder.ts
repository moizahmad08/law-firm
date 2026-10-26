/**
 * Pure TypeScript / Node.js standard PDF 1.4 generator.
 * Produces valid, universally viewable PDF documents with multi-page support,
 * clean typography, page headers, footers, and word wrapping.
 */

export interface PdfPageOptions {
  title: string;
  pages: string[];
  subtitle?: string;
  watermark?: string;
}

export function buildStandardPdf(options: PdfPageOptions): Buffer {
  const { title, pages, subtitle = "Law Firm Management System - Verified Case Dossier" } = options;

  // Ensure at least one page
  const pageContents = pages.length > 0 ? pages : ["No text content available."];

  // Helper to escape PDF text strings
  const escapePdf = (text: string) => {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/\r/g, "");
  };

  // Split text into lines that fit on a standard 72-dpi A4 / Letter page (approx 80-90 chars per line at 10pt)
  const wrapText = (rawText: string, maxCharsPerLine = 85): string[] => {
    const lines: string[] = [];
    const paragraphs = rawText.split("\n");

    for (const para of paragraphs) {
      if (!para.trim()) {
        lines.push("");
        continue;
      }

      const words = para.split(/\s+/);
      let currentLine = "";

      for (const word of words) {
        if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
          currentLine = (currentLine + " " + word).trim();
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
    }

    return lines;
  };

  const linesPerPage = 42;
  const allFormattedPages: string[][] = [];

  for (const rawPageText of pageContents) {
    const wrapped = wrapText(rawPageText, 85);
    for (let i = 0; i < wrapped.length; i += linesPerPage) {
      allFormattedPages.push(wrapped.slice(i, i + linesPerPage));
    }
  }

  if (allFormattedPages.length === 0) {
    allFormattedPages.push(["[Empty Document Content]"]);
  }

  const totalPages = allFormattedPages.length;

  const catalogObjNum = 1;
  const pagesRootObjNum = 2;
  const fontNormalObjNum = 3;
  const fontBoldObjNum = 4;

  let currentObjNum = 4;

  const pageDetails: { pageObjNum: number; streamObjNum: number; lines: string[]; pageNum: number }[] = [];
  const pageObjectNums: number[] = [];

  for (let p = 0; p < totalPages; p++) {
    currentObjNum++;
    const streamObjNum = currentObjNum;
    currentObjNum++;
    const pageObjNum = currentObjNum;
    pageObjectNums.push(pageObjNum);
    pageDetails.push({
      pageObjNum,
      streamObjNum,
      lines: allFormattedPages[p],
      pageNum: p + 1,
    });
  }

  const objList: { num: number; body: string }[] = [];

  // 1. Catalog
  objList.push({
    num: catalogObjNum,
    body: `<< /Type /Catalog /Pages ${pagesRootObjNum} 0 R >>`,
  });

  // 2. Pages Root
  const kidsStr = pageObjectNums.map((n) => `${n} 0 R`).join(" ");
  objList.push({
    num: pagesRootObjNum,
    body: `<< /Type /Pages /Kids [${kidsStr}] /Count ${totalPages} >>`,
  });

  // 3. Font Normal
  objList.push({
    num: fontNormalObjNum,
    body: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`,
  });

  // 4. Font Bold
  objList.push({
    num: fontBoldObjNum,
    body: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`,
  });

  // Pages & Streams
  for (const detail of pageDetails) {
    const streamParts: string[] = [];

    // Header bar line
    streamParts.push("0.2 0.25 0.35 RG");
    streamParts.push("54 742 504 1 re f");

    // Header Text
    streamParts.push("BT");
    streamParts.push(`/F2 9 Tf`);
    streamParts.push("0.3 0.35 0.45 rg");
    streamParts.push(`54 750 Td (${escapePdf(title.slice(0, 70))}) Tj`);
    streamParts.push("ET");

    // Subtitle / Date
    streamParts.push("BT");
    streamParts.push(`/F1 8 Tf`);
    streamParts.push("0.5 0.55 0.6 rg");
    streamParts.push(`54 732 Td (${escapePdf(subtitle.slice(0, 80))}) Tj`);
    streamParts.push("ET");

    // Body Text
    streamParts.push("BT");
    streamParts.push(`/F1 9.5 Tf`);
    streamParts.push("14 TL");
    streamParts.push("0.1 0.1 0.1 rg");
    streamParts.push("54 700 Td");

    for (let l = 0; l < detail.lines.length; l++) {
      const line = detail.lines[l];
      if (l === 0) {
        streamParts.push(`(${escapePdf(line)}) Tj`);
      } else {
        streamParts.push(`T* (${escapePdf(line)}) Tj`);
      }
    }
    streamParts.push("ET");

    // Footer rule & Page Number
    streamParts.push("0.8 0.82 0.85 RG");
    streamParts.push("54 48 504 0.5 re f");

    streamParts.push("BT");
    streamParts.push(`/F1 8 Tf`);
    streamParts.push("0.5 0.55 0.6 rg");
    streamParts.push(`54 36 Td (Al-Meezan Law Chambers - Confidential Litigation Record) Tj`);
    streamParts.push(`480 36 Td (Page ${detail.pageNum} of ${totalPages}) Tj`);
    streamParts.push("ET");

    const streamContent = streamParts.join("\n");
    const streamLength = Buffer.byteLength(streamContent, "utf-8");

    objList.push({
      num: detail.streamObjNum,
      body: `<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream`,
    });

    objList.push({
      num: detail.pageObjNum,
      body: `<< /Type /Page /Parent ${pagesRootObjNum} 0 R /MediaBox [0 0 612 792] /Contents ${detail.streamObjNum} 0 R /Resources << /Font << /F1 ${fontNormalObjNum} 0 R /F2 ${fontBoldObjNum} 0 R >> >> >>`,
    });
  }

  objList.sort((a, b) => a.num - b.num);

  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];

  for (const obj of objList) {
    offsets.push(Buffer.byteLength(pdf, "utf-8"));
    pdf += `${obj.num} 0 obj\n${obj.body}\nendobj\n`;
  }

  const startXref = Buffer.byteLength(pdf, "utf-8");
  pdf += `xref\n0 ${objList.length + 1}\n`;
  pdf += `0000000000 65535 f \n`;

  for (const offset of offsets) {
    const padded = ("0000000000" + offset).slice(-10);
    pdf += `${padded} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objList.length + 1} /Root ${catalogObjNum} 0 R >>\n`;
  pdf += `startxref\n${startXref}\n%%EOF\n`;

  return Buffer.from(pdf, "utf-8");
}
