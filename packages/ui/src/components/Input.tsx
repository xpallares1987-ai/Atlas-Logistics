import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";

const inputVariants = cva(
  "flex w-full rounded-md border bg-transparent text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:placeholder:text-slate-400 dark:focus-visible:ring-indigo-400",
  {
    variants: {
      size: {
        default: "h-10 px-3 py-2",
        sm: "h-9 px-3 py-1",
        lg: "h-12 px-4 py-3 text-base",
      },
      error: {
        true: "border-rose-500 focus-visible:ring-rose-500 dark:border-rose-500 dark:focus-visible:ring-rose-500",
        false: "border-slate-300 dark:border-slate-700",
      },
    },
    defaultVariants: {
      size: "default",
      error: false,
    },
  },
);

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, error, leftIcon, rightIcon, type, ...props }, ref) => {
    if (!leftIcon && !rightIcon) {
      return (
        <input
          type={type}
          className={cn(inputVariants({ size, error, className }))}
          ref={ref}
          {...props}
        />
      );
    }

    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3 flex items-center justify-center text-slate-500 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            inputVariants({ size, error, className }),
            leftIcon && "pl-10",
            rightIcon && "pr-10",
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 flex items-center justify-center text-slate-500 pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input, inputVariants };
