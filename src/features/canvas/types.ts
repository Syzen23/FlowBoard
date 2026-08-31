import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";

export type FlowBoardExcalidrawAPI = ExcalidrawImperativeAPI;
export type FlowBoardCanvasElement = OrderedExcalidrawElement;
export type FlowBoardCanvasAppState = Partial<AppState>;
export type FlowBoardCanvasFiles = BinaryFiles;
export type FlowBoardInitialScene = ExcalidrawInitialDataState;

export type FlowBoardSceneData = {
  elements?: unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
};
