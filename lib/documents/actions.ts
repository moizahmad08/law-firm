"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  uploadDocument,
  uploadDocumentRevision,
  getDocumentDownloadToken,
} from "@/lib/documents/service";
import { DocumentCategory } from "@prisma/client";

export async function uploadDocumentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const file = formData.get("file") as File;
  const caseId = formData.get("caseId") as string;
  const title = formData.get("title") as string;
  const category = (formData.get("category") as DocumentCategory) || DocumentCategory.OTHER;
  const description = (formData.get("description") as string) || "";
  const isRestricted = formData.get("isRestricted") === "true";
  const notes = (formData.get("notes") as string) || "";

  if (!file || !caseId || !title) {
    return { success: false, error: "Missing required fields (file, caseId, title)." };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await uploadDocument({
      caseId,
      title,
      category,
      description,
      isRestricted,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
      uploaderId: user.id,
      notes,
    });

    revalidatePath(`/cases/${caseId}`);
    return { success: true, message: "Document uploaded successfully." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to upload document." };
  }
}

export async function uploadRevisionAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const file = formData.get("file") as File;
  const documentId = formData.get("documentId") as string;
  const caseId = formData.get("caseId") as string;
  const notes = (formData.get("notes") as string) || "";

  if (!file || !documentId) {
    return { success: false, error: "Missing required file or document ID." };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await uploadDocumentRevision({
      documentId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
      uploaderId: user.id,
      notes,
    });

    if (caseId) {
      revalidatePath(`/cases/${caseId}`);
    }
    return { success: true, message: "Document revision uploaded successfully." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to upload document revision." };
  }
}

export type DownloadTokenResult =
  | { success: true; token: string; fileName: string; versionNumber: number; downloadUrl: string }
  | { success: false; error: string };

export async function getDownloadTokenAction(
  documentId: string,
  versionNumber?: number
): Promise<DownloadTokenResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const tokenData = await getDocumentDownloadToken({
      documentId,
      versionNumber,
      userId: user.id,
    });
    return { success: true, ...tokenData };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to generate download token." };
  }
}
