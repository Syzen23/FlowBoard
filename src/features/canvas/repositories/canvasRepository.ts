import type { CanvasWorkspace } from "@/src/types";
import { apiClient } from "@/src/lib/apiClient";
import {
  CANVAS_BOARD_BACKGROUND,
  CANVAS_DEFAULT_FILL_COLOR,
  CANVAS_DEFAULT_STROKE_COLOR,
  MAX_CANVASES,
  MIN_CANVASES,
  cleanAppStateForStorage,
  loadCurrentCanvasIdFromStorage,
  saveCurrentCanvasIdToStorage,
} from "@/src/features/canvas/utils/canvasStorage";

export {
  CANVAS_BOARD_BACKGROUND,
  CANVAS_DEFAULT_FILL_COLOR,
  CANVAS_DEFAULT_STROKE_COLOR,
  MAX_CANVASES,
  MIN_CANVASES,
  cleanAppStateForStorage,
};

export const canvasRepository = {
  getAll(): Promise<CanvasWorkspace[]> {
    return apiClient.get<CanvasWorkspace[]>("/canvases");
  },

  getById(id: string): Promise<CanvasWorkspace> {
    return apiClient.get<CanvasWorkspace>(`/canvases/${id}`);
  },

  create(title: string = "Untitled Canvas"): Promise<CanvasWorkspace> {
    return apiClient.post<CanvasWorkspace, { title: string }>("/canvases", {
      title: title.trim() || "Untitled Canvas",
    });
  },

  update(
    id: string,
    updates: Partial<Pick<CanvasWorkspace, "title" | "sceneData">>
  ): Promise<CanvasWorkspace> {
    return apiClient.patch<CanvasWorkspace, Partial<Pick<CanvasWorkspace, "title" | "sceneData">>>(
      `/canvases/${id}`,
      updates
    );
  },

  delete(id: string): Promise<void> {
    return apiClient.delete(`/canvases/${id}`);
  },

  getActiveCanvasId(validCanvasIds: string[]): string {
    return loadCurrentCanvasIdFromStorage(validCanvasIds);
  },

  setActiveCanvasId(id: string): void {
    saveCurrentCanvasIdToStorage(id);
  },
};
