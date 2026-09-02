import type { Task, TaskStatus } from "@/src/types";
import { apiClient } from "@/src/lib/apiClient";

export interface CreateTaskData {
  title: string;
  dueDate: string;
  dueTime?: string;
  description?: string;
  status?: TaskStatus;
  canvasId?: string | null;
}

export interface UpdateTaskData {
  title?: string;
  dueDate?: string;
  dueTime?: string | null;
  description?: string | null;
  status?: TaskStatus;
  canvasId?: string | null;
}

export const taskRepository = {
  getAll(): Promise<Task[]> {
    return apiClient.get<Task[]>("/tasks");
  },

  getById(id: string): Promise<Task> {
    return apiClient.get<Task>(`/tasks/${id}`);
  },

  create(taskData: CreateTaskData): Promise<Task> {
    return apiClient.post<Task, CreateTaskData>("/tasks", {
      ...taskData,
      status: taskData.status || "todo",
      canvasId: taskData.canvasId !== undefined ? taskData.canvasId : null,
    });
  },

  update(taskId: string, updates: UpdateTaskData): Promise<Task> {
    return apiClient.patch<Task, UpdateTaskData>(`/tasks/${taskId}`, updates);
  },

  delete(taskId: string): Promise<void> {
    return apiClient.delete(`/tasks/${taskId}`);
  },
};
