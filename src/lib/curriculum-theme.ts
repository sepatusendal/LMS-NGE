// Assigns each curriculum/program a consistent color from the app's 5-color
// chart palette (same colors already used for the lesson-plan form's
// section accents), so a program always renders in the same color across
// every screen — a stable visual identity for the module "cover", not just
// a plain text link.
const THEMES = [
  {
    bar: "bg-chart-1",
    solid: "bg-chart-1",
    soft: "bg-chart-1/10",
    text: "text-chart-1",
    ring: "ring-chart-1/20",
    gradient: "from-chart-1 to-[#7a94dc]",
  },
  {
    bar: "bg-chart-2",
    solid: "bg-chart-2",
    soft: "bg-chart-2/10",
    text: "text-chart-2",
    ring: "ring-chart-2/20",
    gradient: "from-chart-2 to-[#f0895c]",
  },
  {
    bar: "bg-chart-3",
    solid: "bg-chart-3",
    soft: "bg-chart-3/10",
    text: "text-chart-3",
    ring: "ring-chart-3/20",
    gradient: "from-chart-3 to-[#4ecb9c]",
  },
  {
    bar: "bg-chart-4",
    solid: "bg-chart-4",
    soft: "bg-chart-4/10",
    text: "text-chart-4",
    ring: "ring-chart-4/20",
    gradient: "from-chart-4 to-[#f5bc4c]",
  },
  {
    bar: "bg-chart-5",
    solid: "bg-chart-5",
    soft: "bg-chart-5/10",
    text: "text-chart-5",
    ring: "ring-chart-5/20",
    gradient: "from-chart-5 to-[#ef9fc0]",
  },
] as const;

export type CurriculumTheme = (typeof THEMES)[number];

export function getCurriculumTheme(name: string): CurriculumTheme {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return THEMES[hash % THEMES.length];
}
