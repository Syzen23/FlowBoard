import * as React from "react";
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Shapes,
  Clock3,
  Edit2,
  Trash2,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Task } from "@/src/types";

interface DayTaskPanelProps {
  selectedDate: string; // YYYY-MM-DD
  tasks: Task[];
  onNewTask: () => void;
  onSelectTask: (task: Task) => void;
  onToggleTaskStatus?: (taskId: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
}

export function DayTaskPanel({
  selectedDate,
  tasks,
  onNewTask,
  onSelectTask,
  onToggleTaskStatus,
  onEditTask,
  onDeleteTask,
}: DayTaskPanelProps) {
  // Format readable date like "August — 25"
  const formattedDateHeader = React.useMemo(() => {
    try {
      const [year, month, day] = selectedDate.split("-").map(Number);
      const dateObj = new Date(year, month - 1, day);
      const monthName = dateObj.toLocaleString("en-US", { month: "long" });
      return `${monthName} — ${day}`;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e22]/90 backdrop-blur-md rounded-2xl border border-zinc-800 p-5 shadow-2xl">
      {/* Date Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
            {formattedDateHeader}
          </h2>
          <span className="text-[11px] text-zinc-400 font-mono">
            {tasks.length === 0
              ? "0 tasks scheduled"
              : `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} scheduled`}
          </span>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2">
        {tasks.length === 0 ? (
          <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center p-6 text-zinc-500">
            <p className="text-xs font-medium text-zinc-400">No tasks scheduled.</p>
            <p className="text-[11px] text-zinc-600 mt-1">
              Add a task with a deadline for this date.
            </p>
          </div>
        ) : (
          tasks.map((task) => {
            const isDone = task.status === "done";
            const isInProgress = task.status === "in_progress";

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                  isDone
                    ? "bg-[#18181a]/60 border-zinc-800/50 opacity-65"
                    : isInProgress
                    ? "bg-[#25252a]/95 hover:bg-[#2c2c33] border-amber-500/30 shadow-xs"
                    : "bg-[#25252a]/80 hover:bg-[#2c2c33] border-zinc-700/60 shadow-xs"
                }`}
              >
                {/* Status toggle checkbox */}
                <button
                  type="button"
                  title={isDone ? "Mark as to do" : "Mark as done"}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleTaskStatus) onToggleTaskStatus(task.id);
                  }}
                  className="mt-0.5 text-zinc-500 hover:text-orange-400 transition-colors shrink-0 cursor-pointer"
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isInProgress ? (
                    <Clock3 className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`text-xs font-medium truncate ${
                        isDone
                          ? "line-through text-zinc-400"
                          : "text-zinc-200 group-hover:text-zinc-100"
                      }`}
                    >
                      {task.title}
                    </h3>

                    {/* Status Badge */}
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold shrink-0 ${
                        isDone
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : isInProgress
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                      }`}
                    >
                      {task.status === "in_progress"
                        ? "In Progress"
                        : task.status === "done"
                        ? "Done"
                        : "To Do"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-400">
                    {task.dueTime && (
                      <span className="flex items-center gap-1 font-mono text-zinc-400">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        {task.dueTime}
                      </span>
                    )}
                    {task.canvasId && (
                      <span className="flex items-center gap-1 text-orange-400/90 font-medium truncate">
                        <Shapes className="w-3 h-3 text-orange-400" />
                        Canvas
                      </span>
                    )}
                  </div>
                </div>

                {/* Hover action buttons */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 ml-1">
                  {onEditTask && (
                    <button
                      type="button"
                      title="Edit task"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTask(task);
                      }}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                  {onDeleteTask && (
                    <button
                      type="button"
                      title="Delete task"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTask(task);
                      }}
                      className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Task Button */}
      <div className="pt-3 border-t border-zinc-800/80">
        <Button
          variant="orange"
          size="sm"
          onClick={onNewTask}
          className="w-full text-xs font-medium py-2 rounded-xl justify-center gap-1.5 shadow-md"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </Button>
      </div>
    </div>
  );
}
