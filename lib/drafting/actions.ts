"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createDocumentTemplate,
  createGeneratedDocument,
  updateGeneratedDocument,
  submitDocumentForApproval,
  reviewDocumentApproval,
  exportDocumentForSigning,
  linkSignedDocumentCopy,
} from "./service";
import { TemplateCategory } from "@prisma/client";

export async function createDocumentTemplateAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const category = formData.get("category") as TemplateCategory;
  const description = formData.get("description") as string;
  const content = formData.get("content") as string;

  if (!name || !code || !category || !content) {
    return { success: false, error: "Name, unique code, category, and content are required." };
  }

  try {
    const template = await createDocumentTemplate(user.id, {
      name,
      code,
      category,
      description,
      content,
    });

    return { success: true, template, message: `Template "${template.name}" created.` };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create document template." };
  }
}

export async function createGeneratedDocumentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const caseId = formData.get("caseId") as string;
  const templateId = (formData.get("templateId") as string) || undefined;
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;

  if (!caseId || !title || !content) {
    return { success: false, error: "Case ID, title, and content are required." };
  }

  try {
    const doc = await createGeneratedDocument(user.id, {
      caseId,
      templateId,
      title,
      content,
    });

    revalidatePath(`/cases/${caseId}`);
    return { success: true, document: doc, message: "Draft document saved." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create document draft." };
  }
}

export async function updateGeneratedDocumentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const documentId = formData.get("documentId") as string;
  const caseId = formData.get("caseId") as string;
  const title = (formData.get("title") as string) || undefined;
  const content = (formData.get("content") as string) || undefined;

  if (!documentId) {
    return { success: false, error: "Document ID is required." };
  }

  try {
    const doc = await updateGeneratedDocument(user.id, {
      documentId,
      title,
      content,
    });

    if (caseId) revalidatePath(`/cases/${caseId}`);
    return {
      success: true,
      document: doc,
      message:
        doc.approvalStatus === "DRAFT"
          ? "Document updated. (Note: Substantive edit reset approval status to Draft for re-review)."
          : "Document updated.",
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update document." };
  }
}

export async function submitDocumentForApprovalAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const documentId = formData.get("documentId") as string;
  const caseId = formData.get("caseId") as string;

  if (!documentId) {
    return { success: false, error: "Document ID is required." };
  }

  try {
    const doc = await submitDocumentForApproval(user.id, documentId);
    if (caseId) revalidatePath(`/cases/${caseId}`);
    return { success: true, document: doc, message: "Submitted for partner approval." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to submit for approval." };
  }
}

export async function reviewDocumentApprovalAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const documentId = formData.get("documentId") as string;
  const caseId = formData.get("caseId") as string;
  const action = formData.get("action") as "APPROVE" | "REJECT";
  const rejectionReason = (formData.get("rejectionReason") as string) || undefined;

  if (!documentId || !action) {
    return { success: false, error: "Document ID and action are required." };
  }

  try {
    const doc = await reviewDocumentApproval(user.id, {
      documentId,
      action,
      rejectionReason,
    });

    if (caseId) revalidatePath(`/cases/${caseId}`);
    return {
      success: true,
      document: doc,
      message: action === "APPROVE" ? "Document approved for export." : "Document rejected.",
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to review document." };
  }
}

export async function exportDocumentForSigningAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const documentId = formData.get("documentId") as string;
  const caseId = formData.get("caseId") as string;
  const format = (formData.get("format") as "PDF" | "DOCX") || "PDF";

  if (!documentId) {
    return { success: false, error: "Document ID is required." };
  }

  try {
    const doc = await exportDocumentForSigning(user.id, documentId, format);
    if (caseId) revalidatePath(`/cases/${caseId}`);
    return { success: true, document: doc, message: `Document marked exported as ${format}.` };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to export document." };
  }
}

export async function linkSignedDocumentCopyAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const documentId = formData.get("documentId") as string;
  const caseId = formData.get("caseId") as string;
  const signedDocumentId = formData.get("signedDocumentId") as string;

  if (!documentId || !signedDocumentId) {
    return { success: false, error: "Document ID and signed document copy are required." };
  }

  try {
    const doc = await linkSignedDocumentCopy(user.id, {
      documentId,
      signedDocumentId,
    });

    if (caseId) revalidatePath(`/cases/${caseId}`);
    return { success: true, document: doc, message: "Physical signed copy linked." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to link signed copy." };
  }
}
