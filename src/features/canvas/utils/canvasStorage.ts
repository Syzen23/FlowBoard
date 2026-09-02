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

export function cleanAppStateForStorage(appState: unknown): Record<string, unknown> {
  const appStateRecord = isRecord(appState) ? appState : undefined;
  const cleaned: Record<string, unknown> = {
    viewBackgroundColor: CANVAS_BOARD_BACKGROUND,
    currentItemStrokeColor: normalizeToolStrokeColor(appStateRecord?.currentItemStrokeColor),
    currentItemBackgroundColor:
      typeof appStateRecord?.currentItemBackgroundColor === "string"
        ? appStateRecord.currentItemBackgroundColor
        : CANVAS_DEFAULT_FILL_COLOR,
  };

  if (!appStateRecord) return cleaned;

  if (
    isRecord(appStateRecord.zoom) &&
    typeof appStateRecord.zoom.value === "number"
  ) {
    cleaned.zoom = appStateRecord.zoom;
  }

  if (typeof appStateRecord.scrollX === "number") {
    cleaned.scrollX = appStateRecord.scrollX;
  }

  if (typeof appStateRecord.scrollY === "number") {
    cleaned.scrollY = appStateRecord.scrollY;
  }

  if (typeof appStateRecord.gridSize === "number") {
    cleaned.gridSize = appStateRecord.gridSize;
  }

  if (typeof appStateRecord.currentItemRoughness === "number") {
    cleaned.currentItemRoughness = appStateRecord.currentItemRoughness;
  }

  if (typeof appStateRecord.currentItemOpacity === "number") {
    cleaned.currentItemOpacity = appStateRecord.currentItemOpacity;
  }

  if (typeof appStateRecord.currentItemFontFamily === "number") {
    cleaned.currentItemFontFamily = appStateRecord.currentItemFontFamily;
  }

  if (typeof appStateRecord.currentItemFontSize === "number") {
    cleaned.currentItemFontSize = appStateRecord.currentItemFontSize;
  }

  return cleaned;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
