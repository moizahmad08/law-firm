import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  createCoordinatedBackup,
  verifyRestoreIntegrity,
  BackupManifest,
} from "@/lib/recovery/backup-restore";
import { uploadDocument } from "@/lib/documents/service";
import { DocumentCategory, Role, PrismaClient } from "@prisma/client";

const ownerPrisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.SEED_DATABASE_URL ||
        "postgresql://lms_owner:lms_dev_password@localhost:5432/lms_dev?schema=public",
    },
  },
});

describe("Milestone 7B: Coordinated Disaster Recovery & Restore Drill (MASTER_SPEC Section 15 & 18)", () => {
  let counselAlphaId: string;
  let testCaseId: string;
  let testDocId: string;
  let tempBackupDir: string;
  let manifest: BackupManifest;

  beforeAll(async () => {
    const counselAlpha = await ownerPrisma.user.findFirstOrThrow({
      where: { email: "counsel.alpha@lawfirm.local" },
    });
    counselAlphaId = counselAlpha.id;

    const testCase = await ownerPrisma.case.findFirstOrThrow({
      where: { caseNumber: "WP-101/2026" },
    });
    testCaseId = testCase.id;

    tempBackupDir = path.resolve(process.cwd(), "storage", "test_backups", `backup_${Date.now()}`);

    // Create an authentic test document with physical file content
    const sampleBuffer = Buffer.from("%PDF-1.4\nDisaster Recovery Test Court Order\n%%EOF");
    const doc = await uploadDocument({
      caseId: testCaseId,
      title: "Disaster Recovery Drill Evidence.pdf",
      category: DocumentCategory.COURT_ORDER,
      uploaderId: counselAlphaId,
      fileName: "Disaster_Recovery_Drill_Evidence.pdf",
      mimeType: "application/pdf",
      buffer: sampleBuffer,
    });
    testDocId = doc.document.id;
  });

  afterAll(async () => {
    if (testDocId) {
      await ownerPrisma.document.deleteMany({ where: { id: testDocId } });
    }
    if (fs.existsSync(tempBackupDir)) {
      fs.rmSync(tempBackupDir, { recursive: true, force: true });
    }
    await ownerPrisma.$disconnect();
  });

  it("creates a coordinated backup snapshot across database records and private storage files", async () => {
    manifest = await createCoordinatedBackup(tempBackupDir);

    expect(manifest.backupId).toBeDefined();
    expect(manifest.timestamp).toBeDefined();
    expect(manifest.dbStats.usersCount).toBeGreaterThan(0);
    expect(manifest.dbStats.casesCount).toBeGreaterThan(0);
    expect(manifest.dbStats.documentsCount).toBeGreaterThan(0);
    expect(manifest.rpoHours).toBe(24);
    expect(manifest.rtoTargetHours).toBe(4);

    const manifestFilePath = path.join(tempBackupDir, "manifest.json");
    expect(fs.existsSync(manifestFilePath)).toBe(true);
  });

  it("verifies restore integrity: validates database tables and SHA-256 hashes of on-disk files", async () => {
    const report = await verifyRestoreIntegrity(manifest);

    expect(report.dbAccessible).toBe(true);
    expect(report.isConsistent).toBe(true);
    expect(report.mismatchedFilesCount).toBe(0);
    expect(report.verifiedFilesCount).toBeGreaterThan(0);
    // Verified restoration completed within sub-second drill timeframe (well below 4 hour SLA)
    expect(report.timeElapsedMs).toBeLessThan(10000);
  });

  it("detects and flags file tampering or corruption during restoration verification", async () => {
    // Find the physical file of our test document
    const version = await ownerPrisma.documentVersion.findFirstOrThrow({
      where: { documentId: testDocId },
    });

    const storageBaseDir = path.resolve(process.cwd(), "storage", "private_documents");
    const filePath = path.resolve(storageBaseDir, version.storagePath);

    if (fs.existsSync(filePath)) {
      const originalContent = fs.readFileSync(filePath);
      try {
        // Corrupt file by appending arbitrary bytes
        fs.appendFileSync(filePath, Buffer.from("TAMPERED_BYTE_PAYLOAD"));

        // Re-run restore verification
        const corruptedReport = await verifyRestoreIntegrity(manifest);
        expect(corruptedReport.isConsistent).toBe(false);
        expect(corruptedReport.mismatchedFilesCount).toBeGreaterThan(0);
        expect(corruptedReport.errors.some((e) => e.includes("SHA-256 hash mismatch"))).toBe(true);
      } finally {
        // Restore original authentic content
        fs.writeFileSync(filePath, originalContent);
      }
    }
  });
});
