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
  const tasksRef = React.useRef(tasks);
  const sessionIdRef = React.useRef(0);
  const currentUserIdRef = React.useRef<string | undefined>(currentUserId);
  const latestTaskRequestIdRef = React.useRef(0);
  const lastReconciledCanvasSignatureRef = React.useRef("");

  tasksRef.current = tasks;

  const resetRuntimeState = React.useCallback(() => {
    latestTaskRequestIdRef.current += 1;
    lastReconciledCanvasSignatureRef.current = "";
    tasksRef.current = [];
    setTasks([]);
  }, []);

  const loadTasks = React.useCallback(async (sessionId: number): Promise<Task[]> => {
    const requestId = latestTaskRequestIdRef.current + 1;
    latestTaskRequestIdRef.current = requestId;
    const loadedTasks = await taskRepository.getAll();

    if (
      sessionIdRef.current !== sessionId ||
      latestTaskRequestIdRef.current !== requestId
    ) {
      return tasksRef.current;
    }

    setTasks(loadedTasks);
    return loadedTasks;
  }, []);

  React.useEffect(() => {
    if (authLoading) {
      return;
    }

    const userChanged = currentUserIdRef.current !== currentUserId;
    if (userChanged) {
      currentUserIdRef.current = currentUserId;
      sessionIdRef.current += 1;
      resetRuntimeState();
    }

    if (!currentUserId) {
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const sessionId = sessionIdRef.current;

    async function initializeTasks() {
      resetRuntimeState();
      setIsLoading(true);
      setError(null);

      try {
        await loadTasks(sessionId);
      } catch (initializationError) {
        if (!cancelled && sessionIdRef.current === sessionId) {
          setError(getErrorMessage(initializationError));
        }
      } finally {
        if (!cancelled && sessionIdRef.current === sessionId) {
          setIsLoading(false);
        }
      }
    }

    void initializeTasks();

    return () => {
      cancelled = true;
    };
  }, [authLoading, currentUserId, loadTasks, resetRuntimeState]);

  const refreshTasks = React.useCallback(async (): Promise<Task[]> => {
    const sessionId = sessionIdRef.current;

    try {
      setError(null);
      return await loadTasks(sessionId);
    } catch (refreshError) {
      if (sessionIdRef.current !== sessionId) {
        return tasksRef.current;
      }

      setError(getErrorMessage(refreshError));
      return tasksRef.current;
    }
  }, [loadTasks]);

  const createTask = React.useCallback(async (input: CreateTaskInput): Promise<Task | null> => {
    const sessionId = sessionIdRef.current;

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
      if (sessionIdRef.current !== sessionId) return null;

      setTasks((currentTasks) => [...currentTasks, newTask]);
      return newTask;
    } catch (createError) {
      if (sessionIdRef.current !== sessionId) return null;
      setError(getErrorMessage(createError));
      return null;
    }
  }, []);

  const updateTask = React.useCallback(
    async (taskId: string, updates: UpdateTaskInput): Promise<Task | null> => {
      const sessionId = sessionIdRef.current;

      try {
        setError(null);
        const updatedTask = await taskRepository.update(taskId, updates);
        if (sessionIdRef.current !== sessionId) return null;

        setTasks((currentTasks) =>
          currentTasks.map((task) => (task.id === taskId ? updatedTask : task))
        );
        return updatedTask;
      } catch (updateError) {
        if (sessionIdRef.current !== sessionId) return null;
        setError(getErrorMessage(updateError));
        return null;
      }
    },
    []
  );

  const deleteTask = React.useCallback(async (taskId: string): Promise<boolean> => {
    const sessionId = sessionIdRef.current;

    try {
      setError(null);
      await taskRepository.delete(taskId);
      if (sessionIdRef.current !== sessionId) return false;

      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
      return true;
    } catch (deleteError) {
      if (sessionIdRef.current !== sessionId) return false;
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
      const canvasSignature = [...validCanvasIds].sort().join("|");
      if (lastReconciledCanvasSignatureRef.current === canvasSignature) {
        return;
      }
      lastReconciledCanvasSignatureRef.current = canvasSignature;

      const validCanvasIdSet = new Set(validCanvasIds);
      const hasStaleCanvasLink = tasksRef.current.some(
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
