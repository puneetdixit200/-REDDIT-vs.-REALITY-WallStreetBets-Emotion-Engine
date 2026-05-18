import { NextResponse } from "next/server";
import {
  buildFallbackCoins,
  normalizeCoinMarkets,
  normalizeMarketChart,
  TRACKED_COINS,
  type CoinGeckoMarket,
  type CoinGeckoMarketChart
} from "@/lib/market";

export const dynamic = "force-dynamic";

const MARKET_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,dogecoin&order=market_cap_desc&per_page=3&page=1&sparkline=true&price_change_percentage=24h";

async function fetchJson<T>(url: string, timeoutMs = 9000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  try {
    const markets = await fetchJson<CoinGeckoMarket[]>(MARKET_URL);
    const coins = normalizeCoinMarkets(markets);
    const histories = await Promise.allSettled(
      TRACKED_COINS.map((coin) =>
        fetchJson<CoinGeckoMarketChart>(
          `https://api.coingecko.com/api/v3/coins/${coin.id}/market_chart?vs_currency=usd&days=1`
        )
      )
    );

    const coinsWithHistory = coins.map((coin) => {
      const historyResult = histories[TRACKED_COINS.findIndex((tracked) => tracked.id === coin.id)];
      const history =
        historyResult?.status === "fulfilled"
          ? normalizeMarketChart(historyResult.value)
          : [];

      return {
        ...coin,
        history: history.length > 2 ? history : coin.history
      };
    });

    if (!coinsWithHistory.length) {
      throw new Error("CoinGecko returned no tracked coins");
    }

    return NextResponse.json(
      {
        coins: coinsWithHistory,
        source: "coingecko",
        updatedAt: new Date().toISOString()
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        coins: buildFallbackCoins(),
        source: "fallback",
        updatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown price fetch error"
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
