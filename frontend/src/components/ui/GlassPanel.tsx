import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export function GlassPanel({
  className,
  strong,
  ...props
}: HTMLAttributes<HTMLDivElement> & { strong?: boolean }) {
  return (
    <div
      className={cn(strong ? "glass-panel-strong" : "glass-panel", className)}
      {...props}
    />
  );
}
