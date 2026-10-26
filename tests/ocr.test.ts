import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/database/client";
import { withUserContext } from "@/lib/database/context";
import { uploadDocument } from "@/lib/documents/service";
import {
  detectLanguage,
  DeterministicOcrEngine,
  processDocumentOcr,
} from "@/lib/ai/ocr";
import { DocumentCategory, Role } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

// Owner prisma client for clean teardown of test artifacts
const ownerPrisma = new PrismaClient({
  datasources: { db: { url: process.env.SEED_DATABASE_URL || process.env.DATABASE_URL } },
});

describe("Milestone 5A: Multilingual OCR Engine & Document Page Pipeline", () => {
  let counselAlphaId: string;
  let testCaseId: string;
  let uploadedVersionId: string;
  let createdDocId: string;

  beforeAll(async () => {
    const counselAlpha = await prisma.user.findFirstOrThrow({
      where: { email: "counsel.alpha@lawfirm.local" },
    });
    counselAlphaId = counselAlpha.id;

    const generalCase = await withUserContext(counselAlphaId, async (tx) => {
      return await tx.case.findFirstOrThrow({
        where: { caseNumber: "WP-101/2026" },
      });
    });
    testCaseId = generalCase.id;

    // Upload a test legal brief for OCR processing
    const sampleLegalBrief = Buffer.from(`
HIGH COURT OF SINDH, BENCH AT SUKKUR
Constitutional Petition No. D-450 of 2026

Petitioner: Muhammad Ali & Co.
Versus
Respondent: Federation of Pakistan & Others

ORDER SHEET:
Date of Order: 15th November 2026.
Hon'ble Mr. Justice Tariq Mehmood, Judge.

1. Learned counsel for the petitioner has argued at length regarding the jurisdiction of the authority.
2. Let notice be issued to respondents for 28th November 2026.
3. Written reply and rejoinder to be filed within two weeks. Compliance is mandatory.
4. Adjourned to 28th November 2026 for hearing on interim relief.
    `);

    const uploadRes = await uploadDocument({
      caseId: testCaseId,
      uploaderId: counselAlphaId,
      title: "Sukkur Bench Order Sheet Nov 2026",
      fileName: "order_sheet_sukkur_nov_2026.pdf",
      buffer: sampleLegalBrief,
      mimeType: "application/pdf",
      category: DocumentCategory.COURT_ORDER,
    });

    createdDocId = uploadRes.document.id;
    uploadedVersionId = uploadRes.version.id;
  });

  afterAll(async () => {
    // Teardown created test document and its pages
    if (createdDocId) {
      await ownerPrisma.documentPage.deleteMany({
        where: { versionId: uploadedVersionId },
      });
      await ownerPrisma.documentVersion.deleteMany({
        where: { documentId: createdDocId },
      });
      await ownerPrisma.document.deleteMany({
        where: { id: createdDocId },
      });
    }
    await ownerPrisma.$disconnect();
  });

  describe("1. Urdu Nastaliq & English Language Detection", () => {
    it("DETECTS URDU: Correctly identifies Urdu Arabic Unicode script", () => {
      const urduText = "معزز عدالت عالیہ کے روبرو رٹ پٹیشن برائے حصول انصاف";
      const lang = detectLanguage(urduText);
      expect(lang).toBe("ur");
    });

    it("DETECTS ENGLISH: Correctly identifies standard English legal petition", () => {
      const englishText = "In the High Court of Sindh at Karachi. Constitutional Petition No. 101/2026.";
      const lang = detectLanguage(englishText);
      expect(lang).toBe("en");
    });

    it("DETECTS BILINGUAL / URDU SCRIPT IN MIXED TEXT: Flags as mixed when both scripts exist", () => {
      const mixedText = "Case No 102/2026 - بمطابق حکم عدالت عالیہ سماعت ملتوی کی گئی";
      const lang = detectLanguage(mixedText);
      expect(lang).toBe("mixed");
    });
  });

  describe("2. Deterministic OCR Engine Chunking & Confidence", () => {
    it("CHUNKS TEXT INTO ORDERED PAGES: Large documents are split across multiple pages", async () => {
      const engine = new DeterministicOcrEngine();
      // Generate 85 lines of text (yields 3 pages at 40 lines/page)
      const longText = Array.from({ length: 85 }, (_, i) => `Line ${i + 1}: Legal pleading paragraph text content.`).join("\n");
      const buffer = Buffer.from(longText, "utf8");

      const result = await engine.extractText(buffer, "application/pdf", "large_brief.pdf");
      expect(result.pages.length).toBeGreaterThanOrEqual(2);
      expect(result.pages[0].pageNumber).toBe(1);
      expect(result.pages[1].pageNumber).toBe(2);
      expect(result.averageConfidence).toBeGreaterThanOrEqual(0.9);
    });

    it("FALLBACK ON SCANNED IMAGE: Returns confidence score reflecting simulated OCR quality", async () => {
      const engine = new DeterministicOcrEngine();
      const imageBuffer = Buffer.from("--- PAGE 1 ---\nOCR Text Extraction for scanned affidavit page.\n--- PAGE 2 ---\nAnnexure B evidence copy.", "utf8");

      const result = await engine.extractText(imageBuffer, "image/jpeg", "affidavit_scan.jpg");
      expect(result.pages.length).toBe(2);
      expect(result.averageConfidence).toBeGreaterThanOrEqual(0.85);
      expect(result.pages[0].text).toContain("OCR Text Extraction");
    });
  });

  describe("3. Database Page Persistence & RLS Enforcement", () => {
    it("STORES OCR PAGES: Writes pages to document_pages table under user context", async () => {
      const ocrResult = await processDocumentOcr({
        versionId: uploadedVersionId,
        userId: counselAlphaId,
      });

      expect(ocrResult.totalPages).toBeGreaterThanOrEqual(1);
      expect(ocrResult.detectedLanguage).toBe("en");

      // Verify records in database under user context
      const pages = await withUserContext(counselAlphaId, async (tx) => {
        return await tx.documentPage.findMany({
          where: { versionId: uploadedVersionId },
          orderBy: { pageNumber: "asc" },
        });
      });

      expect(pages.length).toBe(ocrResult.totalPages);
      expect(pages[0].textContent).toContain("HIGH COURT OF SINDH");
      expect(pages[0].ocrConfidence).toBeGreaterThanOrEqual(0.8);
    });

    it("IDEMPOTENT UPSERT: Re-running OCR updates existing pages without primary key duplicates", async () => {
      const reRunResult = await processDocumentOcr({
        versionId: uploadedVersionId,
        userId: counselAlphaId,
      });

      expect(reRunResult.totalPages).toBeGreaterThanOrEqual(1);

      const totalCount = await withUserContext(counselAlphaId, async (tx) => {
        return await tx.documentPage.count({
          where: { versionId: uploadedVersionId },
        });
      });

      expect(totalCount).toBe(reRunResult.totalPages);
    });
  });
});
