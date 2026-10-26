"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database/client";
import { withUserContext } from "@/lib/database/context";
import { getCurrentUser } from "@/lib/auth/session";
import { recordAuthAudit } from "@/lib/auth/audit";
import { Role, RoleInCase, PartyRole } from "@prisma/client";

const CreateCaseSchema = z.object({
  caseNumber: z.string().min(2, "Case number is required (e.g. WP-101/2026)."),
  title: z.string().min(5, "Case title is required."),
  court: z.string().min(2, "Court name is required."),
  courtId: z.string().uuid().optional().nullable(),
  benchId: z.string().uuid().optional().nullable(),
  province: z.string().default("Punjab"),
  city: z.string().default("Lahore"),
  jurisdiction: z.string().default("High Court"),
  caseType: z.string().min(2, "Case type is required (e.g. Writ Petition)."),
  filingDate: z.string().optional().nullable(),
  isRestricted: z.boolean().default(false),
  clientId: z.string().uuid("Client selection is required."),
  statusId: z.string().uuid("Status selection is required."),
  assignedLawyerId: z.string().uuid("Assigned lead counsel is required."),
  opposingParty: z.string().optional().nullable(),
  opposingLawyer: z.string().optional().nullable(),
});

export type CaseActionState = {
  status: "IDLE" | "SUCCESS" | "ERROR";
  message?: string;
  caseId?: string;
};

export async function createCaseAction(
  _prevState: CaseActionState,
  formData: FormData
): Promise<CaseActionState> {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.OFFICE_ADMIN && user.role !== Role.LAWYER)) {
    return {
      status: "ERROR",
      message: "Unauthorized: Only an Office Administrator or Counsel may institute a case.",
    };
  }

  const raw = {
    caseNumber: formData.get("caseNumber") as string,
    title: formData.get("title") as string,
    court: formData.get("court") as string,
    courtId: (formData.get("courtId") as string) || null,
    benchId: (formData.get("benchId") as string) || null,
    province: (formData.get("province") as string) || "Punjab",
    city: (formData.get("city") as string) || "Lahore",
    jurisdiction: (formData.get("jurisdiction") as string) || "High Court",
    caseType: formData.get("caseType") as string,
    filingDate: (formData.get("filingDate") as string) || null,
    isRestricted: formData.get("isRestricted") === "true",
    clientId: formData.get("clientId") as string,
    statusId: formData.get("statusId") as string,
    assignedLawyerId: formData.get("assignedLawyerId") as string,
    opposingParty: (formData.get("opposingParty") as string) || null,
    opposingLawyer: (formData.get("opposingLawyer") as string) || null,
  };

  const parsed = CreateCaseSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "ERROR",
      message: parsed.error.issues[0]?.message || "Invalid case information.",
    };
  }

  const data = parsed.data;

  try {
    const createdCase = await withUserContext(user.id, async (tx) => {
      // 1. Create Case
      const newCase = await tx.case.create({
        data: {
          caseNumber: data.caseNumber.trim(),
          title: data.title.trim(),
          court: data.court.trim(),
          courtId: data.courtId,
          benchId: data.benchId,
          province: data.province,
          city: data.city,
          jurisdiction: data.jurisdiction,
          caseType: data.caseType.trim(),
          filingDate: data.filingDate ? new Date(data.filingDate) : null,
          isRestricted: data.isRestricted,
          clientId: data.clientId,
          statusId: data.statusId,
          opposingParty: data.opposingParty,
          opposingLawyer: data.opposingLawyer,
        },
      });

      // 2. Assign Lead Counsel
      await tx.caseAssignment.create({
        data: {
          caseId: newCase.id,
          userId: data.assignedLawyerId,
          assignedById: user.id,
          roleInCase: RoleInCase.LEAD_COUNSEL,
          isActive: true,
        },
      });

      // If restricted and creator is an admin not assigned as lead counsel,
      // also assign creator so they retain visibility if desired
      if (data.isRestricted && user.id !== data.assignedLawyerId) {
        await tx.caseAssignment.create({
          data: {
            caseId: newCase.id,
            userId: user.id,
            assignedById: user.id,
            roleInCase: RoleInCase.ASSOCIATE,
            isActive: true,
          },
        });
      }

      // 3. Create primary Client Party entry
      const client = await tx.client.findUnique({
        where: { id: data.clientId },
      });

      if (client) {
        await tx.caseParty.create({
          data: {
            caseId: newCase.id,
            partyRole: data.caseType.toLowerCase().includes("petition")
              ? PartyRole.PETITIONER
              : PartyRole.PLAINTIFF,
            name: client.name,
            cnic: client.cnic,
            contactNumber: client.mobile,
            address: client.address,
            isPrimary: true,
          },
        });
      }

      // 4. Create Opposing Party if specified
      if (data.opposingParty) {
        await tx.caseParty.create({
          data: {
            caseId: newCase.id,
            partyRole: data.caseType.toLowerCase().includes("petition")
              ? PartyRole.RESPONDENT
              : PartyRole.DEFENDANT,
            name: data.opposingParty.trim(),
            advocateName: data.opposingLawyer || null,
            isPrimary: true,
          },
        });
      }

      return newCase;
    });

    await recordAuthAudit({
      userId: user.id,
      action: "CASE_CREATED",
      metadata: {
        caseId: createdCase.id,
        caseNumber: createdCase.caseNumber,
        isRestricted: createdCase.isRestricted,
      },
    });

    revalidatePath("/cases");
    revalidatePath("/");

    return {
      status: "SUCCESS",
      caseId: createdCase.id,
      message: `Matter ${createdCase.caseNumber} successfully instituted in chambers.`,
    };
  } catch (error: any) {
    return {
      status: "ERROR",
      message: error?.message || "Failed to create case. Please try again.",
    };
  }
}

export async function updateCaseStatusAction(
  caseId: string,
  newStatusId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.OFFICE_ADMIN && user.role !== Role.LAWYER)) {
    throw new Error("Unauthorized: Only an Office Administrator or Counsel may update case status.");
  }

  await withUserContext(user.id, async (tx) => {
    const existing = await tx.case.findUnique({
      where: { id: caseId },
      include: { status: true },
    });

    if (!existing) {
      throw new Error("Case not found or access denied.");
    }

    const updated = await tx.case.update({
      where: { id: caseId },
      data: { statusId: newStatusId },
      include: { status: true },
    });

    await recordAuthAudit({
      userId: user.id,
      action: "CASE_STATUS_TRANSITION",
      metadata: {
        caseId,
        fromStatus: existing.status.code,
        toStatus: updated.status.code,
        reason: reason.trim(),
      },
    });
  });

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  revalidatePath("/");

  return { success: true, message: "Case status updated successfully." };
}
