"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { createTask, updateTaskStatus } from "@/lib/tasks/service";
import { TaskPriority, TaskStatus } from "@prisma/client";

export async function createTaskAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const caseId = (formData.get("caseId") as string) || null;
  const hearingId = (formData.get("hearingId") as string) || null;
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  const priority = (formData.get("priority") as TaskPriority) || TaskPriority.MEDIUM;
  const dueDate = (formData.get("dueDate") as string) || null;
  const assignedToUserId = (formData.get("assignedToUserId") as string) || null;

  if (!title) {
    return { success: false, error: "Task title is required." };
  }

  try {
    await createTask({
      caseId,
      hearingId,
      title,
      description,
      priority,
      dueDate,
      assignedToUserId,
      createdById: user.id,
    });

    if (caseId) {
      revalidatePath(`/cases/${caseId}`);
    }
    revalidatePath("/");
    return { success: true, message: "Task created successfully." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create task." };
  }
}

export async function updateTaskStatusAction(taskId: string, status: TaskStatus, caseId?: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await updateTaskStatus({
      taskId,
      status,
      userId: user.id,
    });

    if (caseId) {
      revalidatePath(`/cases/${caseId}`);
    }
    revalidatePath("/");
    return { success: true, message: `Task status updated to ${status}.` };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update task status." };
  }
}
