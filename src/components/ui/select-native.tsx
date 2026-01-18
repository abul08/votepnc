import * as React from "react";
import { cn } from "@/lib/utils";

const SelectNative = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "flex h-10 sm:h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm touch-manipulation",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
SelectNative.displayName = "SelectNative";

export { SelectNative };
