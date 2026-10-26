"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  generateCaseSummary,
  sendCaseChatMessage,
  extractEventsFromDocument,
  reviewExtractedEvent,
} from "./service";
import { processDocumentOcr } from "./ocr";
import { SummaryType } from "@prisma/client";

export async function generateCaseSummaryAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const caseId = formData.get("caseId") as string;
  const summaryType = (formData.get("summaryType") as SummaryType) || SummaryType.OVERVIEW;

  if (!caseId) {
    return { success: false, error: "Case ID is required." };
  }

  try {
    const summary = await generateCaseSummary({
      caseId,
      userId: user.id,
      summaryType,
    });

    revalidatePath(`/cases/${caseId}`);
    return { success: true, summary, message: "Structured case brief generated." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to generate case summary." };
  }
}

export async function sendCaseChatMessageAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const caseId = formData.get("caseId") as string;
  const message = formData.get("message") as string;

  if (!caseId || !message || !message.trim()) {
    return { success: false, error: "Case ID and message are required." };
  }

  try {
    const result = await sendCaseChatMessage({
      caseId,
      userId: user.id,
      message,
    });

    revalidatePath(`/cases/${caseId}`);
    return {
      success: true,
      userMessage: result.userMessage,
      assistantMessage: result.assistantMessage,
      citations: result.citations,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Case chat query failed." };
  }
}

export async function triggerDocumentOcrAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const versionId = formData.get("versionId") as string;
  const caseId = formData.get("caseId") as string;

  if (!versionId) {
    return { success: false, error: "Document Version ID is required." };
  }

  try {
    const ocrResult = await processDocumentOcr({
      versionId,
      userId: user.id,
    });

    if (caseId) {
      revalidatePath(`/cases/${caseId}`);
    }

    return {
      success: true,
      totalPages: ocrResult.totalPages,
      language: ocrResult.detectedLanguage,
      message: `Extracted ${ocrResult.totalPages} pages with average confidence ${ocrResult.averageConfidence * 100}%.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Document OCR processing failed." };
  }
}

export async function extractEventsFromDocumentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const versionId = formData.get("versionId") as string;
  const caseId = formData.get("caseId") as string;

  if (!versionId) {
    return { success: false, error: "Document Version ID is required." };
  }

  try {
    const events = await extractEventsFromDocument({
      documentVersionId: versionId,
      userId: user.id,
    });

    if (caseId) {
      revalidatePath(`/cases/${caseId}`);
    }

    return {
      success: true,
      eventsFound: events.length,
      message: `Identified ${events.length} suggested dates/deadlines sent to lawyer review queue.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to extract dates from document." };
  }
}

export async function reviewExtractedEventAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const eventId = formData.get("eventId") as string;
  const caseId = formData.get("caseId") as string;
  const action = formData.get("action") as "CONFIRM" | "REJECT";
  const courtName = (formData.get("courtName") as string) || undefined;
  const purpose = (formData.get("purpose") as string) || undefined;

  if (!eventId || !action) {
    return { success: false, error: "Event ID and action are required." };
  }

  try {
    const result = await reviewExtractedEvent({
      eventId,
      userId: user.id,
      action,
      courtName,
      purpose,
    });

    if (caseId) {
      revalidatePath(`/cases/${caseId}`);
    }

    const msg =
      result.status === "CONFIRMED"
        ? `Confirmed and scheduled as official ${result.eventType === "HEARING_DATE" ? "court hearing" : "litigation task"}.`
        : "Suggested date rejected from review queue.";

    return {
      success: true,
      status: result.status,
      message: msg,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to review extracted date." };
  }
}
