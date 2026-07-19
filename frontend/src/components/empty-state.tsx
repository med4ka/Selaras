import { cn } from "@/utils/cn";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-surface p-8 shadow-sm text-center",
        className
      )}
    >
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-canvas">
        <Icon className="h-5 w-5 text-ink-muted" aria-hidden="true" />
      </div>
      <h3 className="mb-1 text-sm font-medium text-ink">{title}</h3>
      <p className="text-sm text-ink-muted">{description}</p>
    </div>
  );
}
