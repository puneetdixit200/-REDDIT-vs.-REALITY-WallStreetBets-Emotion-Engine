import { NextResponse } from "next/server";
import {
  buildFallbackCoins,
  mergeProviderQuotes,
  normalizeCoinMarkets,
  normalizeBinanceTickerPayload,
  normalizeCoinbaseSpot,
  normalizeKrakenTickerPayload,
  normalizeMarketChart,
  TRACKED_COINS,
  type BinanceTicker,
  type CoinGeckoMarket,
  type CoinGeckoMarketChart,
  type CoinbaseSpotPayload,
  type KrakenTickerPayload,
  type ProviderQuote
} from "@/lib/market";

export const dynamic = "force-dynamic";

const MARKET_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,dogecoin&order=market_cap_desc&per_page=3&page=1&sparkline=true&price_change_percentage=24h";
const BINANCE_URL =
  "https://api.binance.us/api/v3/ticker/24hr?symbols=%5B%22BTCUSD%22,%22ETHUSD%22,%22DOGEUSD%22%5D";
const KRAKEN_URL = "https://api.kraken.com/0/public/Ticker?pair=XBTUSD,ETHUSD,DOGEUSD";

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

async function fetchBinanceQuotes(): Promise<ProviderQuote[]> {
  return normalizeBinanceTickerPayload(await fetchJson<BinanceTicker[]>(BINANCE_URL, 7000));
}

async function fetchKrakenQuotes(): Promise<ProviderQuote[]> {
  return normalizeKrakenTickerPayload(await fetchJson<KrakenTickerPayload>(KRAKEN_URL, 7000));
}

async function fetchCoinbaseQuotes(): Promise<ProviderQuote[]> {
  const quotes = await Promise.allSettled(
    TRACKED_COINS.map((coin) =>
      fetchJson<CoinbaseSpotPayload>(
        `https://api.coinbase.com/v2/prices/${coin.symbol}-USD/spot`,
        7000
      )
    )
  );

  return quotes.flatMap((result) => {
    if (result.status !== "fulfilled") {
      return [];
    }

    const quote = normalizeCoinbaseSpot(result.value);

    return quote ? [quote] : [];
  });
}

async function fetchFallbackPriceCoins() {
  const timestamp = Date.now();
  const results = await Promise.allSettled([
    fetchBinanceQuotes(),
    fetchKrakenQuotes(),
    fetchCoinbaseQuotes()
  ]);
  const quotes = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );
  const providerCoins = mergeProviderQuotes(quotes, timestamp);

  if (!providerCoins.length) {
    return {
      coins: buildFallbackCoins(timestamp),
      source: "synthetic fallback"
    };
  }

  const syntheticCoins = buildFallbackCoins(timestamp);
  const coins = TRACKED_COINS.map(
    (tracked) =>
      providerCoins.find((coin) => coin.symbol === tracked.symbol) ??
      syntheticCoins.find((coin) => coin.symbol === tracked.symbol)
  ).filter((coin): coin is NonNullable<typeof coin> => Boolean(coin));
  const sources = Array.from(new Set(quotes.map((quote) => quote.source)));

  return {
    coins,
    source: `${sources.join(" + ")} fallback`
  };
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
    const fallback = await fetchFallbackPriceCoins();

    return NextResponse.json(
      {
        coins: fallback.coins,
        source: fallback.source,
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
