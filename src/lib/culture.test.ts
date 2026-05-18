import { describe, expect, it } from "vitest";
import {
  BINGO_PHRASES,
  buildSentimentHeatmap,
  detectBingoHits,
  fallbackLiveEvents,
  loadHistoricalEvent,
  normalizeRedditLiveEvents
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
    expect(loadHistoricalEvent("doge-snl")?.title).toContain("DOGE");
    expect(loadHistoricalEvent("amc-squeeze")?.frames.at(-1)?.priceChange).toBeLessThan(0);
    expect(loadHistoricalEvent("missing")).toBeUndefined();
  });

  it("normalizes Reddit top posts into playable live events", () => {
    const liveEvents = normalizeRedditLiveEvents(
      {
        data: {
          children: [
            {
              data: {
                id: "abc123",
                title: "NVDA calls to the moon",
                ups: 4200,
                num_comments: 900,
                created_utc: 1779074104,
                permalink: "/r/wallstreetbets/comments/abc123/nvda_calls/"
              }
            }
          ]
        }
      },
      1779075000000
    );

    expect(liveEvents).toHaveLength(1);
    expect(liveEvents[0]).toMatchObject({
      slug: "live-wsb-abc123",
      source: "live",
      url: "https://www.reddit.com/r/wallstreetbets/comments/abc123/nvda_calls/"
    });
    expect(liveEvents[0].frames).toHaveLength(4);
  });

  it("provides deterministic live-event fallbacks", () => {
    const liveEvents = fallbackLiveEvents(1779075000000);

    expect(liveEvents.length).toBeGreaterThanOrEqual(3);
    expect(liveEvents.every((event) => event.source === "live-fallback")).toBe(true);
  });
});
