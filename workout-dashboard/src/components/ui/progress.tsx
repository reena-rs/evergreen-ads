import { cn } from "@/lib/utils";

export function Progress({
  value,
  max = 100,
  className,
  barClassName,
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-neutral-800", className)}>
      <div
        className={cn("h-full rounded-full bg-emerald-500 transition-all", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
