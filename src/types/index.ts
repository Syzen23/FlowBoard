import type { FlowBoardSceneData } from "@/src/features/canvas/types";

export type RouteMode = "canvas" | "calendar";

export type TaskStatus = "todo" | "in_progress" | "done";

export type CanvasWorkspace = {
  id: string;
  title: string;
  sceneData?: FlowBoardSceneData;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  status: TaskStatus;
  canvasId?: string | null;
  createdAt: string;
  updatedAt: string;
};
