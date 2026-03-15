import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type StatusType = "Present" | "Absent" | "Leave" | "Active" | "Inactive";

const statusStyles: Record<StatusType, string> = {
  Present: "bg-success/10 text-success border-success/20",
  Active: "bg-success/10 text-success border-success/20",
  Absent: "bg-destructive/10 text-destructive border-destructive/20",
  Inactive: "bg-destructive/10 text-destructive border-destructive/20",
  Leave: "bg-warning/10 text-warning border-warning/20",
};

export function StatusBadge({ status }: { status: StatusType }) {
  return (
    <Badge variant="outline" className={cn("font-medium", statusStyles[status])}>
      {status}
    </Badge>
  );
}
