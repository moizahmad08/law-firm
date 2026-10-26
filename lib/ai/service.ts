import { withUserContext } from "@/lib/database/context";
import { recordAuthAudit } from "@/lib/auth/audit";
import { defaultAiProvider, AiProvider } from "./provider";
import {
  SummaryType,
  ChatRole,
  ExtractedEventType,
  ExtractionStatus,
  HearingStatus,
  TaskPriority,
  TaskStatus,
} from "@prisma/client";

export interface GenerateCaseSummaryInput {
  caseId: string;
  userId: string;
  summaryType?: SummaryType;
  provider?: AiProvider;
}

export interface SendCaseChatMessageInput {
  caseId: string;
  userId: string;
  message: string;
  provider?: AiProvider;
}

export interface ReviewExtractedEventInput {
  eventId: string;
  userId: string;
  action: "CONFIRM" | "REJECT";
  courtName?: string;
  purpose?: string;
}

/**
 * Generates an AI structured case dossier summary with document page citations.
 */
export async function generateCaseSummary(input: GenerateCaseSummaryInput) {
  const provider = input.provider || defaultAiProvider;
  const summaryType = input.summaryType || SummaryType.OVERVIEW;

  // 1. Fetch case and its document pages under RLS
  const caseRecord = await withUserContext(input.userId, async (tx) => {
    return await tx.case.findUniqueOrThrow({
      where: { id: input.caseId },
      include: {
        client: { select: { name: true } },
        documents: {
          where: { deletedAt: null },
          include: {
            versions: {
              orderBy: { versionNumber: "desc" },
              take: 1,
              include: {
                pages: { orderBy: { pageNumber: "asc" } },
              },
            },
          },
        },
      },
    });
  });

  // 2. Prepare context documents
  const contextDocuments = caseRecord.documents.map((d) => {
    const latestVer = d.versions[0];
    return {
      title: d.title,
      versionNumber: latestVer?.versionNumber || 1,
      pages: (latestVer?.pages || []).map((p) => ({
        pageNumber: p.pageNumber,
        text: p.textContent,
      })),
    };
  });

  const prompt = `Please generate a structured legal case summary (${summaryType}) for matter ${caseRecord.caseNumber}: "${caseRecord.title}". Client: ${caseRecord.client.name}. Court: ${caseRecord.court}.`;

  // 3. Generate AI summary outside DB transaction so external network latency does not hold locks or hit timeouts
  const completion = await provider.generateCompletion(prompt, {
    contextDocuments,
  });

  // 4. Store in case_summaries under RLS context
  return await withUserContext(input.userId, async (tx) => {
    const summary = await tx.caseSummary.create({
      data: {
        caseId: caseRecord.id,
        summaryType,
        content: completion.text,
        citationsJson: completion.citations as any,
        generatedById: input.userId,
        tokenCount: completion.tokenCount,
      },
      include: {
        generatedBy: { select: { fullName: true } },
      },
    });

    // 5. Audit event
    await recordAuthAudit({
      userId: input.userId,
      action: "AI_CASE_SUMMARY_GENERATED",
      metadata: {
        summaryId: summary.id,
        caseId: caseRecord.id,
        summaryType,
        tokenCount: completion.tokenCount,
        citationCount: completion.citations.length,
      },
    });

    return summary;
  });
}

/**
 * Interactive case chat with strict per-case RLS boundary and document citations.
 */
export async function sendCaseChatMessage(input: SendCaseChatMessageInput) {
  const provider = input.provider || defaultAiProvider;
  const promptText = input.message.trim();

  if (!promptText) {
    throw new Error("Message text cannot be empty.");
  }

  // 1. Verify case access under RLS and save user message
  const { caseRecord, userMessage } = await withUserContext(input.userId, async (tx) => {
    const record = await tx.case.findUniqueOrThrow({
      where: { id: input.caseId },
      include: {
        documents: {
          where: { deletedAt: null },
          include: {
            versions: {
              orderBy: { versionNumber: "desc" },
              take: 1,
              include: {
                pages: { orderBy: { pageNumber: "asc" } },
              },
            },
          },
        },
      },
    });

    const msg = await tx.caseChatMessage.create({
      data: {
        caseId: record.id,
        userId: input.userId,
        role: ChatRole.USER,
        content: promptText,
      },
    });

    return { caseRecord: record, userMessage: msg };
  });

  // 2. Prepare context
  const contextDocuments = caseRecord.documents.map((d) => {
    const latestVer = d.versions[0];
    return {
      title: d.title,
      versionNumber: latestVer?.versionNumber || 1,
      pages: (latestVer?.pages || []).map((p) => ({
        pageNumber: p.pageNumber,
        text: p.textContent,
      })),
    };
  });

  // 3. Generate response outside DB transaction
  const completion = await provider.generateCompletion(promptText, {
    contextDocuments,
  });

  // 4. Save assistant message with citations under RLS context
  return await withUserContext(input.userId, async (tx) => {
    const assistantMessage = await tx.caseChatMessage.create({
      data: {
        caseId: caseRecord.id,
        userId: input.userId,
        role: ChatRole.ASSISTANT,
        content: completion.text,
        citationsJson: completion.citations as any,
      },
    });

    // 5. Audit event
    await recordAuthAudit({
      userId: input.userId,
      action: "AI_CASE_CHAT_QUERY",
      metadata: {
        caseId: caseRecord.id,
        promptLength: promptText.length,
        tokenCount: completion.tokenCount,
      },
    });

    return {
      userMessage,
      assistantMessage,
      citations: completion.citations,
    };
  });
}

/**
 * Scans document pages to extract hearing dates and filing deadlines into the Confirmation Review Queue.
 * STRICT POLICY: Does NOT auto-schedule official hearings without explicit human lawyer confirmation.
 */
export async function extractEventsFromDocument(input: {
  documentVersionId: string;
  userId: string;
}) {
  return await withUserContext(input.userId, async (tx) => {
    const version = await tx.documentVersion.findUniqueOrThrow({
      where: { id: input.documentVersionId },
      include: {
        document: { select: { id: true, title: true, caseId: true } },
        pages: { orderBy: { pageNumber: "asc" } },
      },
    });

    const caseId = version.document.caseId;
    const extractedEvents = [];

    // Date regex matching standard Pakistani court dates e.g. "15th November 2026", "20-11-2026", "2026-11-20"
    const dateRegex = /\b(\d{1,2}(?:st|nd|rd|th)?[\s/-]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s/-]+\d{4}|\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})\b/i;

    for (const page of version.pages) {
      const lines = page.textContent.split("\n");
      for (const line of lines) {
        const match = line.match(dateRegex);
        if (match) {
          const rawDateStr = match[0].replace(/(st|nd|rd|th)/i, "");
          const parsedDate = new Date(rawDateStr);

          if (!isNaN(parsedDate.getTime())) {
            const lowerLine = line.toLowerCase();
            let eventType: ExtractedEventType = ExtractedEventType.HEARING_DATE;
            let description = `Court proceeding detected in ${version.document.title}`;

            if (lowerLine.includes("reply") || lowerLine.includes("rejoinder") || lowerLine.includes("written statement")) {
              eventType = ExtractedEventType.FILING_DEADLINE;
              description = `Filing deadline: ${line.trim().slice(0, 80)}`;
            } else if (lowerLine.includes("deposit") || lowerLine.includes("compliance") || lowerLine.includes("fee")) {
              eventType = ExtractedEventType.COMPLIANCE_TASK;
              description = `Compliance deadline: ${line.trim().slice(0, 80)}`;
            } else {
              description = `Hearing date suggestion: ${line.trim().slice(0, 80)}`;
            }

            const event = await tx.extractedEvent.create({
              data: {
                caseId,
                documentVersionId: version.id,
                eventType,
                suggestedDate: parsedDate,
                description,
                confidence: 0.88,
                sourceSnippet: line.trim().slice(0, 200),
                pageNumber: page.pageNumber,
                status: ExtractionStatus.PENDING_REVIEW,
              },
            });
            extractedEvents.push(event);
          }
        }
      }
    }

    await recordAuthAudit({
      userId: input.userId,
      action: "AI_EVENTS_EXTRACTED",
      metadata: {
        documentVersionId: version.id,
        caseId,
        eventsFound: extractedEvents.length,
      },
    });

    return extractedEvents;
  });
}

/**
 * Lawyer reviews and explicitly confirms or rejects an AI extracted date.
 * If confirmed: automatically schedules an official court hearing or litigation task.
 */
export async function reviewExtractedEvent(input: ReviewExtractedEventInput) {
  return await withUserContext(input.userId, async (tx) => {
    const event = await tx.extractedEvent.findUniqueOrThrow({
      where: { id: input.eventId },
      include: {
        case: { select: { id: true, court: true, title: true } },
      },
    });

    if (event.status !== ExtractionStatus.PENDING_REVIEW) {
      throw new Error(`Event is already ${event.status}.`);
    }

    if (input.action === "REJECT") {
      const updated = await tx.extractedEvent.update({
        where: { id: event.id },
        data: {
          status: ExtractionStatus.REJECTED,
          reviewedById: input.userId,
          reviewedAt: new Date(),
        },
      });

      await recordAuthAudit({
        userId: input.userId,
        action: "EXTRACTED_EVENT_REJECTED",
        metadata: { eventId: event.id, caseId: event.caseId },
      });

      return { status: "REJECTED", updated };
    }

    // Action === CONFIRM
    let createdRecordId: string | null = null;

    if (event.eventType === ExtractedEventType.HEARING_DATE) {
      // Create official court hearing
      const hearing = await tx.hearing.create({
        data: {
          caseId: event.caseId,
          court: input.courtName || event.case.court,
          hearingDate: event.suggestedDate,
          purpose: input.purpose || event.description,
          status: HearingStatus.SCHEDULED,
          createdById: input.userId,
          notes: `Confirmed from AI extraction [Doc Page ${event.pageNumber || 1}]`,
        },
      });
      createdRecordId = hearing.id;
    } else {
      // Create official litigation task
      const task = await tx.task.create({
        data: {
          caseId: event.caseId,
          title: event.description,
          priority: TaskPriority.HIGH,
          status: TaskStatus.PENDING,
          dueDate: event.suggestedDate,
          createdById: input.userId,
          description: `Extracted from document snippet: "${event.sourceSnippet}"`,
        },
      });
      createdRecordId = task.id;
    }

    const updated = await tx.extractedEvent.update({
      where: { id: event.id },
      data: {
        status: ExtractionStatus.CONFIRMED,
        reviewedById: input.userId,
        reviewedAt: new Date(),
      },
    });

    await recordAuthAudit({
      userId: input.userId,
      action: "EXTRACTED_EVENT_CONFIRMED",
      metadata: {
        eventId: event.id,
        caseId: event.caseId,
        eventType: event.eventType,
        createdRecordId,
      },
    });

    return {
      status: "CONFIRMED",
      createdRecordId,
      eventType: event.eventType,
      updated,
    };
  });
}

/**
 * Retrieves case dossier summaries, chat history, and pending review events under RLS.
 */
export async function getCaseAiData(caseId: string, userId: string) {
  return await withUserContext(userId, async (tx) => {
    const summaries = await tx.caseSummary.findMany({
      where: { caseId },
      orderBy: { createdAt: "desc" },
      include: { generatedBy: { select: { fullName: true } } },
    });

    const messages = await tx.caseChatMessage.findMany({
      where: { caseId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { fullName: true } } },
    });

    const pendingEvents = await tx.extractedEvent.findMany({
      where: { caseId, status: ExtractionStatus.PENDING_REVIEW },
      orderBy: { suggestedDate: "asc" },
    });

    return {
      summaries,
      messages,
      pendingEvents,
    };
  });
}
