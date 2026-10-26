"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createClientMessage,
  updateClientMessage,
  submitClientMessageForApproval,
  reviewClientMessage,
  dispatchApprovedClientMessage,
  createExternalDocumentShare,
  reviewExternalDocumentShare,
  dispatchApprovedExternalShare,
} from "./service";
import { MessageChannel, PasswordDeliveryMethod } from "@prisma/client";

export async function createClientMessageAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const caseId = formData.get("caseId") as string;
  const clientId = formData.get("clientId") as string;
  const channel = (formData.get("channel") as MessageChannel) || MessageChannel.EMAIL;
  const recipient = formData.get("recipient") as string;
  const subject = (formData.get("subject") as string) || undefined;
  const content = formData.get("content") as string;
  const messageType = (formData.get("messageType") as string) || "HEARING_UPDATE";

  if (!caseId || !clientId || !recipient || !content) {
    return { success: false, error: "Case, client, recipient, and message content are required." };
  }

  try {
    const msg = await createClientMessage({
      caseId,
      clientId,
      channel,
      recipient,
      subject,
      content,
      messageType,
      userId: user.id,
    });

    revalidatePath(`/cases/${caseId}`);
    return { success: true, message: msg, notice: "Client message draft created." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to draft client message." };
  }
}

export async function updateClientMessageAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const messageId = formData.get("messageId") as string;
  const caseId = formData.get("caseId") as string;
  const content = (formData.get("content") as string) || undefined;
  const recipient = (formData.get("recipient") as string) || undefined;
  const subject = (formData.get("subject") as string) || undefined;

  if (!messageId) {
    return { success: false, error: "Message ID is required." };
  }

  try {
    const msg = await updateClientMessage(user.id, {
      messageId,
      content,
      recipient,
      subject,
    });

    if (caseId) revalidatePath(`/cases/${caseId}`);
    return {
      success: true,
      message: msg,
      notice:
        msg.approvalStatus === "DRAFT"
          ? "Message updated. (Note: Substantive edit reset approval status to Draft for re-review)."
          : "Message updated.",
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update client message." };
  }
}

export async function submitClientMessageForApprovalAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const messageId = formData.get("messageId") as string;
  const caseId = formData.get("caseId") as string;

  if (!messageId) {
    return { success: false, error: "Message ID is required." };
  }

  try {
    const msg = await submitClientMessageForApproval(user.id, messageId);
    if (caseId) revalidatePath(`/cases/${caseId}`);
    return { success: true, message: msg, notice: "Submitted for lawyer approval." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to submit message for approval." };
  }
}

export async function reviewClientMessageAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const messageId = formData.get("messageId") as string;
  const caseId = formData.get("caseId") as string;
  const action = formData.get("action") as "APPROVE" | "REJECT";
  const rejectionReason = (formData.get("rejectionReason") as string) || undefined;

  if (!messageId || !action) {
    return { success: false, error: "Message ID and action are required." };
  }

  try {
    const msg = await reviewClientMessage({
      messageId,
      userId: user.id,
      action,
      rejectionReason,
    });

    if (caseId) revalidatePath(`/cases/${caseId}`);
    return {
      success: true,
      message: msg,
      notice: action === "APPROVE" ? "Client message approved for dispatch." : "Client message rejected.",
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to review client message." };
  }
}

export async function dispatchApprovedClientMessageAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const messageId = formData.get("messageId") as string;
  const caseId = formData.get("caseId") as string;

  if (!messageId) {
    return { success: false, error: "Message ID is required." };
  }

  try {
    const msg = await dispatchApprovedClientMessage(user.id, messageId);
    if (caseId) revalidatePath(`/cases/${caseId}`);
    return { success: true, message: msg, notice: `Message dispatched via ${msg.channel}.` };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to dispatch message." };
  }
}

export async function createExternalDocumentShareAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const caseId = formData.get("caseId") as string;
  const recipientEmail = formData.get("recipientEmail") as string;
  const subject = formData.get("subject") as string;
  const message = formData.get("message") as string;
  const versionIdsRaw = formData.getAll("documentVersionIds") as string[];
  const isPasswordProtected = formData.get("isPasswordProtected") === "true";
  const passwordDeliveryMethod = (formData.get("passwordDeliveryMethod") as PasswordDeliveryMethod) || PasswordDeliveryMethod.WHATSAPP;
  const deliveryRecipientContact = (formData.get("deliveryRecipientContact") as string) || undefined;

  if (!caseId || !recipientEmail || !subject || !message || versionIdsRaw.length === 0) {
    return { success: false, error: "Recipient email, subject, message, and at least one document are required." };
  }

  try {
    const share = await createExternalDocumentShare({
      caseId,
      recipientEmail,
      subject,
      message,
      documentVersionIds: versionIdsRaw,
      isPasswordProtected,
      passwordDeliveryMethod,
      deliveryRecipientContact,
      userId: user.id,
    });

    revalidatePath(`/cases/${caseId}`);
    return { success: true, share, notice: "External document share request prepared." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create share request." };
  }
}

export async function reviewExternalDocumentShareAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const shareId = formData.get("shareId") as string;
  const caseId = formData.get("caseId") as string;
  const action = formData.get("action") as "APPROVE" | "REJECT";
  const rejectionReason = (formData.get("rejectionReason") as string) || undefined;

  if (!shareId || !action) {
    return { success: false, error: "Share ID and action are required." };
  }

  try {
    const share = await reviewExternalDocumentShare({
      shareId,
      userId: user.id,
      action,
      rejectionReason,
    });

    if (caseId) revalidatePath(`/cases/${caseId}`);
    return {
      success: true,
      share,
      notice: action === "APPROVE" ? "External share approved for sending." : "External share rejected.",
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to review external share." };
  }
}

export async function dispatchApprovedExternalShareAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const shareId = formData.get("shareId") as string;
  const caseId = formData.get("caseId") as string;

  if (!shareId) {
    return { success: false, error: "Share ID is required." };
  }

  try {
    const share = await dispatchApprovedExternalShare(user.id, shareId);
    if (caseId) revalidatePath(`/cases/${caseId}`);
    return { success: true, share, notice: "External share dispatched via secure email." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to dispatch external share." };
  }
}
