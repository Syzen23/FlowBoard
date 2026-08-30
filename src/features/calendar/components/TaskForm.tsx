import * as React from "react";
import { CheckSquare, Edit3, Shapes } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Task, TaskStatus, CanvasWorkspace } from "@/src/types";

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: string;
  taskToEdit?: Task | null;
  canvases?: CanvasWorkspace[];
  onSave?: (taskData: {
    title: string;
    dueDate: string;
    dueTime?: string;
    description?: string;
    status: TaskStatus;
    canvasId?: string | null;
  }) => void;
}

export function TaskForm({
  open,
  onOpenChange,
  initialDate = "",
  taskToEdit = null,
  canvases = [],
  onSave,
}: TaskFormProps) {
  const isEditing = Boolean(taskToEdit);

  const [title, setTitle] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [dueTime, setDueTime] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState<TaskStatus>("todo");
  const [selectedCanvasId, setSelectedCanvasId] = React.useState<string>("none");

  // Sync form state whenever dialog opens or taskToEdit / initialDate changes
  React.useEffect(() => {
    if (open) {
      if (taskToEdit) {
        setTitle(taskToEdit.title || "");
        setDueDate(taskToEdit.dueDate || initialDate || "");
        setDueTime(taskToEdit.dueTime || "");
        setDescription(taskToEdit.description || "");
        setStatus(taskToEdit.status || "todo");
        setSelectedCanvasId(taskToEdit.canvasId ? taskToEdit.canvasId : "none");
      } else {
        setTitle("");
        setDueDate(initialDate || "");
        setDueTime("");
        setDescription("");
        setStatus("todo");
        setSelectedCanvasId("none"); // Default to None for new Calendar tasks
      }
    }
  }, [open, taskToEdit, initialDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    const finalCanvasId =
      selectedCanvasId === "none" || !selectedCanvasId
        ? null
        : selectedCanvasId;

    if (onSave) {
      onSave({
        title: title.trim(),
        dueDate,
        dueTime: dueTime.trim() ? dueTime.trim() : undefined,
        description: description.trim() ? description.trim() : undefined,
        status,
        canvasId: finalCanvasId,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md bg-[#1b1b1e] border-zinc-800 p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">
              {isEditing ? (
                <Edit3 className="w-4 h-4" />
              ) : (
                <CheckSquare className="w-4 h-4" />
              )}
            </span>
            <DialogTitle className="text-base text-zinc-100 font-semibold">
              {isEditing ? "Edit Task" : "New Task"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400 mt-1">
            {isEditing
              ? "Update the deadline, linked canvas, and details for this task."
              : "Create a deadline-based task for your calendar schedule."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-2 text-left">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Title <span className="text-orange-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Bikin konsep API"
              required
              autoFocus
              className="w-full h-9 px-3 rounded-lg bg-[#242428] border border-zinc-700/60 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* Deadline & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Deadline <span className="text-orange-400">*</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full h-9 px-3 rounded-lg bg-[#242428] border border-zinc-700/60 text-xs sm:text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Time <span className="text-zinc-500 text-[11px]">(optional)</span>
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#242428] border border-zinc-700/60 text-xs sm:text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Canvas Link */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shapes className="w-3.5 h-3.5 text-orange-400" />
                Canvas <span className="text-zinc-500 text-[11px]">(optional link)</span>
              </span>
            </label>
            <select
              value={selectedCanvasId}
              onChange={(e) => setSelectedCanvasId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#242428] border border-zinc-700/60 text-xs sm:text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors cursor-pointer"
            >
              <option value="none">None</option>
              {canvases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus("todo")}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all text-center border cursor-pointer ${
                  status === "todo"
                    ? "bg-zinc-800 text-zinc-100 border-zinc-500 shadow-xs"
                    : "bg-[#242428] text-zinc-400 border-zinc-700/40 hover:text-zinc-200"
                }`}
              >
                To Do
              </button>
              <button
                type="button"
                onClick={() => setStatus("in_progress")}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all text-center border cursor-pointer ${
                  status === "in_progress"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs"
                    : "bg-[#242428] text-zinc-400 border-zinc-700/40 hover:text-zinc-200"
                }`}
              >
                In Progress
              </button>
              <button
                type="button"
                onClick={() => setStatus("done")}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all text-center border cursor-pointer ${
                  status === "done"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-xs"
                    : "bg-[#242428] text-zinc-400 border-zinc-700/40 hover:text-zinc-200"
                }`}
              >
                Done
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Description <span className="text-zinc-500 text-[11px]">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details, links, or notes..."
              className="w-full px-3 py-2 rounded-lg bg-[#242428] border border-zinc-700/60 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800/80">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="orange"
              size="sm"
              className="text-xs px-4"
            >
              {isEditing ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
