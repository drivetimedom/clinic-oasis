import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary/10 text-primary",
        secondary: "border-border bg-secondary text-secondary-foreground",
        destructive: "border-destructive/20 bg-destructive/10 text-destructive",
        outline: "border-border text-foreground",
        success: "border-[hsl(142_69%_58%/0.2)] bg-[hsl(142_69%_58%/0.1)] text-[hsl(142_69%_58%)]",
        warning: "border-[hsl(45_93%_47%/0.2)] bg-[hsl(45_93%_47%/0.1)] text-[hsl(45_93%_47%)]",
        info: "border-[hsl(217_91%_60%/0.2)] bg-[hsl(217_91%_60%/0.1)] text-[hsl(217_91%_60%)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
