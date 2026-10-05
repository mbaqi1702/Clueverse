import * as React from "react";

const inputStyles =
  "flex h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-slate-100 shadow-sm transition-colors placeholder:text-slate-500 focus-visible:border-amber-300 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-amber-300/15 disabled:cursor-not-allowed disabled:opacity-50";

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
