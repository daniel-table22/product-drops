import * as React from "react";
import { cn } from "@/lib/cn";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-3 border border-neutral-7 bg-surface px-3 py-1",
        "text-size-2 text-neutral-12 placeholder:text-neutral-9",
        "outline-none transition-colors",
        "focus:border-accent-8 focus:ring-1 focus:ring-accent-8",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
