export type TaskStatus = "todo" | "in_progress" | "done";

export type Task = {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  status: TaskStatus;
  canvasId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTaskInput = {
  title?: unknown;
  description?: unknown;
  dueDate?: unknown;
  dueTime?: unknown;
  status?: unknown;
  canvasId?: unknown;
};

export type UpdateTaskInput = {
  title?: unknown;
  description?: unknown;
  dueDate?: unknown;
  dueTime?: unknown;
  status?: unknown;
  canvasId?: unknown;
};
