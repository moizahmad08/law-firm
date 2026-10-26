import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/database/client";
import { withUserContext } from "@/lib/database/context";
import {
  createTask,
  updateTaskStatus,
  getUserTasks,
} from "@/lib/tasks/service";
import { TaskPriority, TaskStatus, Role } from "@prisma/client";

describe("Milestone 3D: Task Management & Case Linkage Suite", () => {
  let officeAdminId: string;
  let counselAlphaId: string;
  let counselBetaId: string;
  let generalCaseId: string;
  let restrictedCaseId: string;

  beforeAll(async () => {
    const officeAdmin = await prisma.user.findFirstOrThrow({
      where: { role: Role.OFFICE_ADMIN },
    });
    const counselAlpha = await prisma.user.findFirstOrThrow({
      where: { email: "counsel.alpha@lawfirm.local" },
    });
    const counselBeta = await prisma.user.findFirstOrThrow({
      where: { email: "counsel.beta@lawfirm.local" },
    });

    officeAdminId = officeAdmin.id;
    counselAlphaId = counselAlpha.id;
    counselBetaId = counselBeta.id;

    const generalCase = await withUserContext(counselAlphaId, async (tx) => {
      return await tx.case.findFirstOrThrow({
        where: { caseNumber: "WP-101/2026" },
      });
    });

    const restrictedCase = await withUserContext(counselBetaId, async (tx) => {
      return await tx.case.findFirstOrThrow({
        where: { caseNumber: "CS-202/2026", isRestricted: true },
      });
    });

    generalCaseId = generalCase.id;
    restrictedCaseId = restrictedCase.id;
  });

  describe("1. Task Creation & RLS Isolation", () => {
    let alphaTaskId: string;
    let betaTaskId: string;

    it("Creates task linked to WP-101 with due date and priority", async () => {
      const task = await createTask({
        caseId: generalCaseId,
        title: "Draft Rejoinder to Federation Reply",
        description: "Review preliminary objections raised by Deputy Attorney General.",
        priority: TaskPriority.HIGH,
        dueDate: new Date("2026-11-10T17:00:00+05:00"),
        assignedToUserId: counselAlphaId,
        createdById: counselAlphaId,
      });

      expect(task.id).toBeDefined();
      expect(task.priority).toBe(TaskPriority.HIGH);
      expect(task.status).toBe(TaskStatus.PENDING);
      alphaTaskId = task.id;
    });

    it("Creates task linked to restricted case CS-202", async () => {
      const task = await createTask({
        caseId: restrictedCaseId,
        title: "Prepare Cross-Examination Questions",
        description: "Confidential witness examination strategy.",
        priority: TaskPriority.URGENT,
        assignedToUserId: counselBetaId,
        createdById: counselBetaId,
      });

      expect(task.id).toBeDefined();
      betaTaskId = task.id;
    });

    it("ETHICAL WALL RLS: Counsel Alpha cannot see tasks belonging to restricted case CS-202", async () => {
      const tasks = await withUserContext(counselAlphaId, async (tx) => {
        return await tx.task.findMany({
          where: { id: betaTaskId },
        });
      });

      expect(tasks).toHaveLength(0);
    });

    it("ETHICAL WALL RLS: Office Admin cannot see tasks belonging to restricted case CS-202", async () => {
      const tasks = await withUserContext(officeAdminId, async (tx) => {
        return await tx.task.findMany({
          where: { id: betaTaskId },
        });
      });

      expect(tasks).toHaveLength(0);
    });

    it("Retrieves tasks list for Counsel Alpha", async () => {
      const tasks = await getUserTasks({
        userId: counselAlphaId,
      });

      expect(tasks.length).toBeGreaterThanOrEqual(1);
      const match = tasks.find((t) => t.id === alphaTaskId);
      expect(match).toBeDefined();
      expect(match?.case?.caseNumber).toBe("WP-101/2026");
    });
  });

  describe("2. Task Lifecycle & Completion Audit", () => {
    it("Updates task status to COMPLETED and records completion timestamp", async () => {
      const task = await withUserContext(counselAlphaId, async (tx) => {
        return await tx.task.findFirstOrThrow({
          where: { caseId: generalCaseId },
        });
      });

      const updated = await updateTaskStatus({
        taskId: task.id,
        status: TaskStatus.COMPLETED,
        userId: counselAlphaId,
      });

      expect(updated.status).toBe(TaskStatus.COMPLETED);
      expect(updated.completionDate).not.toBeNull();

      // Verify audit trail
      const audit = await prisma.auditEvent.findFirst({
        where: {
          action: "TASK_STATUS_UPDATED",
          userId: counselAlphaId,
        },
        orderBy: { createdAt: "desc" },
      });
      expect(audit).not.toBeNull();
    });
  });
});
