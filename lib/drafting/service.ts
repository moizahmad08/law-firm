import { withUserContext } from "@/lib/database/context";
import { recordAuthAudit } from "@/lib/auth/audit";
import {
  TemplateCategory,
  DocumentApprovalStatus,
  Role,
} from "@prisma/client";

export interface AutofillResult {
  renderedContent: string;
  substitutedTokens: Record<string, string>;
  missingTokens: string[];
}

/**
 * Resolves case data and substitutes template tokens.
 * Flags any unresolved tokens rather than hallucinating or guessing.
 */
export function autofillTemplateContent(
  templateContent: string,
  caseRecord: {
    caseNumber: string;
    title: string;
    court: string;
    caseType: string;
    jurisdiction: string;
    filingDate: Date | null;
    client: { name: string; mobile: string; email: string | null; address: string | null; cnic: string | null };
    courtRef?: { name: string } | null;
    benchRef?: { name: string } | null;
    parties?: Array<{ name: string; partyRole: string; advocateName: string | null; cnic: string | null }>;
    assignments?: Array<{ roleInCase: string; user: { fullName: string; email: string } }>;
    hearings?: Array<{ hearingDate: Date; status: string }>;
  }
): AutofillResult {
  const petitioner = caseRecord.parties?.find(
    (p) => p.partyRole === "PETITIONER" || p.partyRole === "PLAINTIFF" || p.partyRole === "APPELLANT"
  );
  const respondent = caseRecord.parties?.find(
    (p) => p.partyRole === "RESPONDENT" || p.partyRole === "DEFENDANT" || p.partyRole === "PROFORMA_RESPONDENT"
  );

  const leadCounsel = caseRecord.assignments?.find(
    (a) => a.roleInCase === "LEAD_COUNSEL"
  ) || caseRecord.assignments?.[0];

  const upcomingHearing = (caseRecord.hearings || [])
    .filter((h) => new Date(h.hearingDate) >= new Date())
    .sort((a, b) => new Date(a.hearingDate).getTime() - new Date(b.hearingDate).getTime())[0];

  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-PK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const tokenMap: Record<string, string> = {
    CASE_NUMBER: caseRecord.caseNumber,
    CASE_TITLE: caseRecord.title,
    COURT_NAME: caseRecord.courtRef?.name || caseRecord.court,
    BENCH_NAME: caseRecord.benchRef?.name || "Single Bench",
    CASE_TYPE: caseRecord.caseType,
    JURISDICTION: caseRecord.jurisdiction,
    FILING_DATE: caseRecord.filingDate ? new Date(caseRecord.filingDate).toLocaleDateString("en-PK") : "",
    PETITIONER_NAME: petitioner?.name || caseRecord.client.name,
    PETITIONER_ADVOCATE: petitioner?.advocateName || leadCounsel?.user.fullName || "",
    PETITIONER_CNIC: petitioner?.cnic || caseRecord.client.cnic || "",
    RESPONDENT_NAME: respondent?.name || "",
    RESPONDENT_ADVOCATE: respondent?.advocateName || "",
    CLIENT_NAME: caseRecord.client.name,
    CLIENT_MOBILE: caseRecord.client.mobile,
    CLIENT_CNIC: caseRecord.client.cnic || "",
    CLIENT_ADDRESS: caseRecord.client.address || "",
    ADVOCATE_NAME: leadCounsel?.user.fullName || "Counsel for Petitioner",
    TODAY_DATE: dateFormatted,
    NEXT_HEARING_DATE: upcomingHearing
      ? new Date(upcomingHearing.hearingDate).toLocaleDateString("en-PK", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "",
  };

  const substitutedTokens: Record<string, string> = {};
  let renderedContent = templateContent;

  for (const [key, value] of Object.entries(tokenMap)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    if (regex.test(renderedContent)) {
      if (value) {
        renderedContent = renderedContent.replace(regex, value);
        substitutedTokens[key] = value;
      }
    }
  }

  // Detect any unresolved tokens e.g. {{UNKNOWN_TOKEN}} or missing required values
  const remainingTokenRegex = /\{\{([A-Z0-9_]+)\}\}/g;
  const missingTokens: string[] = [];
  let match;
  while ((match = remainingTokenRegex.exec(renderedContent)) !== null) {
    if (!missingTokens.includes(match[1])) {
      missingTokens.push(match[1]);
    }
  }

  return {
    renderedContent,
    substitutedTokens,
    missingTokens,
  };
}

/**
 * Creates a new document template under firm governance.
 */
export async function createDocumentTemplate(
  userId: string,
  input: {
    name: string;
    code: string;
    category: TemplateCategory;
    description?: string;
    content: string;
    availableTokens?: string[];
  }
) {
  return await withUserContext(userId, async (tx) => {
    const template = await tx.documentTemplate.create({
      data: {
        name: input.name.trim(),
        code: input.code.trim().toUpperCase(),
        category: input.category,
        description: input.description?.trim(),
        currentVersionNumber: 1,
        createdById: userId,
        versions: {
          create: {
            versionNumber: 1,
            content: input.content,
            availableTokens: input.availableTokens || [],
            isPublished: true,
            publishedById: userId,
          },
        },
      },
      include: {
        versions: true,
      },
    });

    await recordAuthAudit({
      userId,
      action: "DOCUMENT_TEMPLATE_CREATED",
      metadata: { templateId: template.id, code: template.code, category: template.category },
    });

    return template;
  });
}

/**
 * Creates a generated document draft for a case.
 */
export async function createGeneratedDocument(
  userId: string,
  input: {
    caseId: string;
    templateId?: string;
    templateVersionNumber?: number;
    title: string;
    content: string;
  }
) {
  return await withUserContext(userId, async (tx) => {
    const doc = await tx.generatedDocument.create({
      data: {
        caseId: input.caseId,
        templateId: input.templateId,
        templateVersionNumber: input.templateVersionNumber,
        title: input.title.trim(),
        content: input.content,
        approvalStatus: DocumentApprovalStatus.DRAFT,
        createdById: userId,
      },
    });

    await recordAuthAudit({
      userId,
      action: "GENERATED_DOCUMENT_CREATED",
      metadata: { documentId: doc.id, caseId: input.caseId, title: doc.title },
    });

    return doc;
  });
}

/**
 * Updates an existing generated document draft.
 * STRICT SECURITY MANDATE (MASTER_SPEC Section 8.2):
 * "Substantive edits after approval require renewed review."
 * If the document was APPROVED, any content update immediately invalidates approval
 * and resets its status to DRAFT with audit logging.
 */
export async function updateGeneratedDocument(
  userId: string,
  input: {
    documentId: string;
    title?: string;
    content?: string;
  }
) {
  return await withUserContext(userId, async (tx) => {
    const existing = await tx.generatedDocument.findUniqueOrThrow({
      where: { id: input.documentId },
    });

    const isSubstantiveEdit = input.content !== undefined && input.content !== existing.content;
    const wasApproved = existing.approvalStatus === DocumentApprovalStatus.APPROVED;

    const data: any = {};
    if (input.title !== undefined) data.title = input.title.trim();
    if (input.content !== undefined) data.content = input.content;

    // Invalidate approval on substantive post-approval edit
    if (wasApproved && isSubstantiveEdit) {
      data.approvalStatus = DocumentApprovalStatus.DRAFT;
      data.approvedById = null;
      data.approvedAt = null;
      data.rejectionReason = "Approval invalidated due to substantive content modification.";
    }

    const updated = await tx.generatedDocument.update({
      where: { id: input.documentId },
      data,
    });

    if (wasApproved && isSubstantiveEdit) {
      await recordAuthAudit({
        userId,
        action: "DOCUMENT_APPROVAL_INVALIDATED_BY_EDIT",
        metadata: {
          documentId: existing.id,
          caseId: existing.caseId,
          previousStatus: DocumentApprovalStatus.APPROVED,
          newStatus: DocumentApprovalStatus.DRAFT,
        },
      });
    }

    return updated;
  });
}

/**
 * Submits a drafted document for lawyer/partner review.
 */
export async function submitDocumentForApproval(userId: string, documentId: string) {
  return await withUserContext(userId, async (tx) => {
    const updated = await tx.generatedDocument.update({
      where: { id: documentId },
      data: {
        approvalStatus: DocumentApprovalStatus.PENDING_APPROVAL,
      },
    });

    await recordAuthAudit({
      userId,
      action: "DOCUMENT_SUBMITTED_FOR_APPROVAL",
      metadata: { documentId, caseId: updated.caseId },
    });

    return updated;
  });
}

/**
 * Reviews and formally approves or rejects a generated document.
 */
export async function reviewDocumentApproval(
  userId: string,
  input: {
    documentId: string;
    action: "APPROVE" | "REJECT";
    rejectionReason?: string;
  }
) {
  return await withUserContext(userId, async (tx) => {
    const doc = await tx.generatedDocument.findUniqueOrThrow({
      where: { id: input.documentId },
    });

    if (input.action === "APPROVE") {
      const updated = await tx.generatedDocument.update({
        where: { id: doc.id },
        data: {
          approvalStatus: DocumentApprovalStatus.APPROVED,
          approvedById: userId,
          approvedAt: new Date(),
          rejectionReason: null,
        },
      });

      await recordAuthAudit({
        userId,
        action: "DOCUMENT_APPROVED",
        metadata: { documentId: doc.id, caseId: doc.caseId },
      });

      return updated;
    } else {
      const updated = await tx.generatedDocument.update({
        where: { id: doc.id },
        data: {
          approvalStatus: DocumentApprovalStatus.REJECTED,
          approvedById: userId,
          approvedAt: new Date(),
          rejectionReason: input.rejectionReason || "Rejected by reviewing advocate.",
        },
      });

      await recordAuthAudit({
        userId,
        action: "DOCUMENT_REJECTED",
        metadata: {
          documentId: doc.id,
          caseId: doc.caseId,
          reason: input.rejectionReason,
        },
      });

      return updated;
    }
  });
}

/**
 * Marks an approved document as exported for physical signing.
 */
export async function exportDocumentForSigning(
  userId: string,
  documentId: string,
  format: "PDF" | "DOCX" = "PDF"
) {
  return await withUserContext(userId, async (tx) => {
    const doc = await tx.generatedDocument.findUniqueOrThrow({
      where: { id: documentId },
    });

    if (doc.approvalStatus !== DocumentApprovalStatus.APPROVED) {
      throw new Error("Cannot export document for signing: Document has not been approved by counsel.");
    }

    const updated = await tx.generatedDocument.update({
      where: { id: doc.id },
      data: {
        approvalStatus: DocumentApprovalStatus.EXPORTED_FOR_SIGNING,
        exportedAt: new Date(),
        exportFormat: format,
      },
    });

    await recordAuthAudit({
      userId,
      action: "DOCUMENT_EXPORTED_FOR_SIGNING",
      metadata: { documentId: doc.id, caseId: doc.caseId, format },
    });

    return updated;
  });
}

/**
 * Links an uploaded physical signed copy to the approved generated document.
 */
export async function linkSignedDocumentCopy(
  userId: string,
  input: {
    documentId: string;
    signedDocumentId: string;
  }
) {
  return await withUserContext(userId, async (tx) => {
    const updated = await tx.generatedDocument.update({
      where: { id: input.documentId },
      data: {
        signedDocumentId: input.signedDocumentId,
        approvalStatus: DocumentApprovalStatus.SIGNED_COPY_UPLOADED,
      },
    });

    await recordAuthAudit({
      userId,
      action: "SIGNED_DOCUMENT_COPY_LINKED",
      metadata: {
        generatedDocumentId: input.documentId,
        signedDocumentId: input.signedDocumentId,
        caseId: updated.caseId,
      },
    });

    return updated;
  });
}
