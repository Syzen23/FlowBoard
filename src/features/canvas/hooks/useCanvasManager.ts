import * as React from "react";
import { CanvasWorkspace } from "@/src/types";
import {
  cleanAppStateForStorage,
  CANVAS_BOARD_BACKGROUND,
  CANVAS_DEFAULT_FILL_COLOR,
  CANVAS_DEFAULT_STROKE_COLOR,
  MAX_CANVASES,
  MIN_CANVASES,
  canvasRepository,
} from "@/src/features/canvas/repositories/canvasRepository";
import { taskRepository } from "@/src/features/calendar/repositories/taskRepository";

export type SaveStatus = "saved" | "saving";

export function useCanvasManager(initialSelectedId?: string) {
  const [canvases, setCanvases] = React.useState<CanvasWorkspace[]>(() => {
    return canvasRepository.getAll();
  });

  const [activeCanvasId, setActiveCanvasId] = React.useState<string>(() => {
    const loadedCanvases = canvasRepository.getAll();
    const validIds = loadedCanvases.map((c) => c.id);
    if (initialSelectedId && validIds.includes(initialSelectedId)) {
      return initialSelectedId;
    }
    return canvasRepository.getActiveCanvasId(validIds);
  });

  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("saved");

  // Keep latest refs for debounce / scene saving
  const activeCanvasIdRef = React.useRef(activeCanvasId);
  activeCanvasIdRef.current = activeCanvasId;

  const canvasesRef = React.useRef(canvases);
  canvasesRef.current = canvases;

  const pendingSceneRef = React.useRef<{
    elements: readonly any[];
    appState: Record<string, any>;
    files: Record<string, any>;
  } | null>(null);

  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isProgrammaticUpdateRef = React.useRef(false);

  // Sync active canvas ID across storage when changed
  React.useEffect(() => {
    canvasRepository.setActiveCanvasId(activeCanvasId);
  }, [activeCanvasId]);

  // Flush any pending changes to persistence
  const flushCurrentScene = React.useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (pendingSceneRef.current) {
      const currentId = activeCanvasIdRef.current;
      const updatedCanvases = canvasesRef.current.map((c) => {
        if (c.id === currentId) {
          return {
            ...c,
            sceneData: {
              elements: [...(pendingSceneRef.current?.elements || [])],
              appState: cleanAppStateForStorage(pendingSceneRef.current?.appState),
              files: pendingSceneRef.current?.files || {},
            },
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });

      setCanvases(updatedCanvases);
      canvasRepository.save(updatedCanvases);
      pendingSceneRef.current = null;
      setSaveStatus("saved");
    }
  }, []);

  // Handle scene change from Excalidraw onChange
  const handleSceneChange = React.useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      if (isProgrammaticUpdateRef.current) {
        return;
      }

      pendingSceneRef.current = {
        elements,
        appState,
        files,
      };

      setSaveStatus("saving");

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        flushCurrentScene();
      }, 700);
    },
    [flushCurrentScene]
  );

  // Switch to another canvas
  const switchCanvas = React.useCallback(
    (targetCanvasId: string, excalidrawAPI?: any) => {
      if (targetCanvasId === activeCanvasIdRef.current) return;

      // 1. Flush current scene to storage
      flushCurrentScene();

      // 2. Locate target canvas
      const target = canvasesRef.current.find((c) => c.id === targetCanvasId);
      if (!target) return;

      // 3. Mark update as programmatic to avoid immediate change loop
      isProgrammaticUpdateRef.current = true;
      activeCanvasIdRef.current = targetCanvasId;
      setActiveCanvasId(targetCanvasId);
      canvasRepository.setActiveCanvasId(targetCanvasId);

      // 4. Update Excalidraw scene if API is available
      if (excalidrawAPI) {
        const sceneData = target.sceneData;
        excalidrawAPI.updateScene({
          elements: (sceneData?.elements || []) as any,
          appState: {
            ...cleanAppStateForStorage(sceneData?.appState),
            theme: "dark",
            viewBackgroundColor: CANVAS_BOARD_BACKGROUND,
          },
          files: (sceneData?.files || {}) as any,
        });
        if (excalidrawAPI.history?.clear) {
          excalidrawAPI.history.clear();
        }
      }

      setTimeout(() => {
        isProgrammaticUpdateRef.current = false;
      }, 150);
    },
    [flushCurrentScene]
  );

  // Create a new canvas
  const createCanvas = React.useCallback(
    (excalidrawAPI?: any) => {
      if (canvasesRef.current.length >= MAX_CANVASES) {
        return null;
      }

      // Flush current scene before adding
      flushCurrentScene();

      const newCanvas = canvasRepository.create("Untitled Canvas");
      const updatedCanvases = [...canvasesRef.current, newCanvas];

      canvasesRef.current = updatedCanvases;
      setCanvases(updatedCanvases);
      canvasRepository.save(updatedCanvases);

      // Switch to the newly created canvas
      isProgrammaticUpdateRef.current = true;
      activeCanvasIdRef.current = newCanvas.id;
      setActiveCanvasId(newCanvas.id);
      canvasRepository.setActiveCanvasId(newCanvas.id);

      if (excalidrawAPI) {
        excalidrawAPI.updateScene({
          elements: [],
          appState: {
            viewBackgroundColor: CANVAS_BOARD_BACKGROUND,
            theme: "dark",
            currentItemStrokeColor: CANVAS_DEFAULT_STROKE_COLOR,
            currentItemBackgroundColor: CANVAS_DEFAULT_FILL_COLOR,
          },
          files: {},
        });
        if (excalidrawAPI.history?.clear) {
          excalidrawAPI.history.clear();
        }
      }

      setTimeout(() => {
        isProgrammaticUpdateRef.current = false;
      }, 150);

      return newCanvas;
    },
    [flushCurrentScene]
  );

  // Rename a canvas
  const renameCanvas = React.useCallback((id: string, newTitle: string) => {
    const trimmed = newTitle.trim() || "Untitled Canvas";
    setCanvases((prev) => {
      const updated = prev.map((c) =>
        c.id === id ? { ...c, title: trimmed, updatedAt: new Date().toISOString() } : c
      );
      canvasRepository.save(updated);
      return updated;
    });
  }, []);

  // Delete a canvas
  const deleteCanvas = React.useCallback(
    (id: string, excalidrawAPI?: any) => {
      if (canvasesRef.current.length <= MIN_CANVASES) {
        return; // Cannot delete last canvas
      }

      // Unlink any tasks associated with this deleted canvas
      taskRepository.unlinkCanvas(id);

      // If deleting the active canvas, determine next active canvas
      const currentId = activeCanvasIdRef.current;
      const updated = canvasesRef.current.filter((c) => c.id !== id);

      canvasesRef.current = updated;
      setCanvases(updated);
      canvasRepository.save(updated);

      if (currentId === id) {
        const nextActive = updated[0];
        if (nextActive) {
          isProgrammaticUpdateRef.current = true;
          activeCanvasIdRef.current = nextActive.id;
          setActiveCanvasId(nextActive.id);
          canvasRepository.setActiveCanvasId(nextActive.id);

          if (excalidrawAPI) {
            const sceneData = nextActive.sceneData;
            excalidrawAPI.updateScene({
              elements: (sceneData?.elements || []) as any,
              appState: {
                ...cleanAppStateForStorage(sceneData?.appState),
                theme: "dark",
                viewBackgroundColor: CANVAS_BOARD_BACKGROUND,
              },
              files: (sceneData?.files || {}) as any,
            });
            if (excalidrawAPI.history?.clear) {
              excalidrawAPI.history.clear();
            }
          }

          setTimeout(() => {
            isProgrammaticUpdateRef.current = false;
          }, 150);
        }
      }
    },
    []
  );

  const activeCanvas = React.useMemo(() => {
    return (
      canvases.find((c) => c.id === activeCanvasId) ||
      canvases[0] ||
      canvasRepository.create("Untitled Canvas")
    );
  }, [canvases, activeCanvasId]);

  return {
    canvases,
    activeCanvas,
    activeCanvasId,
    saveStatus,
    handleSceneChange,
    switchCanvas,
    createCanvas,
    renameCanvas,
    deleteCanvas,
    flushCurrentScene,
    isProgrammaticUpdateRef,
  };
}
