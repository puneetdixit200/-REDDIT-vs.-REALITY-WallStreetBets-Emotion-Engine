import { NextResponse } from "next/server";
import {
  fallbackLiveEvents,
  normalizeApeWisdomLiveEvents,
  normalizeFearGreedEvents,
  normalizeMarketTrendingEvents,
  normalizeRedditLiveEvents
} from "@/lib/culture";
import type {
  ApeWisdomPayload,
  CoinGeckoTrendingPayload,
  FearGreedPayload,
  YahooTrendingPayload
} from "@/lib/culture";

export const dynamic = "force-dynamic";

async function fetchApeWisdom(): Promise<ApeWisdomPayload> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://apewisdom.io/api/v1.0/filter/wallstreetbets", {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "user-agent": "reddit-vs-reality-emotion-engine/1.0"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`ApeWisdom request failed: ${response.status}`);
    }

    return (await response.json()) as ApeWisdomPayload;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchYahooTrending(): Promise<YahooTrendingPayload> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://query1.finance.yahoo.com/v1/finance/trending/US", {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "user-agent": "reddit-vs-reality-emotion-engine/1.0"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Yahoo trending request failed: ${response.status}`);
    }

    return (await response.json()) as YahooTrendingPayload;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchCoinGeckoTrending(): Promise<CoinGeckoTrendingPayload> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://api.coingecko.com/api/v3/search/trending", {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "user-agent": "reddit-vs-reality-emotion-engine/1.0"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`CoinGecko trending request failed: ${response.status}`);
    }

    return (await response.json()) as CoinGeckoTrendingPayload;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFearGreed(): Promise<FearGreedPayload> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://api.alternative.me/fng/?limit=1&format=json", {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "user-agent": "reddit-vs-reality-emotion-engine/1.0"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Fear & Greed request failed: ${response.status}`);
    }

    return (await response.json()) as FearGreedPayload;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRedditTop() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      "https://www.reddit.com/r/wallstreetbets/top.json?limit=8&t=day",
      {
        cache: "no-store",
        headers: {
          accept: "application/json",
          "user-agent": "reddit-vs-reality-emotion-engine/1.0"
        },
        signal: controller.signal
      }
    );

    if (!response.ok) {
      throw new Error(`Reddit request failed: ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const timestamp = Date.now();

  const [apeWisdomResult, yahooResult, coinGeckoResult, fearGreedResult] =
    await Promise.allSettled([
      fetchApeWisdom(),
      fetchYahooTrending(),
      fetchCoinGeckoTrending(),
      fetchFearGreed()
    ]);
  const apeWisdomEvents =
    apeWisdomResult.status === "fulfilled"
      ? normalizeApeWisdomLiveEvents(apeWisdomResult.value, timestamp)
      : [];
  const fearGreedEvents =
    fearGreedResult.status === "fulfilled"
      ? normalizeFearGreedEvents(fearGreedResult.value, timestamp)
      : [];
  const marketTrendingEvents = normalizeMarketTrendingEvents(
    {
      yahoo: yahooResult.status === "fulfilled" ? yahooResult.value : undefined,
      coingecko: coinGeckoResult.status === "fulfilled" ? coinGeckoResult.value : undefined
    },
    timestamp
  );
  const noKeyEvents = [...apeWisdomEvents, ...fearGreedEvents, ...marketTrendingEvents].slice(
    0,
    12
  );

  if (noKeyEvents.length) {
    const sources = [
      apeWisdomEvents.length ? "apewisdom" : "",
      fearGreedEvents.length ? "fear-greed" : "",
      marketTrendingEvents.length ? "market-trending" : ""
    ].filter(Boolean);

    return NextResponse.json(
      {
        events: noKeyEvents,
        source: sources.join("+"),
        updatedAt: new Date(timestamp).toISOString(),
        degraded: apeWisdomEvents.length === 0
      },
      {
        headers: {
          "Cache-Control": "s-maxage=90, stale-while-revalidate=120"
        }
      }
    );
  }

  try {
    const events = normalizeRedditLiveEvents(await fetchRedditTop(), timestamp);
    if (!events.length) {
      throw new Error("Reddit returned no playable events");
    }

    return NextResponse.json(
      {
        events,
        source: "reddit-live",
        updatedAt: new Date(timestamp).toISOString()
      },
      {
        headers: {
          "Cache-Control": "s-maxage=90, stale-while-revalidate=120"
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        events: fallbackLiveEvents(timestamp),
        source: "live-fallback",
        updatedAt: new Date(timestamp).toISOString(),
        error: error instanceof Error ? error.message : "Unknown live event fetch error"
      },
      {
        headers: {
          "Cache-Control": "s-maxage=60, stale-while-revalidate=120"
        }
      }
    );
  }
}
