import { withUserContext } from "@/lib/database/context";
import { recordAuthAudit } from "@/lib/auth/audit";
import {
  localStorageAdapter,
  validateUploadFile,
  scanFileBuffer,
  generateSignedDownloadToken,
} from "@/lib/storage/adapter";
import { DocumentCategory, ScanStatus } from "@prisma/client";

export interface DocumentUploadInput {
  caseId: string;
  title: string;
  category: DocumentCategory;
  description?: string;
  isRestricted?: boolean;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  uploaderId: string;
  notes?: string;
}

export interface DocumentRevisionInput {
  documentId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  uploaderId: string;
  notes?: string;
}

/**
 * Uploads an initial document and its version 1 under user context.
 */
export async function uploadDocument(input: DocumentUploadInput) {
  // 1. File Validation
  const validation = validateUploadFile({
    fileName: input.fileName,
    mimeType: input.mimeType,
    fileSize: input.buffer.length,
  });

  if (!validation.valid) {
    throw new Error(validation.error || "File validation failed.");
  }

  // 2. Malware Scan Hook
  const scanResult = await scanFileBuffer(input.buffer);
  if (!scanResult.isClean) {
    await recordAuthAudit({
      userId: input.uploaderId,
      action: "MALWARE_DETECTED_UPLOAD_BLOCKED",
      metadata: {
        fileName: input.fileName,
        caseId: input.caseId,
        virusName: scanResult.virusName,
      },
    });
    throw new Error(`Security Violation: File upload blocked. Threat detected: ${scanResult.virusName}`);
  }

  return await withUserContext(input.uploaderId, async (tx) => {
    // 3. Create Document Record
    const doc = await tx.document.create({
      data: {
        caseId: input.caseId,
        title: input.title.trim(),
        category: input.category,
        description: input.description?.trim(),
        isRestricted: input.isRestricted ?? false,
        createdById: input.uploaderId,
        currentVersionNumber: 1,
      },
    });

    // 4. Save to Private Storage
    const fileMeta = await localStorageAdapter.saveFile({
      caseId: input.caseId,
      documentId: doc.id,
      versionNumber: 1,
      fileName: input.fileName,
      buffer: input.buffer,
      mimeType: input.mimeType,
    });

    // 5. Create Document Version 1 Record
    const version = await tx.documentVersion.create({
      data: {
        documentId: doc.id,
        versionNumber: 1,
        fileName: fileMeta.fileName,
        fileExtension: fileMeta.fileExtension,
        mimeType: fileMeta.mimeType,
        fileSizeBytes: fileMeta.fileSizeBytes,
        storagePath: fileMeta.storagePath,
        fileHashSha256: fileMeta.fileHashSha256,
        notes: input.notes?.trim(),
        scanStatus: ScanStatus.CLEAN,
        scannedAt: new Date(),
        uploaderId: input.uploaderId,
      },
    });

    await recordAuthAudit({
      userId: input.uploaderId,
      action: "DOCUMENT_UPLOADED",
      metadata: {
        documentId: doc.id,
        versionId: version.id,
        caseId: input.caseId,
        fileName: input.fileName,
        fileHash: fileMeta.fileHashSha256,
        isRestricted: input.isRestricted ?? false,
      },
    });

    return {
      document: doc,
      version,
    };
  });
}

/**
 * Uploads a new version/revision of an existing document while preserving history.
 */
export async function uploadDocumentRevision(input: DocumentRevisionInput) {
  const validation = validateUploadFile({
    fileName: input.fileName,
    mimeType: input.mimeType,
    fileSize: input.buffer.length,
  });

  if (!validation.valid) {
    throw new Error(validation.error || "File validation failed.");
  }

  const scanResult = await scanFileBuffer(input.buffer);
  if (!scanResult.isClean) {
    await recordAuthAudit({
      userId: input.uploaderId,
      action: "MALWARE_DETECTED_UPLOAD_BLOCKED",
      metadata: {
        fileName: input.fileName,
        documentId: input.documentId,
        virusName: scanResult.virusName,
      },
    });
    throw new Error(`Security Violation: Revision upload blocked. Threat detected: ${scanResult.virusName}`);
  }

  return await withUserContext(input.uploaderId, async (tx) => {
    // 1. Fetch document under RLS
    const doc = await tx.document.findUnique({
      where: { id: input.documentId },
    });

    if (!doc) {
      throw new Error("Document not found or access denied.");
    }

    const nextVersionNumber = doc.currentVersionNumber + 1;

    // 2. Save new version to private storage
    const fileMeta = await localStorageAdapter.saveFile({
      caseId: doc.caseId,
      documentId: doc.id,
      versionNumber: nextVersionNumber,
      fileName: input.fileName,
      buffer: input.buffer,
      mimeType: input.mimeType,
    });

    // 3. Create new DocumentVersion row
    const version = await tx.documentVersion.create({
      data: {
        documentId: doc.id,
        versionNumber: nextVersionNumber,
        fileName: fileMeta.fileName,
        fileExtension: fileMeta.fileExtension,
        mimeType: fileMeta.mimeType,
        fileSizeBytes: fileMeta.fileSizeBytes,
        storagePath: fileMeta.storagePath,
        fileHashSha256: fileMeta.fileHashSha256,
        notes: input.notes?.trim(),
        scanStatus: ScanStatus.CLEAN,
        scannedAt: new Date(),
        uploaderId: input.uploaderId,
      },
    });

    // 4. Update Document currentVersionNumber
    await tx.document.update({
      where: { id: doc.id },
      data: {
        currentVersionNumber: nextVersionNumber,
        updatedAt: new Date(),
      },
    });

    await recordAuthAudit({
      userId: input.uploaderId,
      action: "DOCUMENT_REPLACED",
      metadata: {
        documentId: doc.id,
        previousVersion: doc.currentVersionNumber,
        newVersion: nextVersionNumber,
        fileName: input.fileName,
        fileHash: fileMeta.fileHashSha256,
      },
    });

    return {
      document: doc,
      version,
    };
  });
}

/**
 * Generates a signed download URL/token for a permitted document version.
 */
export async function getDocumentDownloadToken({
  documentId,
  versionNumber,
  userId,
}: {
  documentId: string;
  versionNumber?: number;
  userId: string;
}) {
  return await withUserContext(userId, async (tx) => {
    const doc = await tx.document.findUnique({
      where: { id: documentId },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
        },
      },
    });

    if (!doc) {
      throw new Error("Document not found or access denied.");
    }

    const targetVersionNumber = versionNumber ?? doc.currentVersionNumber;
    const version = doc.versions.find((v) => v.versionNumber === targetVersionNumber);

    if (!version) {
      throw new Error(`Document version v${targetVersionNumber} not found.`);
    }

    const token = generateSignedDownloadToken({
      documentId: doc.id,
      versionNumber: targetVersionNumber,
      userId,
      expiresInSeconds: 900, // 15 mins
    });

    await recordAuthAudit({
      userId,
      action: "DOCUMENT_TOKEN_GENERATED",
      metadata: {
        documentId: doc.id,
        versionNumber: targetVersionNumber,
      },
    });

    return {
      token,
      fileName: version.fileName,
      versionNumber: targetVersionNumber,
      downloadUrl: `/api/documents/${doc.id}/download?token=${token}`,
    };
  });
}
