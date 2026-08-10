import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Groups a stretch of dashboard cards under a labeled section so a long
 * column of cards reads as organized zones instead of one undifferentiated
 * stack. */
export function SectionHeading({
  title,
  description,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="text-muted-foreground size-4" />}
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="text-muted-foreground text-xs">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
