import * as React from "react";
import { CheckSquare, Shapes, Calendar as CalendarIcon, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { taskRepository } from "@/src/features/calendar/repositories/taskRepository";
import { Task } from "@/src/types";

interface ConvertTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCanvasId?: string;
  currentCanvasTitle?: string;
  onConverted?: (task: Task) => void;
}

export function ConvertTaskDialog({
  open,
  onOpenChange,
  currentCanvasId = "",
  currentCanvasTitle = "Untitled Canvas",
  onConverted,
}: ConvertTaskDialogProps) {
  const [title, setTitle] = React.useState("");
  const [deadline, setDeadline] = React.useState("");
  const [time, setTime] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Initialize form whenever dialog opens
  React.useEffect(() => {
    if (open) {
      setTitle("");
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      setDeadline(todayStr);
      setTime("");
      setDescription("");
      setToastMessage(null);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadline) return;

    const newTask = taskRepository.create({
      title: title.trim(),
      dueDate: deadline,
      dueTime: time.trim() ? time.trim() : undefined,
      description: description.trim() ? description.trim() : undefined,
      status: "todo",
      canvasId: currentCanvasId || null,
    });

    setToastMessage("Task added to Calendar.");

    setTimeout(() => {
      setToastMessage(null);
      onOpenChange(false);
      if (onConverted) onConverted(newTask);
    }, 850);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md bg-[#1b1b1e] border-zinc-800 p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <CheckSquare className="w-4 h-4" />
            </span>
            <DialogTitle className="text-base text-zinc-100 font-semibold">
              Convert to Task
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400 mt-1">
            Turn your current canvas ideas into a scheduled task on your Calendar.
          </DialogDescription>
        </DialogHeader>

        {toastMessage ? (
          <div className="p-4 my-4 text-center rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-300 text-sm font-medium animate-in fade-in-50">
            ✓ {toastMessage}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 my-2 text-left">
            {/* Read-only Source Canvas Context */}
            <div className="bg-[#242428]/80 border border-zinc-800 rounded-lg px-3 py-2 text-xs flex items-center justify-between text-zinc-300">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Shapes className="w-3.5 h-3.5 text-orange-400" />
                Source Canvas:
              </span>
              <span className="font-medium text-orange-300 truncate max-w-[200px]" title={currentCanvasTitle}>
                {currentCanvasTitle}
              </span>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Title <span className="text-orange-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Implement authentication flow"
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
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
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
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#242428] border border-zinc-700/60 text-xs sm:text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
                />
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
                placeholder="Add notes, requirements, or next steps..."
                className="w-full px-3 py-2 rounded-lg bg-[#242428] border border-zinc-700/60 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
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
                className="text-xs px-4 font-medium"
              >
                Add Task
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
