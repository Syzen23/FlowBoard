import * as React from "react";
import {
  Menu,
  Share2,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { WorkspaceSwitcher } from "@/src/features/navigation/WorkspaceSwitcher";
import { DayTaskPanel } from "@/src/features/calendar/components/DayTaskPanel";
import { TaskForm } from "@/src/features/calendar/components/TaskForm";
import { TaskDetail } from "@/src/features/calendar/components/TaskDetail";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import { CanvasMenu } from "@/src/features/canvas/components/CanvasMenu";
import { ShareCanvasDialog } from "@/src/features/canvas/components/ShareCanvasDialog";
import { Task, RouteMode, TaskStatus } from "@/src/types";
import { CanvasManager } from "@/src/features/canvas/hooks/useCanvasManager";
import { useTaskManager } from "@/src/features/calendar/hooks/useTaskManager";

interface CalendarWorkspaceProps {
  onModeChange: (mode: RouteMode) => void;
  onOpenCanvas?: (canvasId: string) => void;
  canvasManager: CanvasManager;
}

export function CalendarWorkspace({
  onModeChange,
  onOpenCanvas,
  canvasManager,
}: CalendarWorkspaceProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);

  // Task dialogs state
  const [taskFormOpen, setTaskFormOpen] = React.useState(false);
  const [taskToEdit, setTaskToEdit] = React.useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = React.useState<Task | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);

  // Canvas manager for workspace switcher and menu
  const {
    canvases,
    activeCanvasId,
    createCanvas,
    renameCanvas,
    deleteCanvas,
  } = canvasManager;

  // Task manager with repository-backed persistence
  const {
    tasks,
    createTask,
    updateTask,
    deleteTask,
    setTaskStatus,
    toggleTaskStatus,
    getTasksForDate,
    hasTasksOnDate,
  } = useTaskManager();

  // Initialize date state with today's date (defaults to August 2026 in environment / prototype)
  const [currentYear, setCurrentYear] = React.useState(() => {
    return new Date().getFullYear();
  });
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    return new Date().getMonth(); // 0-indexed (e.g. 7 = August)
  });
  const [selectedDay, setSelectedDay] = React.useState(() => {
    return new Date().getDate();
  });

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Days in current month calculation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDay(today.getDate());
  };

  // Selected date string in YYYY-MM-DD format
  const selectedDateStr = React.useMemo(() => {
    // Ensure selectedDay does not exceed daysInMonth
    const clampedDay = Math.min(selectedDay, daysInMonth);
    return `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
  }, [currentYear, currentMonth, selectedDay, daysInMonth]);

  // Real today date string in YYYY-MM-DD
  const todayDateStr = React.useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }, []);

  const tasksForSelectedDay = React.useMemo(() => {
    return getTasksForDate(selectedDateStr);
  }, [getTasksForDate, selectedDateStr]);

  // Keep selectedTask updated if tasks list changes
  const activeSelectedTask = React.useMemo(() => {
    if (!selectedTask) return null;
    return tasks.find((t) => t.id === selectedTask.id) || null;
  }, [selectedTask, tasks]);

  // Task creation or edit save handler
  const handleSaveTask = (taskData: {
    title: string;
    dueDate: string;
    dueTime?: string;
    description?: string;
    status: TaskStatus;
    canvasId?: string | null;
  }) => {
    if (taskToEdit) {
      updateTask(taskToEdit.id, {
        title: taskData.title,
        dueDate: taskData.dueDate,
        dueTime: taskData.dueTime,
        description: taskData.description,
        status: taskData.status,
        canvasId: taskData.canvasId !== undefined ? taskData.canvasId : null,
      });
      setTaskToEdit(null);
    } else {
      createTask({
        title: taskData.title,
        dueDate: taskData.dueDate,
        dueTime: taskData.dueTime,
        description: taskData.description,
        status: taskData.status,
        canvasId: taskData.canvasId !== undefined ? taskData.canvasId : null,
      });
    }
  };

  // Trigger task edit dialog
  const handleOpenEditTask = (task: Task) => {
    setSelectedTask(null);
    setTaskToEdit(task);
    setTaskFormOpen(true);
  };

  // Trigger task delete dialog with confirmation
  const handlePromptDeleteTask = (task: Task) => {
    setTaskToDelete(task);
    setConfirmDeleteOpen(true);
  };

  // Execute task delete
  const handleConfirmDelete = () => {
    if (taskToDelete) {
      deleteTask(taskToDelete.id);
      if (selectedTask?.id === taskToDelete.id) {
        setSelectedTask(null);
      }
      setTaskToDelete(null);
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#141416] text-zinc-100 flex flex-col overflow-hidden select-none">
      {/* Background canvas dot grid */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Top Bar Floating Controls */}
      <header className="relative z-20 flex items-center justify-between p-4 sm:p-5 w-full pointer-events-none">
        {/* Left: Hamburger menu */}
        <div className="pointer-events-auto flex items-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setMenuOpen(true)}
            aria-label="Open Canvases Menu"
            className="w-9 h-9 rounded-lg bg-[#1e1e22]/90 hover:bg-[#28282e] border-zinc-800 text-zinc-300 shadow-md"
          >
            <Menu className="w-4 h-4" />
          </Button>
          <span className="hidden sm:inline-block text-xs font-mono text-zinc-500">
            Calendar Planner
          </span>
        </div>

        {/* Right: Share */}
        <div className="pointer-events-auto flex items-center gap-2">
          <Button
            variant="blue"
            size="sm"
            onClick={() => setShareOpen(true)}
            className="text-xs h-8 px-3.5 rounded-lg shadow-md gap-1.5 font-medium"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </Button>
        </div>
      </header>

      {/* Main Calendar Viewport (Centered Dual Panel Layout) */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          {/* Left Panel: Month Calendar (7 cols) */}
          <div className="md:col-span-7 bg-[#1e1e22]/90 backdrop-blur-md rounded-2xl border border-zinc-800 p-5 sm:p-6 shadow-2xl flex flex-col justify-between">
            <div>
              {/* Month navigation header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="Previous month"
                    className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
                    {monthNames[currentMonth]} {currentYear}
                  </h2>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="Next month"
                    className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSelectToday}
                  className="text-[11px] text-zinc-400 hover:text-orange-400 font-medium px-2 py-0.5 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  ( Today )
                </button>
              </div>

              {/* Day of week headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {daysOfWeek.map((day) => (
                  <div
                    key={day}
                    className="text-[11px] font-semibold text-zinc-500 py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Empty prefix cells */}
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-9 sm:h-10" />
                ))}

                {/* Month day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const isSelected = selectedDay === dayNum;
                  const dayHasTasks = hasTasksOnDate(dateString);
                  const isToday = todayDateStr === dateString;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => setSelectedDay(dayNum)}
                      className={`relative h-10 sm:h-11 rounded-xl text-xs font-medium transition-all duration-150 flex flex-col items-center justify-center cursor-pointer ${
                        isSelected
                          ? "bg-[#f97316] text-white font-semibold shadow-md ring-2 ring-orange-500/30"
                          : isToday
                          ? "text-orange-300 font-semibold bg-zinc-800/40 border border-zinc-700/60 hover:bg-zinc-800/80"
                          : "text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-100"
                      }`}
                    >
                      <span className="leading-none">{dayNum}</span>
                      {isToday && (
                        <span
                          className={`mt-0.5 text-[9px] leading-none font-semibold ${
                            isSelected ? "text-white/90" : "text-orange-300"
                          }`}
                        >
                          Today
                        </span>
                      )}
                      {dayHasTasks && !isToday && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                            isSelected ? "bg-white" : "bg-orange-400"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-note */}
            <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Deadline-based visual calendar</span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" /> Tasks scheduled
              </span>
            </div>
          </div>

          {/* Right Panel: Day Task Context Panel (5 cols) */}
          <div className="md:col-span-5 h-full min-h-[360px]">
            <DayTaskPanel
              selectedDate={selectedDateStr}
              tasks={tasksForSelectedDay}
              onNewTask={() => {
                setTaskToEdit(null);
                setTaskFormOpen(true);
              }}
              onSelectTask={(task) => setSelectedTask(task)}
              onToggleTaskStatus={toggleTaskStatus}
              onEditTask={handleOpenEditTask}
              onDeleteTask={handlePromptDeleteTask}
            />
          </div>
        </div>
      </main>

      {/* Bottom Workspace Switcher */}
      <footer className="relative z-20 w-full p-4 sm:p-5 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <WorkspaceSwitcher currentMode="calendar" onModeChange={onModeChange} />
        </div>
      </footer>

      {/* Modals & Dialogs */}
      <CanvasMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        canvases={canvases}
        activeCanvasId={activeCanvasId}
        onSelectCanvas={(id) => {
          if (onOpenCanvas) onOpenCanvas(id);
        }}
        onCreateCanvas={async () => {
          const created = await createCanvas();
          if (created && onOpenCanvas) {
            onOpenCanvas(created.id);
          }
        }}
        onRenameCanvas={renameCanvas}
        onDeleteCanvas={deleteCanvas}
      />

      <ShareCanvasDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        canvasTitle="FlowBoard Schedule"
      />

      {/* Task Create / Edit Form */}
      <TaskForm
        open={taskFormOpen}
        onOpenChange={(open) => {
          setTaskFormOpen(open);
          if (!open) setTaskToEdit(null);
        }}
        initialDate={selectedDateStr}
        taskToEdit={taskToEdit}
        canvases={canvases}
        onSave={handleSaveTask}
      />

      {/* Task Detail Dialog */}
      <TaskDetail
        task={activeSelectedTask}
        open={Boolean(activeSelectedTask)}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null);
        }}
        canvases={canvases}
        onOpenCanvas={(canvasId) => {
          setSelectedTask(null);
          if (onOpenCanvas) onOpenCanvas(canvasId);
        }}
        onEdit={handleOpenEditTask}
        onDelete={handlePromptDeleteTask}
        onStatusChange={setTaskStatus}
      />

      {/* Delete Task Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={(open) => {
          setConfirmDeleteOpen(open);
          if (!open) setTaskToDelete(null);
        }}
        title="Delete Task"
        description={
          taskToDelete
            ? `Are you sure you want to delete "${taskToDelete.title}"? This action cannot be undone.`
            : "Are you sure you want to delete this task?"
        }
        confirmLabel="Delete Task"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
