import { CanvasWorkspace } from "@/src/types";
import {
  CANVAS_BOARD_BACKGROUND,
  CANVAS_DEFAULT_FILL_COLOR,
  CANVAS_DEFAULT_STROKE_COLOR,
  MAX_CANVASES,
  MIN_CANVASES,
  cleanAppStateForStorage,
  createNewCanvas,
  loadCanvasesFromStorage,
  loadCurrentCanvasIdFromStorage,
  saveCanvasesToStorage,
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
  getAll(): CanvasWorkspace[] {
    return loadCanvasesFromStorage();
  },

  getById(id: string): CanvasWorkspace | null {
    return loadCanvasesFromStorage().find((canvas) => canvas.id === id) || null;
  },

  save(canvases: CanvasWorkspace[]): void {
    saveCanvasesToStorage(canvases);
  },

  create(title: string = "Untitled Canvas"): CanvasWorkspace {
    return createNewCanvas(title);
  },

  update(id: string, updates: Partial<CanvasWorkspace>): CanvasWorkspace[] {
    const updatedCanvases = loadCanvasesFromStorage().map((canvas) =>
      canvas.id === id
        ? { ...canvas, ...updates, id, updatedAt: updates.updatedAt || new Date().toISOString() }
        : canvas
    );
    saveCanvasesToStorage(updatedCanvases);
    return updatedCanvases;
  },

  delete(id: string): CanvasWorkspace[] {
    const updatedCanvases = loadCanvasesFromStorage().filter((canvas) => canvas.id !== id);
    saveCanvasesToStorage(updatedCanvases);
    return updatedCanvases;
  },

  getActiveCanvasId(validCanvasIds: string[]): string {
    return loadCurrentCanvasIdFromStorage(validCanvasIds);
  },

  setActiveCanvasId(id: string): void {
    saveCurrentCanvasIdToStorage(id);
  },
};
