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
import { RouteMode } from "@/src/types";
import { useCanvasManager } from "@/src/features/canvas/hooks/useCanvasManager";
import { cleanAppStateForStorage } from "@/src/features/canvas/utils/canvasStorage";

interface CanvasWorkspaceProps {
  onModeChange: (mode: RouteMode) => void;
  activeCanvasId?: string;
  onSelectCanvas?: (id: string) => void;
}

export function CanvasWorkspace({
  onModeChange,
  activeCanvasId: propActiveCanvasId,
  onSelectCanvas: propOnSelectCanvas,
}: CanvasWorkspaceProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [convertOpen, setConvertOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [excalidrawAPI, setExcalidrawAPI] = React.useState<any>(null);

  const {
    canvases,
    activeCanvas,
    activeCanvasId,
    saveStatus,
    handleSceneChange,
    switchCanvas,
    createCanvas,
    renameCanvas,
    deleteCanvas,
  } = useCanvasManager(propActiveCanvasId);

  // Sync external prop if provided
  React.useEffect(() => {
    if (propActiveCanvasId && propActiveCanvasId !== activeCanvasId) {
      switchCanvas(propActiveCanvasId, excalidrawAPI);
    }
  }, [propActiveCanvasId, activeCanvasId, switchCanvas, excalidrawAPI]);

  const handleSelectCanvas = (id: string) => {
    switchCanvas(id, excalidrawAPI);
    if (propOnSelectCanvas) {
      propOnSelectCanvas(id);
    }
  };

  const handleCreateCanvas = () => {
    const created = createCanvas(excalidrawAPI);
    if (created && propOnSelectCanvas) {
      propOnSelectCanvas(created.id);
    }
  };

  const handleDeleteCanvas = (id: string) => {
    deleteCanvas(id, excalidrawAPI);
  };

  return (
    <div className="relative w-full h-screen bg-[#141416] text-zinc-100 flex flex-col overflow-hidden select-none">
      {/* Excalidraw Canvas Viewport */}
      <div className="absolute inset-0 z-0">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          theme="dark"
          initialData={{
            elements: activeCanvas.sceneData?.elements || [],
            appState: {
              ...cleanAppStateForStorage(activeCanvas.sceneData?.appState),
              theme: "dark",
            },
            files: activeCanvas.sceneData?.files || {},
          }}
          onChange={(elements, appState, files) => {
            handleSceneChange(elements, appState, files);
          }}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: true,
              clearCanvas: true,
              export: {
                saveFileToDisk: true,
              },
              loadScene: true,
              saveAsImage: true,
              theme: false,
            },
          }}
        />
      </div>

      {/* Top Bar Floating Controls */}
      <header className="relative z-20 flex items-center justify-between p-3 sm:p-4 w-full pointer-events-none">
        {/* Left: Hamburger menu, Title pill, and subtle autosave indicator */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setMenuOpen(true)}
            aria-label="Open Canvases Menu"
            className="w-9 h-9 rounded-lg bg-[#1e1e22]/90 hover:bg-[#28282e] border-zinc-800 text-zinc-300 shadow-md backdrop-blur-md cursor-pointer"
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
              title={saveStatus === "saving" ? "Saving changes to browser storage..." : "All changes saved locally"}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  saveStatus === "saving" ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                }`}
              />
              <span className={saveStatus === "saving" ? "text-amber-300/90" : "text-zinc-400"}>
                {saveStatus === "saving" ? "Saving..." : "Saved"}
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
            className="text-xs h-8 px-3 rounded-lg shadow-md gap-1.5 font-medium cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Convert to Task</span>
          </Button>

          <Button
            variant="blue"
            size="sm"
            onClick={() => setShareOpen(true)}
            className="text-xs h-8 px-3.5 rounded-lg shadow-md gap-1.5 font-medium cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </Button>
        </div>
      </header>

      {/* Bottom Center: Workspace Switcher */}
      <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
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
