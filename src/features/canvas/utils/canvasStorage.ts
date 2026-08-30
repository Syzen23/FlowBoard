import { CanvasWorkspace } from "@/src/types";

export const STORAGE_KEY_CANVASES = "flowboard_canvases";
export const STORAGE_KEY_CURRENT_CANVAS = "flowboard_current_canvas";
export const MAX_CANVASES = 3;
export const MIN_CANVASES = 1;

export function createNewCanvas(title: string = "Untitled Canvas"): CanvasWorkspace {
  const now = new Date().toISOString();
  return {
    id: `canvas-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: title.trim() || "Untitled Canvas",
    sceneData: {
      elements: [],
      appState: {
        viewBackgroundColor: "#141416",
      },
      files: {},
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function loadCanvasesFromStorage(): CanvasWorkspace[] {
  if (typeof window === "undefined") return [createNewCanvas("Untitled Canvas")];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CANVASES);
    if (!raw) {
      const initial = [createNewCanvas("Untitled Canvas")];
      saveCanvasesToStorage(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    const fallback = [createNewCanvas("Untitled Canvas")];
    saveCanvasesToStorage(fallback);
    return fallback;
  } catch (err) {
    console.error("Failed to load canvases from localStorage:", err);
    const fallback = [createNewCanvas("Untitled Canvas")];
    saveCanvasesToStorage(fallback);
    return fallback;
  }
}

export function saveCanvasesToStorage(canvases: CanvasWorkspace[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_CANVASES, JSON.stringify(canvases));
  } catch (err) {
    console.error("Failed to save canvases to localStorage:", err);
  }
}

export function loadCurrentCanvasIdFromStorage(validCanvasIds: string[]): string {
  if (typeof window === "undefined") return validCanvasIds[0] || "";
  try {
    const savedId = localStorage.getItem(STORAGE_KEY_CURRENT_CANVAS);
    if (savedId && validCanvasIds.includes(savedId)) {
      return savedId;
    }
  } catch (err) {
    console.error("Failed to load current canvas ID from localStorage:", err);
  }
  const defaultId = validCanvasIds[0] || "";
  if (defaultId) {
    saveCurrentCanvasIdToStorage(defaultId);
  }
  return defaultId;
}

export function saveCurrentCanvasIdToStorage(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_CURRENT_CANVAS, id);
  } catch (err) {
    console.error("Failed to save current canvas ID to localStorage:", err);
  }
}

export function cleanAppStateForStorage(appState: any): Record<string, any> {
  if (!appState) return {};
  return {
    viewBackgroundColor: appState.viewBackgroundColor || "#141416",
    zoom: appState.zoom,
    scrollX: appState.scrollX,
    scrollY: appState.scrollY,
    gridSize: appState.gridSize,
  };
}
