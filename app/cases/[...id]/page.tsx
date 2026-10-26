import React from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { withUserContext } from "@/lib/database/context";
import { prisma } from "@/lib/database/client";
import { AppShell } from "@/components/shell/AppShell";
import { CaseDetailView } from "@/components/cases/CaseDetailView";
import { Role } from "@prisma/client";
import { getCaseAiData } from "@/lib/ai/service";

export const dynamic = "force-dynamic";

interface CaseDetailPageProps {
  params: {
    id: string | string[];
  };
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const rawParam = (
    Array.isArray(params.id)
      ? params.id.map((segment) => decodeURIComponent(segment)).join("/")
      : decodeURIComponent(params.id || "")
  ).trim();
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUuid = UUID_REGEX.test(rawParam);

  // Load case strictly within user context via PostgreSQL RLS
  const caseRecord = await withUserContext(user.id, async (tx) => {
    return await tx.case.findFirst({
      where: isUuid
        ? { id: rawParam }
        : { caseNumber: { equals: rawParam, mode: "insensitive" } },
      include: {
        status: true,
        client: true,
        courtRef: true,
        benchRef: true,
        parties: {
          orderBy: { createdAt: "asc" },
        },
        customFields: {
          include: { fieldDefinition: true },
        },
        assignments: {
          where: { isActive: true },
          include: {
            user: { select: { fullName: true, email: true, role: true } },
          },
          orderBy: { assignedAt: "asc" },
        },
        documents: {
          where: { deletedAt: null },
          include: {
            versions: {
              orderBy: { versionNumber: "desc" },
              include: {
                uploader: { select: { fullName: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        hearings: {
          where: { deletedAt: null },
          include: {
            benchRef: { select: { name: true, code: true } },
            judgeRef: { select: { fullName: true, designation: true } },
          },
          orderBy: { hearingDate: "asc" },
        },
        tasks: {
          where: { deletedAt: null },
          include: {
            assignedToUser: { select: { id: true, fullName: true, role: true } },
          },
          orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
        },
        fee: {
          include: {
            installments: {
              where: { deletedAt: null },
              orderBy: { installmentNumber: "asc" },
            },
          },
        },
        payments: {
          include: {
            receivedBy: { select: { fullName: true } },
            reversedBy: { select: { fullName: true } },
          },
          orderBy: { paymentDate: "desc" },
        },
        expenses: {
          where: { deletedAt: null },
          include: {
            incurredBy: { select: { fullName: true } },
          },
          orderBy: { expenseDate: "desc" },
        },
        generatedDocuments: {
          orderBy: { createdAt: "desc" },
        },
        clientMessages: {
          orderBy: { createdAt: "desc" },
        },
        externalShares: {
          include: {
            items: {
              include: {
                documentVersion: {
                  include: { document: { select: { title: true } } },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  });

  // If case does not exist or user is blocked by RLS / Ethical Wall, return 404
  if (!caseRecord) {
    notFound();
  }

  const aiData = await getCaseAiData(caseRecord.id, user.id);

  const statuses = await prisma.caseStatus.findMany({
    where: { isActive: true },
    select: { id: true, code: true, label: true },
    orderBy: { displayOrder: "asc" },
  });

  const templates = await prisma.documentTemplate.findMany({
    where: { isActive: true },
    include: {
      versions: {
        where: { isPublished: true },
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  const canEdit =
    user.role === Role.OFFICE_ADMIN ||
    caseRecord.assignments.some((a) => a.user.email === user.email);

  const canApprove =
    user.role === Role.OFFICE_ADMIN ||
    caseRecord.assignments.some(
      (a) => a.user.email === user.email && a.roleInCase === "LEAD_COUNSEL"
    );

  return (
    <AppShell
      user={{
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      }}
      title={`Matter ${caseRecord.caseNumber}`}
    >
      <CaseDetailView
        caseData={{
          ...caseRecord,
          caseFee: caseRecord.fee,
          summaries: aiData.summaries,
          chatMessages: aiData.messages,
          pendingEvents: aiData.pendingEvents,
          templates,
        }}
        statuses={statuses}
        canEdit={canEdit}
        canApprove={canApprove}
      />
    </AppShell>
  );
}
