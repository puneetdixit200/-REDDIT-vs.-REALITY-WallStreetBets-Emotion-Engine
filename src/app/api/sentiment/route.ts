import { NextResponse } from "next/server";
import {
  generateSyntheticSentiment,
  TRACKED_COINS,
  clamp,
  roundTo,
  type SentimentPoint
} from "@/lib/market";

export const dynamic = "force-dynamic";

type TradestieRecord = {
  ticker?: string;
  sentiment?: string | number;
  sentiment_score?: string | number;
  no_of_comments?: string | number;
  comment_volume?: string | number;
  comments?: string | number;
};

const sampleComments = [
  "diamond hands detected while the chart looks tired",
  "YOLO calls posted with suspicious confidence",
  "smooth brain math says the dip is optional",
  "loss porn loading, paper hands exiting",
  "moon thesis survives another candle",
  "copium reserves remain above strategic levels"
];

async function fetchTradestie(): Promise<TradestieRecord[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch("https://tradestie.com/api/v1/apps/reddit", {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "user-agent": "reddit-vs-reality-emotion-engine/1.0"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Tradestie request failed: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new Error("Tradestie returned non-JSON content");
    }

    return (await response.json()) as TradestieRecord[];
  } finally {
    clearTimeout(timeout);
  }
}

function parseSentiment(record: TradestieRecord): number {
  const rawScore = Number(record.sentiment_score ?? record.sentiment);
  if (Number.isFinite(rawScore)) {
    return clamp(rawScore, -1, 1);
  }

  const label = String(record.sentiment ?? "").toLowerCase();
  if (label.includes("bull")) {
    return 0.64;
  }

  if (label.includes("bear")) {
    return -0.64;
  }

  return 0;
}

function normalizeTradestie(records: TradestieRecord[], timestamp: number): SentimentPoint[] {
  return records
    .filter((record) => record.ticker)
    .slice(0, 24)
    .map((record, index) => {
      const ticker = String(record.ticker).toUpperCase();
      const sentiment = roundTo(parseSentiment(record), 2);
      const volume = Number(
        record.no_of_comments ?? record.comment_volume ?? record.comments ?? 0
      );

      return {
        ticker,
        sentiment,
        volume: Number.isFinite(volume) ? Math.max(0, Math.round(volume)) : 0,
        timestamp: new Date(timestamp).toISOString(),
        comment: `${ticker}: ${sampleComments[index % sampleComments.length]}`,
        source: "tradestie" as const
      };
    });
}

function buildSyntheticBatch(timestamp: number): SentimentPoint[] {
  return TRACKED_COINS.map((coin, index) =>
    generateSyntheticSentiment(timestamp - index * 1000, coin.symbol)
  );
}

export async function GET() {
  const timestamp = Date.now();

  try {
    const tradestie = normalizeTradestie(await fetchTradestie(), timestamp);
    if (!tradestie.length) {
      throw new Error("Tradestie returned no sentiment records");
    }

    const trackedFallbacks = buildSyntheticBatch(timestamp).filter(
      (point) => !tradestie.some((item) => item.ticker === point.ticker)
    );
    const items = [...trackedFallbacks, ...tradestie].slice(0, 30);

    return NextResponse.json(
      {
        items,
        comments: items.map((item) => item.comment),
        source: "tradestie",
        degraded: trackedFallbacks.length > 0,
        updatedAt: new Date(timestamp).toISOString()
      },
      {
        headers: {
          "Cache-Control": "s-maxage=60, stale-while-revalidate=60"
        }
      }
    );
  } catch (error) {
    const items = buildSyntheticBatch(timestamp);

    return NextResponse.json(
      {
        items,
        comments: items.map((item) => item.comment),
        source: "synthetic",
        degraded: true,
        updatedAt: new Date(timestamp).toISOString(),
        error: error instanceof Error ? error.message : "Unknown sentiment fetch error"
      },
      {
        headers: {
          "Cache-Control": "s-maxage=30, stale-while-revalidate=30"
        }
      }
    );
  }
}
