import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";
import { ChevronDown } from "lucide-react";

const selectVariants = cva(
  "flex w-full appearance-none rounded-md border bg-transparent text-sm shadow-sm transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:placeholder:text-slate-400 dark:focus-visible:ring-indigo-400 [&>option]:text-slate-900",
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

export interface SelectProps
  extends
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">,
    VariantProps<typeof selectVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      size,
      error,
      leftIcon,
      rightIcon = <ChevronDown className="h-4 w-4 opacity-50" />,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3 flex items-center justify-center text-slate-500 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <select
          className={cn(
            selectVariants({ size, error, className }),
            leftIcon && "pl-10",
            rightIcon && "pr-10",
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        {rightIcon && (
          <div className="absolute right-3 flex items-center justify-center text-slate-500 pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>
    );
  },
);
Select.displayName = "Select";

export { Select, selectVariants };
