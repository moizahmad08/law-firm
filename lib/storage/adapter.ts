import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface StoredFileMeta {
  storagePath: string;
  fileSizeBytes: bigint;
  fileHashSha256: string;
  fileName: string;
  fileExtension: string;
  mimeType: string;
}

export interface StorageAdapter {
  saveFile(params: {
    caseId: string;
    documentId: string;
    versionNumber: number;
    fileName: string;
    buffer: Buffer;
    mimeType: string;
  }): Promise<StoredFileMeta>;

  getFileBuffer(storagePath: string): Promise<Buffer>;
  deleteFile(storagePath: string): Promise<boolean>;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/msword": [".doc"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/tiff": [".tif", ".tiff"],
};

// EICAR standard antivirus test string signature for malware hook validation
const EICAR_SIGNATURE = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

/**
 * Malware scan hook abstraction.
 * Integrates ClamAV daemon or signature checks.
 * Rejects malicious payloads immediately.
 */
export async function scanFileBuffer(buffer: Buffer): Promise<{ isClean: boolean; virusName?: string }> {
  const contentStr = buffer.toString("utf8");
  if (contentStr.includes(EICAR_SIGNATURE)) {
    return {
      isClean: false,
      virusName: "EICAR-Test-Signature (Malware Detected)",
    };
  }

  // Extensible for ClamAV socket daemon (clamd) in production
  return { isClean: true };
}

/**
 * Validates file constraints (MIME type, size, extension consistency).
 */
export function validateUploadFile({
  fileName,
  mimeType,
  fileSize,
}: {
  fileName: string;
  mimeType: string;
  fileSize: number;
}): { valid: boolean; error?: string } {
  if (fileSize <= 0) {
    return { valid: false, error: "Uploaded file is empty (0 bytes)." };
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File exceeds maximum allowed size of 25 MB (${(fileSize / (1024 * 1024)).toFixed(1)} MB).` };
  }

  const ext = path.extname(fileName).toLowerCase();
  const allowedExtensions = ALLOWED_MIME_TYPES[mimeType];

  if (!allowedExtensions || !allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Disallowed file format (${ext} / ${mimeType}). Permitted formats: PDF, DOCX, DOC, JPEG, PNG, TIFF.`,
    };
  }

  return { valid: true };
}

/**
 * Private Local Filesystem Storage Adapter
 * Stores litigation files in a secured private directory outside of public web root.
 */
export class PrivateLocalStorageAdapter implements StorageAdapter {
  private baseDir: string;

  constructor(customBaseDir?: string) {
    this.baseDir = customBaseDir || path.resolve(process.cwd(), "storage", "private_documents");
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async saveFile({
    caseId,
    documentId,
    versionNumber,
    fileName,
    buffer,
    mimeType,
  }: {
    caseId: string;
    documentId: string;
    versionNumber: number;
    fileName: string;
    buffer: Buffer;
    mimeType: string;
  }): Promise<StoredFileMeta> {
    // 1. Calculate SHA-256 Hash
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");
    const ext = path.extname(fileName).toLowerCase();
    const sanitizedBase = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_\-\.]/g, "_");

    // 2. Build isolated storage path: <baseDir>/<caseId>/<documentId>/v<version>_<hashPrefix>.<ext>
    const relativeFolder = path.join(caseId, documentId);
    const targetFolder = path.resolve(this.baseDir, relativeFolder);

    // Guard against directory traversal
    if (!targetFolder.startsWith(this.baseDir)) {
      throw new Error("Security violation: Invalid storage path directory traversal attempted.");
    }

    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const diskFileName = `v${versionNumber}_${hash.substring(0, 12)}_${sanitizedBase}${ext}`;
    const fullPath = path.resolve(targetFolder, diskFileName);

    if (!fullPath.startsWith(this.baseDir)) {
      throw new Error("Security violation: Invalid target file path directory traversal attempted.");
    }

    // 3. Write file securely with restricted permissions (0o600: read/write owner only)
    await fs.promises.writeFile(fullPath, buffer, { mode: 0o600 });

    return {
      storagePath: path.relative(this.baseDir, fullPath).replace(/\\/g, "/"),
      fileSizeBytes: BigInt(buffer.length),
      fileHashSha256: hash,
      fileName,
      fileExtension: ext,
      mimeType,
    };
  }

  async getFileBuffer(storagePath: string): Promise<Buffer> {
    const fullPath = path.resolve(this.baseDir, storagePath);
    if (!fullPath.startsWith(this.baseDir)) {
      throw new Error("Security violation: Invalid file retrieval path.");
    }

    if (!fs.existsSync(fullPath)) {
      throw new Error("Document file not found on private storage.");
    }

    return await fs.promises.readFile(fullPath);
  }

  async deleteFile(storagePath: string): Promise<boolean> {
    const fullPath = path.resolve(this.baseDir, storagePath);
    if (!fullPath.startsWith(this.baseDir)) {
      throw new Error("Security violation: Invalid file deletion path.");
    }

    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      return true;
    }
    return false;
  }
}

export const localStorageAdapter = new PrivateLocalStorageAdapter();

/**
 * Generates an HMAC-SHA256 signed short-lived document download token.
 */
export function generateSignedDownloadToken({
  documentId,
  versionNumber,
  userId,
  expiresInSeconds = 900, // 15 minutes default
}: {
  documentId: string;
  versionNumber: number;
  userId: string;
  expiresInSeconds?: number;
}): string {
  const secret = process.env.AUTH_SECRET || "dev_storage_token_secret_32_characters_min";
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${documentId}:${versionNumber}:${userId}:${expiresAt}`;
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  return `${Buffer.from(payload).toString("base64url")}.${hmac}`;
}

/**
 * Verifies an HMAC-SHA256 signed short-lived document download token.
 */
export function verifySignedDownloadToken(token: string): {
  valid: boolean;
  documentId?: string;
  versionNumber?: number;
  userId?: string;
  error?: string;
} {
  try {
    const secret = process.env.AUTH_SECRET || "dev_storage_token_secret_32_characters_min";
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) {
      return { valid: false, error: "Malformed download token." };
    }

    const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const expectedHmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedHmac, "hex")
      )
    ) {
      return { valid: false, error: "Invalid download token signature." };
    }

    const [documentId, versionNumberStr, userId, expiresAtStr] = payload.split(":");
    const expiresAt = parseInt(expiresAtStr, 10);
    const now = Math.floor(Date.now() / 1000);

    if (now > expiresAt) {
      return { valid: false, error: "Download token has expired." };
    }

    return {
      valid: true,
      documentId,
      versionNumber: parseInt(versionNumberStr, 10),
      userId,
    };
  } catch (err: any) {
    return { valid: false, error: err.message || "Failed to verify token." };
  }
}
