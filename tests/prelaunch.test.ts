import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/database/client";
import { withUserContext } from "@/lib/database/context";
import {
  createClientMessage,
  updateClientMessage,
  reviewClientMessage,
  dispatchApprovedClientMessage,
  createExternalDocumentShare,
  reviewExternalDocumentShare,
  dispatchApprovedExternalShare,
} from "@/lib/communication/service";
import { searchPrecedents } from "@/lib/research/service";
import { searchLitigation } from "@/lib/search/global-search";
import { getCaseAiData, sendCaseChatMessage } from "@/lib/ai/service";
import {
  Role,
  MessageChannel,
  MessageApprovalStatus,
  PasswordDeliveryMethod,
  DocumentCategory,
  PrismaClient,
} from "@prisma/client";

const ownerPrisma = new PrismaClient({
  datasources: { db: { url: process.env.SEED_DATABASE_URL || process.env.DATABASE_URL } },
});

describe("Milestone 7A: Comprehensive Pre-Launch Acceptance Suite (MASTER_SPEC Section 18)", () => {
  let superAdminId: string;
  let officeAdminId: string;
  let counselAlphaId: string;
  let counselBetaId: string;
  let assistantId: string;
  let financeAdminId: string;

  let generalCaseId: string;
  let generalClientId: string;
  let restrictedCaseId: string;
  let restrictedClientId: string;
  let createdDocId: string;
  let createdVersionId: string;

  beforeAll(async () => {
    // 1. Fetch test users across all 5 roles
    const superAdmin = await prisma.user.findFirstOrThrow({ where: { role: Role.SUPER_ADMIN } });
    const officeAdmin = await prisma.user.findFirstOrThrow({ where: { role: Role.OFFICE_ADMIN } });
    const counselAlpha = await prisma.user.findFirstOrThrow({ where: { email: "counsel.alpha@lawfirm.local" } });
    const counselBeta = await prisma.user.findFirstOrThrow({ where: { email: "counsel.beta@lawfirm.local" } });
    const assistant = await prisma.user.findFirstOrThrow({ where: { role: Role.ASSISTANT } });
    const financeAdmin = await prisma.user.findFirstOrThrow({ where: { role: Role.FINANCE_ADMIN } });

    superAdminId = superAdmin.id;
    officeAdminId = officeAdmin.id;
    counselAlphaId = counselAlpha.id;
    counselBetaId = counselBeta.id;
    assistantId = assistant.id;
    financeAdminId = financeAdmin.id;

    // 2. Fetch test cases (WP-101/2026 is general; CS-202/2026 is restricted to Counsel Beta)
    const generalCase = await withUserContext(counselAlphaId, async (tx) => {
      return await tx.case.findFirstOrThrow({
        where: { caseNumber: "WP-101/2026" },
        include: { client: true },
      });
    });
    generalCaseId = generalCase.id;
    generalClientId = generalCase.clientId;

    const restrictedCase = await withUserContext(counselBetaId, async (tx) => {
      return await tx.case.findFirstOrThrow({
        where: { caseNumber: "CS-202/2026" },
        include: { client: true },
      });
    });
    restrictedCaseId = restrictedCase.id;
    restrictedClientId = restrictedCase.clientId;

    // 3. Create a test document version for sharing tests
    const doc = await withUserContext(counselAlphaId, async (tx) => {
      return await tx.document.create({
        data: {
          caseId: generalCaseId,
          category: DocumentCategory.COURT_ORDER,
          title: "Prelaunch Acceptance Exhibit.pdf",
          createdById: counselAlphaId,
          versions: {
            create: {
              versionNumber: 1,
              fileName: "Prelaunch_Acceptance_Exhibit.pdf",
              fileExtension: "pdf",
              mimeType: "application/pdf",
              fileSizeBytes: BigInt(4096),
              storagePath: "documents/prelaunch/exhibit_v1.pdf",
              fileHashSha256: "fa468112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
              uploader: { connect: { id: counselAlphaId } },
            },
          },
        },
        include: { versions: true },
      });
    });
    createdDocId = doc.id;
    createdVersionId = doc.versions[0].id;
  });

  afterAll(async () => {
    if (createdDocId) {
      await ownerPrisma.document.deleteMany({ where: { id: createdDocId } });
    }
    await ownerPrisma.$disconnect();
  });

  describe("1. Cross-Role Access Matrix & Ethical Wall Isolation", () => {
    it("strictly isolates restricted case CS-202/2026 from unassigned counsel Alpha across search and query", async () => {
      // Counsel Alpha searching for "CS-202/2026" or "Apex Financial"
      const searchRes = await searchLitigation({
        query: "CS-202/2026",
        userId: counselAlphaId,
      });
      expect(searchRes.results.some((c) => c.title.includes("CS-202/2026"))).toBe(false);

      // Direct RLS query for restricted case by unassigned lawyer returns null
      const directQuery = await withUserContext(counselAlphaId, async (tx) => {
        return await tx.case.findUnique({ where: { id: restrictedCaseId } });
      });
      expect(directQuery).toBeNull();
    });

    it("strictly blocks Office Admin from viewing restricted case without explicit assignment", async () => {
      const adminQuery = await withUserContext(officeAdminId, async (tx) => {
        return await tx.case.findUnique({ where: { id: restrictedCaseId } });
      });
      expect(adminQuery).toBeNull();
    });

    it("permits assigned counsel Beta full access to restricted case CS-202/2026", async () => {
      const betaQuery = await withUserContext(counselBetaId, async (tx) => {
        return await tx.case.findUnique({ where: { id: restrictedCaseId } });
      });
      expect(betaQuery).not.toBeNull();
      expect(betaQuery?.caseNumber).toBe("CS-202/2026");
    });

    it("strictly isolates AI grounded case chat and dossier generation from unassigned users", async () => {
      // 1. Data retrieval returns empty results under RLS (no leakage of summaries or messages)
      const aiData = await getCaseAiData(restrictedCaseId, counselAlphaId);
      expect(aiData.summaries.length).toBe(0);
      expect(aiData.messages.length).toBe(0);
      expect(aiData.pendingEvents.length).toBe(0);

      // 2. Interactive chat attempt on restricted case strictly throws an RLS rejection
      await expect(
        sendCaseChatMessage({
          caseId: restrictedCaseId,
          userId: counselAlphaId,
          message: "What are the secret claims in this dispute?",
        })
      ).rejects.toThrow();
    });
  });

  describe("2. Client Communication & External Sharing Approval Bypass Prevention", () => {
    let messageId: string;
    let shareId: string;

    it("rejects dispatch of client messages in DRAFT or unapproved state", async () => {
      const msg = await createClientMessage({
        caseId: generalCaseId,
        clientId: generalClientId,
        channel: MessageChannel.EMAIL,
        recipient: "client@apextrading.pk",
        subject: "Pre-Launch Verification Notice",
        content: "Dear Client, this is an automated verification advisory.",
        userId: counselAlphaId,
      });
      messageId = msg.id;

      // Unapproved message cannot be dispatched
      await expect(
        dispatchApprovedClientMessage(counselAlphaId, messageId)
      ).rejects.toThrow("Dispatch Rejected");
    });

    it("resets approved status to DRAFT if substantive edits occur post-approval", async () => {
      // Counsel formally approves message
      await reviewClientMessage({
        messageId,
        userId: counselAlphaId,
        action: "APPROVE",
      });

      // Substantive edit post-approval
      const edited = await updateClientMessage(counselAlphaId, {
        messageId,
        content: "SUBSTANTIVELY REVISED: Terms modified post-approval.",
      });

      expect(edited.approvalStatus).toBe(MessageApprovalStatus.DRAFT);
      expect(edited.approvedById).toBeNull();
      expect(edited.rejectionReason).toContain("Approval invalidated due to content modification");
    });

    it("rejects dispatch of external document share before explicit lawyer approval", async () => {
      const share = await createExternalDocumentShare({
        caseId: generalCaseId,
        recipientEmail: "outside.counsel@chambers.pk",
        subject: "Confidential Court Exhibits",
        message: "Please find attached the protected legal documents.",
        documentVersionIds: [createdVersionId],
        isPasswordProtected: true,
        passwordDeliveryMethod: PasswordDeliveryMethod.SMS,
        deliveryRecipientContact: "+92 300 5551234",
        userId: counselAlphaId,
      });
      shareId = share.id;

      // Attempting dispatch without approval must fail
      await expect(
        dispatchApprovedExternalShare(counselAlphaId, shareId)
      ).rejects.toThrow("Dispatch Blocked: External share request has not been approved");

      // Approve and dispatch cleanly
      await reviewExternalDocumentShare({
        shareId,
        userId: counselAlphaId,
        action: "APPROVE",
      });

      const sent = await dispatchApprovedExternalShare(counselAlphaId, shareId);
      expect(sent.approvalStatus).toBe(MessageApprovalStatus.SENT);
      expect(sent.sentAt).not.toBeNull();
    });

    afterAll(async () => {
      if (messageId) {
        await ownerPrisma.clientMessage.deleteMany({ where: { id: messageId } });
      }
      if (shareId) {
        await ownerPrisma.externalDocumentShare.deleteMany({ where: { id: shareId } });
      }
    });
  });

  describe("3. Secret Scan & Audit Trail Sanitization", () => {
    it("strictly verifies no raw passwords, TOTP seeds, or attachment passcodes appear in audit logs", async () => {
      const recentAuditEvents = await ownerPrisma.auditEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      const forbiddenSecrets = [
        "TestLawyer2026!",
        "lms_dev_password",
        "EICAR-STANDARD-ANTIVIRUS",
      ];

      for (const event of recentAuditEvents) {
        const payloadStr = JSON.stringify({
          before: event.beforeState,
          after: event.afterState,
          action: event.action,
        });

        for (const secret of forbiddenSecrets) {
          expect(payloadStr).not.toContain(secret);
        }
      }
    });

    it("verifies immutable audit trail integrity: lms_app cannot alter or prune audit events", async () => {
      await expect(
        prisma.$executeRawUnsafe(`DELETE FROM public.audit_events WHERE entity_id = 'INITIAL_SEED';`)
      ).rejects.toThrow();

      await expect(
        prisma.$executeRawUnsafe(`UPDATE public.audit_events SET action = 'ALTERED' WHERE entity_id = 'INITIAL_SEED';`)
      ).rejects.toThrow();
    });
  });

  describe("4. Research Engine Quality & Pakistan Precedent Precedential Weight", () => {
    it("consistently computes Article 189 Supreme Court binding weight across provincial courts", async () => {
      const searchRes = await searchPrecedents(counselAlphaId, {
        query: "Practice and Procedure Act",
      });

      expect(searchRes.results.length).toBeGreaterThan(0);
      const scPrecedent = searchRes.results.find((r) => r.citation === "PLD 2023 SC 450");
      expect(scPrecedent).toBeDefined();
      expect(scPrecedent?.effectiveAuthority).toBe("BINDING");
      expect(scPrecedent?.authorityReasoning).toContain("Article 189");
    });
  });
});
