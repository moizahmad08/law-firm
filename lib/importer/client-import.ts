import { withUserContext } from "@/lib/database/context";
import { recordAuthAudit } from "@/lib/auth/audit";
import { ClientType } from "@prisma/client";

export interface ClientImportRow {
  name: string;
  clientType?: string;
  mobile: string;
  email?: string;
  address?: string;
  cnic?: string;
}

export interface ClientImportValidationResult {
  rowNumber: number;
  data: ClientImportRow;
  isValid: boolean;
  errors: string[];
  isDuplicate: boolean;
  duplicateReason?: string;
}

export interface ClientImportSummary {
  dryRun: boolean;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  importedCount: number;
  rows: ClientImportValidationResult[];
}

/**
 * Validates Pakistani CNIC format (13 digits: XXXXX-XXXXXXX-X or 13 unhyphenated digits).
 */
export function validateAndFormatCnic(cnic?: string | null): { valid: boolean; formatted?: string; error?: string } {
  if (!cnic || !cnic.trim()) return { valid: true };
  const cleaned = cnic.trim().replace(/[^0-9]/g, "");
  if (cleaned.length !== 13) {
    return { valid: false, error: "CNIC must contain exactly 13 digits (e.g. 42101-1234567-1)." };
  }
  const formatted = `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12, 13)}`;
  return { valid: true, formatted };
}

/**
 * Validates Pakistani mobile/phone format.
 */
export function validateMobile(mobile?: string | null): { valid: boolean; error?: string } {
  if (!mobile || !mobile.trim()) {
    return { valid: false, error: "Mobile number is required." };
  }
  const cleaned = mobile.trim().replace(/[^0-9+]/g, "");
  if (cleaned.length < 10 || cleaned.length > 15) {
    return { valid: false, error: "Mobile number must be between 10 and 15 digits." };
  }
  return { valid: true };
}

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parses CSV text into array of object records.
 */
export function parseCsv(csvText: string): ClientImportRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error("CSV file must contain a header row and at least one data row.");
  }

  // Parse header
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());

  const nameIdx = headers.findIndex((h) => h === "name" || h === "client_name" || h === "client name");
  const mobileIdx = headers.findIndex((h) => h === "mobile" || h === "phone" || h === "contact");
  const typeIdx = headers.findIndex((h) => h === "clienttype" || h === "client_type" || h === "type");
  const emailIdx = headers.findIndex((h) => h === "email" || h === "email_address");
  const cnicIdx = headers.findIndex((h) => h === "cnic" || h === "nic" || h === "national_id");
  const addressIdx = headers.findIndex((h) => h === "address" || h === "location");

  if (nameIdx === -1 || mobileIdx === -1) {
    throw new Error("CSV header must include at least 'Name' and 'Mobile' columns.");
  }

  const result: ClientImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const tokens = parseCsvLine(lines[i]);

    result.push({
      name: tokens[nameIdx] || "",
      mobile: tokens[mobileIdx] || "",
      clientType: typeIdx !== -1 ? tokens[typeIdx] : undefined,
      email: emailIdx !== -1 ? tokens[emailIdx] : undefined,
      cnic: cnicIdx !== -1 ? tokens[cnicIdx] : undefined,
      address: addressIdx !== -1 ? tokens[addressIdx] : undefined,
    });
  }

  return result;
}

/**
 * Validates and executes client import with dry-run support under user context.
 */
export async function importClients(input: {
  userId: string;
  csvContent: string;
  dryRun?: boolean;
}): Promise<ClientImportSummary> {
  const dryRun = input.dryRun ?? true;
  const parsedRows = parseCsv(input.csvContent);

  return await withUserContext(input.userId, async (tx) => {
    // Fetch existing CNICs and Mobiles for duplicate checks
    const existingClients = await tx.client.findMany({
      select: { mobile: true, cnic: true },
    });

    const existingMobiles = new Set(existingClients.map((c) => c.mobile.replace(/[^0-9]/g, "")));
    const existingCnics = new Set(
      existingClients
        .filter((c) => c.cnic)
        .map((c) => c.cnic!.replace(/[^0-9]/g, ""))
    );

    const validationResults: ClientImportValidationResult[] = [];
    const validToImport: Array<{
      name: string;
      mobile: string;
      clientType: ClientType;
      email?: string | null;
      cnic?: string | null;
      address?: string | null;
    }> = [];

    let rowNum = 1;
    for (const row of parsedRows) {
      rowNum++;
      const errors: string[] = [];
      let isDuplicate = false;
      let duplicateReason: string | undefined;

      // 1. Name check
      if (!row.name || row.name.trim().length < 2) {
        errors.push("Client name is required (minimum 2 characters).");
      }

      // 2. Mobile check
      const mobileVal = validateMobile(row.mobile);
      if (!mobileVal.valid) {
        errors.push(mobileVal.error!);
      } else {
        const cleanedMobile = row.mobile.replace(/[^0-9]/g, "");
        if (existingMobiles.has(cleanedMobile)) {
          isDuplicate = true;
          duplicateReason = `Mobile number '${row.mobile}' is already registered with another client.`;
        }
      }

      // 3. CNIC check
      let formattedCnic: string | undefined;
      if (row.cnic) {
        const cnicVal = validateAndFormatCnic(row.cnic);
        if (!cnicVal.valid) {
          errors.push(cnicVal.error!);
        } else {
          formattedCnic = cnicVal.formatted;
          const cleanedCnic = formattedCnic!.replace(/[^0-9]/g, "");
          if (existingCnics.has(cleanedCnic)) {
            isDuplicate = true;
            duplicateReason = `CNIC '${formattedCnic}' already exists in database.`;
          }
        }
      }

      // 4. Email check
      if (row.email && row.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email.trim())) {
          errors.push("Invalid email format.");
        }
      }

      // 5. Client type
      let cType: ClientType = ClientType.INDIVIDUAL;
      if (row.clientType) {
        const upper = row.clientType.trim().toUpperCase();
        if (upper === "COMPANY" || upper === "CORPORATE") {
          cType = ClientType.COMPANY;
        } else if (upper === "INDIVIDUAL") {
          cType = ClientType.INDIVIDUAL;
        } else {
          errors.push(`Invalid client type '${row.clientType}'. Must be INDIVIDUAL or COMPANY.`);
        }
      }

      const isValid = errors.length === 0 && !isDuplicate;

      validationResults.push({
        rowNumber: rowNum,
        data: row,
        isValid,
        errors,
        isDuplicate,
        duplicateReason,
      });

      if (isValid) {
        validToImport.push({
          name: row.name.trim(),
          mobile: row.mobile.trim(),
          clientType: cType,
          email: row.email?.trim() || null,
          cnic: formattedCnic || null,
          address: row.address?.trim() || null,
        });

        // Track in current batch to catch intra-batch duplicates
        existingMobiles.add(row.mobile.replace(/[^0-9]/g, ""));
        if (formattedCnic) {
          existingCnics.add(formattedCnic.replace(/[^0-9]/g, ""));
        }
      }
    }

    let importedCount = 0;

    // If not dry run and valid rows exist, commit
    if (!dryRun && validToImport.length > 0) {
      for (const clientData of validToImport) {
        await tx.client.create({
          data: clientData,
        });
        importedCount++;
      }

      await recordAuthAudit({
        userId: input.userId,
        action: "CLIENTS_IMPORTED",
        metadata: {
          importedCount,
          totalRows: parsedRows.length,
          skippedCount: parsedRows.length - importedCount,
        },
      });
    }

    const invalidCount = validationResults.filter((r) => r.errors.length > 0).length;
    const duplicateCount = validationResults.filter((r) => r.isDuplicate).length;
    const validCount = validationResults.filter((r) => r.isValid).length;

    return {
      dryRun,
      totalRows: parsedRows.length,
      validCount,
      invalidCount,
      duplicateCount,
      importedCount,
      rows: validationResults,
    };
  });
}
