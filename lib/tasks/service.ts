import { withUserContext } from "@/lib/database/context";
import { recordAuthAudit } from "@/lib/auth/audit";
import { TaskPriority, TaskStatus } from "@prisma/client";

export interface CreateTaskInput {
  caseId?: string | null;
  hearingId?: string | null;
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: Date | string | null;
  assignedToUserId?: string | null;
  createdById: string;
}

export interface UpdateTaskStatusInput {
  taskId: string;
  status: TaskStatus;
  userId: string;
}

/**
 * Creates a new task under user context.
 */
export async function createTask(input: CreateTaskInput) {
  const dueDate = input.dueDate ? new Date(input.dueDate) : null;

  return await withUserContext(input.createdById, async (tx) => {
    const task = await tx.task.create({
      data: {
        caseId: input.caseId || null,
        hearingId: input.hearingId || null,
        title: input.title.trim(),
        description: input.description?.trim(),
        priority: input.priority || TaskPriority.MEDIUM,
        dueDate,
        assignedToUserId: input.assignedToUserId || null,
        createdById: input.createdById,
        status: TaskStatus.PENDING,
      },
    });

    await recordAuthAudit({
      userId: input.createdById,
      action: "TASK_CREATED",
      metadata: {
        taskId: task.id,
        caseId: input.caseId,
        title: input.title,
        priority: task.priority,
        assignedTo: input.assignedToUserId,
      },
    });

    return task;
  });
}

/**
 * Updates task status (e.g. to COMPLETED or IN_PROGRESS).
 */
export async function updateTaskStatus(input: UpdateTaskStatusInput) {
  return await withUserContext(input.userId, async (tx) => {
    const existing = await tx.task.findUnique({
      where: { id: input.taskId },
    });

    if (!existing) {
      throw new Error("Task record not found or access denied.");
    }

    const completionDate = input.status === TaskStatus.COMPLETED ? new Date() : null;

    const updated = await tx.task.update({
      where: { id: input.taskId },
      data: {
        status: input.status,
        completionDate,
        updatedAt: new Date(),
      },
    });

    await recordAuthAudit({
      userId: input.userId,
      action: "TASK_STATUS_UPDATED",
      metadata: {
        taskId: updated.id,
        oldStatus: existing.status,
        newStatus: input.status,
      },
    });

    return updated;
  });
}

/**
 * Retrieves tasks accessible to the current user under RLS.
 */
export async function getUserTasks({
  userId,
  status,
}: {
  userId: string;
  status?: TaskStatus;
}) {
  return await withUserContext(userId, async (tx) => {
    return await tx.task.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status } : {}),
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            court: true,
            isRestricted: true,
          },
        },
        assignedToUser: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    });
  });
}
