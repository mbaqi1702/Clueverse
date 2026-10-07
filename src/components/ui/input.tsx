import * as React from "react";

const inputStyles =
  "flex h-12 w-full rounded border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 transition-colors placeholder:text-stone-500 focus-visible:border-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700/15 disabled:cursor-not-allowed disabled:opacity-60";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={`${inputStyles} ${className ?? ""}`}
      ref={ref}
      {...props}
    />
  ),
);

Input.displayName = "Input";

export { Input };
