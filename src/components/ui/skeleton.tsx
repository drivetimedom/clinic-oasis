import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-lg bg-[hsl(0_0%_100%/0.05)]", className)} {...props} />;
}

export { Skeleton };
