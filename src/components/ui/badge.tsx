import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-pink-500 text-white",
        secondary: "border-transparent bg-pink-100 text-pink-700",
        destructive: "border-transparent bg-red-500 text-white",
        outline: "border-pink-200 text-pink-700",
        success: "border-transparent bg-emerald-500 text-white",
        warning: "border-transparent bg-amber-500 text-white",
        pending: "border-transparent bg-yellow-100 text-yellow-700",
        confirmed: "border-transparent bg-blue-100 text-blue-700",
        checked_in: "border-transparent bg-emerald-100 text-emerald-700",
        completed: "border-transparent bg-purple-100 text-purple-700",
        cancelled: "border-transparent bg-slate-100 text-slate-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
