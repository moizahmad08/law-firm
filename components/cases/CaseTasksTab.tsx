"use client";

import React, { useState, useTransition } from "react";
import {
  CheckSquare,
  Square,
  Plus,
  Clock,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  User,
} from "lucide-react";
import { createTaskAction, updateTaskStatusAction } from "@/lib/tasks/actions";
import { TaskPriority, TaskStatus } from "@prisma/client";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date | string | null;
  completionDate: Date | string | null;
  assignedToUser?: { id: string; fullName: string; role: string } | null;
}

interface CaseTasksTabProps {
  caseId: string;
  tasks: TaskItem[];
  canEdit: boolean;
  chambersUsers?: Array<{ id: string; fullName: string; role: string }>;
}

export function CaseTasksTab({
  caseId,
  tasks,
  canEdit,
  chambersUsers = [],
}: CaseTasksTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("caseId", caseId);

    startTransition(async () => {
      const res = await createTaskAction(formData);
      if (res.success) {
        setMessage({ text: "Task created successfully.", type: "success" });
        setIsCreateOpen(false);
      } else {
        setMessage({ text: res.error || "Failed to create task", type: "error" });
      }
    });
  };

  const handleToggleComplete = (task: TaskItem) => {
    const nextStatus = task.status === "COMPLETED" ? TaskStatus.PENDING : TaskStatus.COMPLETED;

    startTransition(async () => {
      const res = await updateTaskStatusAction(task.id, nextStatus, caseId);
      if (!res.success) {
        setMessage({ text: res.error || "Failed to update task", type: "error" });
      }
    });
  };

  const formatDueDate = (d: Date | string) => {
    try {
      return new Intl.DateTimeFormat("en-PK", {
        timeZone: "Asia/Karachi",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(d));
    } catch {
      return new Date(d).toLocaleDateString();
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-400" />
            <span>Case Tasks & Preparation Deadlines</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Internal litigation assignments, rejoinder drafting, witness interviews, and procedural filings.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors shadow-lg shadow-amber-500/10 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        )}
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl border flex items-center space-x-2 text-xs ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-2.5">
        {tasks.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
            No active tasks linked to this case. Click &ldquo;Create Task&rdquo; to assign research or drafting.
          </div>
        ) : (
          tasks.map((task) => {
            const isCompleted = task.status === "COMPLETED";

            return (
              <div
                key={task.id}
                className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                  isCompleted
                    ? "bg-slate-950/40 border-slate-800/60 opacity-60"
                    : "bg-slate-900 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start space-x-3 min-w-0 flex-1">
                  <button
                    onClick={() => handleToggleComplete(task)}
                    disabled={isPending}
                    className="mt-0.5 text-slate-400 hover:text-amber-400 transition-colors"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold text-white ${
                        isCompleted ? "line-through text-slate-400" : ""
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400">
                      {task.dueDate && (
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Due {formatDueDate(task.dueDate)}</span>
                        </span>
                      )}

                      {task.assignedToUser && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span>{task.assignedToUser.fullName}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      task.priority === "URGENT"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        : task.priority === "HIGH"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Task Modal */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-amber-400" />
              <span>Create Litigation Task</span>
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Task Title *
                </label>
                <input
                  name="title"
                  required
                  placeholder="e.g. Draft Rejoinder to Civil Miscellaneous Application"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description / Specific Instructions
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Detail citations to include, facts to verify with client..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    name="priority"
                    defaultValue="MEDIUM"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Create Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
