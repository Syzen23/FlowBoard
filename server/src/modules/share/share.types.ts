import type { CanvasSceneData } from "../canvas/canvas.types.js";

export type SharePermission = "view" | "edit";

export type CanvasShare = {
  id: string;
  canvasId: string;
  token: string;
  permission: SharePermission;
  createdAt: string;
  updatedAt: string;
};

export type SharedCanvas = {
  id: string;
  title: string;
  sceneData: CanvasSceneData;
  sceneRevision: number;
  updatedAt: string;
};

export type SharedCanvasPayload = {
  canvas: SharedCanvas;
  permission: SharePermission;
};

export type RealtimeShareAccess = {
  shareId: string;
  canvas: SharedCanvas;
  permission: SharePermission;
};

export type UpdateShareInput = {
  permission?: unknown;
};

export type UpdateSharedCanvasInput = {
  sceneData?: unknown;
};
