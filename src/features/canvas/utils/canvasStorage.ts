import { CanvasWorkspace } from "@/src/types";

export const STORAGE_KEY_CANVASES = "flowboard_canvases";
export const STORAGE_KEY_CURRENT_CANVAS = "flowboard_current_canvas";
export const MAX_CANVASES = 3;
export const MIN_CANVASES = 1;
export const CANVAS_BOARD_BACKGROUND = "#141416";
export const CANVAS_DEFAULT_STROKE_COLOR = "#ffffff";
export const CANVAS_DEFAULT_FILL_COLOR = "transparent";

function normalizeToolStrokeColor(color: unknown): string {
  if (
    typeof color !== "string" ||
    color === "#000" ||
    color === "#000000" ||
    color === "#1e1e1e"
  ) {
    return CANVAS_DEFAULT_STROKE_COLOR;
  }

  return color;
}

export function createNewCanvas(title: string = "Untitled Canvas"): CanvasWorkspace {
  const now = new Date().toISOString();
  return {
    id: `canvas-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: title.trim() || "Untitled Canvas",
    sceneData: {
      elements: [],
      appState: {
        viewBackgroundColor: CANVAS_BOARD_BACKGROUND,
        currentItemStrokeColor: CANVAS_DEFAULT_STROKE_COLOR,
        currentItemBackgroundColor: CANVAS_DEFAULT_FILL_COLOR,
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
  const cleaned: Record<string, any> = {
    viewBackgroundColor: CANVAS_BOARD_BACKGROUND,
    currentItemStrokeColor: normalizeToolStrokeColor(appState?.currentItemStrokeColor),
    currentItemBackgroundColor:
      typeof appState?.currentItemBackgroundColor === "string"
        ? appState.currentItemBackgroundColor
        : CANVAS_DEFAULT_FILL_COLOR,
  };

  if (!appState) return cleaned;

  if (
    appState.zoom &&
    typeof appState.zoom === "object" &&
    typeof appState.zoom.value === "number"
  ) {
    cleaned.zoom = appState.zoom;
  }

  if (typeof appState.scrollX === "number") {
    cleaned.scrollX = appState.scrollX;
  }

  if (typeof appState.scrollY === "number") {
    cleaned.scrollY = appState.scrollY;
  }

  if (typeof appState.gridSize === "number") {
    cleaned.gridSize = appState.gridSize;
  }

  if (typeof appState.currentItemRoughness === "number") {
    cleaned.currentItemRoughness = appState.currentItemRoughness;
  }

  if (typeof appState.currentItemOpacity === "number") {
    cleaned.currentItemOpacity = appState.currentItemOpacity;
  }

  if (typeof appState.currentItemFontFamily === "number") {
    cleaned.currentItemFontFamily = appState.currentItemFontFamily;
  }

  if (typeof appState.currentItemFontSize === "number") {
    cleaned.currentItemFontSize = appState.currentItemFontSize;
  }

  return cleaned;
}
