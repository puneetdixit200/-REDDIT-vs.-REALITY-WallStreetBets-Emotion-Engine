export type DelusionState = {
  label: "Rational" | "Mild Copium" | "Heavy Copium" | "FULL DELUSION";
  severity: "calm" | "mild" | "heavy" | "critical";
  color: string;
  alert: boolean;
};

export type MoodState = {
  label: "EUPHORIC" | "GREED" | "CONFUSED" | "FEAR" | "DESPAIR";
  color: string;
  icon: string;
};

export type SentimentPoint = {
  ticker: string;
  sentiment: number;
  volume: number;
  timestamp: string;
  comment: string;
  source: "tradestie" | "synthetic" | "historical";
};

export type PricePoint = {
  time: number;
  value: number;
};

export type CoinRecord = {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  currentPrice: number;
  change24h: number;
  marketCap: number;
  sparkline: number[];
  history: PricePoint[];
  lastUpdated: string;
};

export type PriceProviderSource = "binance-us" | "kraken" | "coinbase";

export type ProviderQuote = {
  symbol: string;
  currentPrice: number;
  change24h?: number | undefined;
  source: PriceProviderSource;
  lastUpdated?: string | undefined;
};

export type CoinGeckoMarket = {
  id?: string;
  symbol?: string;
  name?: string;
  image?: string;
  current_price?: number;
  market_cap?: number;
  price_change_percentage_24h?: number;
  sparkline_in_7d?: {
    price?: number[];
  };
  last_updated?: string;
};

export type CoinGeckoMarketChart = {
  prices?: Array<[number, number]>;
};

export type BinanceTicker = {
  symbol?: string;
  lastPrice?: string;
  priceChangePercent?: string;
  closeTime?: number;
};

export type KrakenTickerPayload = {
  error?: string[];
  result?: Record<
    string,
    {
      c?: string[];
      o?: string;
    }
  >;
};

export type CoinbaseSpotPayload = {
  data?: {
    amount?: string;
    base?: string;
    currency?: string;
  };
};

type ListeningInput = {
  symbol: string;
  currentPrice: number;
  highestSentimentPrice: number;
  lowestSentimentPrice: number;
  investment: number;
};

export const TRACKED_COINS = [
  { id: "bitcoin", symbol: "BTC", coincap: "bitcoin" },
  { id: "ethereum", symbol: "ETH", coincap: "ethereum" },
  { id: "dogecoin", symbol: "DOGE", coincap: "dogecoin" }
] as const;

const coinNames: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  DOGE: "Dogecoin"
};

const coinIds: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  DOGE: "dogecoin"
};

const fallbackComments = [
  "BTC diamond hands into the void",
  "ETH is either a thesis or a group hallucination",
  "DOGE rockets loaded, math optional",
  "BTC bears got paid, bulls got a lesson",
  "ETH smooth brain confidence remains elevated",
  "DOGE bagholders refreshing charts like it owes them money"
];

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

export function roundTo(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function normalizeSentimentScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return roundTo(clamp(score, -1, 1) * 100, 2);
}

export function calculateDelusionGap(
  sentimentScore: number,
  priceChangePercentage: number
): number {
  const sentiment = normalizeSentimentScore(sentimentScore);
  const price = clamp(priceChangePercentage, -100, 100);

  return roundTo(clamp(Math.abs(sentiment - price), 0, 100), 2);
}

export function classifyDelusion(gap: number): DelusionState {
  const value = clamp(gap, 0, 100);

  if (value > 80) {
    return {
      label: "FULL DELUSION",
      severity: "critical",
      color: "#ea3943",
      alert: true
    };
  }

  if (value > 60) {
    return {
      label: "Heavy Copium",
      severity: "heavy",
      color: "#f97316",
      alert: false
    };
  }

  if (value > 30) {
    return {
      label: "Mild Copium",
      severity: "mild",
      color: "#f0b90b",
      alert: false
    };
  }

  return {
    label: "Rational",
    severity: "calm",
    color: "#16c784",
    alert: false
  };
}

export function classifyMood(sentiment: number): MoodState {
  if (sentiment > 0.85) {
    return { label: "EUPHORIC", color: "#00ff41", icon: "🚀" };
  }

  if (sentiment > 0.5) {
    return { label: "GREED", color: "#16c784", icon: "🤑" };
  }

  if (sentiment < -0.7) {
    return { label: "DESPAIR", color: "#ea3943", icon: "💀" };
  }

  if (sentiment < -0.3) {
    return { label: "FEAR", color: "#f97316", icon: "😬" };
  }

  return { label: "CONFUSED", color: "#f0b90b", icon: "🤨" };
}

export function calculateListeningOutcome(input: ListeningInput) {
  const highUnits = input.investment / input.highestSentimentPrice;
  const lowUnits = input.investment / input.lowestSentimentPrice;
  const highSentimentValue = roundTo(highUnits * input.currentPrice, 2);
  const lowSentimentValue = roundTo(lowUnits * input.currentPrice, 2);

  return {
    symbol: input.symbol,
    investment: input.investment,
    highSentimentValue,
    lowSentimentValue,
    redditDelta: roundTo(highSentimentValue - input.investment, 2),
    contrarianDelta: roundTo(lowSentimentValue - input.investment, 2)
  };
}

export function normalizeCoinMarkets(markets: CoinGeckoMarket[]): CoinRecord[] {
  return markets
    .filter((market) => market.id && market.symbol)
    .map((market) => ({
      id: market.id ?? "unknown",
      symbol: (market.symbol ?? "???").toUpperCase(),
      name: market.name ?? market.id ?? "Unknown",
      image: market.image,
      currentPrice: Number(market.current_price ?? 0),
      change24h: roundTo(Number(market.price_change_percentage_24h ?? 0), 4),
      marketCap: Number(market.market_cap ?? 0),
      sparkline: (market.sparkline_in_7d?.price ?? []).filter(Number.isFinite),
      history: (market.sparkline_in_7d?.price ?? [])
        .filter(Number.isFinite)
        .slice(-96)
        .map((value, index, values) => ({
          time: Date.now() - (values.length - index) * 15 * 60 * 1000,
          value
        })),
      lastUpdated: market.last_updated ?? new Date().toISOString()
    }));
}

export function normalizeBinanceTickerPayload(payload: BinanceTicker[]): ProviderQuote[] {
  return payload.flatMap((ticker) => {
    const symbol = ticker.symbol?.replace(/USD$/, "").toUpperCase();
    const currentPrice = Number(ticker.lastPrice);
    const change24h = Number(ticker.priceChangePercent);

    if (!symbol || !isTrackedSymbol(symbol) || !Number.isFinite(currentPrice)) {
      return [];
    }

    const quote: ProviderQuote = {
      symbol,
      currentPrice,
      change24h: Number.isFinite(change24h) ? roundTo(change24h, 4) : undefined,
      source: "binance-us",
      lastUpdated: ticker.closeTime
        ? new Date(ticker.closeTime).toISOString()
        : new Date().toISOString()
    };

    return [quote];
  });
}

export function normalizeKrakenTickerPayload(payload: KrakenTickerPayload): ProviderQuote[] {
  const symbolByPair: Record<string, string> = {
    XXBTZUSD: "BTC",
    XBTUSD: "BTC",
    XETHZUSD: "ETH",
    ETHUSD: "ETH",
    XDGUSD: "DOGE",
    DOGEUSD: "DOGE"
  };

  return Object.entries(payload.result ?? {}).flatMap(([pair, ticker]) => {
    const symbol = symbolByPair[pair];
    const currentPrice = Number(ticker.c?.[0]);
    const open = Number(ticker.o);
    const change24h =
      Number.isFinite(open) && open > 0
        ? roundTo(((currentPrice - open) / open) * 100, 4)
        : undefined;

    if (!symbol || !Number.isFinite(currentPrice)) {
      return [];
    }

    const quote: ProviderQuote = {
      symbol,
      currentPrice,
      change24h,
      source: "kraken",
      lastUpdated: new Date().toISOString()
    };

    return [quote];
  });
}

export function normalizeCoinbaseSpot(payload: CoinbaseSpotPayload): ProviderQuote | undefined {
  const symbol = payload.data?.base?.toUpperCase();
  const currentPrice = Number(payload.data?.amount);

  if (!symbol || !isTrackedSymbol(symbol) || !Number.isFinite(currentPrice)) {
    return undefined;
  }

  return {
    symbol,
    currentPrice,
    source: "coinbase",
    lastUpdated: new Date().toISOString()
  };
}

export function mergeProviderQuotes(
  quotes: ProviderQuote[],
  timestamp = Date.now()
): CoinRecord[] {
  const bySymbol = new Map<string, ProviderQuote>();

  quotes.forEach((quote) => {
    if (!isTrackedSymbol(quote.symbol) || bySymbol.has(quote.symbol)) {
      return;
    }

    bySymbol.set(quote.symbol, quote);
  });

  return TRACKED_COINS.flatMap((tracked) => {
    const quote = bySymbol.get(tracked.symbol);
    if (!quote) {
      return [];
    }

    const history = buildHistoryFromQuote(quote, timestamp);

    return [
      {
        id: coinIds[tracked.symbol],
        symbol: tracked.symbol,
        name: coinNames[tracked.symbol],
        currentPrice: quote.currentPrice,
        change24h: roundTo(quote.change24h ?? calculateChangeFromHistory(history), 4),
        marketCap: Math.round(
          quote.currentPrice *
            (tracked.symbol === "DOGE"
              ? 154_000_000_000
              : tracked.symbol === "ETH"
                ? 120_000_000
                : 20_000_000)
        ),
        sparkline: history.map((point) => point.value),
        history,
        lastUpdated: quote.lastUpdated ?? new Date(timestamp).toISOString()
      }
    ];
  });
}

export function normalizeMarketChart(chart: CoinGeckoMarketChart): PricePoint[] {
  return (chart.prices ?? [])
    .filter(([time, value]) => Number.isFinite(time) && Number.isFinite(value))
    .map(([time, value]) => ({
      time,
      value
    }));
}

export function appendPriceTick(
  points: PricePoint[],
  nextPoint: PricePoint,
  maxPoints = 288
): PricePoint[] {
  return [...points, nextPoint].slice(-maxPoints);
}

export function generateSyntheticSentiment(
  timestamp = Date.now(),
  ticker = "BTC"
): SentimentPoint {
  const symbol = ticker.toUpperCase();
  const seed =
    timestamp / 60000 +
    symbol.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  const wave = Math.sin(seed / 3.7) * 0.58 + Math.cos(seed / 8.4) * 0.34;
  const sentiment = roundTo(clamp(wave, -0.96, 0.96), 2);
  const commentIndex = Math.abs(Math.floor(seed)) % fallbackComments.length;
  const comment = fallbackComments[commentIndex].replace(/BTC|ETH|DOGE/, symbol);

  return {
    ticker: symbol,
    sentiment,
    volume: Math.round(180 + Math.abs(Math.sin(seed)) * 820),
    timestamp: new Date(timestamp).toISOString(),
    comment,
    source: "synthetic"
  };
}

export function getCoinIdForSymbol(symbol: string): string {
  return (
    TRACKED_COINS.find((coin) => coin.symbol === symbol.toUpperCase())?.id ??
    "bitcoin"
  );
}

export function getCoinCapAssets(): string {
  return TRACKED_COINS.map((coin) => coin.coincap).join(",");
}

export function getSymbolForCoinCapAsset(asset: string): string | undefined {
  return TRACKED_COINS.find((coin) => coin.coincap === asset)?.symbol;
}

export function buildFallbackCoins(timestamp = Date.now()): CoinRecord[] {
  const basePrices: Record<string, number> = {
    BTC: 76750,
    ETH: 2115,
    DOGE: 0.106
  };

  return TRACKED_COINS.map((coin, coinIndex) => {
    const base = basePrices[coin.symbol];
    const history = Array.from({ length: 96 }, (_, index) => {
      const minutesAgo = (95 - index) * 15;
      const seed = timestamp / 240000 + index * 0.31 + coinIndex * 1.8;
      const drift = Math.sin(seed) * 0.018 + Math.cos(seed / 2) * 0.012;

      return {
        time: timestamp - minutesAgo * 60 * 1000,
        value: roundTo(base * (1 + drift), coin.symbol === "DOGE" ? 6 : 2)
      };
    });
    const first = history[0]?.value ?? base;
    const last = history.at(-1)?.value ?? base;
    const change24h = roundTo(((last - first) / first) * 100, 4);

    return {
      id: coin.id,
      symbol: coin.symbol,
      name: coinNames[coin.symbol],
      currentPrice: last,
      change24h,
      marketCap: Math.round(last * (coin.symbol === "DOGE" ? 154_000_000_000 : coin.symbol === "ETH" ? 120_000_000 : 20_000_000)),
      sparkline: history.map((point) => point.value),
      history,
      lastUpdated: new Date(timestamp).toISOString()
    };
  });
}

function isTrackedSymbol(symbol: string): symbol is (typeof TRACKED_COINS)[number]["symbol"] {
  return TRACKED_COINS.some((coin) => coin.symbol === symbol);
}

function buildHistoryFromQuote(quote: ProviderQuote, timestamp: number): PricePoint[] {
  const digits = quote.symbol === "DOGE" ? 6 : 2;
  const current = quote.currentPrice;
  const change = clamp(quote.change24h ?? 0, -95, 200);
  const open = current / (1 + change / 100);

  return Array.from({ length: 96 }, (_, index) => {
    const progress = index / 95;
    const wave = Math.sin(index * 0.55 + current / 1000) * Math.abs(change || 0.8) * 0.0009;
    const value = index === 95 ? current : open + (current - open) * progress + current * wave;

    return {
      time: timestamp - (95 - index) * 15 * 60 * 1000,
      value: roundTo(value, digits)
    };
  });
}

function calculateChangeFromHistory(history: PricePoint[]): number {
  const first = history[0]?.value;
  const last = history.at(-1)?.value;

  if (!first || !last) {
    return 0;
  }

  return ((last - first) / first) * 100;
}
