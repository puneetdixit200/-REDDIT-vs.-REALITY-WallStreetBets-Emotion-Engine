import { describe, expect, it } from "vitest";
import {
  BINGO_PHRASES,
  buildSentimentHeatmap,
  detectBingoHits,
  fallbackLiveEvents,
  loadHistoricalEvent,
  normalizeFearGreedEvents,
  normalizeApeWisdomLiveEvents,
  normalizeApeWisdomSentiment,
  normalizeMarketTrendingEvents,
  normalizeRedditLiveEvents,
  rankDelusionEvents
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

  it("turns ApeWisdom WSB ticker momentum into tracked coin sentiment", () => {
    const points = normalizeApeWisdomSentiment(
      {
        results: [
          {
            ticker: "MU",
            name: "Micron Technology",
            mentions: 294,
            upvotes: 2387,
            rank: 1,
            rank_24h_ago: 1,
            mentions_24h_ago: 134
          },
          {
            ticker: "SPY",
            name: "SPDR S&P 500 ETF Trust",
            mentions: 149,
            upvotes: 2499,
            rank: 2,
            rank_24h_ago: 8,
            mentions_24h_ago: 40
          }
        ]
      },
      1779075000000
    );

    expect(points.slice(0, 3).map((point) => point.ticker)).toEqual(["BTC", "ETH", "DOGE"]);
    expect(points[0]).toMatchObject({
      source: "apewisdom",
      timestamp: "2026-05-18T03:30:00.000Z"
    });
    expect(points[0].sentiment).toBeGreaterThan(0.4);
    expect(points.some((point) => point.ticker === "MU")).toBe(true);
    expect(points.map((point) => point.comment).join("\n")).toContain("ApeWisdom");
  });

  it("creates playable ApeWisdom live events from WSB mention spikes", () => {
    const events = normalizeApeWisdomLiveEvents(
      {
        results: [
          {
            ticker: "RKLB",
            name: "Rocket Lab USA",
            mentions: 39,
            upvotes: 188,
            rank: 8,
            rank_24h_ago: 41,
            mentions_24h_ago: 5
          }
        ]
      },
      1779075000000
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      slug: "live-apewisdom-rklb",
      source: "apewisdom",
      title: "LIVE: RKLB mention velocity spike"
    });
    expect(events[0].frames).toHaveLength(4);
    expect(events[0].frames[1].sentiment).toBeGreaterThan(0.5);
  });

  it("normalizes no-key Yahoo and CoinGecko trending payloads into live events", () => {
    const events = normalizeMarketTrendingEvents(
      {
        yahoo: {
          finance: {
            result: [
              {
                quotes: [{ symbol: "BTC-USD" }, { symbol: "NVDA" }]
              }
            ]
          }
        },
        coingecko: {
          coins: [
            {
              item: {
                id: "hyperliquid",
                name: "Hyperliquid",
                symbol: "HYPE",
                market_cap_rank: 13,
                data: {
                  price_change_percentage_24h: {
                    usd: 6.19
                  }
                }
              }
            }
          ]
        }
      },
      1779075000000
    );

    expect(events.map((event) => event.source)).toEqual([
      "market-trending",
      "market-trending",
      "market-trending"
    ]);
    expect(events[0].title).toContain("BTC-USD");
    expect(events[2].title).toContain("Hyperliquid");
  });

  it("normalizes the no-key Fear and Greed index into a playable live event", () => {
    const events = normalizeFearGreedEvents(
      {
        data: [
          {
            value: "78",
            value_classification: "Extreme Greed",
            timestamp: "1779062400"
          }
        ]
      },
      1779075000000
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      slug: "live-fear-greed-extreme-greed",
      source: "fear-greed",
      title: "LIVE: Crypto Fear & Greed prints Extreme Greed (78)"
    });
    expect(events[0].frames).toHaveLength(4);
    expect(events[0].frames[1].sentiment).toBeGreaterThan(0.5);
    expect(events[0].frames[2].priceChange).toBeLessThan(0);
  });

  it("ranks delusion events by their maximum frame gap", () => {
    const ranked = rankDelusionEvents([
      {
        slug: "quiet",
        title: "Quiet",
        caption: "low gap",
        frames: [{ label: "Aligned", sentiment: 0.1, priceChange: 8, volume: 1 }]
      },
      {
        slug: "detached",
        title: "Detached",
        caption: "high gap",
        frames: [{ label: "Opposite", sentiment: 0.92, priceChange: -18, volume: 1 }]
      }
    ]);

    expect(ranked[0]).toMatchObject({
      slug: "detached",
      maxGap: 100,
      trigger: "Opposite"
    });
    expect(ranked[1].slug).toBe("quiet");
  });

  it("provides deterministic live-event fallbacks", () => {
    const liveEvents = fallbackLiveEvents(1779075000000);

    expect(liveEvents.length).toBeGreaterThanOrEqual(3);
    expect(liveEvents.every((event) => event.source === "live-fallback")).toBe(true);
  });
});
