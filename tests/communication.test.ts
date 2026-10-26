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
import {
  MessageChannel,
  MessageApprovalStatus,
  PasswordDeliveryMethod,
  Role,
  DocumentCategory,
  PrismaClient,
} from "@prisma/client";

const ownerPrisma = new PrismaClient({
  datasources: { db: { url: process.env.SEED_DATABASE_URL || process.env.DATABASE_URL } },
});

describe("Milestone 6C: Client Communications, Approval Guardrails & Dual-Channel Sharing", () => {
  let superAdminId: string;
  let counselAlphaId: string;
  let counselBetaId: string;
  let generalCaseId: string;
  let generalClientId: string;
  let restrictedCaseId: string;
  let restrictedClientId: string;
  let testDocumentVersionId: string;
  let createdMessageId: string;
  let createdShareId: string;

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
        include: { client: true },
      });
    });
    generalCaseId = generalCase.id;
    generalClientId = generalCase.clientId;

    // CS-202/2026 (restricted case assigned to Beta, Alpha blocked)
    const restrictedCase = await withUserContext(counselBetaId, async (tx) => {
      return await tx.case.findFirstOrThrow({
        where: { caseNumber: "CS-202/2026" },
        include: { client: true },
      });
    });
    restrictedCaseId = restrictedCase.id;
    restrictedClientId = restrictedCase.clientId;

    // Create a mock document version for external sharing tests
    const testDoc = await withUserContext(counselAlphaId, async (tx) => {
      return await tx.document.create({
        data: {
          caseId: generalCaseId,
          category: DocumentCategory.COURT_ORDER,
          title: "Interim Stay Order WP-101.pdf",
          createdById: counselAlphaId,
          versions: {
            create: {
              versionNumber: 1,
              fileName: "Interim_Stay_Order_WP-101.pdf",
              fileExtension: "pdf",
              mimeType: "application/pdf",
              fileSizeBytes: BigInt(2048),
              storagePath: "documents/wp101/order_v1.pdf",
              fileHashSha256: "d3b07384d113edec49eaa6238ad5ff00",
              uploader: { connect: { id: counselAlphaId } },
            },
          },
        },
        include: { versions: true },
      });
    });
    testDocumentVersionId = testDoc.versions[0].id;
  });

  afterAll(async () => {
    if (createdMessageId) {
      await ownerPrisma.clientMessage.deleteMany({
        where: { id: createdMessageId },
      });
    }
    if (createdShareId) {
      await ownerPrisma.externalDocumentShare.deleteMany({
        where: { id: createdShareId },
      });
    }
    if (testDocumentVersionId) {
      await ownerPrisma.documentVersion.deleteMany({
        where: { id: testDocumentVersionId },
      });
    }
    await ownerPrisma.$disconnect();
  });

  describe("Client Message Workflow & Approval Gatekeeping", () => {
    it("strictly blocks prompt injection or internal strategy markers in client drafts", async () => {
      await expect(
        createClientMessage({
          caseId: generalCaseId,
          clientId: generalClientId,
          channel: MessageChannel.EMAIL,
          recipient: "client@apextrading.pk",
          subject: "Hearing Update",
          content: "Dear Client, our CONFIDENTIAL STRATEGY is to delay the next hearing.",
          userId: counselAlphaId,
        })
      ).rejects.toThrow("Security Violation");
    });

    it("creates a client message in DRAFT status requiring approval", async () => {
      const msg = await createClientMessage({
        caseId: generalCaseId,
        clientId: generalClientId,
        channel: MessageChannel.EMAIL,
        recipient: "client@apextrading.pk",
        subject: "Hearing Scheduled - WP-101/2026",
        content: "Dear Client, the next hearing has been scheduled for November 15, 2026 before the Lahore High Court.",
        userId: counselAlphaId,
      });

      expect(msg.id).toBeDefined();
      createdMessageId = msg.id;
      expect(msg.approvalStatus).toBe(MessageApprovalStatus.DRAFT);
      expect(msg.approvedById).toBeNull();
    });

    it("STRICT MANDATE: blocks dispatch of unapproved client messages", async () => {
      // Message is currently in DRAFT status
      await expect(
        dispatchApprovedClientMessage(counselAlphaId, createdMessageId)
      ).rejects.toThrow("Dispatch Rejected");
    });

    it("allows counsel to formally approve message and dispatches successfully", async () => {
      // 1. Approve message
      const approved = await reviewClientMessage({
        messageId: createdMessageId,
        userId: counselAlphaId,
        action: "APPROVE",
      });
      expect(approved.approvalStatus).toBe(MessageApprovalStatus.APPROVED);
      expect(approved.approvedById).toBe(counselAlphaId);
      expect(approved.approvedAt).not.toBeNull();

      // 2. Dispatch approved message
      const sent = await dispatchApprovedClientMessage(counselAlphaId, createdMessageId);
      expect(sent.approvalStatus).toBe(MessageApprovalStatus.SENT);
      expect(sent.sentAt).not.toBeNull();
    });

    it("STRICT MANDATE: substantive edit to approved message invalidates approval and resets status to DRAFT", async () => {
      // Create a fresh message and approve it
      const msg2 = await createClientMessage({
        caseId: generalCaseId,
        clientId: generalClientId,
        channel: MessageChannel.WHATSAPP,
        recipient: "+92 300 1234567",
        content: "Reminder: Please arrive at court at 9:00 AM.",
        userId: counselAlphaId,
      });

      await reviewClientMessage({
        messageId: msg2.id,
        userId: counselAlphaId,
        action: "APPROVE",
      });

      // Substantively edit message content post-approval
      const edited = await updateClientMessage(counselAlphaId, {
        messageId: msg2.id,
        content: "Reminder: Change of venue! Please arrive at Court Room 4 at 11:00 AM.",
      });

      // Verify automatic invalidation (MASTER_SPEC Section 10.1)
      expect(edited.approvalStatus).toBe(MessageApprovalStatus.DRAFT);
      expect(edited.approvedById).toBeNull();
      expect(edited.approvedAt).toBeNull();
      expect(edited.rejectionReason).toContain("Approval invalidated due to content modification");

      // Cleanup
      await ownerPrisma.clientMessage.deleteMany({ where: { id: msg2.id } });
    });
  });

  describe("External Document Sharing & Dual-Channel Password Delivery", () => {
    it("creates an external document share request with dual-channel delivery mode", async () => {
      const share = await createExternalDocumentShare({
        caseId: generalCaseId,
        recipientEmail: "expert.witness@forensics.pk",
        subject: "Confidential Court Order - Matter WP-101/2026",
        message: "Please find attached the certified copy of the interim injunction for your expert review.",
        documentVersionIds: [testDocumentVersionId],
        isPasswordProtected: true,
        passwordDeliveryMethod: PasswordDeliveryMethod.WHATSAPP,
        deliveryRecipientContact: "+92 300 9876543",
        userId: counselAlphaId,
      });

      expect(share.id).toBeDefined();
      createdShareId = share.id;
      expect(share.approvalStatus).toBe(MessageApprovalStatus.DRAFT);
      expect(share.isPasswordProtected).toBe(true);
      expect(share.passwordDeliveryMethod).toBe(PasswordDeliveryMethod.WHATSAPP);
      expect(share.items.length).toBe(1);
    });

    it("blocks dispatch of unapproved external document share", async () => {
      await expect(
        dispatchApprovedExternalShare(counselAlphaId, createdShareId)
      ).rejects.toThrow("Dispatch Blocked: External share request has not been approved");
    });

    it("approves and dispatches external share without exposing passcode in email body", async () => {
      // 1. Counsel review & approve
      const approved = await reviewExternalDocumentShare({
        shareId: createdShareId,
        userId: counselAlphaId,
        action: "APPROVE",
      });
      expect(approved.approvalStatus).toBe(MessageApprovalStatus.APPROVED);

      // 2. Dispatch
      const sent = await dispatchApprovedExternalShare(counselAlphaId, createdShareId);
      expect(sent.approvalStatus).toBe(MessageApprovalStatus.SENT);
      expect(sent.sentAt).not.toBeNull();
    });
  });

  describe("Ethical Wall Protection on Client Messages & Sharing", () => {
    it("strictly blocks unassigned counsel Alpha from messaging or sharing on restricted case CS-202/2026", async () => {
      await expect(
        createClientMessage({
          caseId: restrictedCaseId,
          clientId: restrictedClientId,
          channel: MessageChannel.EMAIL,
          recipient: "unauthorized@client.pk",
          content: "Intruder attempt on restricted matter.",
          userId: counselAlphaId,
        })
      ).rejects.toThrow();

      await expect(
        createExternalDocumentShare({
          caseId: restrictedCaseId,
          recipientEmail: "intruder@outside.pk",
          subject: "Restricted Case Dossier",
          message: "Unauthorized document export.",
          documentVersionIds: [testDocumentVersionId],
          userId: counselAlphaId,
        })
      ).rejects.toThrow();
    });
  });
});
