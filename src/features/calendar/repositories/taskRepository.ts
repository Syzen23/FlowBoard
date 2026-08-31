import type { Task, TaskStatus } from "@/src/types";
import {
  TASKS_UPDATED_EVENT,
  addTaskToStorage,
  loadTasksFromStorage,
  saveTasksToStorage,
  unlinkTasksForCanvas,
} from "@/src/features/calendar/utils/taskStorage";

export { TASKS_UPDATED_EVENT };

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
  dueTime?: string;
  description?: string;
  status?: TaskStatus;
  canvasId?: string | null;
}

export const taskRepository = {
  getAll(): Task[] {
    return loadTasksFromStorage();
  },

  save(tasks: Task[]): void {
    saveTasksToStorage(tasks);
  },

  create(taskData: CreateTaskData): Task {
    return addTaskToStorage(taskData);
  },

  update(taskId: string, updates: UpdateTaskData): Task[] {
    const updatedTasks = loadTasksFromStorage().map((task) => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
        ...(updates.dueDate !== undefined ? { dueDate: updates.dueDate } : {}),
        ...(updates.dueTime !== undefined ? { dueTime: updates.dueTime || undefined } : {}),
        ...(updates.description !== undefined
          ? { description: updates.description.trim() || undefined }
          : {}),
        ...(updates.status !== undefined ? { status: updates.status } : {}),
        ...(updates.canvasId !== undefined ? { canvasId: updates.canvasId } : {}),
        updatedAt: new Date().toISOString(),
      };
    });
    saveTasksToStorage(updatedTasks);
    return updatedTasks;
  },

  delete(taskId: string): Task[] {
    const updatedTasks = loadTasksFromStorage().filter((task) => task.id !== taskId);
    saveTasksToStorage(updatedTasks);
    return updatedTasks;
  },

  unlinkCanvas(canvasId: string): void {
    unlinkTasksForCanvas(canvasId);
  },
};
