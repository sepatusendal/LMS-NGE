export function getTimeGreeting(hour: number): { text: string; emoji: string } {
  if (hour >= 4 && hour < 11) return { text: "Selamat pagi", emoji: "☀️" };
  if (hour >= 11 && hour < 15) return { text: "Selamat siang", emoji: "🌤️" };
  if (hour >= 15 && hour < 18) return { text: "Selamat sore", emoji: "🌇" };
  return { text: "Selamat malam", emoji: "🌙" };
}
