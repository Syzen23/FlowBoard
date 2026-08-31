import * as React from "react";
import { Task, TaskStatus } from "@/src/types";
import {
  taskRepository,
  TASKS_UPDATED_EVENT,
} from "@/src/features/calendar/repositories/taskRepository";

export interface CreateTaskInput {
  title: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  description?: string;
  status?: TaskStatus;
  canvasId?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  dueDate?: string;
  dueTime?: string;
  description?: string;
  status?: TaskStatus;
  canvasId?: string | null;
}

export function useTaskManager() {
  const [tasks, setTasks] = React.useState<Task[]>(() => {
    return taskRepository.getAll();
  });

  // Listen for storage / custom update events across views
  React.useEffect(() => {
    const handleSync = (e?: Event) => {
      const customEvent = e as CustomEvent<Task[]>;
      if (customEvent && customEvent.detail && Array.isArray(customEvent.detail)) {
        setTasks(customEvent.detail);
      } else {
        setTasks(taskRepository.getAll());
      }
    };

    window.addEventListener(TASKS_UPDATED_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(TASKS_UPDATED_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // Create a new task
  const createTask = React.useCallback((input: CreateTaskInput): Task => {
    const newTask = taskRepository.create({
      title: input.title,
      dueDate: input.dueDate,
      dueTime: input.dueTime,
      description: input.description,
      status: input.status || "todo",
      canvasId: input.canvasId !== undefined ? input.canvasId : null,
    });
    setTasks(taskRepository.getAll());
    return newTask;
  }, []);

  // Update an existing task
  const updateTask = React.useCallback(
    (taskId: string, updates: UpdateTaskInput) => {
      setTasks(taskRepository.update(taskId, updates));
    },
    []
  );

  // Delete a task
  const deleteTask = React.useCallback((taskId: string) => {
    setTasks(taskRepository.delete(taskId));
  }, []);

  // Set task status directly
  const setTaskStatus = React.useCallback(
    (taskId: string, newStatus: TaskStatus) => {
      setTasks((prev) => {
        const updated = prev.map((t) =>
          t.id === taskId
            ? { ...t, status: newStatus, updatedAt: new Date().toISOString() }
            : t
        );
        taskRepository.save(updated);
        return updated;
      });
    },
    []
  );

  // Toggle task status (e.g. todo -> done, done -> todo)
  const toggleTaskStatus = React.useCallback((taskId: string) => {
    setTasks((prev) => {
      const updated = prev.map((t) => {
        if (t.id !== taskId) return t;
        const nextStatus: TaskStatus = t.status === "done" ? "todo" : "done";
        return { ...t, status: nextStatus, updatedAt: new Date().toISOString() };
      });
      taskRepository.save(updated);
      return updated;
    });
  }, []);

  // Filter tasks for a specific date
  const getTasksForDate = React.useCallback(
    (dateStr: string): Task[] => {
      return tasks.filter((t) => t.dueDate === dateStr);
    },
    [tasks]
  );

  // Check if date contains any tasks
  const hasTasksOnDate = React.useCallback(
    (dateStr: string): boolean => {
      return tasks.some((t) => t.dueDate === dateStr);
    },
    [tasks]
  );

  return {
    tasks,
    createTask,
    updateTask,
    deleteTask,
    setTaskStatus,
    toggleTaskStatus,
    getTasksForDate,
    hasTasksOnDate,
  };
}
