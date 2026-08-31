export type CanvasSceneData = {
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
};

export type Canvas = {
  id: string;
  title: string;
  sceneData: CanvasSceneData;
  createdAt: string;
  updatedAt: string;
};

export type CreateCanvasInput = {
  title?: unknown;
  sceneData?: unknown;
};

export type UpdateCanvasInput = {
  title?: unknown;
  sceneData?: unknown;
};
