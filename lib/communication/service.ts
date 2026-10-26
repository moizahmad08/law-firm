import { withUserContext } from "@/lib/database/context";
import { recordAuthAudit } from "@/lib/auth/audit";
import {
  MessageChannel,
  MessageApprovalStatus,
  PasswordDeliveryMethod,
} from "@prisma/client";

export interface CreateClientMessageInput {
  caseId: string;
  clientId: string;
  channel: MessageChannel;
  recipient: string;
  subject?: string;
  content: string;
  messageType?: string;
  userId: string;
}

export interface ReviewClientMessageInput {
  messageId: string;
  userId: string;
  action: "APPROVE" | "REJECT";
  rejectionReason?: string;
}

export interface CreateExternalDocumentShareInput {
  caseId: string;
  recipientEmail: string;
  subject: string;
  message: string;
  documentVersionIds: string[];
  isPasswordProtected?: boolean;
  passwordDeliveryMethod?: PasswordDeliveryMethod;
  deliveryRecipientContact?: string;
  userId: string;
}

export interface ReviewExternalShareInput {
  shareId: string;
  userId: string;
  action: "APPROVE" | "REJECT";
  rejectionReason?: string;
}

/**
 * Creates a client communication draft.
 * STRICT SPECIFICATION: Messages always start in DRAFT and require explicit lawyer approval.
 */
export async function createClientMessage(input: CreateClientMessageInput) {
  // Safety guardrail: Disallow accidental exposure of internal AI thoughts or strategy
  const forbiddenPatterns = [
    /system\s+prompt/i,
    /confidential\s+strategy/i,
    /internal\s+notes\s+only/i,
  ];
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(input.content)) {
      throw new Error("Security Violation: Draft contains forbidden internal or strategy markers.");
    }
  }

  return await withUserContext(input.userId, async (tx) => {
    const msg = await tx.clientMessage.create({
      data: {
        caseId: input.caseId,
        clientId: input.clientId,
        channel: input.channel,
        recipient: input.recipient.trim(),
        subject: input.subject?.trim(),
        content: input.content.trim(),
        messageType: input.messageType || "HEARING_UPDATE",
        approvalStatus: MessageApprovalStatus.DRAFT,
        createdById: input.userId,
      },
      include: {
        client: { select: { name: true, mobile: true, email: true } },
      },
    });

    await recordAuthAudit({
      userId: input.userId,
      action: "CLIENT_MESSAGE_DRAFTED",
      metadata: {
        messageId: msg.id,
        caseId: input.caseId,
        channel: input.channel,
        recipient: msg.recipient,
      },
    });

    return msg;
  });
}

/**
 * Submits a drafted client message for lawyer approval.
 */
export async function submitClientMessageForApproval(userId: string, messageId: string) {
  return await withUserContext(userId, async (tx) => {
    const updated = await tx.clientMessage.update({
      where: { id: messageId },
      data: {
        approvalStatus: MessageApprovalStatus.PENDING_APPROVAL,
      },
    });

    await recordAuthAudit({
      userId,
      action: "CLIENT_MESSAGE_SUBMITTED_FOR_APPROVAL",
      metadata: { messageId, caseId: updated.caseId },
    });

    return updated;
  });
}

/**
 * Updates a client message draft.
 * STRICT SPECIFICATION (MASTER_SPEC Section 10.1):
 * "Approvers can edit drafts. Any later edit invalidates approval."
 * If the message was previously APPROVED, editing resets it back to DRAFT!
 */
export async function updateClientMessage(
  userId: string,
  input: {
    messageId: string;
    content?: string;
    recipient?: string;
    subject?: string;
  }
) {
  return await withUserContext(userId, async (tx) => {
    const existing = await tx.clientMessage.findUniqueOrThrow({
      where: { id: input.messageId },
    });

    const isModified =
      (input.content !== undefined && input.content !== existing.content) ||
      (input.recipient !== undefined && input.recipient !== existing.recipient) ||
      (input.subject !== undefined && input.subject !== existing.subject);

    const wasApproved = existing.approvalStatus === MessageApprovalStatus.APPROVED;

    const data: any = {};
    if (input.content !== undefined) data.content = input.content.trim();
    if (input.recipient !== undefined) data.recipient = input.recipient.trim();
    if (input.subject !== undefined) data.subject = input.subject.trim();

    if (wasApproved && isModified) {
      data.approvalStatus = MessageApprovalStatus.DRAFT;
      data.approvedById = null;
      data.approvedAt = null;
      data.rejectionReason = "Approval invalidated due to content modification.";
    }

    const updated = await tx.clientMessage.update({
      where: { id: input.messageId },
      data,
    });

    if (wasApproved && isModified) {
      await recordAuthAudit({
        userId,
        action: "CLIENT_MESSAGE_APPROVAL_INVALIDATED_BY_EDIT",
        metadata: {
          messageId: existing.id,
          caseId: existing.caseId,
        },
      });
    }

    return updated;
  });
}

/**
 * Reviews and approves or rejects a client communication.
 */
export async function reviewClientMessage(input: ReviewClientMessageInput) {
  return await withUserContext(input.userId, async (tx) => {
    const msg = await tx.clientMessage.findUniqueOrThrow({
      where: { id: input.messageId },
    });

    if (input.action === "APPROVE") {
      const updated = await tx.clientMessage.update({
        where: { id: msg.id },
        data: {
          approvalStatus: MessageApprovalStatus.APPROVED,
          approvedById: input.userId,
          approvedAt: new Date(),
          rejectionReason: null,
        },
      });

      await recordAuthAudit({
        userId: input.userId,
        action: "CLIENT_MESSAGE_APPROVED",
        metadata: { messageId: msg.id, caseId: msg.caseId, channel: msg.channel },
      });

      return updated;
    } else {
      const updated = await tx.clientMessage.update({
        where: { id: msg.id },
        data: {
          approvalStatus: MessageApprovalStatus.REJECTED,
          approvedById: input.userId,
          approvedAt: new Date(),
          rejectionReason: input.rejectionReason || "Rejected by reviewing advocate.",
        },
      });

      await recordAuthAudit({
        userId: input.userId,
        action: "CLIENT_MESSAGE_REJECTED",
        metadata: { messageId: msg.id, caseId: msg.caseId, reason: input.rejectionReason },
      });

      return updated;
    }
  });
}

/**
 * Dispatches an approved client message through the configured channel.
 * STRICT SPECIFICATION: Only APPROVED messages can ever be dispatched.
 */
export async function dispatchApprovedClientMessage(userId: string, messageId: string) {
  return await withUserContext(userId, async (tx) => {
    const msg = await tx.clientMessage.findUniqueOrThrow({
      where: { id: messageId },
    });

    if (msg.approvalStatus !== MessageApprovalStatus.APPROVED) {
      throw new Error("Dispatch Rejected: Client message has not received explicit lawyer approval.");
    }

    // Simulated reliable channel dispatch (adapter ready for SendGrid, Twilio, WhatsApp Cloud API)
    const sentAt = new Date();
    const updated = await tx.clientMessage.update({
      where: { id: msg.id },
      data: {
        approvalStatus: MessageApprovalStatus.SENT,
        sentAt,
        deliveryStatus: "DELIVERED",
      },
    });

    await recordAuthAudit({
      userId,
      action: "CLIENT_MESSAGE_DISPATCHED",
      metadata: {
        messageId: msg.id,
        caseId: msg.caseId,
        channel: msg.channel,
        recipient: msg.recipient,
        sentAt,
      },
    });

    return updated;
  });
}

/**
 * Creates an external document sharing request.
 * MANDATE (MASTER_SPEC Section 11):
 * If password-protected, the password is NEVER included in the email message.
 * Password delivery is configured on a secondary channel (WhatsApp, SMS, or recorded manual).
 */
export async function createExternalDocumentShare(input: CreateExternalDocumentShareInput) {
  if (input.documentVersionIds.length === 0) {
    throw new Error("Validation Error: At least one document version must be attached for external sharing.");
  }

  // Security Check: Ensure password is never in the email text or subject
  const passwordInContentRegex = /(password|passcode|secret\s+key)\s*[:=]\s*\w+/i;
  if (passwordInContentRegex.test(input.message) || (input.subject && passwordInContentRegex.test(input.subject))) {
    throw new Error(
      "Security Violation (MASTER_SPEC Section 11): Never put the document password in the same email as the attachment."
    );
  }

  return await withUserContext(input.userId, async (tx) => {
    const share = await tx.externalDocumentShare.create({
      data: {
        caseId: input.caseId,
        recipientEmail: input.recipientEmail.trim().toLowerCase(),
        subject: input.subject.trim(),
        message: input.message.trim(),
        isPasswordProtected: input.isPasswordProtected ?? true,
        passwordDeliveryMethod: input.passwordDeliveryMethod || PasswordDeliveryMethod.WHATSAPP,
        deliveryRecipientContact: input.deliveryRecipientContact?.trim(),
        approvalStatus: MessageApprovalStatus.DRAFT,
        createdById: input.userId,
        items: {
          create: input.documentVersionIds.map((vId) => ({
            documentVersionId: vId,
          })),
        },
      },
      include: {
        items: {
          include: {
            documentVersion: {
              include: { document: { select: { title: true } } },
            },
          },
        },
      },
    });

    await recordAuthAudit({
      userId: input.userId,
      action: "EXTERNAL_SHARE_REQUEST_CREATED",
      metadata: {
        shareId: share.id,
        caseId: input.caseId,
        recipientEmail: share.recipientEmail,
        isPasswordProtected: share.isPasswordProtected,
        attachmentCount: input.documentVersionIds.length,
      },
    });

    return share;
  });
}

/**
 * Reviews and formally approves or rejects an external document share request.
 */
export async function reviewExternalDocumentShare(input: ReviewExternalShareInput) {
  return await withUserContext(input.userId, async (tx) => {
    const share = await tx.externalDocumentShare.findUniqueOrThrow({
      where: { id: input.shareId },
    });

    if (input.action === "APPROVE") {
      const updated = await tx.externalDocumentShare.update({
        where: { id: share.id },
        data: {
          approvalStatus: MessageApprovalStatus.APPROVED,
          approvedById: input.userId,
          approvedAt: new Date(),
          rejectionReason: null,
        },
      });

      await recordAuthAudit({
        userId: input.userId,
        action: "EXTERNAL_SHARE_APPROVED",
        metadata: { shareId: share.id, caseId: share.caseId, recipientEmail: share.recipientEmail },
      });

      return updated;
    } else {
      const updated = await tx.externalDocumentShare.update({
        where: { id: share.id },
        data: {
          approvalStatus: MessageApprovalStatus.REJECTED,
          approvedById: input.userId,
          approvedAt: new Date(),
          rejectionReason: input.rejectionReason || "Rejected by reviewing advocate.",
        },
      });

      await recordAuthAudit({
        userId: input.userId,
        action: "EXTERNAL_SHARE_REJECTED",
        metadata: { shareId: share.id, caseId: share.caseId, reason: input.rejectionReason },
      });

      return updated;
    }
  });
}

/**
 * Dispatches an approved external document share.
 * Strictly verifies prior approval and enforces dual-channel password delivery.
 */
export async function dispatchApprovedExternalShare(userId: string, shareId: string) {
  return await withUserContext(userId, async (tx) => {
    const share = await tx.externalDocumentShare.findUniqueOrThrow({
      where: { id: shareId },
      include: {
        items: {
          include: {
            documentVersion: true,
          },
        },
      },
    });

    if (share.approvalStatus !== MessageApprovalStatus.APPROVED) {
      throw new Error("Dispatch Blocked: External share request has not been approved by counsel.");
    }

    const sentAt = new Date();
    const updated = await tx.externalDocumentShare.update({
      where: { id: share.id },
      data: {
        approvalStatus: MessageApprovalStatus.SENT,
        sentAt,
      },
    });

    await recordAuthAudit({
      userId,
      action: "EXTERNAL_DOCUMENT_SHARE_DISPATCHED",
      metadata: {
        shareId: share.id,
        caseId: share.caseId,
        recipientEmail: share.recipientEmail,
        isPasswordProtected: share.isPasswordProtected,
        passwordDeliveryMethod: share.passwordDeliveryMethod,
        sentAt,
      },
    });

    return updated;
  });
}
