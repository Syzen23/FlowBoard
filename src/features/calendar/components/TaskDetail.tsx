import * as React from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Shapes,
  ExternalLink,
  Edit2,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Task, TaskStatus, CanvasWorkspace } from "@/src/types";

interface TaskDetailProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvases?: CanvasWorkspace[];
  onOpenCanvas?: (canvasId: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
}

export function TaskDetail({
  task,
  open,
  onOpenChange,
  canvases = [],
  onOpenCanvas,
  onEdit,
  onDelete,
  onStatusChange,
}: TaskDetailProps) {
  if (!task) return null;

  const linkedCanvas = React.useMemo(() => {
    if (!task.canvasId) return null;
    return canvases.find((c) => c.id === task.canvasId) || null;
  }, [task.canvasId, canvases]);

  const formattedDueDate = React.useMemo(() => {
    try {
      const [year, month, day] = task.dueDate.split("-").map(Number);
      const dateObj = new Date(year, month - 1, day);
      return dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return task.dueDate;
    }
  }, [task.dueDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md bg-[#1b1b1e] border-zinc-800 p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-[#242428] p-0.5 rounded-lg border border-zinc-700/60">
              <button
                type="button"
                onClick={() => onStatusChange && onStatusChange(task.id, "todo")}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  task.status === "todo"
                    ? "bg-zinc-700 text-zinc-100 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                To Do
              </button>
              <button
                type="button"
                onClick={() => onStatusChange && onStatusChange(task.id, "in_progress")}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  task.status === "in_progress"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                In Progress
              </button>
              <button
                type="button"
                onClick={() => onStatusChange && onStatusChange(task.id, "done")}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  task.status === "done"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Done
              </button>
            </div>

            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit(task);
                  }}
                  title="Edit task"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(task);
                  }}
                  title="Delete task"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <DialogTitle className="text-base font-semibold text-zinc-100 mt-3 text-left">
            {task.title}
          </DialogTitle>

          {task.description ? (
            <DialogDescription className="text-xs text-zinc-300 mt-2 text-left bg-[#242428]/60 p-3 rounded-lg border border-zinc-800 whitespace-pre-wrap leading-relaxed">
              {task.description}
            </DialogDescription>
          ) : (
            <DialogDescription className="text-xs text-zinc-500 italic mt-1 text-left">
              No description provided.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-2.5 my-3 text-xs text-zinc-300 border-t border-zinc-800/80 pt-3">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-zinc-500" /> Deadline
            </span>
            <span className="font-mono text-zinc-200">{formattedDueDate}</span>
          </div>

          {task.dueTime && (
            <div className="flex items-center justify-between py-1.5 border-t border-zinc-800/40">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-500" /> Time
              </span>
              <span className="font-mono text-zinc-200">{task.dueTime}</span>
            </div>
          )}

          {/* Canvas Link Section */}
          <div className="flex items-center justify-between py-1.5 border-t border-zinc-800/40">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Shapes className={`w-3.5 h-3.5 ${linkedCanvas ? "text-orange-400" : "text-zinc-500"}`} />
              Canvas
            </span>
            {linkedCanvas ? (
              <span
                className="text-orange-300 font-medium truncate max-w-[200px]"
                title={linkedCanvas.title}
              >
                {linkedCanvas.title}
              </span>
            ) : (
              <span className="text-zinc-500 text-xs">Not linked</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
          {linkedCanvas ? (
            <Button
              variant="orange"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                if (onOpenCanvas && task.canvasId) onOpenCanvas(task.canvasId);
              }}
              className="text-xs gap-1.5 font-medium cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Canvas
            </Button>
          ) : (
            <div />
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
