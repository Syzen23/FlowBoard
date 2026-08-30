import * as React from "react";
import { Calendar as CalendarIcon, Shapes } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { RouteMode } from "@/src/types";

interface WorkspaceSwitcherProps {
  currentMode: RouteMode;
  onModeChange: (mode: RouteMode) => void;
  className?: string;
}

export function WorkspaceSwitcher({
  currentMode,
  onModeChange,
  className,
}: WorkspaceSwitcherProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center p-1 rounded-full bg-[#1e1e22]/90 backdrop-blur-md border border-zinc-800 shadow-xl",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onModeChange("calendar")}
        className={cn(
          "flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-150 cursor-pointer select-none",
          currentMode === "calendar"
            ? "bg-zinc-700/80 text-white shadow-sm"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
        )}
      >
        <CalendarIcon className="w-3.5 h-3.5" />
        <span>Calendar</span>
      </button>

      <button
        type="button"
        onClick={() => onModeChange("canvas")}
        className={cn(
          "flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-150 cursor-pointer select-none",
          currentMode === "canvas"
            ? "bg-zinc-700/80 text-white shadow-sm"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
        )}
      >
        <Shapes className="w-3.5 h-3.5" />
        <span>Canvas</span>
      </button>
    </div>
  );
}
