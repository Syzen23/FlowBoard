import * as React from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import {
  Menu,
  Share2,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { WorkspaceSwitcher } from "@/src/features/navigation/WorkspaceSwitcher";
import { CanvasMenu } from "@/src/features/canvas/components/CanvasMenu";
import { ConvertTaskDialog } from "@/src/features/canvas/components/ConvertTaskDialog";
import { ShareCanvasDialog } from "@/src/features/canvas/components/ShareCanvasDialog";
import { realtimeRepository } from "@/src/features/realtime/realtimeRepository";
import { useRealtimeElementReceiver } from "@/src/features/realtime/useRealtimeElementReceiver";
import { RouteMode } from "@/src/types";
import { CanvasManager } from "@/src/features/canvas/hooks/useCanvasManager";
import {
  applyAppStateToExcalidraw,
  createFlowBoardAppState,
  createScenePayload,
  hasFlowBoardCanvasBackground,
} from "@/src/features/canvas/adapters/canvasSceneAdapter";
import type {
  FlowBoardExcalidrawAPI,
  FlowBoardInitialScene,
} from "@/src/features/canvas/types";

interface CanvasWorkspaceProps {
  onModeChange: (mode: RouteMode) => void;
  canvasManager: CanvasManager;
}

export function CanvasWorkspace({
  onModeChange,
  canvasManager,
}: CanvasWorkspaceProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [convertOpen, setConvertOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [excalidrawAPI, setExcalidrawAPI] = React.useState<FlowBoardExcalidrawAPI | null>(null);

  const {
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
    isProgrammaticUpdateRef,
    markRemoteElementsApplied,
  } = canvasManager;

  const joinOwnerRealtimeRoom = React.useCallback(() => {
    return realtimeRepository.joinOwnerRoom(activeCanvasId);
  }, [activeCanvasId]);

  const handleRealtimeError = React.useCallback((realtimeError: unknown) => {
    console.warn("FlowBoard owner realtime receiver unavailable", realtimeError);
  }, []);

  useRealtimeElementReceiver({
    enabled: isInitialized && Boolean(activeCanvasId),
    roomKey: activeCanvasId,
    excalidrawAPI,
    joinRoom: joinOwnerRealtimeRoom,
    isProgrammaticUpdateRef,
    onRemoteElementsApplied: (elements, files) => {
      markRemoteElementsApplied(activeCanvasId, elements, files);
    },
    onError: handleRealtimeError,
  });

  const applyDarkCanvasAppearance = React.useCallback((appState?: unknown) => {
    if (!excalidrawAPI) return;

    isProgrammaticUpdateRef.current = true;
    applyAppStateToExcalidraw(excalidrawAPI, appState);

    window.setTimeout(() => {
      isProgrammaticUpdateRef.current = false;
    }, 150);
  }, [excalidrawAPI, isProgrammaticUpdateRef]);

  React.useEffect(() => {
    if (!excalidrawAPI) return;

    applyDarkCanvasAppearance(activeCanvas.sceneData?.appState);
  }, [activeCanvas.id, applyDarkCanvasAppearance, excalidrawAPI]);

  const handleSelectCanvas = (id: string) => {
    void switchCanvas(id, excalidrawAPI);
  };

  const handleCreateCanvas = () => {
    void createCanvas(excalidrawAPI);
  };

  const handleDeleteCanvas = (id: string) => {
    void deleteCanvas(id, excalidrawAPI);
  };

  if (isLoading || !isInitialized) {
    return (
      <div className="relative w-full h-screen bg-[#141416] text-zinc-100 flex items-center justify-center overflow-hidden select-none">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-zinc-700 border-t-orange-500 animate-spin" />
          <p className="text-xs text-zinc-400">
            {error ? "Unable to load canvases." : "Loading canvases..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-[#141416] text-zinc-100 flex flex-col overflow-hidden select-none">
      {/* Excalidraw Canvas Viewport */}
      <div className="absolute inset-0 z-0 flowboard-excalidraw">
        <Excalidraw
          key={activeCanvas.id}
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          theme="dark"
          initialData={createScenePayload(activeCanvas.sceneData) as FlowBoardInitialScene}
          onChange={(elements, appState, files) => {
            const flowBoardAppState = createFlowBoardAppState(appState);

            if (!hasFlowBoardCanvasBackground(appState)) {
              applyDarkCanvasAppearance(appState);
            }

            handleSceneChange(elements, flowBoardAppState, files);
          }}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: false,
              clearCanvas: true,
              export: {
                saveFileToDisk: true,
              },
              loadScene: true,
              saveAsImage: true,
              toggleTheme: false,
            },
          }}
        />
      </div>

      {/* Top Bar Floating Controls */}
      <header className="relative z-20 flex items-center justify-between p-4 sm:p-5 w-full pointer-events-none">
        {/* Left: Hamburger menu, Title pill, and subtle autosave indicator */}
        <div className="pointer-events-auto flex items-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setMenuOpen(true)}
            aria-label="Open Canvases Menu"
            className="w-9 h-9 rounded-lg bg-[#1e1e22]/90 hover:bg-[#28282e] border-zinc-800 text-zinc-300 shadow-none ring-0 outline-none focus-visible:ring-0"
          >
            <Menu className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2">
            <span
              onClick={() => setMenuOpen(true)}
              title="Click to manage or rename canvases"
              className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md bg-[#1e1e22]/90 hover:bg-[#26262c] border border-zinc-800/80 text-xs font-mono text-zinc-200 backdrop-blur-md cursor-pointer transition-colors max-w-[200px] truncate"
            >
              {activeCanvas.title}
            </span>

            {/* Subtle Autosave Status */}
            <span
              className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#18181b]/80 border border-zinc-800/60 backdrop-blur-xs flex items-center gap-1.5 transition-all duration-200"
              title={
                saveStatus === "saving"
                  ? "Saving changes..."
                  : saveStatus === "error"
                  ? "Autosave failed"
                  : "All changes saved"
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  saveStatus === "saving"
                    ? "bg-amber-400 animate-pulse"
                    : saveStatus === "error"
                    ? "bg-red-400"
                    : "bg-emerald-400"
                }`}
              />
              <span
                className={
                  saveStatus === "saving"
                    ? "text-amber-300/90"
                    : saveStatus === "error"
                    ? "text-red-300/90"
                    : "text-zinc-400"
                }
              >
                {saveStatus === "saving" ? "Saving..." : saveStatus === "error" ? "Save failed" : "Saved"}
              </span>
            </span>
          </div>
        </div>

        {/* Right: Actions (Convert to Task & Share) */}
        <div className="pointer-events-auto flex items-center gap-2">
          <Button
            variant="orange"
            size="sm"
            onClick={() => setConvertOpen(true)}
            className="text-xs h-8 px-3 rounded-lg shadow-md gap-1.5 font-medium cursor-pointer ring-0 outline-none"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Convert to Task</span>
          </Button>

          <Button
            variant="blue"
            size="sm"
            onClick={() => setShareOpen(true)}
            className="text-xs h-8 px-3.5 rounded-lg shadow-none gap-1.5 font-medium ring-0 outline-none focus-visible:ring-0"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </Button>
        </div>
      </header>

      <main className="relative z-10 flex-1 pointer-events-none" />

      {/* Bottom Center: Workspace Switcher */}
      <footer className="relative z-20 w-full p-4 sm:p-5 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <WorkspaceSwitcher currentMode="canvas" onModeChange={onModeChange} />
        </div>
      </footer>

      {/* Modals & Dialogs */}
      <CanvasMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        canvases={canvases}
        activeCanvasId={activeCanvasId}
        onSelectCanvas={handleSelectCanvas}
        onCreateCanvas={handleCreateCanvas}
        onRenameCanvas={renameCanvas}
        onDeleteCanvas={handleDeleteCanvas}
      />

      <ConvertTaskDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        currentCanvasId={activeCanvas.id}
        currentCanvasTitle={activeCanvas.title}
      />

      <ShareCanvasDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        canvasId={activeCanvas.id}
        canvasTitle={activeCanvas.title}
      />
    </div>
  );
}
