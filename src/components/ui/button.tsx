import * as React from "react";
import { cn } from "@/src/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "orange" | "blue" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variantClasses = {
      default: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 active:scale-[0.98] border border-zinc-700/60 shadow-sm",
      secondary: "bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 active:scale-[0.98] border border-zinc-800",
      outline: "border border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800/80 active:scale-[0.98]",
      ghost: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 active:scale-[0.98]",
      orange: "bg-[#f97316] text-white hover:bg-[#ea580c] active:scale-[0.98] shadow-sm font-medium border border-orange-500/30",
      blue: "bg-[#3b82f6] text-white hover:bg-[#2563eb] active:scale-[0.98] shadow-sm font-medium border border-blue-500/30",
      destructive: "bg-red-900/40 text-red-300 border border-red-800/60 hover:bg-red-900/60 active:scale-[0.98]",
    };

    const sizeClasses = {
      default: "h-9 px-4 py-2 text-sm",
      sm: "h-8 rounded-lg px-3 text-xs",
      lg: "h-11 rounded-lg px-6 text-base",
      icon: "h-9 w-9 rounded-lg p-0",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-40 select-none cursor-pointer",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
