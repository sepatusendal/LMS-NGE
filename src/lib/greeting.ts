export type GreetingKey = "morning" | "afternoon" | "evening" | "night";

const ID_TEXT: Record<GreetingKey, string> = {
  morning: "Selamat pagi",
  afternoon: "Selamat siang",
  evening: "Selamat sore",
  night: "Selamat malam",
};

export function getTimeGreeting(hour: number): { key: GreetingKey; text: string; emoji: string } {
  const key: GreetingKey =
    hour >= 4 && hour < 11
      ? "morning"
      : hour >= 11 && hour < 15
        ? "afternoon"
        : hour >= 15 && hour < 18
          ? "evening"
          : "night";
  const emoji = key === "morning" ? "☀️" : key === "afternoon" ? "🌤️" : key === "evening" ? "🌇" : "🌙";

  return { key, text: ID_TEXT[key], emoji };
}
