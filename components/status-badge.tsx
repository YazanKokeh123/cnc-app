import clsx from "clsx";
import type { PositionStatus } from "@/lib/types";

const labels: Record<PositionStatus, string> = {
  open: "Offen",
  in_progress: "In Arbeit",
  done: "Fertig"
};

export function StatusBadge({ status }: { status: PositionStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex min-w-24 justify-center rounded px-2.5 py-1 text-xs font-semibold",
        status === "open" && "bg-slate-100 text-slate-700",
        status === "in_progress" && "bg-amber-100 text-amber-800",
        status === "done" && "bg-emerald-100 text-emerald-800"
      )}
    >
      {labels[status]}
    </span>
  );
}
