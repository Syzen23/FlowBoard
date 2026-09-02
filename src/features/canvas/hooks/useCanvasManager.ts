import * as React from "react";
import { CanvasWorkspace } from "@/src/types";
import {
  MAX_CANVASES,
  MIN_CANVASES,
  canvasRepository,
} from "@/src/features/canvas/repositories/canvasRepository";
import {
  applySceneToExcalidraw,
  createFlowBoardAppState,
  normalizeSceneForStorage,
} from "@/src/features/canvas/adapters/canvasSceneAdapter";
import { useAuth } from "@/src/features/auth/AuthContext";
import type {
  FlowBoardCanvasAppState,
  FlowBoardCanvasElement,
  FlowBoardCanvasFiles,
  FlowBoardExcalidrawAPI,
} from "@/src/features/canvas/types";

export type SaveStatus = "saved" | "saving" | "error";

type PendingScene = {
  elements: readonly FlowBoardCanvasElement[];
  appState: FlowBoardCanvasAppState;
  files: FlowBoardCanvasFiles;
};

const initializationRequests = new Map<string, Promise<CanvasWorkspace[]>>();

const loadingCanvas: CanvasWorkspace = {
  id: "loading-canvas",
  title: "Loading Canvas",
  sceneData: {
    elements: [],
    appState: createFlowBoardAppState(),
    files: {},
  },
  createdAt: "",
  updatedAt: "",
};

export function useCanvasManager(initialSelectedId?: string) {
  const { currentUser, loading: authLoading } = useAuth();
  const currentUserId = currentUser?.uid;
  const [canvases, setCanvases] = React.useState<CanvasWorkspace[]>([]);
  const [activeCanvasId, setActiveCanvasId] = React.useState("");
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("saved");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const activeCanvasIdRef = React.useRef(activeCanvasId);
  activeCanvasIdRef.current = activeCanvasId;

  const canvasesRef = React.useRef(canvases);
  canvasesRef.current = canvases;

  const pendingScenesRef = React.useRef(new Map<string, PendingScene>());
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isProgrammaticUpdateRef = React.useRef(false);
  const saveRequestIdRef = React.useRef(0);
  const sessionIdRef = React.useRef(0);
  const currentUserIdRef = React.useRef<string | undefined>(currentUserId);

  const resetRuntimeState = React.useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    pendingScenesRef.current.clear();
    saveRequestIdRef.current += 1;
    activeCanvasIdRef.current = "";
    canvasesRef.current = [];
    isProgrammaticUpdateRef.current = false;
    setCanvases([]);
    setActiveCanvasId("");
    setSaveStatus("saved");
  }, []);

  React.useEffect(() => {
    if (authLoading) {
      return;
    }

    const userChanged = currentUserIdRef.current !== currentUserId;
    if (userChanged) {
      currentUserIdRef.current = currentUserId;
      sessionIdRef.current += 1;
      resetRuntimeState();
    }

    if (!currentUserId) {
      setIsInitialized(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const sessionId = sessionIdRef.current;

    async function initializeCanvases() {
      resetRuntimeState();
      setIsLoading(true);
      setIsInitialized(false);
      setError(null);

      try {
        const loadedCanvases = await getInitialCanvasesForUser(currentUserId);
        if (cancelled || sessionIdRef.current !== sessionId) return;

        const validIds = loadedCanvases.map((canvas) => canvas.id);
        const nextActiveCanvasId =
          initialSelectedId && validIds.includes(initialSelectedId)
            ? initialSelectedId
            : canvasRepository.getActiveCanvasId(validIds);

        canvasesRef.current = loadedCanvases;
        activeCanvasIdRef.current = nextActiveCanvasId;
        setCanvases(loadedCanvases);
        setActiveCanvasId(nextActiveCanvasId);
        canvasRepository.setActiveCanvasId(nextActiveCanvasId);
        setSaveStatus("saved");
        setIsInitialized(true);
      } catch (initializationError) {
        if (cancelled || sessionIdRef.current !== sessionId) return;
        setError(getErrorMessage(initializationError));
        setIsInitialized(false);
      } finally {
        if (!cancelled && sessionIdRef.current === sessionId) {
          setIsLoading(false);
        }
      }
    }

    void initializeCanvases();

    return () => {
      cancelled = true;
    };
  }, [authLoading, currentUserId, initialSelectedId, resetRuntimeState]);

  React.useEffect(() => {
    if (activeCanvasId) {
      canvasRepository.setActiveCanvasId(activeCanvasId);
    }
  }, [activeCanvasId]);

  const flushCurrentScene = React.useCallback(async (): Promise<boolean> => {
    const sessionId = sessionIdRef.current;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const currentId = activeCanvasIdRef.current;
    if (!currentId) {
      return true;
    }

    while (pendingScenesRef.current.has(currentId)) {
      const pendingScene = pendingScenesRef.current.get(currentId);
      if (!pendingScene) {
        return true;
      }

      const sceneData = normalizeSceneForStorage(
        pendingScene.elements,
        pendingScene.appState,
        pendingScene.files
      );
      const localUpdatedAt = new Date().toISOString();

      pendingScenesRef.current.delete(currentId);
      setSaveStatus("saving");

      setCanvases((currentCanvases) => {
        const updatedCanvases = currentCanvases.map((canvas) =>
          canvas.id === currentId
            ? {
                ...canvas,
                sceneData,
                updatedAt: localUpdatedAt,
              }
            : canvas
        );
        canvasesRef.current = updatedCanvases;
        return updatedCanvases;
      });

      const saveRequestId = saveRequestIdRef.current + 1;
      saveRequestIdRef.current = saveRequestId;

      try {
        const savedCanvas = await canvasRepository.update(currentId, { sceneData });

        if (sessionIdRef.current !== sessionId || saveRequestIdRef.current !== saveRequestId) {
          continue;
        }

        setCanvases((currentCanvases) => {
          const updatedCanvases = currentCanvases.map((canvas) =>
            canvas.id === savedCanvas.id
              ? {
                  ...canvas,
                  title: savedCanvas.title,
                  updatedAt: savedCanvas.updatedAt,
                }
              : canvas
          );
          canvasesRef.current = updatedCanvases;
          return updatedCanvases;
        });
      } catch (saveError) {
        if (sessionIdRef.current !== sessionId) {
          return false;
        }

        if (!pendingScenesRef.current.has(currentId)) {
          pendingScenesRef.current.set(currentId, pendingScene);
        }
        setError(getErrorMessage(saveError));
        setSaveStatus("error");
        return false;
      }
    }

    setSaveStatus(pendingScenesRef.current.size > 0 ? "saving" : "saved");
    return true;
  }, []);

  React.useEffect(() => {
    return () => {
      if (pendingScenesRef.current.size > 0) {
        void flushCurrentScene();
      }
    };
  }, [flushCurrentScene]);

  const handleSceneChange = React.useCallback(
    (
      elements: readonly FlowBoardCanvasElement[],
      appState: FlowBoardCanvasAppState,
      files: FlowBoardCanvasFiles
    ) => {
      if (isProgrammaticUpdateRef.current || !isInitialized) {
        return;
      }

      const currentId = activeCanvasIdRef.current;
      if (!currentId) return;

      pendingScenesRef.current.set(currentId, {
        elements,
        appState,
        files,
      });

      setSaveStatus("saving");

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        void flushCurrentScene();
      }, 700);
    },
    [flushCurrentScene, isInitialized]
  );

  const switchCanvas = React.useCallback(
    async (targetCanvasId: string, excalidrawAPI?: FlowBoardExcalidrawAPI | null) => {
      if (!isInitialized || targetCanvasId === activeCanvasIdRef.current) return;
      const sessionId = sessionIdRef.current;

      const flushed = await flushCurrentScene();
      if (!flushed || sessionIdRef.current !== sessionId) return;

      const target = canvasesRef.current.find((canvas) => canvas.id === targetCanvasId);
      if (!target) return;

      isProgrammaticUpdateRef.current = true;
      activeCanvasIdRef.current = targetCanvasId;
      setActiveCanvasId(targetCanvasId);
      canvasRepository.setActiveCanvasId(targetCanvasId);

      if (excalidrawAPI) {
        applySceneToExcalidraw(excalidrawAPI, target.sceneData, { clearHistory: true });
      }

      window.setTimeout(() => {
        isProgrammaticUpdateRef.current = false;
      }, 150);
    },
    [flushCurrentScene, isInitialized]
  );

  const createCanvas = React.useCallback(
    async (excalidrawAPI?: FlowBoardExcalidrawAPI | null) => {
      if (!isInitialized || canvasesRef.current.length >= MAX_CANVASES) {
        return null;
      }
      const sessionId = sessionIdRef.current;

      const flushed = await flushCurrentScene();
      if (!flushed || sessionIdRef.current !== sessionId) return null;

      try {
        setSaveStatus("saving");
        const newCanvas = await canvasRepository.create("Untitled Canvas");
        if (sessionIdRef.current !== sessionId) return null;
        const updatedCanvases = [...canvasesRef.current, newCanvas];

        canvasesRef.current = updatedCanvases;
        setCanvases(updatedCanvases);

        isProgrammaticUpdateRef.current = true;
        activeCanvasIdRef.current = newCanvas.id;
        setActiveCanvasId(newCanvas.id);
        canvasRepository.setActiveCanvasId(newCanvas.id);

        if (excalidrawAPI) {
          applySceneToExcalidraw(excalidrawAPI, newCanvas.sceneData, { clearHistory: true });
        }

        window.setTimeout(() => {
          isProgrammaticUpdateRef.current = false;
        }, 150);

        setSaveStatus("saved");
        return newCanvas;
      } catch (createError) {
        if (sessionIdRef.current !== sessionId) return null;
        setError(getErrorMessage(createError));
        setSaveStatus("error");
        return null;
      }
    },
    [flushCurrentScene, isInitialized]
  );

  const renameCanvas = React.useCallback(async (id: string, newTitle: string) => {
    const trimmed = newTitle.trim() || "Untitled Canvas";
    const sessionId = sessionIdRef.current;

    try {
      setSaveStatus("saving");
      const savedCanvas = await canvasRepository.update(id, { title: trimmed });
      if (sessionIdRef.current !== sessionId) return;

      setCanvases((currentCanvases) => {
        const updatedCanvases = currentCanvases.map((canvas) =>
          canvas.id === id
            ? {
                ...canvas,
                title: savedCanvas.title,
                updatedAt: savedCanvas.updatedAt,
              }
            : canvas
        );
        canvasesRef.current = updatedCanvases;
        return updatedCanvases;
      });

      setSaveStatus(pendingScenesRef.current.size > 0 ? "saving" : "saved");
    } catch (renameError) {
      if (sessionIdRef.current !== sessionId) return;
      setError(getErrorMessage(renameError));
      setSaveStatus("error");
    }
  }, []);

  const deleteCanvas = React.useCallback(
    async (id: string, excalidrawAPI?: FlowBoardExcalidrawAPI | null) => {
      if (!isInitialized || canvasesRef.current.length <= MIN_CANVASES) {
        return;
      }
      const sessionId = sessionIdRef.current;

      const flushed = await flushCurrentScene();
      if (!flushed || sessionIdRef.current !== sessionId) return;

      try {
        setSaveStatus("saving");
        await canvasRepository.delete(id);
        if (sessionIdRef.current !== sessionId) return;

        const currentId = activeCanvasIdRef.current;
        const updatedCanvases = canvasesRef.current.filter((canvas) => canvas.id !== id);

        canvasesRef.current = updatedCanvases;
        setCanvases(updatedCanvases);

        if (currentId === id) {
          const nextActive = updatedCanvases[0];
          if (nextActive) {
            isProgrammaticUpdateRef.current = true;
            activeCanvasIdRef.current = nextActive.id;
            setActiveCanvasId(nextActive.id);
            canvasRepository.setActiveCanvasId(nextActive.id);

            if (excalidrawAPI) {
              applySceneToExcalidraw(excalidrawAPI, nextActive.sceneData, { clearHistory: true });
            }

            window.setTimeout(() => {
              isProgrammaticUpdateRef.current = false;
            }, 150);
          }
        }

        setSaveStatus("saved");
      } catch (deleteError) {
        setError(getErrorMessage(deleteError));
        setSaveStatus("error");
      }
    },
    [flushCurrentScene, isInitialized]
  );

  const activeCanvas = React.useMemo(() => {
    return canvases.find((canvas) => canvas.id === activeCanvasId) || canvases[0] || loadingCanvas;
  }, [canvases, activeCanvasId]);

  return {
    canvases,
    activeCanvas,
    activeCanvasId,
    saveStatus,
    isLoading,
    isInitialized,
    error,
    handleSceneChange,
    switchCanvas,
    createCanvas,
    renameCanvas,
    deleteCanvas,
    flushCurrentScene,
    isProgrammaticUpdateRef,
  };
}

async function getInitialCanvasesForUser(userId: string): Promise<CanvasWorkspace[]> {
  const existingRequest = initializationRequests.get(userId);
  if (existingRequest) {
    return existingRequest;
  }

  const request = loadOrCreateDefaultCanvas();
  initializationRequests.set(userId, request);

  try {
    return await request;
  } finally {
    initializationRequests.delete(userId);
  }
}

async function loadOrCreateDefaultCanvas(): Promise<CanvasWorkspace[]> {
  const loadedCanvases = await canvasRepository.getAll();
  if (loadedCanvases.length > 0) {
    return loadedCanvases;
  }

  return [await canvasRepository.create("Untitled Canvas")];
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Canvas persistence failed";
}

export type CanvasManager = ReturnType<typeof useCanvasManager>;
