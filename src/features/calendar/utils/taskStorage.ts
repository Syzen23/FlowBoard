import { Task, TaskStatus } from "@/src/types";

export const TASK_STORAGE_KEY = "flowboard_tasks";
export const TASKS_UPDATED_EVENT = "flowboard_tasks_updated";

export const INITIAL_SAMPLE_TASKS: Task[] = [
  {
    id: "t-sample-1",
    title: "Bikin konsep API",
    description: "Map API routes and data contracts in Canvas before building server endpoints.",
    dueDate: "2026-08-25",
    dueTime: "10:00",
    status: "in_progress",
    canvasId: "1",
    createdAt: "2026-08-25T08:00:00.000Z",
    updatedAt: "2026-08-25T08:00:00.000Z",
  },
  {
    id: "t-sample-2",
    title: "Frontend prototype integration review",
    description: "Review prototype interaction flows and verify calendar state transitions.",
    dueDate: "2026-08-25",
    dueTime: "14:30",
    status: "todo",
    canvasId: "1",
    createdAt: "2026-08-25T09:00:00.000Z",
    updatedAt: "2026-08-25T09:00:00.000Z",
  },
  {
    id: "t-sample-3",
    title: "Research Excalidraw integration",
    description: "Study @excalidraw/excalidraw packages and canvas persistence.",
    dueDate: "2026-08-26",
    dueTime: "11:00",
    status: "todo",
    canvasId: "2",
    createdAt: "2026-08-25T10:00:00.000Z",
    updatedAt: "2026-08-25T10:00:00.000Z",
  },
  {
    id: "t-sample-4",
    title: "Calendar Day Task Panel UX polish",
    description: "Ensure date selection and task list responsiveness match PRD specs.",
    dueDate: "2026-08-29",
    dueTime: "16:00",
    status: "done",
    canvasId: null,
    createdAt: "2026-08-26T10:00:00.000Z",
    updatedAt: "2026-08-29T07:00:00.000Z",
  },
];

export function loadTasksFromStorage(): Task[] {
  if (typeof window === "undefined") {
    return INITIAL_SAMPLE_TASKS;
  }

  try {
    const raw = localStorage.getItem(TASK_STORAGE_KEY);
    if (!raw) {
      // Seed initial tasks if nothing exists in localStorage
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_TASKS));
      return INITIAL_SAMPLE_TASKS;
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return INITIAL_SAMPLE_TASKS;
  } catch (error) {
    console.error("Failed to load tasks from localStorage:", error);
    return INITIAL_SAMPLE_TASKS;
  }
}

export function saveTasksToStorage(tasks: Task[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
    window.dispatchEvent(new CustomEvent(TASKS_UPDATED_EVENT, { detail: tasks }));
  } catch (error) {
    console.error("Failed to save tasks to localStorage:", error);
  }
}

export function addTaskToStorage(taskData: {
  title: string;
  dueDate: string;
  dueTime?: string;
  description?: string;
  status?: TaskStatus;
  canvasId?: string | null;
}): Task {
  const tasks = loadTasksFromStorage();
  const now = new Date().toISOString();
  const newTask: Task = {
    id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: taskData.title.trim(),
    description: taskData.description?.trim() || undefined,
    dueDate: taskData.dueDate,
    dueTime: taskData.dueTime || undefined,
    status: taskData.status || "todo",
    canvasId: taskData.canvasId !== undefined ? taskData.canvasId : null,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [...tasks, newTask];
  saveTasksToStorage(updated);
  return newTask;
}

export function unlinkTasksForCanvas(canvasId: string): void {
  if (typeof window === "undefined" || !canvasId) return;
  try {
    const tasks = loadTasksFromStorage();
    let hasChanges = false;
    const updated = tasks.map((task) => {
      if (task.canvasId === canvasId) {
        hasChanges = true;
        return {
          ...task,
          canvasId: null,
          updatedAt: new Date().toISOString(),
        };
      }
      return task;
    });

    if (hasChanges) {
      saveTasksToStorage(updated);
    }
  } catch (error) {
    console.error("Failed to unlink tasks for canvas:", error);
  }
}
