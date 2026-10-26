import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/database/client";
import { withUserContext } from "@/lib/database/context";
import {
  importClients,
  validateAndFormatCnic,
  validateMobile,
  parseCsv,
} from "@/lib/importer/client-import";

describe("Milestone 4 - Client CSV Importer Engine", () => {
  let adminUserId: string;

  beforeAll(async () => {
    const admin = await prisma.user.findFirstOrThrow({
      where: { email: "senior.partner@lawfirm.local" },
    });
    adminUserId = admin.id;
  });

  it("validates and formats Pakistani CNIC correctly", () => {
    // Valid 13-digit hyphenated
    const v1 = validateAndFormatCnic("42101-1234567-1");
    expect(v1.valid).toBe(true);
    expect(v1.formatted).toBe("42101-1234567-1");

    // Valid 13-digit raw unhyphenated
    const v2 = validateAndFormatCnic("4210112345671");
    expect(v2.valid).toBe(true);
    expect(v2.formatted).toBe("42101-1234567-1");

    // Invalid length (12 digits)
    const v3 = validateAndFormatCnic("421011234567");
    expect(v3.valid).toBe(false);
    expect(v3.error).toContain("13 digits");

    // Empty/null should be valid (optional field)
    const v4 = validateAndFormatCnic("");
    expect(v4.valid).toBe(true);
  });

  it("validates mobile numbers correctly", () => {
    const m1 = validateMobile("+923001234567");
    expect(m1.valid).toBe(true);

    const m2 = validateMobile("03001234567");
    expect(m2.valid).toBe(true);

    const m3 = validateMobile("123");
    expect(m3.valid).toBe(false);

    const m4 = validateMobile("");
    expect(m4.valid).toBe(false);
  });

  it("parses valid CSV text into structured records", () => {
    const csv = `Name,Mobile,ClientType,Email,CNIC,Address
Zubair Ali,03009988776,INDIVIDUAL,zubair@test.com,42201-9988776-5,Karachi Clifton
Delta Logistics,03211122334,COMPANY,contact@delta.pk,,Lahore Gulberg`;

    const parsed = parseCsv(csv);
    expect(parsed.length).toBe(2);
    expect(parsed[0].name).toBe("Zubair Ali");
    expect(parsed[0].mobile).toBe("03009988776");
    expect(parsed[1].name).toBe("Delta Logistics");
    expect(parsed[1].clientType).toBe("COMPANY");
  });

  it("rejects CSV with missing required columns", () => {
    const badCsv = `Address,Email
Karachi,test@test.com`;

    expect(() => parseCsv(badCsv)).toThrow(/must include at least 'Name' and 'Mobile'/);
  });

  it("executes dry-run validation without modifying the database", async () => {
    const initialCount = await prisma.client.count();

    const csv = `Name,Mobile,ClientType,Email,CNIC
Test Dry Run User,03459988112,INDIVIDUAL,dryrun@test.com,35202-9988112-1
Invalid Client,,INDIVIDUAL,bad@test.com,1234`;

    const summary = await importClients({
      userId: adminUserId,
      csvContent: csv,
      dryRun: true,
    });

    expect(summary.dryRun).toBe(true);
    expect(summary.totalRows).toBe(2);
    expect(summary.validCount).toBe(1);
    expect(summary.invalidCount).toBe(1);
    expect(summary.importedCount).toBe(0);

    // Verify DB count has NOT changed
    const afterCount = await prisma.client.count();
    expect(afterCount).toBe(initialCount);
  });

  it("detects duplicates and commits valid records when dryRun is false", async () => {
    const uniquePhone = `0399${Date.now().toString().slice(-7)}`;
    const uniqueCnic = `42101-${Date.now().toString().slice(-7)}-1`;

    const csv = `Name,Mobile,ClientType,Email,CNIC,Address
Imported Client Alpha,${uniquePhone},INDIVIDUAL,alpha@import.pk,${uniqueCnic},Islamabad F-7
Imported Client Beta,${uniquePhone},INDIVIDUAL,beta@import.pk,,Lahore DHA`;

    const summary = await importClients({
      userId: adminUserId,
      csvContent: csv,
      dryRun: false,
    });

    expect(summary.dryRun).toBe(false);
    expect(summary.importedCount).toBe(1); // First is imported
    expect(summary.duplicateCount).toBe(1); // Second has duplicate phone, rejected

    // Verify client exists in DB under user context (due to RLS)
    const createdClient = await withUserContext(adminUserId, async (tx) => {
      return await tx.client.findFirst({
        where: { mobile: uniquePhone },
      });
    });
    expect(createdClient).toBeDefined();
    expect(createdClient?.name).toBe("Imported Client Alpha");
  });
});
