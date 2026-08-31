import { CANVAS_BOARD_BACKGROUND, cleanAppStateForStorage } from "@/src/features/canvas/utils/canvasStorage";

type ExcalidrawAPI = {
  updateScene: (scene: Record<string, unknown>) => void;
  history?: {
    clear?: () => void;
  };
};

type FlowBoardSceneData = {
  elements?: unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
};

type FlowBoardAppStateOptions = {
  viewModeEnabled?: boolean;
};

type ApplySceneOptions = FlowBoardAppStateOptions & {
  clearHistory?: boolean;
};

export { CANVAS_BOARD_BACKGROUND };

export function createFlowBoardAppState(
  appState?: unknown,
  options: FlowBoardAppStateOptions = {}
): Record<string, unknown> {
  return {
    ...cleanAppStateForStorage(appState),
    theme: "dark",
    viewBackgroundColor: CANVAS_BOARD_BACKGROUND,
    ...(options.viewModeEnabled !== undefined
      ? { viewModeEnabled: options.viewModeEnabled }
      : {}),
  };
}

export function normalizeSceneForStorage(
  elements: readonly unknown[] = [],
  appState?: unknown,
  files: unknown = {}
): FlowBoardSceneData {
  return {
    elements: [...elements],
    appState: cleanAppStateForStorage(appState),
    files: isRecord(files) ? files : {},
  };
}

export function createScenePayload(
  sceneData?: FlowBoardSceneData,
  options: FlowBoardAppStateOptions = {}
): Record<string, unknown> {
  return {
    elements: sceneData?.elements || [],
    appState: createFlowBoardAppState(sceneData?.appState, options),
    files: sceneData?.files || {},
  };
}

export function applySceneToExcalidraw(
  excalidrawAPI: ExcalidrawAPI | null | undefined,
  sceneData?: FlowBoardSceneData,
  options: ApplySceneOptions = {}
): void {
  if (!excalidrawAPI) return;

  excalidrawAPI.updateScene(createScenePayload(sceneData, options));

  if (options.clearHistory && excalidrawAPI.history?.clear) {
    excalidrawAPI.history.clear();
  }
}

export function applyAppStateToExcalidraw(
  excalidrawAPI: ExcalidrawAPI | null | undefined,
  appState?: unknown,
  options: FlowBoardAppStateOptions = {}
): void {
  if (!excalidrawAPI) return;

  excalidrawAPI.updateScene({
    appState: createFlowBoardAppState(appState, options),
  });
}

export function hasFlowBoardCanvasBackground(appState?: unknown): boolean {
  return isRecord(appState) && appState.viewBackgroundColor === CANVAS_BOARD_BACKGROUND;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
