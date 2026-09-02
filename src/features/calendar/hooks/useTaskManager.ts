import * as React from "react";
import { Task, TaskStatus } from "@/src/types";
import { useAuth } from "@/src/features/auth/AuthContext";
import { taskRepository } from "@/src/features/calendar/repositories/taskRepository";

export interface CreateTaskInput {
  title: string;
  dueDate: string;
  dueTime?: string;
  description?: string;
  status?: TaskStatus;
  canvasId?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  dueDate?: string;
  dueTime?: string | null;
  description?: string | null;
  status?: TaskStatus;
  canvasId?: string | null;
}

export function useTaskManager() {
  const { currentUser, loading: authLoading } = useAuth();
  const currentUserId = currentUser?.uid;
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadTasks = React.useCallback(async (): Promise<Task[]> => {
    const loadedTasks = await taskRepository.getAll();
    setTasks(loadedTasks);
    return loadedTasks;
  }, []);

  React.useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!currentUserId) {
      setTasks([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function initializeTasks() {
      setIsLoading(true);
      setError(null);

      try {
        const loadedTasks = await taskRepository.getAll();
        if (!cancelled) {
          setTasks(loadedTasks);
        }
      } catch (initializationError) {
        if (!cancelled) {
          setError(getErrorMessage(initializationError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void initializeTasks();

    return () => {
      cancelled = true;
    };
  }, [authLoading, currentUserId]);

  const refreshTasks = React.useCallback(async (): Promise<Task[]> => {
    try {
      setError(null);
      return await loadTasks();
    } catch (refreshError) {
      setError(getErrorMessage(refreshError));
      return tasks;
    }
  }, [loadTasks, tasks]);

  const createTask = React.useCallback(async (input: CreateTaskInput): Promise<Task | null> => {
    try {
      setError(null);
      const newTask = await taskRepository.create({
        title: input.title,
        dueDate: input.dueDate,
        dueTime: input.dueTime,
        description: input.description,
        status: input.status || "todo",
        canvasId: input.canvasId !== undefined ? input.canvasId : null,
      });
      setTasks((currentTasks) => [...currentTasks, newTask]);
      return newTask;
    } catch (createError) {
      setError(getErrorMessage(createError));
      return null;
    }
  }, []);

  const updateTask = React.useCallback(
    async (taskId: string, updates: UpdateTaskInput): Promise<Task | null> => {
      try {
        setError(null);
        const updatedTask = await taskRepository.update(taskId, updates);
        setTasks((currentTasks) =>
          currentTasks.map((task) => (task.id === taskId ? updatedTask : task))
        );
        return updatedTask;
      } catch (updateError) {
        setError(getErrorMessage(updateError));
        return null;
      }
    },
    []
  );

  const deleteTask = React.useCallback(async (taskId: string): Promise<boolean> => {
    try {
      setError(null);
      await taskRepository.delete(taskId);
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
      return true;
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
      return false;
    }
  }, []);

  const setTaskStatus = React.useCallback(
    (taskId: string, newStatus: TaskStatus) => {
      void updateTask(taskId, { status: newStatus });
    },
    [updateTask]
  );

  const toggleTaskStatus = React.useCallback(
    (taskId: string) => {
      const task = tasks.find((currentTask) => currentTask.id === taskId);
      if (!task) return;

      const nextStatus: TaskStatus = task.status === "done" ? "todo" : "done";
      void updateTask(taskId, { status: nextStatus });
    },
    [tasks, updateTask]
  );

  const reconcileDeletedCanvasLinks = React.useCallback(
    async (validCanvasIds: string[]): Promise<void> => {
      const validCanvasIdSet = new Set(validCanvasIds);
      const hasStaleCanvasLink = tasks.some(
        (task) => task.canvasId && !validCanvasIdSet.has(task.canvasId)
      );

      if (hasStaleCanvasLink) {
        await refreshTasks();
      }
    },
    [refreshTasks, tasks]
  );

  const getTasksForDate = React.useCallback(
    (dateStr: string): Task[] => {
      return tasks.filter((task) => task.dueDate === dateStr);
    },
    [tasks]
  );

  const hasTasksOnDate = React.useCallback(
    (dateStr: string): boolean => {
      return tasks.some((task) => task.dueDate === dateStr);
    },
    [tasks]
  );

  return {
    tasks,
    isLoading,
    error,
    refreshTasks,
    createTask,
    updateTask,
    deleteTask,
    setTaskStatus,
    toggleTaskStatus,
    reconcileDeletedCanvasLinks,
    getTasksForDate,
    hasTasksOnDate,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Task persistence failed";
}
