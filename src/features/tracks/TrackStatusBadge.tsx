import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/tracks/model";

const styles: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ACTIVE: "bg-success-soft text-success",
  INACTIVE: "bg-accent text-accent-foreground",
  ARCHIVED: "bg-danger-soft text-destructive",
};
export function TrackStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", styles[status] ?? styles.DRAFT)}>
      <span className="size-1.5 rounded-full bg-current" />
      {statusLabel(status)}
    </span>
  );
}
