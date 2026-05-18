import { describe, expect, it } from "vitest";
import {
  appendPriceTick,
  calculateDelusionGap,
  calculateListeningOutcome,
  classifyDelusion,
  classifyMood,
  generateSyntheticSentiment,
  mergeProviderQuotes,
  normalizeCoinMarkets,
  normalizeBinanceTickerPayload,
  normalizeCoinbaseSpot,
  normalizeKrakenTickerPayload,
  normalizeSentimentScore
} from "./market";

describe("market math", () => {
  it("maps sentiment from -1..1 into percentage reality-gap space", () => {
    expect(normalizeSentimentScore(0.72)).toBe(72);
    expect(normalizeSentimentScore(-0.3)).toBe(-30);
    expect(normalizeSentimentScore(2)).toBe(100);
    expect(normalizeSentimentScore(Number.NaN)).toBe(0);
  });

  it("calculates absolute delusion gap and clamps the result to 100", () => {
    expect(calculateDelusionGap(0.8, -15)).toBe(95);
    expect(calculateDelusionGap(-0.8, 80)).toBe(100);
  });

  it("classifies gauge states with stable threshold labels", () => {
    expect(classifyDelusion(12).label).toBe("Rational");
    expect(classifyDelusion(45).label).toBe("Mild Copium");
    expect(classifyDelusion(73).label).toBe("Heavy Copium");
    expect(classifyDelusion(91).label).toBe("FULL DELUSION");
  });

  it("classifies the WallStreetBets heartbeat mood", () => {
    expect(classifyMood(0.91).label).toBe("EUPHORIC");
    expect(classifyMood(-0.74).label).toBe("DESPAIR");
    expect(classifyMood(0.08).label).toBe("CONFUSED");
  });

  it("calculates the if-you-listened outcome from high and low sentiment entries", () => {
    const outcome = calculateListeningOutcome({
      symbol: "DOGE",
      currentPrice: 0.2,
      highestSentimentPrice: 0.8,
      lowestSentimentPrice: 0.1,
      investment: 1000
    });

    expect(outcome.highSentimentValue).toBe(250);
    expect(outcome.lowSentimentValue).toBe(2000);
    expect(outcome.redditDelta).toBe(-750);
    expect(outcome.contrarianDelta).toBe(1000);
  });

  it("turns CoinGecko market payloads into dashboard coin records", () => {
    const coins = normalizeCoinMarkets([
      {
        id: "bitcoin",
        symbol: "btc",
        name: "Bitcoin",
        current_price: 65000,
        market_cap: 100,
        price_change_percentage_24h: -2.4,
        sparkline_in_7d: { price: [64000, 65000] },
        last_updated: "2026-05-18T00:00:00.000Z"
      }
    ]);

    expect(coins[0]).toMatchObject({
      id: "bitcoin",
      symbol: "BTC",
      name: "Bitcoin",
      currentPrice: 65000,
      change24h: -2.4,
      sparkline: [64000, 65000]
    });
  });

  it("normalizes Binance US fallback ticker payloads", () => {
    const quotes = normalizeBinanceTickerPayload([
      {
        symbol: "BTCUSD",
        lastPrice: "76992.61",
        priceChangePercent: "-1.505",
        closeTime: 1779082705294
      }
    ]);

    expect(quotes).toEqual([
      {
        symbol: "BTC",
        currentPrice: 76992.61,
        change24h: -1.505,
        source: "binance-us",
        lastUpdated: "2026-05-18T05:38:25.294Z"
      }
    ]);
  });

  it("normalizes Kraken fallback ticker payloads", () => {
    const quotes = normalizeKrakenTickerPayload({
      error: [],
      result: {
        XXBTZUSD: {
          c: ["76955.8"],
          o: "77410.1"
        },
        XDGUSD: {
          c: ["0.1064792"],
          o: "0.1089299"
        }
      }
    });

    expect(quotes[0]).toMatchObject({
      symbol: "BTC",
      currentPrice: 76955.8,
      source: "kraken"
    });
    expect(quotes[0].change24h).toBeCloseTo(-0.5869, 4);
    expect(quotes[1].symbol).toBe("DOGE");
  });

  it("normalizes Coinbase spot fallback payloads", () => {
    expect(
      normalizeCoinbaseSpot({
        data: { amount: "76949.675", base: "BTC", currency: "USD" }
      })
    ).toMatchObject({
      symbol: "BTC",
      currentPrice: 76949.675,
      source: "coinbase"
    });
  });

  it("merges provider quotes into complete tracked coin records", () => {
    const coins = mergeProviderQuotes(
      [
        { symbol: "BTC", currentPrice: 10, change24h: 5, source: "binance-us" },
        { symbol: "ETH", currentPrice: 20, change24h: -2, source: "kraken" },
        { symbol: "BTC", currentPrice: 11, change24h: 6, source: "coinbase" }
      ],
      1700000000000
    );

    expect(coins.map((coin) => coin.symbol)).toEqual(["BTC", "ETH"]);
    expect(coins[0].currentPrice).toBe(10);
    expect(coins[0].history.at(-1)?.value).toBe(10);
    expect(coins[0].change24h).toBe(5);
  });

  it("appends websocket ticks without letting charts grow forever", () => {
    const points = Array.from({ length: 4 }, (_, index) => ({
      time: index,
      value: index + 1
    }));

    expect(appendPriceTick(points, { time: 5, value: 9 }, 3)).toEqual([
      { time: 2, value: 3 },
      { time: 3, value: 4 },
      { time: 5, value: 9 }
    ]);
  });

  it("generates deterministic fallback WSB sentiment when the public API is challenged", () => {
    const first = generateSyntheticSentiment(1700000000000, "BTC");
    const second = generateSyntheticSentiment(1700000000000, "BTC");

    expect(first).toEqual(second);
    expect(first.ticker).toBe("BTC");
    expect(first.sentiment).toBeGreaterThanOrEqual(-1);
    expect(first.sentiment).toBeLessThanOrEqual(1);
    expect(first.comment).toContain("BTC");
  });
});
