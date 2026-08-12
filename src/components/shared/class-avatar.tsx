import { cn } from "@/lib/utils";
import { getCurriculumTheme } from "@/lib/curriculum-theme";

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Colored initials avatar, themed the same way as its module cover — gives
 * every class a consistent, recognizable identity across screens instead
 * of a generic icon-in-a-box every card seems to default to. */
export function ClassAvatar({
  name,
  themeKey,
  size = "md",
  className,
}: {
  name: string;
  themeKey?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const theme = getCurriculumTheme(themeKey ?? name);
  const sizeClasses = {
    sm: "size-9 text-xs",
    md: "size-11 text-sm",
    lg: "size-14 text-lg",
  }[size];

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-bold text-white shadow-sm",
        theme.gradient,
        sizeClasses,
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
