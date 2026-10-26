import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/database/client";
import { withUserContext } from "@/lib/database/context";
import {
  autofillTemplateContent,
  createGeneratedDocument,
  updateGeneratedDocument,
  submitDocumentForApproval,
  reviewDocumentApproval,
  exportDocumentForSigning,
  linkSignedDocumentCopy,
} from "@/lib/drafting/service";
import {
  DocumentApprovalStatus,
  DocumentCategory,
  Role,
  PrismaClient,
} from "@prisma/client";

const ownerPrisma = new PrismaClient({
  datasources: { db: { url: process.env.SEED_DATABASE_URL || process.env.DATABASE_URL } },
});

describe("Milestone 6B: Legal Document Drafting, Autofill & Approval Lifecycle", () => {
  let superAdminId: string;
  let counselAlphaId: string;
  let counselBetaId: string;
  let generalCaseId: string;
  let restrictedCaseId: string;
  let stayTemplateId: string;
  let stayTemplateVersionNumber: number;
  let createdDocumentId: string;
  let signedDocId: string;

  beforeAll(async () => {
    const superAdmin = await prisma.user.findFirstOrThrow({
      where: { role: Role.SUPER_ADMIN },
    });
    const counselAlpha = await prisma.user.findFirstOrThrow({
      where: { email: "counsel.alpha@lawfirm.local" },
    });
    const counselBeta = await prisma.user.findFirstOrThrow({
      where: { email: "counsel.beta@lawfirm.local" },
    });

    superAdminId = superAdmin.id;
    counselAlphaId = counselAlpha.id;
    counselBetaId = counselBeta.id;

    // WP-101/2026 (general case assigned to Alpha)
    const generalCase = await withUserContext(counselAlphaId, async (tx) => {
      return await tx.case.findFirstOrThrow({
        where: { caseNumber: "WP-101/2026" },
      });
    });
    generalCaseId = generalCase.id;

    // CS-202/2026 (restricted case assigned to Beta, Alpha blocked)
    const restrictedCase = await withUserContext(counselBetaId, async (tx) => {
      return await tx.case.findFirstOrThrow({
        where: { caseNumber: "CS-202/2026" },
      });
    });
    restrictedCaseId = restrictedCase.id;

    // Fetch CP_PETITION_STAY template within user context
    const template = await withUserContext(counselAlphaId, async (tx) => {
      return await tx.documentTemplate.findUniqueOrThrow({
        where: { code: "CP_PETITION_STAY" },
        include: { versions: { where: { isPublished: true }, orderBy: { versionNumber: "desc" }, take: 1 } },
      });
    });
    stayTemplateId = template.id;
    stayTemplateVersionNumber = template.versions[0].versionNumber;
  });

  afterAll(async () => {
    if (createdDocumentId) {
      await ownerPrisma.generatedDocument.deleteMany({
        where: { id: createdDocumentId },
      });
    }
    if (signedDocId) {
      await ownerPrisma.document.deleteMany({
        where: { id: signedDocId },
      });
    }
    await ownerPrisma.$disconnect();
  });

  describe("Template Token Autofill Engine", () => {
    it("autofills case facts into template and detects missing tokens", () => {
      const templateContent = `IN THE {{COURT_NAME}} AT {{BENCH_NAME}}\nCASE: {{CASE_NUMBER}} - {{CASE_TITLE}}\nPETITIONER: {{PETITIONER_NAME}}\nCOUNSEL: {{ADVOCATE_NAME}}\nDATE: {{TODAY_DATE}}\nUNRESOLVED: {{SPECIAL_STATUTE_SECTION}}`;

      const mockCase = {
        caseNumber: "WP-101/2026",
        title: "Messrs Apex Traders v. Federation of Pakistan",
        court: "Lahore High Court",
        caseType: "Writ Petition",
        jurisdiction: "Constitutional",
        filingDate: new Date("2026-02-10"),
        client: {
          name: "Apex Trading Corp",
          mobile: "+92 300 1234567",
          email: "legal@apextrading.pk",
          address: "12-Mall Road, Lahore",
          cnic: "35202-1234567-1",
        },
        parties: [
          { name: "Apex Trading Corp", partyRole: "PETITIONER", advocateName: "Adv. Tariq Rahim", cnic: null },
          { name: "Federation of Pakistan", partyRole: "RESPONDENT", advocateName: "DAG", cnic: null },
        ],
        assignments: [
          { roleInCase: "LEAD_COUNSEL", user: { fullName: "Barrister Ahmed Ali", email: "counsel.alpha@lawfirm.local" } },
        ],
      };

      const result = autofillTemplateContent(templateContent, mockCase);

      expect(result.renderedContent).toContain("IN THE Lahore High Court");
      expect(result.renderedContent).toContain("CASE: WP-101/2026 - Messrs Apex Traders v. Federation of Pakistan");
      expect(result.renderedContent).toContain("PETITIONER: Apex Trading Corp");
      expect(result.substitutedTokens["CASE_NUMBER"]).toBe("WP-101/2026");
      expect(result.missingTokens).toContain("SPECIAL_STATUTE_SECTION");
    });
  });

  describe("Document Creation & Approval Lifecycle", () => {
    it("creates a generated document from template in DRAFT status", async () => {
      const doc = await createGeneratedDocument(counselAlphaId, {
        caseId: generalCaseId,
        templateId: stayTemplateId,
        templateVersionNumber: stayTemplateVersionNumber,
        title: "Draft Stay Application WP-101/2026",
        content: "APPLICATION UNDER ORDER XXXIX RULES 1 & 2 C.P.C. FOR WP-101/2026",
      });

      expect(doc.id).toBeDefined();
      createdDocumentId = doc.id;
      expect(doc.approvalStatus).toBe(DocumentApprovalStatus.DRAFT);
      expect(doc.content).toContain("APPLICATION UNDER ORDER XXXIX");
      expect(doc.content).toContain("WP-101/2026");
    });

    it("advances document through PENDING_APPROVAL and formal APPROVAL", async () => {
      // 1. Submit for approval
      const submitted = await submitDocumentForApproval(counselAlphaId, createdDocumentId);
      expect(submitted.approvalStatus).toBe(DocumentApprovalStatus.PENDING_APPROVAL);

      // 2. Counsel review & approval
      const approved = await reviewDocumentApproval(counselAlphaId, {
        documentId: createdDocumentId,
        action: "APPROVE",
      });
      expect(approved.approvalStatus).toBe(DocumentApprovalStatus.APPROVED);
      expect(approved.approvedById).toBe(counselAlphaId);
      expect(approved.approvedAt).not.toBeNull();
    });

    it("STRICT SECURITY MANDATE: substantive content edit strictly invalidates approval and resets status to DRAFT", async () => {
      // Document is currently APPROVED. Now we make a substantive change to content.
      const modifiedContent = "MODIFIED TEXT: Substantive legal arguments inserted post-approval.";
      const edited = await updateGeneratedDocument(counselAlphaId, {
        documentId: createdDocumentId,
        content: modifiedContent,
      });

      // Verification of automatic invalidation (MASTER_SPEC Section 8.2)
      expect(edited.approvalStatus).toBe(DocumentApprovalStatus.DRAFT);
      expect(edited.approvedById).toBeNull();
      expect(edited.approvedAt).toBeNull();
      expect(edited.rejectionReason).toContain("Approval invalidated due to substantive content modification");
    });

    it("allows non-substantive edit (title only) without invalidating approved status", async () => {
      // Re-approve the document first
      await reviewDocumentApproval(counselAlphaId, {
        documentId: createdDocumentId,
        action: "APPROVE",
      });

      // Edit only title
      const updatedTitle = await updateGeneratedDocument(counselAlphaId, {
        documentId: createdDocumentId,
        title: "Updated Title - Final Stay Application WP-101/2026",
      });

      // Status remains APPROVED
      expect(updatedTitle.approvalStatus).toBe(DocumentApprovalStatus.APPROVED);
      expect(updatedTitle.approvedById).toBe(counselAlphaId);
    });

    it("exports document for signing and links signed document copy", async () => {
      // Export for signing
      const exported = await exportDocumentForSigning(counselAlphaId, createdDocumentId, "DOCX");
      expect(exported.approvalStatus).toBe(DocumentApprovalStatus.EXPORTED_FOR_SIGNING);
      expect(exported.exportFormat).toBe("DOCX");
      expect(exported.exportedAt).not.toBeNull();

      // Create a mock signed Document in case
      const signedDoc = await withUserContext(counselAlphaId, async (tx) => {
        return await tx.document.create({
          data: {
            caseId: generalCaseId,
            category: DocumentCategory.PLEADING,
            title: "Signed Stay Application (Executed Copy).pdf",
            createdById: counselAlphaId,
          },
        });
      });
      signedDocId = signedDoc.id;

      // Link signed copy
      const linked = await linkSignedDocumentCopy(counselAlphaId, {
        documentId: createdDocumentId,
        signedDocumentId: signedDocId,
      });
      expect(linked.approvalStatus).toBe(DocumentApprovalStatus.SIGNED_COPY_UPLOADED);
      expect(linked.signedDocumentId).toBe(signedDocId);
    });
  });

  describe("Ethical Wall Protection on Document Drafting", () => {
    it("strictly blocks unassigned counsel Alpha from creating or reading drafts on restricted case CS-202/2026", async () => {
      await expect(
        createGeneratedDocument(counselAlphaId, {
          caseId: restrictedCaseId,
          templateId: stayTemplateId,
          templateVersionNumber: stayTemplateVersionNumber,
          title: "Intruder Draft on CS-202/2026",
          content: "Intruder Content",
        })
      ).rejects.toThrow();
    });
  });
});
