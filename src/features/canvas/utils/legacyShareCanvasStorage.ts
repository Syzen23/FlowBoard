import type { CanvasWorkspace } from "@/src/types";
import {
  CANVAS_BOARD_BACKGROUND,
  CANVAS_DEFAULT_FILL_COLOR,
  CANVAS_DEFAULT_STROKE_COLOR,
} from "@/src/features/canvas/utils/canvasStorage";

export const LEGACY_SHARE_CANVASES_STORAGE_KEY = "flowboard_canvases";

function createLegacyShareCanvas(title: string = "Untitled Canvas"): CanvasWorkspace {
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

export function loadLegacyShareCanvasesFromStorage(): CanvasWorkspace[] {
  if (typeof window === "undefined") return [createLegacyShareCanvas("Untitled Canvas")];

  try {
    const raw = localStorage.getItem(LEGACY_SHARE_CANVASES_STORAGE_KEY);
    if (!raw) {
      const initial = [createLegacyShareCanvas("Untitled Canvas")];
      saveLegacyShareCanvasesToStorage(initial);
      return initial;
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }

    const fallback = [createLegacyShareCanvas("Untitled Canvas")];
    saveLegacyShareCanvasesToStorage(fallback);
    return fallback;
  } catch (err) {
    console.error("Failed to load legacy share canvases from localStorage:", err);
    const fallback = [createLegacyShareCanvas("Untitled Canvas")];
    saveLegacyShareCanvasesToStorage(fallback);
    return fallback;
  }
}

export function saveLegacyShareCanvasesToStorage(canvases: CanvasWorkspace[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(LEGACY_SHARE_CANVASES_STORAGE_KEY, JSON.stringify(canvases));
  } catch (err) {
    console.error("Failed to save legacy share canvases to localStorage:", err);
  }
}
