import { Progress } from "@/components/ui/progress";

export function MacroBar({
  label,
  logged,
  target,
  unit,
}: {
  label: string;
  logged: number;
  target: number;
  unit: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-neutral-400">
        <span>{label}</span>
        <span>
          {logged}
          {unit} / {target}
          {unit}
        </span>
      </div>
      <Progress value={logged} max={target} />
    </div>
  );
}
