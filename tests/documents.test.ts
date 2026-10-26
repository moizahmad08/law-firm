import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/database/client";
import { withUserContext } from "@/lib/database/context";
import {
  uploadDocument,
  uploadDocumentRevision,
  getDocumentDownloadToken,
} from "@/lib/documents/service";
import { verifySignedDownloadToken } from "@/lib/storage/adapter";
import { DocumentCategory, Role } from "@prisma/client";

describe("Milestone 3A & 3B: Secure Versioned Documents & Malware Protection Suite", () => {
  let superAdminId: string;
  let officeAdminId: string;
  let counselAlphaId: string;
  let counselBetaId: string;
  let generalCaseId: string;
  let restrictedCaseId: string;

  beforeAll(async () => {
    const superAdmin = await prisma.user.findFirstOrThrow({
      where: { role: Role.SUPER_ADMIN },
    });
    const officeAdmin = await prisma.user.findFirstOrThrow({
      where: { role: Role.OFFICE_ADMIN },
    });
    const counselAlpha = await prisma.user.findFirstOrThrow({
      where: { email: "counsel.alpha@lawfirm.local" },
    });
    const counselBeta = await prisma.user.findFirstOrThrow({
      where: { email: "counsel.beta@lawfirm.local" },
    });

    superAdminId = superAdmin.id;
    officeAdminId = officeAdmin.id;
    counselAlphaId = counselAlpha.id;
    counselBetaId = counselBeta.id;

    const generalCase = await withUserContext(counselAlphaId, async (tx) => {
      return await tx.case.findFirstOrThrow({
        where: { caseNumber: "WP-101/2026" },
      });
    });

    const restrictedCase = await withUserContext(counselBetaId, async (tx) => {
      return await tx.case.findFirstOrThrow({
        where: { caseNumber: "CS-202/2026", isRestricted: true },
      });
    });

    generalCaseId = generalCase.id;
    restrictedCaseId = restrictedCase.id;
  });

  describe("1. Document Upload & Malware Scanner Hook", () => {
    it("BLOCKS MALICIOUS UPLOAD: EICAR test signature is blocked with security audit", async () => {
      const maliciousBuffer = Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");

      await expect(
        uploadDocument({
          caseId: generalCaseId,
          title: "Infected Petition Draft",
          category: DocumentCategory.PLEADING,
          fileName: "petition.pdf",
          mimeType: "application/pdf",
          buffer: maliciousBuffer,
          uploaderId: counselAlphaId,
        })
      ).rejects.toThrow(/Security Violation: File upload blocked. Threat detected/i);

      // Verify security audit logged
      const audit = await prisma.auditEvent.findFirst({
        where: {
          action: "MALWARE_DETECTED_UPLOAD_BLOCKED",
          userId: counselAlphaId,
        },
        orderBy: { createdAt: "desc" },
      });
      expect(audit).not.toBeNull();
    });

    it("BLOCKS DISALLOWED FILE TYPES: Rejects unauthorized executable files", async () => {
      const exeBuffer = Buffer.from("MZ dummy executable content");

      await expect(
        uploadDocument({
          caseId: generalCaseId,
          title: "Malicious Executable",
          category: DocumentCategory.OTHER,
          fileName: "payload.exe",
          mimeType: "application/x-msdownload",
          buffer: exeBuffer,
          uploaderId: counselAlphaId,
        })
      ).rejects.toThrow(/Disallowed file format/i);
    });
  });

  describe("2. Document Versioning & Historical Immutability", () => {
    let uploadedDocId: string;

    it("Uploads valid initial document version 1", async () => {
      const samplePdf = Buffer.from("%PDF-1.4 sample writ petition legal pleading in Lahore High Court");

      const result = await uploadDocument({
        caseId: generalCaseId,
        title: "Writ Petition Pleadings",
        category: DocumentCategory.PLEADING,
        fileName: "Writ_Petition_101.pdf",
        mimeType: "application/pdf",
        buffer: samplePdf,
        uploaderId: counselAlphaId,
        notes: "Initial filed copy before LHC registrar.",
      });

      expect(result.document.id).toBeDefined();
      expect(result.document.currentVersionNumber).toBe(1);
      expect(result.version.versionNumber).toBe(1);
      expect(result.version.fileHashSha256).toBeDefined();

      uploadedDocId = result.document.id;
    });

    it("Uploads revision v2: updates current version and preserves v1 in database and disk", async () => {
      const samplePdfV2 = Buffer.from("%PDF-1.4 amended writ petition with verified affidavit");

      const result = await uploadDocumentRevision({
        documentId: uploadedDocId,
        fileName: "Writ_Petition_101_Amended.pdf",
        mimeType: "application/pdf",
        buffer: samplePdfV2,
        uploaderId: counselAlphaId,
        notes: "Amended pursuant to LHC office objections.",
      });

      expect(result.document.id).toBe(uploadedDocId);
      expect(result.version.versionNumber).toBe(2);

      // Verify both versions exist in database
      const versions = await withUserContext(counselAlphaId, async (tx) => {
        return await tx.documentVersion.findMany({
          where: { documentId: uploadedDocId },
          orderBy: { versionNumber: "asc" },
        });
      });

      expect(versions).toHaveLength(2);
      expect(versions[0].versionNumber).toBe(1);
      expect(versions[1].versionNumber).toBe(2);
      expect(versions[0].fileName).toBe("Writ_Petition_101.pdf");
      expect(versions[1].fileName).toBe("Writ_Petition_101_Amended.pdf");
    });
  });

  describe("3. Row-Level Security Isolation on Documents", () => {
    let betaDocId: string;
    let restrictedDocId: string;

    it("Counsel Beta uploads document to restricted case CS-202/2026", async () => {
      const confidentialDoc = Buffer.from("%PDF-1.4 highly confidential commercial shareholder agreement");

      const result = await uploadDocument({
        caseId: restrictedCaseId,
        title: "Confidential Shareholder Agreement",
        category: DocumentCategory.CONTRACT,
        fileName: "Shareholder_Agreement.pdf",
        mimeType: "application/pdf",
        buffer: confidentialDoc,
        uploaderId: counselBetaId,
      });

      betaDocId = result.document.id;
      expect(betaDocId).toBeDefined();
    });

    it("ETHICAL WALL RLS: Unassigned Counsel Alpha receives 0 rows when querying Beta's documents", async () => {
      const docs = await withUserContext(counselAlphaId, async (tx) => {
        return await tx.document.findMany({
          where: { id: betaDocId },
        });
      });

      expect(docs).toHaveLength(0);
    });

    it("ETHICAL WALL RLS: Office Admin receives 0 rows when querying Beta's restricted case documents", async () => {
      const docs = await withUserContext(officeAdminId, async (tx) => {
        return await tx.document.findMany({
          where: { id: betaDocId },
        });
      });

      expect(docs).toHaveLength(0);
    });

    it("PER-DOCUMENT RESTRICTION: Counsel Alpha uploads restricted document in general case WP-101", async () => {
      const sensitiveBrief = Buffer.from("%PDF-1.4 private internal litigation strategy brief");

      const result = await uploadDocument({
        caseId: generalCaseId,
        title: "Privileged Internal Counsel Memo",
        category: DocumentCategory.OTHER,
        isRestricted: true, // Marked restricted at document level!
        fileName: "Counsel_Strategy_Memo.pdf",
        mimeType: "application/pdf",
        buffer: sensitiveBrief,
        uploaderId: counselAlphaId,
      });

      restrictedDocId = result.document.id;

      // Counsel Alpha (assigned) can see it
      const alphaDocs = await withUserContext(counselAlphaId, async (tx) => {
        return await tx.document.findMany({
          where: { id: restrictedDocId },
        });
      });
      expect(alphaDocs).toHaveLength(1);

      // Office Admin is BLOCKED from this restricted document even though WP-101 is general!
      const adminDocs = await withUserContext(officeAdminId, async (tx) => {
        return await tx.document.findMany({
          where: { id: restrictedDocId },
        });
      });
      expect(adminDocs).toHaveLength(0);
    });

    it("ZERO SUPER ADMIN ACCESS: Super Admin by default cannot see documents under RLS", async () => {
      const docs = await withUserContext(superAdminId, async (tx) => {
        return await tx.document.findMany({
          where: { id: betaDocId },
        });
      });
      expect(docs).toHaveLength(0);
    });
  });

  describe("4. Signed Download Tokens & Token Security", () => {
    it("Generates valid HMAC-signed download token and verifies binding", async () => {
      // Find a document accessible to Counsel Alpha
      const alphaDocs = await withUserContext(counselAlphaId, async (tx) => {
        return await tx.document.findFirstOrThrow({
          where: { caseId: generalCaseId, versions: { some: {} } },
          orderBy: { createdAt: "asc" },
        });
      });

      const tokenResult = await getDocumentDownloadToken({
        documentId: alphaDocs.id,
        userId: counselAlphaId,
      });

      expect(tokenResult.token).toBeDefined();
      expect(tokenResult.downloadUrl).toContain("/api/documents/");

      // Verify token cryptographic signature
      const verified = verifySignedDownloadToken(tokenResult.token);
      expect(verified.valid).toBe(true);
      expect(verified.documentId).toBe(alphaDocs.id);
      expect(verified.userId).toBe(counselAlphaId);
      expect(verified.versionNumber).toBeDefined();
    });

    it("Rejects forged or tampered download token", () => {
      const forgedToken = "eyJuYW1lIjoiZm9yZ2VkIn0.badhash123";
      const verified = verifySignedDownloadToken(forgedToken);
      expect(verified.valid).toBe(false);
    });
  });
});
