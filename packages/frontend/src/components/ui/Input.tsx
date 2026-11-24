/**
 * @file Input.tsx
 * @description Lightweight styled Input component with icon adornment support.
 * @module @atlas/frontend/components/ui/Input
 */

import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", leftIcon, rightIcon, error, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full rounded-xl bg-slate-900/80 border text-xs text-white placeholder:text-slate-500 transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500/50 ${
            leftIcon ? "pl-9" : "pl-3"
          } ${rightIcon ? "pr-9" : "pr-3"} py-2 ${
            error
              ? "border-rose-500/50 focus:border-rose-500"
              : "border-white/10 focus:border-indigo-500/50"
          } ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 text-slate-400 pointer-events-none flex items-center justify-center">
            {rightIcon}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
