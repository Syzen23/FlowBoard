import * as React from "react";
import { Plus, Settings, Check, Trash2, Edit2, Layers, AlertCircle, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { CanvasWorkspace } from "@/src/types";
import { MAX_CANVASES, MIN_CANVASES } from "@/src/features/canvas/utils/canvasStorage";

interface CanvasMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvases: CanvasWorkspace[];
  activeCanvasId: string;
  onSelectCanvas: (id: string) => void;
  onCreateCanvas: () => void;
  onRenameCanvas: (id: string, newTitle: string) => void;
  onDeleteCanvas: (id: string) => void;
}

export function CanvasMenu({
  open,
  onOpenChange,
  canvases,
  activeCanvasId,
  onSelectCanvas,
  onCreateCanvas,
  onRenameCanvas,
  onDeleteCanvas,
}: CanvasMenuProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  const maxReached = canvases.length >= MAX_CANVASES;
  const isOnlyOneCanvas = canvases.length <= MIN_CANVASES;

  const handleStartRename = (e: React.MouseEvent, canvas: CanvasWorkspace) => {
    e.stopPropagation();
    setEditingId(canvas.id);
    setEditTitle(canvas.title);
  };

  const handleSaveRename = (id: string) => {
    const trimmed = editTitle.trim();
    if (trimmed) {
      onRenameCanvas(id, trimmed);
    }
    setEditingId(null);
    setEditTitle("");
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isOnlyOneCanvas) return;
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteCanvas(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const canvasToDelete = canvases.find((c) => c.id === deleteConfirmId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent onClose={() => onOpenChange(false)} className="w-[360px] max-w-full p-5 bg-[#1a1a1d] border-zinc-800">
          <DialogHeader className="mb-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xs uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                Canvases ({canvases.length}/{MAX_CANVASES})
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-zinc-500">
              Switch, rename, or manage your brainstorming canvases
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 my-2 max-h-[260px] overflow-y-auto pr-0.5">
            {canvases.map((canvas) => {
              const isActive = canvas.id === activeCanvasId;
              const isEditing = editingId === canvas.id;

              if (isEditing) {
                return (
                  <div
                    key={canvas.id}
                    className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[#242429] border border-orange-500/50"
                  >
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename(canvas.id);
                        if (e.key === "Escape") handleCancelRename();
                      }}
                      autoFocus
                      className="flex-1 min-w-0 bg-transparent text-xs text-zinc-100 px-2 py-1 focus:outline-none font-medium"
                      placeholder="Canvas title..."
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveRename(canvas.id)}
                      className="p-1 rounded text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      title="Save title"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelRename}
                      className="p-1 rounded text-zinc-400 hover:bg-zinc-700 transition-colors"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={canvas.id}
                  onClick={() => {
                    onSelectCanvas(canvas.id);
                    onOpenChange(false);
                  }}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-all duration-150 ${
                    isActive
                      ? "bg-zinc-800/90 text-zinc-100 font-medium border border-zinc-700/60 shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                        isActive ? "bg-orange-500 ring-2 ring-orange-500/20" : "bg-zinc-600 group-hover:bg-zinc-500"
                      }`}
                    />
                    <span className="truncate text-xs">{canvas.title}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleStartRename(e, canvas)}
                      className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60 transition-colors"
                      title="Rename canvas"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteClick(e, canvas.id)}
                      disabled={isOnlyOneCanvas}
                      className={`p-1 rounded transition-colors ${
                        isOnlyOneCanvas
                          ? "text-zinc-700 cursor-not-allowed opacity-40"
                          : "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                      }`}
                      title={isOnlyOneCanvas ? "Cannot delete the only canvas" : "Delete canvas"}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>

                    {isActive && (
                      <Check className="w-3.5 h-3.5 text-orange-400 ml-1 shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="h-px bg-zinc-800/80 my-3" />

          <div className="space-y-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={maxReached}
              className="w-full justify-start text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-40"
              onClick={() => {
                if (!maxReached) {
                  onCreateCanvas();
                  onOpenChange(false);
                }
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-2 text-zinc-400" />
              + New Canvas
            </Button>

            {maxReached && (
              <p className="text-[11px] text-zinc-400 px-1 italic">
                You&apos;ve reached the maximum of 3 canvases.
              </p>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs text-zinc-400 hover:text-zinc-200"
              onClick={() => onOpenChange(false)}
            >
              <Settings className="w-3.5 h-3.5 mr-2" />
              Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteConfirmId)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeleteConfirmId(null);
        }}
      >
        <DialogContent
          onClose={() => setDeleteConfirmId(null)}
          className="w-[340px] max-w-full p-5 bg-[#1c1c1f] border-zinc-800 text-left"
        >
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-red-500/10 text-red-400">
                <AlertCircle className="w-4 h-4" />
              </span>
              <DialogTitle className="text-sm font-semibold text-zinc-100">
                Delete this canvas?
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-zinc-400 mt-2 leading-relaxed">
              This action cannot be undone. All drawings and notes in &ldquo;{canvasToDelete?.title || "this canvas"}&rdquo; will be permanently removed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-zinc-800/80">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirmId(null)}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              className="text-xs px-3 bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              Delete Canvas
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
