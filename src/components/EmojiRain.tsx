"use client";

import type { MoodState } from "@/lib/market";

type EmojiRainProps = {
  mood: MoodState;
};

export function EmojiRain({ mood }: EmojiRainProps) {
  if (mood.label !== "EUPHORIC" && mood.label !== "DESPAIR") {
    return null;
  }

  const glyph = mood.label === "EUPHORIC" ? "🚀" : "💀";

  return (
    <div className="emoji-rain" aria-hidden="true">
      {Array.from({ length: 20 }, (_, index) => (
        <span
          key={index}
          style={{
            left: `${(index * 37) % 100}%`,
            animationDuration: `${2 + (index % 4) * 0.45}s`,
            animationDelay: `${(index % 7) * 0.18}s`
          }}
        >
          {glyph}
        </span>
      ))}
    </div>
  );
}
