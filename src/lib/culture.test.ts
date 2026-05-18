import { describe, expect, it } from "vitest";
import {
  BINGO_PHRASES,
  buildSentimentHeatmap,
  detectBingoHits,
  loadHistoricalEvent
} from "./culture";

describe("WSB culture helpers", () => {
  it("marks bingo phrases found in comment text", () => {
    const hits = detectBingoHits([
      "diamond hands until my wife finds out",
      "YOLO calls and smooth brain math"
    ]);

    expect(hits).toEqual(
      expect.arrayContaining(["diamond hands", "wife", "YOLO", "smooth brain"])
    );
    expect(hits.length).toBeLessThanOrEqual(BINGO_PHRASES.length);
  });

  it("builds a 7 by 24 heatmap with sentiment averages per hour", () => {
    const heatmap = buildSentimentHeatmap([
      { timestamp: "2026-05-18T00:10:00.000Z", sentiment: 0.5 },
      { timestamp: "2026-05-18T00:40:00.000Z", sentiment: 1 },
      { timestamp: "2026-05-17T13:00:00.000Z", sentiment: -0.5 }
    ]);

    expect(heatmap).toHaveLength(7);
    expect(heatmap[0].hours).toHaveLength(24);
    expect(heatmap[0].hours[0].sentiment).toBe(0.75);
    expect(heatmap[1].hours[13].sentiment).toBe(-0.5);
  });

  it("loads predefined historical delusion events by slug", () => {
    const event = loadHistoricalEvent("gme-squeeze");

    expect(event?.title).toContain("GameStop");
    expect(event?.frames.length).toBeGreaterThan(2);
    expect(loadHistoricalEvent("missing")).toBeUndefined();
  });
});
