import React, { forwardRef } from "react";
import { cn } from "../utils/cn";

export interface SwitchProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  containerClassName?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, containerClassName, ...props }, ref) => {
    return (
      <label
        className={cn(
          "relative inline-flex items-center cursor-pointer",
          containerClassName,
        )}
      >
        <input type="checkbox" className="sr-only peer" ref={ref} {...props} />
        <div
          className={cn(
            "w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed peer-disabled:opacity-50 peer-disabled:cursor-not-allowed",
            className,
          )}
        ></div>
      </label>
    );
  },
);
Switch.displayName = "Switch";
