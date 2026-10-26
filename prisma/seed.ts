import {
  PrismaClient,
  Role,
  ClientType,
  RoleInCase,
  PartyRole,
  CustomFieldType,
  PrecedentCourtType,
  PrecedentPrecedentialWeight,
  PrecedentStatus,
  TemplateCategory,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";

const seedUrl =
  process.env.SEED_DATABASE_URL ||
  "postgresql://lms_owner:lms_dev_password@localhost:5432/lms_dev?schema=public";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: seedUrl,
    },
  },
});

async function main() {
  console.log("🌱 Starting idempotent database seed for Milestone 2A...");

  const rawPassword = process.env.SEED_DEFAULT_PASSWORD || "TestLawyer2026!";
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // 1. Seed Case Statuses (Configurable row-managed statuses)
  const statusesData = [
    { code: "DRAFT", label: "Draft", displayOrder: 1 },
    { code: "ACTIVE", label: "Active", displayOrder: 2 },
    { code: "AWAITING_HEARING", label: "Awaiting Hearing", displayOrder: 3 },
    { code: "AWAITING_CLIENT", label: "Awaiting Client", displayOrder: 4 },
    { code: "JUDGMENT_RESERVED", label: "Judgment Reserved", displayOrder: 5 },
    { code: "DECIDED", label: "Decided", displayOrder: 6 },
    { code: "APPEALED", label: "Appealed", displayOrder: 7 },
    { code: "CLOSED", label: "Closed", displayOrder: 8 },
  ];

  const seededStatuses: Record<string, string> = {};
  for (const s of statusesData) {
    const status = await prisma.caseStatus.upsert({
      where: { code: s.code },
      update: { label: s.label, displayOrder: s.displayOrder, isActive: true },
      create: { code: s.code, label: s.label, displayOrder: s.displayOrder, isActive: true },
    });
    seededStatuses[s.code] = status.id;
  }
  console.log("✔ Seeded 8 core case statuses");

  // 2. Seed Pakistani Courts Master Data
  const courtsData = [
    {
      code: "SCP",
      name: "Supreme Court of Pakistan",
      jurisdiction: "APEX",
      province: "FEDERAL",
      city: "Islamabad",
    },
    {
      code: "LHC",
      name: "Lahore High Court",
      jurisdiction: "HIGH_COURT",
      province: "PUNJAB",
      city: "Lahore",
    },
    {
      code: "IHC",
      name: "Islamabad High Court",
      jurisdiction: "HIGH_COURT",
      province: "FEDERAL",
      city: "Islamabad",
    },
    {
      code: "SHC",
      name: "Sindh High Court",
      jurisdiction: "HIGH_COURT",
      province: "SINDH",
      city: "Karachi",
    },
    {
      code: "DSC-LHR",
      name: "District & Sessions Court Lahore",
      jurisdiction: "DISTRICT",
      province: "PUNJAB",
      city: "Lahore",
    },
  ];

  const seededCourts: Record<string, string> = {};
  for (const c of courtsData) {
    const court = await prisma.court.upsert({
      where: { code: c.code },
      update: { name: c.name, jurisdiction: c.jurisdiction, province: c.province, city: c.city },
      create: c,
    });
    seededCourts[c.code] = court.id;
  }
  console.log("✔ Seeded 5 Pakistani Courts");

  // 3. Seed Benches (e.g. Lahore High Court Benches)
  const lhcId = seededCourts["LHC"];
  const benchesData = [
    { courtId: lhcId, code: "LHC-LHR", name: "Principal Seat Lahore", city: "Lahore" },
    { courtId: lhcId, code: "LHC-RWP", name: "Rawalpindi Bench", city: "Rawalpindi" },
    { courtId: lhcId, code: "LHC-MUL", name: "Multan Bench", city: "Multan" },
    { courtId: lhcId, code: "LHC-BWP", name: "Bahawalpur Bench", city: "Bahawalpur" },
  ];

  const seededBenches: Record<string, string> = {};
  for (const b of benchesData) {
    const bench = await prisma.bench.upsert({
      where: { courtId_code: { courtId: b.courtId, code: b.code } },
      update: { name: b.name, city: b.city },
      create: b,
    });
    seededBenches[b.code] = bench.id;
  }
  console.log("✔ Seeded 4 High Court Benches");

  // 4. Seed Presiding Judges
  const judgesData = [
    { fullName: "Mr. Justice Yahya Afridi", designation: "Chief Justice of Pakistan", courtName: "Supreme Court of Pakistan" },
    { fullName: "Mr. Justice Mansoor Ali Shah", designation: "Senior Puisne Judge", courtName: "Supreme Court of Pakistan" },
    { fullName: "Miss Justice Aalia Neelum", designation: "Chief Justice", courtName: "Lahore High Court" },
    { fullName: "Mr. Justice Shahid Karim", designation: "Judge", courtName: "Lahore High Court" },
    { fullName: "Mr. Justice Asim Hafeez", designation: "Judge", courtName: "Lahore High Court" },
  ];

  for (const j of judgesData) {
    const existing = await prisma.judge.findFirst({ where: { fullName: j.fullName } });
    if (!existing) {
      await prisma.judge.create({ data: j });
    }
  }
  console.log("✔ Seeded 5 Presiding Judges");

  // 5. Seed Custom Field Definitions
  const customFieldsData = [
    {
      code: "FIR_NUMBER",
      label: "Police FIR / Crime Case Number",
      fieldType: CustomFieldType.TEXT,
      caseType: "Criminal",
      isRequired: false,
      displayOrder: 1,
    },
    {
      code: "POLICE_STATION",
      label: "Police Station Jurisdiction (Thana)",
      fieldType: CustomFieldType.TEXT,
      caseType: "Criminal",
      isRequired: false,
      displayOrder: 2,
    },
    {
      code: "TAX_YEAR",
      label: "Assessment Tax Year",
      fieldType: CustomFieldType.NUMBER,
      caseType: "Writ Petition",
      isRequired: false,
      displayOrder: 3,
    },
    {
      code: "DISPUTED_PROPERTY_NO",
      label: "Khasra / Khewat / Plot Registration Number",
      fieldType: CustomFieldType.TEXT,
      caseType: "Civil Suit",
      isRequired: false,
      displayOrder: 4,
    },
    {
      code: "STAY_ORDER_GRANTED",
      label: "Interim Injunctive Relief / Stay Granted",
      fieldType: CustomFieldType.BOOLEAN,
      caseType: null,
      isRequired: false,
      displayOrder: 5,
    },
  ];

  const seededFieldDefs: Record<string, string> = {};
  for (const f of customFieldsData) {
    const def = await prisma.customFieldDefinition.upsert({
      where: { code: f.code },
      update: { label: f.label, fieldType: f.fieldType, caseType: f.caseType, displayOrder: f.displayOrder },
      create: f,
    });
    seededFieldDefs[f.code] = def.id;
  }
  console.log("✔ Seeded 5 Custom Field Definitions");

  // 6. Seed Fictional Staff across all roles
  const usersData = [
    {
      email: "admin.dev@lawfirm.local",
      fullName: "Tariq Mahmood (Super Admin)",
      role: Role.SUPER_ADMIN,
      mfaEnabled: true,
    },
    {
      email: "senior.partner@lawfirm.local",
      fullName: "Barrister Aitzaz Khan (Senior Partner)",
      role: Role.OFFICE_ADMIN,
      mfaEnabled: true,
    },
    {
      email: "counsel.alpha@lawfirm.local",
      fullName: "Advocate Salman Akram (Lead Counsel)",
      role: Role.LAWYER,
      mfaEnabled: false,
    },
    {
      email: "counsel.beta@lawfirm.local",
      fullName: "Advocate Asma Jahangir (Counsel Beta)",
      role: Role.LAWYER,
      mfaEnabled: false,
    },
    {
      email: "clerk.one@lawfirm.local",
      fullName: "Muhammad Usman (Senior Court Clerk)",
      role: Role.ASSISTANT,
      mfaEnabled: false,
    },
    {
      email: "finance.head@lawfirm.local",
      fullName: "Bilal Siddiqui (Finance Manager)",
      role: Role.FINANCE_ADMIN,
      mfaEnabled: true,
    },
  ];

  const seededUsers: Record<string, string> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { fullName: u.fullName, role: u.role, passwordHash, isActive: true },
      create: { email: u.email, fullName: u.fullName, role: u.role, passwordHash, mfaEnabled: u.mfaEnabled, isActive: true },
    });
    seededUsers[u.email] = user.id;
  }
  console.log("✔ Seeded 6 fictional staff users across 5 system roles");

  // 7. Seed Fictional Pakistani Clients
  const clientsData = [
    {
      name: "Indus Commercial Consortium",
      clientType: ClientType.COMPANY,
      mobile: "+92-300-1112233",
      email: "legal@indus-consortium.pk",
      address: "14-C Gulberg II, Lahore, Punjab",
      cnic: "35202-1234567-1",
    },
    {
      name: "Apex Financial Conglomerate Ltd",
      clientType: ClientType.COMPANY,
      mobile: "+92-321-4445566",
      email: "secretariat@apex-conglomerate.pk",
      address: "I.I. Chundrigar Road, Karachi, Sindh",
      cnic: "42101-7654321-3",
    },
  ];

  const seededClients: Record<string, string> = {};
  for (const c of clientsData) {
    const existing = await prisma.client.findFirst({ where: { mobile: c.mobile } });
    if (existing) {
      seededClients[c.name] = existing.id;
    } else {
      const created = await prisma.client.create({ data: c });
      seededClients[c.name] = created.id;
    }
  }
  console.log("✔ Seeded 2 institutional clients");

  // 8. Seed Fictional Cases (Standard & Restricted)
  const casesData = [
    {
      court: "Lahore High Court",
      courtCode: "LHC",
      benchCode: "LHC-LHR",
      caseNumber: "WP-101/2026",
      title: "Indus Commercial Consortium vs Federation of Pakistan & IRSA",
      province: "Punjab",
      city: "Lahore",
      jurisdiction: "Constitutional / Writ",
      caseType: "Writ Petition",
      filingDate: new Date("2026-01-15"),
      isRestricted: false,
      opposingParty: "Federation of Pakistan",
      opposingLawyer: "Deputy Attorney General of Pakistan",
      clientName: "Indus Commercial Consortium",
      statusCode: "ACTIVE",
      assignedToEmail: "counsel.alpha@lawfirm.local",
    },
    {
      court: "Supreme Court of Pakistan",
      courtCode: "SCP",
      benchCode: null,
      caseNumber: "CS-202/2026",
      title: "Apex Financial Conglomerate vs Global Telecom Holdings B.V.",
      province: "Federal",
      city: "Islamabad",
      jurisdiction: "Civil / Original",
      caseType: "Civil Suit",
      filingDate: new Date("2026-02-10"),
      isRestricted: true, // Restricted ethical wall matter
      opposingParty: "Global Telecom Holdings B.V.",
      opposingLawyer: "Barrister Salman Safdar",
      clientName: "Apex Financial Conglomerate Ltd",
      statusCode: "AWAITING_HEARING",
      assignedToEmail: "counsel.beta@lawfirm.local",
    },
  ];

  for (const cd of casesData) {
    const clientId = seededClients[cd.clientName];
    const statusId = seededStatuses[cd.statusCode];
    const courtId = seededCourts[cd.courtCode];
    const benchId = cd.benchCode ? seededBenches[cd.benchCode] : null;
    const assignedLawyerId = seededUsers[cd.assignedToEmail];
    const adminId = seededUsers["senior.partner@lawfirm.local"];

    const caseRecord = await prisma.case.upsert({
      where: {
        court_caseNumber: {
          court: cd.court,
          caseNumber: cd.caseNumber,
        },
      },
      update: {
        title: cd.title,
        statusId,
        courtId,
        benchId,
        isRestricted: cd.isRestricted,
      },
      create: {
        caseNumber: cd.caseNumber,
        title: cd.title,
        court: cd.court,
        province: cd.province,
        city: cd.city,
        jurisdiction: cd.jurisdiction,
        caseType: cd.caseType,
        filingDate: cd.filingDate,
        isRestricted: cd.isRestricted,
        opposingParty: cd.opposingParty,
        opposingLawyer: cd.opposingLawyer,
        clientId,
        statusId,
        courtId,
        benchId,
      },
    });

    // Create assignment
    if (assignedLawyerId && adminId) {
      const existingAssignment = await prisma.caseAssignment.findFirst({
        where: { caseId: caseRecord.id, userId: assignedLawyerId, isActive: true },
      });

      if (!existingAssignment) {
        await prisma.caseAssignment.create({
          data: {
            caseId: caseRecord.id,
            userId: assignedLawyerId,
            assignedById: adminId,
            roleInCase: RoleInCase.LEAD_COUNSEL,
            isActive: true,
          },
        });
      }
    }

    // 9. Seed Parties for this Case
    if (cd.caseNumber === "WP-101/2026") {
      // Petitioner
      const p1 = await prisma.caseParty.findFirst({
        where: { caseId: caseRecord.id, name: "Indus Commercial Consortium" },
      });
      if (!p1) {
        await prisma.caseParty.create({
          data: {
            caseId: caseRecord.id,
            partyRole: PartyRole.PETITIONER,
            name: "Indus Commercial Consortium",
            cnic: "35202-1234567-1",
            contactNumber: "+92-300-1112233",
            address: "14-C Gulberg II, Lahore",
            advocateName: "Advocate Salman Akram",
            isPrimary: true,
          },
        });
      }

      // Respondents
      const r1 = await prisma.caseParty.findFirst({
        where: { caseId: caseRecord.id, name: "Federation of Pakistan, through Secretary Ministry of Water Resources" },
      });
      if (!r1) {
        await prisma.caseParty.create({
          data: {
            caseId: caseRecord.id,
            partyRole: PartyRole.RESPONDENT,
            name: "Federation of Pakistan, through Secretary Ministry of Water Resources",
            address: "Pak Secretariat, Islamabad",
            advocateName: "Deputy Attorney General of Pakistan",
            isPrimary: true,
          },
        });
      }

      const r2 = await prisma.caseParty.findFirst({
        where: { caseId: caseRecord.id, name: "Indus River System Authority (IRSA)" },
      });
      if (!r2) {
        await prisma.caseParty.create({
          data: {
            caseId: caseRecord.id,
            partyRole: PartyRole.RESPONDENT,
            name: "Indus River System Authority (IRSA)",
            address: "Sector G-5/2, Islamabad",
            advocateName: "Barrister Asad Rahim",
            isPrimary: false,
          },
        });
      }

      // Custom Field Values for WP-101
      const taxFieldId = seededFieldDefs["TAX_YEAR"];
      const stayFieldId = seededFieldDefs["STAY_ORDER_GRANTED"];

      if (taxFieldId) {
        await prisma.customFieldValue.upsert({
          where: { caseId_fieldDefinitionId: { caseId: caseRecord.id, fieldDefinitionId: taxFieldId } },
          update: { valueNumber: 2026 },
          create: { caseId: caseRecord.id, fieldDefinitionId: taxFieldId, valueNumber: 2026 },
        });
      }

      if (stayFieldId) {
        await prisma.customFieldValue.upsert({
          where: { caseId_fieldDefinitionId: { caseId: caseRecord.id, fieldDefinitionId: stayFieldId } },
          update: { valueBoolean: true },
          create: { caseId: caseRecord.id, fieldDefinitionId: stayFieldId, valueBoolean: true },
        });
      }
    }

    if (cd.caseNumber === "CS-202/2026") {
      // Plaintiff
      const pl1 = await prisma.caseParty.findFirst({
        where: { caseId: caseRecord.id, name: "Apex Financial Conglomerate Ltd" },
      });
      if (!pl1) {
        await prisma.caseParty.create({
          data: {
            caseId: caseRecord.id,
            partyRole: PartyRole.PLAINTIFF,
            name: "Apex Financial Conglomerate Ltd",
            cnic: "42101-7654321-3",
            address: "I.I. Chundrigar Road, Karachi",
            advocateName: "Advocate Asma Jahangir",
            isPrimary: true,
          },
        });
      }

      // Defendant
      const d1 = await prisma.caseParty.findFirst({
        where: { caseId: caseRecord.id, name: "Global Telecom Holdings B.V." },
      });
      if (!d1) {
        await prisma.caseParty.create({
          data: {
            caseId: caseRecord.id,
            partyRole: PartyRole.DEFENDANT,
            name: "Global Telecom Holdings B.V.",
            address: "Amsterdam, Netherlands",
            advocateName: "Barrister Salman Safdar",
            isPrimary: true,
          },
        });
      }
    }
  }
  console.log("✔ Seeded 2 initial cases with parties, assignments, and custom fields");

  // 10. Seed Initial Conflict Check Record
  const sampleConflictCheck = await prisma.conflictCheckRecord.findFirst({
    where: { queriedPartyName: "Indus River Authority" },
  });

  if (!sampleConflictCheck) {
    await prisma.conflictCheckRecord.create({
      data: {
        queriedByName: "Barrister Aitzaz Khan",
        queriedPartyName: "Indus River Authority",
        matchFound: true,
        matchedDetails: {
          matchedCase: "WP-101/2026",
          matchedRole: "RESPONDENT",
          similarityScore: 0.92,
        },
        isCleared: true,
        clearanceNotes: "Prospective representation cleared: Client is Petitioner, opposite party is already adverse.",
      },
    });
    console.log("✔ Seeded initial Conflict Check screening record");
  }

  // 11. Seed Documents & Document Versions (Milestone 3)
  const alphaUser = await prisma.user.findUniqueOrThrow({ where: { email: "counsel.alpha@lawfirm.local" } });
  const betaUser = await prisma.user.findUniqueOrThrow({ where: { email: "counsel.beta@lawfirm.local" } });
  const case1 = await prisma.case.findFirstOrThrow({ where: { caseNumber: "WP-101/2026" } });
  const case2 = await prisma.case.findFirstOrThrow({ where: { caseNumber: "CS-202/2026" } });

  const existingDoc1 = await prisma.document.findFirst({ where: { caseId: case1.id } });
  if (!existingDoc1 && alphaUser) {
    const doc1 = await prisma.document.create({
      data: {
        caseId: case1.id,
        title: "Writ Petition Pleadings & Stay Application",
        category: "PLEADING",
        description: "Certified copy of petition filed under Article 199 of the Constitution of Pakistan.",
        isRestricted: false,
        createdById: alphaUser.id,
        currentVersionNumber: 1,
        versions: {
          create: {
            versionNumber: 1,
            fileName: "Writ_Petition_101_2026.pdf",
            fileExtension: ".pdf",
            mimeType: "application/pdf",
            fileSizeBytes: BigInt(245760),
            storagePath: `${case1.id}/seed_v1_wp101.pdf`,
            fileHashSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            notes: "Filed before Registrar, Lahore High Court.",
            scanStatus: "CLEAN",
            scannedAt: new Date(),
            uploaderId: alphaUser.id,
            pages: {
              create: [
                {
                  pageNumber: 1,
                  textContent: `IN THE LAHORE HIGH COURT, LAHORE\n(CONSTITUTIONAL & WRIT JURISDICTION)\nWrit Petition No. 101 of 2026\n\nIndus Commercial Consortium (Petitioner)\nVERSUS\n1. Federation of Pakistan, through Secretary, Ministry of Water Resources, Islamabad.\n2. Indus River System Authority (IRSA), through its Chairman, Islamabad.\n3. Province of Punjab, through Chief Secretary, Lahore.\n4. Punjab Irrigation Department, through Secretary Irrigation, Lahore. (Respondents)\n\nPETITION UNDER ARTICLE 199 OF THE CONSTITUTION OF PAKISTAN FOR WRIT OF CERTIORARI, MANDAMUS AND PROHIBITION\n\n1. Petitioner holds statutory water quota entitlements under the Water Apportionment Accord 1991 and IRSA Act 1992.\n2. Respondent No. 2 (IRSA) is mandated to ensure equitable water distribution across provincial canal systems.`,
                },
                {
                  pageNumber: 2,
                  textContent: `FACTUAL MATRIX & GROUNDS:\n3. Impugned IRSA Notification dated 08-01-2026 unilaterally reduced discharge by 35% to Taunsa-Panjnad and Chashma-Jhelum Link Canals without mandatory consensus from Council of Common Interests (CCI) under Article 153 and 155 of the Constitution.\n4. Violates Section 8 of IRSA Act 1992 and Fundamental Rights under Articles 4, 9, 18 and 25 of the Constitution. Commercial loss exceeds PKR 1.85 Billion.`,
                },
                {
                  pageNumber: 3,
                  textContent: `PRAYER & INTERIM ORDER:\na) Issue Writ of Certiorari declaring impugned notification illegal and ultra vires.\nb) Direct IRSA to maintain baseline releases under 1991 Accord.\nc) Stay operation of notification dated 08-01-2026.\n\nINTERIM ORDER (18-01-2026 by Hon. Justice Shahid Karim):\nNotice for 28-02-2026. In the interim, operation of impugned notification dated 08-01-2026 suspended. Status quo and regular water discharge maintained.`,
                },
              ],
            },
          },
        },
      },
    });
    console.log("✔ Seeded Document and Version for WP-101/2026");
  }

  const existingDoc2 = await prisma.document.findFirst({ where: { caseId: case2.id } });
  if (!existingDoc2 && betaUser) {
    const doc2 = await prisma.document.create({
      data: {
        caseId: case2.id,
        title: "Confidential Shareholder Resolution",
        category: "CONTRACT",
        description: "Classified minutes of extraordinary general meeting.",
        isRestricted: true,
        createdById: betaUser.id,
        currentVersionNumber: 1,
        versions: {
          create: {
            versionNumber: 1,
            fileName: "Confidential_EGM_Resolution.pdf",
            fileExtension: ".pdf",
            mimeType: "application/pdf",
            fileSizeBytes: BigInt(512000),
            storagePath: `${case2.id}/seed_v1_cs202.pdf`,
            fileHashSha256: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
            notes: "Internal document protected under Ethical Wall.",
            scanStatus: "CLEAN",
            scannedAt: new Date(),
            uploaderId: betaUser.id,
          },
        },
      },
    });
    console.log("✔ Seeded Restricted Document for CS-202/2026");
  }

  // 12. Seed Court Hearings (Milestone 3)
  const existingHearing1 = await prisma.hearing.findFirst({ where: { caseId: case1.id } });
  if (!existingHearing1 && alphaUser) {
    await prisma.hearing.create({
      data: {
        caseId: case1.id,
        court: "Lahore High Court",
        hearingDate: new Date("2026-11-15T09:30:00+05:00"),
        purpose: "Arguments on Interim Injunctive Relief / Extension of Stay",
        status: "SCHEDULED",
        notes: "Before Mr. Justice Mansoor Ali Shah (Bench No. 2)",
        createdById: alphaUser.id,
      },
    });
    console.log("✔ Seeded upcoming hearing for WP-101/2026");
  }

  const existingHearing2 = await prisma.hearing.findFirst({ where: { caseId: case2.id } });
  if (!existingHearing2 && betaUser) {
    await prisma.hearing.create({
      data: {
        caseId: case2.id,
        court: "Lahore High Court",
        hearingDate: new Date("2026-11-20T11:00:00+05:00"),
        purpose: "Framing of Issues in Corporate Governance Dispute",
        status: "SCHEDULED",
        notes: "Confidential hearing before Single Bench",
        createdById: betaUser.id,
      },
    });
    console.log("✔ Seeded upcoming hearing for CS-202/2026");
  }

  // 13. Seed Tasks & Deadlines (Milestone 3)
  const existingTask1 = await prisma.task.findFirst({ where: { caseId: case1.id } });
  if (!existingTask1 && alphaUser) {
    await prisma.task.create({
      data: {
        caseId: case1.id,
        title: "Draft Rejoinder to Federation Written Statement",
        description: "Address preliminary maintainability objections raised by Deputy Attorney General.",
        priority: "HIGH",
        status: "PENDING",
        dueDate: new Date("2026-11-10T17:00:00+05:00"),
        assignedToUserId: alphaUser.id,
        createdById: alphaUser.id,
      },
    });
    console.log("✔ Seeded task for WP-101/2026");
  }

  const existingTask2 = await prisma.task.findFirst({ where: { caseId: case2.id } });
  if (!existingTask2 && betaUser) {
    await prisma.task.create({
      data: {
        caseId: case2.id,
        title: "Prepare Cross-Examination Questions",
        description: "Formulate strategy for cross-examining financial officer.",
        priority: "URGENT",
        status: "PENDING",
        dueDate: new Date("2026-11-18T17:00:00+05:00"),
        assignedToUserId: betaUser.id,
        createdById: betaUser.id,
      },
    });
    console.log("✔ Seeded task for CS-202/2026");
  }

  // 15. Seed Landmark Pakistani Legal Precedents (Milestone 6)
  const precedentsData = [
    {
      citation: "PLD 2023 SC 450",
      title: "Federation of Pakistan v. Suo Motu Practice and Procedure Act",
      court: PrecedentCourtType.SUPREME_COURT,
      bench: "Full Bench (5 Judges)",
      benchSize: 5,
      decisionYear: 2023,
      decisionDate: new Date("2023-10-11"),
      legalTopics: ["Constitutional Law", "Supreme Court Practice", "Parliamentary Sovereignty"],
      statutoryProvisions: ["Constitution of Pakistan 1973, Art 184(3)", "Constitution of Pakistan 1973, Art 199", "Supreme Court Practice and Procedure Act 2023"],
      headnote: "Constitutional Jurisdiction - Exercise of original jurisdiction under Article 184(3) - Constitution of larger benches by committee - Valid legislative enactment.",
      summary: "Parliament possesses the legislative competence under Article 191 of the Constitution to regulate the practice and procedure of the Supreme Court of Pakistan.",
      precedentialWeight: PrecedentPrecedentialWeight.BINDING,
      status: PrecedentStatus.GOOD_LAW,
      sourceUrl: "https://supremecourt.gov.pk/judgments/pld2023sc450.pdf",
    },
    {
      citation: "2024 SCMR 150",
      title: "Commissioner Inland Revenue v. Crescent Textiles Ltd",
      court: PrecedentCourtType.SUPREME_COURT,
      bench: "Three-Judge Bench",
      benchSize: 3,
      decisionYear: 2024,
      decisionDate: new Date("2024-02-15"),
      legalTopics: ["Tax Law", "Limitation", "Assessment Amendment"],
      statutoryProvisions: ["Income Tax Ordinance 2001, s.122", "Income Tax Ordinance 2001, s.214C"],
      headnote: "Taxation Law - Amendment of assessment - Limitation of five years under section 122(2) - Computation of period - Mandatory statutory timeline.",
      summary: "The statutory period of limitation prescribed under Section 122(2) of the Income Tax Ordinance 2001 is mandatory and jurisdictional. An assessment amended after the expiry of five years is void ab initio.",
      precedentialWeight: PrecedentPrecedentialWeight.BINDING,
      status: PrecedentStatus.GOOD_LAW,
      sourceUrl: "https://supremecourt.gov.pk/judgments/2024scmr150.pdf",
    },
    {
      citation: "PLD 2022 SC 1",
      title: "Shahid Hussain v. State",
      court: PrecedentCourtType.SUPREME_COURT,
      bench: "Three-Judge Bench",
      benchSize: 3,
      decisionYear: 2022,
      decisionDate: new Date("2022-01-20"),
      legalTopics: ["Criminal Law", "Bail Jurisprudence", "Liberty of Citizen"],
      statutoryProvisions: ["Code of Criminal Procedure 1898, s.497", "Pakistan Penal Code 1860, s.302"],
      headnote: "Criminal Law - Pre-arrest and post-arrest bail - Further inquiry under Section 497(2) Cr.P.C. - Liberty of citizen paramount unless compelling risk of tampering.",
      summary: "When two reasonable interpretations of evidence exist at the bail stage, the interpretation favoring liberty and further inquiry must be adopted under section 497(2) Cr.P.C.",
      precedentialWeight: PrecedentPrecedentialWeight.BINDING,
      status: PrecedentStatus.GOOD_LAW,
      sourceUrl: "https://supremecourt.gov.pk/judgments/pld2022sc1.pdf",
    },
    {
      citation: "2023 CLC 880",
      title: "Tariq Transport Logistics v. Karachi Port Trust",
      court: PrecedentCourtType.HIGH_COURT_SINDH,
      bench: "Division Bench",
      benchSize: 2,
      decisionYear: 2023,
      decisionDate: new Date("2023-05-18"),
      legalTopics: ["Civil Procedure", "Interim Injunction", "Commercial Dispute"],
      statutoryProvisions: ["Code of Civil Procedure 1908, Order 39 Rules 1 & 2", "Specific Relief Act 1877, s.54"],
      headnote: "Civil Procedure - Interim Injunction - Triple test: prima facie case, balance of convenience, irreparable loss - Commercial contracts.",
      summary: "All three elements of the triple test under Order 39 Rules 1 and 2 CPC must coexist concurrently. In pure commercial monetary claims, damages are an adequate remedy, precluding interim injunction.",
      precedentialWeight: PrecedentPrecedentialWeight.BINDING,
      status: PrecedentStatus.GOOD_LAW,
      sourceUrl: "https://sindhhighcourt.gov.pk/judgments/2023clc880.pdf",
    },
    {
      citation: "PLD 2021 Lahore 220",
      title: "Alpha Builders (Pvt) Ltd v. Province of Punjab",
      court: PrecedentCourtType.HIGH_COURT_LAHORE,
      bench: "Division Bench",
      benchSize: 2,
      decisionYear: 2021,
      decisionDate: new Date("2021-09-08"),
      legalTopics: ["Administrative Law", "Public Procurement", "Due Process"],
      statutoryProvisions: ["Punjab Procurement Regulatory Authority Rules 2014, Rule 48", "Constitution of Pakistan 1973, Art 199"],
      headnote: "Public Procurement - Disqualification of bidder - Natural justice requirement - Hearing before blacklisting.",
      summary: "Blacklisting or disqualifying a government contractor without an explicit show-cause notice and personal hearing violates the fundamental guarantee of due process under Article 10-A.",
      precedentialWeight: PrecedentPrecedentialWeight.BINDING,
      status: PrecedentStatus.GOOD_LAW,
      sourceUrl: "https://lahorehighcourt.gov.pk/judgments/pld2021lah220.pdf",
    },
  ];

  for (const p of precedentsData) {
    await prisma.legalPrecedent.upsert({
      where: { citation: p.citation },
      update: {
        ...p,
        verifiedById: alphaUser.id,
      },
      create: {
        ...p,
        verifiedById: alphaUser.id,
      },
    });
  }
  console.log(`✔ Seeded ${precedentsData.length} landmark Pakistani legal precedents`);

  // 16. Seed Document Drafting Templates (Milestone 6)
  const stayAppTemplate = await prisma.documentTemplate.upsert({
    where: { code: "CP_PETITION_STAY" },
    update: {
      name: "Application for Interim Relief / Stay Under Order 39 Rules 1 & 2 CPC",
      description: "Standard High Court civil application for interim stay pending final adjudication.",
      category: TemplateCategory.APPLICATIONS,
      isActive: true,
    },
    create: {
      code: "CP_PETITION_STAY",
      name: "Application for Interim Relief / Stay Under Order 39 Rules 1 & 2 CPC",
      description: "Standard High Court civil application for interim stay pending final adjudication.",
      category: TemplateCategory.APPLICATIONS,
      isActive: true,
      createdById: alphaUser.id,
    },
  });

  const existingStayVersion = await prisma.templateVersion.findFirst({
    where: { templateId: stayAppTemplate.id, versionNumber: 1 },
  });
  if (!existingStayVersion) {
    await prisma.templateVersion.create({
      data: {
        templateId: stayAppTemplate.id,
        versionNumber: 1,
        content: `IN THE {{COURT_NAME}} AT {{BENCH_NAME}}
In Case No. {{CASE_NUMBER}}

{{CASE_TITLE}}

APPLICATION UNDER ORDER XXXIX RULES 1 & 2 READ WITH SECTION 151 C.P.C. FOR GRANT OF INTERIM RELIEF / AD-INTERIM STAY

Respectfully Sheweth:

1. That the Applicant / Petitioner has instituted the titled matter before this Honorable Court challenging the impugned administrative actions.

2. That the Applicant / Petitioner has a strong prima facie case with high probability of success on merits.

3. That the balance of convenience lies overwhelmingly in favor of the Applicant / Petitioner.

4. That if the operation of the impugned order is not suspended, the Applicant / Petitioner shall suffer grave, irreparable loss and injury which cannot be compensated in monetary terms.

PRAYER:
It is most respectfully prayed that this Honorable Court may graciously be pleased to suspend the operation of the impugned order and restrain the Respondents from taking any adverse action against the Applicant / Petitioner till the final disposal of this case.

Any other relief deemed fit and proper in the interest of justice may also graciously be awarded.

Petitioner: {{PETITIONER_NAME}}
Through Counsel: {{ADVOCATE_NAME}}
Date: {{TODAY_DATE}}`,
        availableTokens: ["COURT_NAME", "BENCH_NAME", "CASE_NUMBER", "CASE_TITLE", "PETITIONER_NAME", "ADVOCATE_NAME", "TODAY_DATE"],
        changelog: "Initial standardized High Court stay application template.",
        isPublished: true,
        publishedById: alphaUser.id,
      },
    });
  }

  const recoveryNoticeTemplate = await prisma.documentTemplate.upsert({
    where: { code: "LEGAL_NOTICE_RECOVERY" },
    update: {
      name: "Legal Notice for Recovery of Outstanding Dues & Damages",
      description: "Formal statutory demand notice under Contract Act 1872 and Section 80 CPC.",
      category: TemplateCategory.LEGAL_NOTICES,
      isActive: true,
    },
    create: {
      code: "LEGAL_NOTICE_RECOVERY",
      name: "Legal Notice for Recovery of Outstanding Dues & Damages",
      description: "Formal statutory demand notice under Contract Act 1872 and Section 80 CPC.",
      category: TemplateCategory.LEGAL_NOTICES,
      isActive: true,
      createdById: alphaUser.id,
    },
  });

  const existingNoticeVersion = await prisma.templateVersion.findFirst({
    where: { templateId: recoveryNoticeTemplate.id, versionNumber: 1 },
  });
  if (!existingNoticeVersion) {
    await prisma.templateVersion.create({
      data: {
        templateId: recoveryNoticeTemplate.id,
        versionNumber: 1,
        content: `LEGAL NOTICE UNDER SECTION 80 C.P.C. & LAW OF CONTRACT

Date: {{TODAY_DATE}}

To:
{{RESPONDENT_NAME}}

From:
{{ADVOCATE_NAME}}, Advocate High Court
On behalf of: {{CLIENT_NAME}} (CNIC: {{CLIENT_CNIC}})
Address: {{CLIENT_ADDRESS}}

SUBJECT: FINAL STATUTORY DEMAND FOR IMMEDIATE PAYMENT IN RESPECT OF MATTER {{CASE_NUMBER}}

Dear Sir/Madam,

Under instructions from and on behalf of our client, {{CLIENT_NAME}}, we hereby serve upon you this formal Legal Notice as under:

1. That you entered into binding commercial contractual obligations with our client.

2. That despite lawful performance of obligations by our client, you have willfully defaulted and refused to clear the lawful outstanding liability.

3. That your deliberate breach of contract has caused immense financial damage, commercial disruption, and mental agony to our client.

THEREFORE, TAKE NOTICE that you are hereby called upon to pay and liquidate the entire outstanding amount within fourteen (14) days from the receipt of this notice, failing which our client has given us peremptory instructions to initiate civil and criminal proceedings against you before the competent Court of Law entirely at your own risk and cost.

Yours faithfully,

{{ADVOCATE_NAME}}
Advocate High Court
Counsel for {{CLIENT_NAME}}`,
        availableTokens: ["TODAY_DATE", "RESPONDENT_NAME", "ADVOCATE_NAME", "CLIENT_NAME", "CLIENT_CNIC", "CLIENT_ADDRESS", "CASE_NUMBER"],
        changelog: "Standard commercial recovery statutory notice.",
        isPublished: true,
        publishedById: alphaUser.id,
      },
    });
  }

  const clientAdvisoryTemplate = await prisma.documentTemplate.upsert({
    where: { code: "CLIENT_HEARING_UPDATE" },
    update: {
      name: "Client Hearing Status & Next Steps Advisory",
      description: "Standard formal advisory letter informing client of court order, next hearing date, and instructions.",
      category: TemplateCategory.CLIENT_CORRESPONDENCE,
      isActive: true,
    },
    create: {
      code: "CLIENT_HEARING_UPDATE",
      name: "Client Hearing Status & Next Steps Advisory",
      description: "Standard formal advisory letter informing client of court order, next hearing date, and instructions.",
      category: TemplateCategory.CLIENT_CORRESPONDENCE,
      isActive: true,
      createdById: alphaUser.id,
    },
  });

  const existingAdvisoryVersion = await prisma.templateVersion.findFirst({
    where: { templateId: clientAdvisoryTemplate.id, versionNumber: 1 },
  });
  if (!existingAdvisoryVersion) {
    await prisma.templateVersion.create({
      data: {
        templateId: clientAdvisoryTemplate.id,
        versionNumber: 1,
        content: `CONFIDENTIAL CLIENT ADVISORY
LAW OFFICES & LEGAL CONSULTANTS

Date: {{TODAY_DATE}}
Client: {{CLIENT_NAME}}
Reference: Case No. {{CASE_NUMBER}} ({{CASE_TITLE}})
Court: {{COURT_NAME}}

Dear {{CLIENT_NAME}},

We write to provide you with a formal briefing regarding the recent proceedings in your matter before the {{COURT_NAME}}.

HEARING STATUS & DIRECTIVES:
The Court convened for hearing of the titled matter. The arguments were presented by our litigation team led by {{ADVOCATE_NAME}}.

NEXT SCHEDULED PROCEEDING:
The matter has been fixed for further proceedings / rejoinder on:
Date: {{NEXT_HEARING_DATE}}

REQUIRED PREPARATION & INSTRUCTIONS:
Kindly review the draft pleadings and provide any supplemental documentation to our chambers at least three (3) business days prior to the hearing date. Should you require any clarification, please contact our office directly at {{CLIENT_MOBILE}}.

Warm regards,

{{ADVOCATE_NAME}}
Lead Counsel`,
        availableTokens: ["TODAY_DATE", "CLIENT_NAME", "CASE_NUMBER", "CASE_TITLE", "COURT_NAME", "ADVOCATE_NAME", "NEXT_HEARING_DATE", "CLIENT_MOBILE"],
        changelog: "Standard post-hearing client advisory note.",
        isPublished: true,
        publishedById: alphaUser.id,
      },
    });
  }
  console.log("✔ Seeded 3 standard legal document templates with published versions");

  // 17. Initial Immutable Audit Event
  await prisma.auditEvent.create({
    data: {
      action: "MILESTONE_6_SEED_INITIALIZED",
      entityType: "SYSTEM",
      entityId: "INITIAL_SEED",
      afterState: {
        version: "6.0.0",
        precedentsCount: precedentsData.length,
        templatesCount: 3,
        researchEngineActive: true,
        draftingAutofillActive: true,
        sharingSecurityActive: true,
      },
      ipAddress: "127.0.0.1",
    },
  });
  console.log("✔ Seeded Milestone 6 audit verification event");

  console.log("🎉 Milestone 6 database seed completed idempotently.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
