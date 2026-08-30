import * as React from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { Eye, Edit3, Lock, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  loadCanvasesFromStorage,
  saveCanvasesToStorage,
  cleanAppStateForStorage,
} from "@/src/features/canvas/utils/canvasStorage";
import { getCanvasShareSetting } from "@/src/features/canvas/utils/shareStorage";

interface SharedCanvasWorkspaceProps {
  canvasId: string;
  initialPermission?: "view" | "edit";
  onReturnToApp?: () => void;
}

export function SharedCanvasWorkspace({
  canvasId,
  initialPermission,
  onReturnToApp,
}: SharedCanvasWorkspaceProps) {
  // Load target canvas and share settings once / when canvasId changes
  const targetCanvas = React.useMemo(() => {
    const all = loadCanvasesFromStorage();
    return all.find((c) => c.id === canvasId) || null;
  }, [canvasId]);

  const shareSetting = React.useMemo(() => {
    return getCanvasShareSetting(canvasId);
  }, [canvasId]);

  // Determine effective permission
  const isPrivate = shareSetting.permission === "private";

  const effectivePermission: "view" | "edit" = React.useMemo(() => {
    if (initialPermission === "edit" || initialPermission === "view") {
      return initialPermission;
    }
    return shareSetting.permission === "edit" ? "edit" : "view";
  }, [initialPermission, shareSetting.permission]);

  const isViewOnly = effectivePermission === "view";

  // Stable initial data for Excalidraw - created ONCE per canvas / viewMode
  const initialData = React.useMemo(() => {
    if (!targetCanvas) return null;
    return {
      elements: targetCanvas.sceneData?.elements || [],
      appState: {
        ...cleanAppStateForStorage(targetCanvas.sceneData?.appState),
        theme: "dark",
        viewModeEnabled: isViewOnly,
      },
      files: targetCanvas.sceneData?.files || {},
    };
  }, [canvasId, isViewOnly, targetCanvas]);

  // Refs for debounced storage saving in Edit mode without triggering React re-renders
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const pendingSceneRef = React.useRef<{
    elements: readonly any[];
    appState: any;
    files: any;
  } | null>(null);

  const flushSceneToStorage = React.useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (!pendingSceneRef.current || isViewOnly) return;

    const { elements, appState, files } = pendingSceneRef.current;
    const currentCanvases = loadCanvasesFromStorage();
    const updatedCanvases = currentCanvases.map((c) => {
      if (c.id !== canvasId) return c;
      return {
        ...c,
        sceneData: {
          elements: [...elements],
          appState: cleanAppStateForStorage(appState),
          files: { ...files },
        },
        updatedAt: new Date().toISOString(),
      };
    });
    saveCanvasesToStorage(updatedCanvases);
    pendingSceneRef.current = null;
  }, [canvasId, isViewOnly]);

  // Flush on unmount
  React.useEffect(() => {
    return () => {
      flushSceneToStorage();
    };
  }, [flushSceneToStorage]);

  // Debounced scene change handler (zero React state updates during drawing)
  const handleSceneChange = React.useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      if (isViewOnly) return;

      pendingSceneRef.current = {
        elements,
        appState,
        files,
      };

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        flushSceneToStorage();
      }, 750);
    },
    [isViewOnly, flushSceneToStorage]
  );

  // If Canvas is not found
  if (!targetCanvas || !initialData) {
    return (
      <div className="w-full h-screen bg-[#141416] text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-400 mb-4 shadow-xl">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-zinc-100 mb-2">Canvas Not Found</h1>
        <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
          The canvas you are trying to view does not exist, may have been removed, or the link is invalid.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (onReturnToApp) {
              onReturnToApp();
            } else if (typeof window !== "undefined") {
              window.location.href = "/app/canvas";
            }
          }}
          className="gap-2 text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to FlowBoard</span>
        </Button>
      </div>
    );
  }

  // If Canvas is marked as private by owner
  if (isPrivate) {
    return (
      <div className="w-full h-screen bg-[#141416] text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-zinc-100 mb-2">This Canvas is Private</h1>
        <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
          The owner of &ldquo;{targetCanvas.title}&rdquo; has set this canvas to Private. Public link access is currently disabled.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (onReturnToApp) {
              onReturnToApp();
            } else if (typeof window !== "undefined") {
              window.location.href = "/app/canvas";
            }
          }}
          className="gap-2 text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to FlowBoard</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-[#141416] text-zinc-100 flex flex-col overflow-hidden select-none">
      {/* Excalidraw Viewport */}
      <div className="absolute inset-0 z-0">
        <Excalidraw
          key={`${canvasId}-${effectivePermission}`}
          theme="dark"
          viewModeEnabled={isViewOnly}
          zenModeEnabled={false}
          gridModeEnabled={false}
          initialData={initialData}
          onChange={handleSceneChange}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: !isViewOnly,
              clearCanvas: !isViewOnly,
              export: {
                saveFileToDisk: true,
              },
              loadScene: false,
              saveAsImage: true,
              theme: false,
            },
          }}
        />
      </div>

      {/* Top Floating Bar for Shared View */}
      <header className="relative z-20 flex items-center justify-between p-3 sm:p-4 w-full pointer-events-none">
        {/* Left: Back to FlowBoard & Canvas Title */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (onReturnToApp) {
                onReturnToApp();
              } else if (typeof window !== "undefined") {
                window.location.href = "/app/canvas";
              }
            }}
            title="Go to Owner FlowBoard"
            className="h-8 px-2.5 rounded-lg bg-[#1e1e22]/90 hover:bg-[#28282e] border-zinc-800 text-zinc-300 shadow-md backdrop-blur-md cursor-pointer gap-1.5 text-xs font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">FlowBoard</span>
          </Button>

          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#1e1e22]/90 border border-zinc-800/80 text-xs font-mono text-zinc-200 backdrop-blur-md max-w-[220px] truncate shadow-xs">
            {targetCanvas.title}
          </span>
        </div>
      </header>

      {/* Bottom Right Floating Permission Badge (Positioned immediately to the left of the help '?' icon) */}
      <div className="absolute bottom-3 sm:bottom-4 right-14 sm:right-16 z-20 pointer-events-none flex items-center">
        <div className="pointer-events-auto">
          {isViewOnly ? (
            <div
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-[#3b82f6] text-white text-[11px] sm:text-xs font-medium shadow-xs select-none"
              title="View only mode - Drawing and element modification disabled"
            >
              <Eye className="w-3.5 h-3.5 text-white shrink-0" />
              <span>View only</span>
            </div>
          ) : (
            <div
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-[#3b82f6] text-white text-[11px] sm:text-xs font-medium shadow-xs select-none"
              title="Can edit mode - Drawing and shape editing enabled"
            >
              <Edit3 className="w-3.5 h-3.5 text-white shrink-0" />
              <span>Can edit</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
