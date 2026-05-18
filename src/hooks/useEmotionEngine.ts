"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  appendPriceTick,
  buildFallbackCoins,
  calculateDelusionGap,
  classifyDelusion,
  classifyMood,
  generateSyntheticSentiment,
  getCoinbaseProductIds,
  normalizeCoinbaseTickerMessage,
  type CoinbaseTickerMessage,
  type CoinRecord,
  type SentimentPoint
} from "@/lib/market";
import {
  buildSentimentHeatmap,
  detectBingoHits,
  fallbackLiveEvents,
  frameToSentimentPoint,
  HISTORICAL_EVENTS,
  type HistoricalEvent
} from "@/lib/culture";

type PricePayload = {
  coins: CoinRecord[];
  source: string;
  updatedAt: string;
  error?: string;
};

type SentimentPayload = {
  items: SentimentPoint[];
  comments: string[];
  source: string;
  degraded: boolean;
  updatedAt: string;
  error?: string;
};

type EventsPayload = {
  events: HistoricalEvent[];
  source: string;
  updatedAt: string;
  error?: string;
};

type StreamState = "connecting" | "live" | "fallback";

const INITIAL_TIMESTAMP = Date.UTC(2026, 4, 18, 0, 0, 0);

function createInitialSentimentHistory(): SentimentPoint[] {
  const now = INITIAL_TIMESTAMP;
  const points: SentimentPoint[] = [];

  for (let day = 6; day >= 0; day -= 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const timestamp = now - day * 24 * 60 * 60 * 1000 - (23 - hour) * 60 * 60 * 1000;
      points.push(generateSyntheticSentiment(timestamp, "BTC"));
      points.push(generateSyntheticSentiment(timestamp + 1000, "ETH"));
      points.push(generateSyntheticSentiment(timestamp + 2000, "DOGE"));
    }
  }

  return points;
}

function latestForSymbol(points: SentimentPoint[], symbol: string): SentimentPoint {
  return (
    [...points].reverse().find((point) => point.ticker === symbol) ??
    generateSyntheticSentiment(Date.now(), symbol)
  );
}

export function useEmotionEngine() {
  const [coins, setCoins] = useState<CoinRecord[]>(() => buildFallbackCoins(INITIAL_TIMESTAMP));
  const [selectedSymbol, setSelectedSymbol] = useState("BTC");
  const [sentimentHistory, setSentimentHistory] = useState<SentimentPoint[]>(
    createInitialSentimentHistory
  );
  const [comments, setComments] = useState<string[]>([
    "BTC diamond hands detected while price checks reality",
    "ETH smooth brain thesis upgraded to ritual",
    "DOGE moon math filed without evidence"
  ]);
  const [priceSource, setPriceSource] = useState("fallback");
  const [sentimentSource, setSentimentSource] = useState("synthetic");
  const [streamState, setStreamState] = useState<StreamState>("connecting");
  const [audioArmed, setAudioArmed] = useState(false);
  const [activeEvent, setActiveEvent] = useState<HistoricalEvent | undefined>();
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [eventPlaying, setEventPlaying] = useState(false);
  const [liveEvents, setLiveEvents] = useState<HistoricalEvent[]>(() =>
    fallbackLiveEvents(INITIAL_TIMESTAMP)
  );
  const [liveEventsSource, setLiveEventsSource] = useState("live-fallback");
  const streamStateRef = useRef<StreamState>("connecting");

  const selectedCoin = useMemo(
    () => coins.find((coin) => coin.symbol === selectedSymbol) ?? coins[0],
    [coins, selectedSymbol]
  );

  const activeFrame = activeEvent?.frames[activeFrameIndex];

  const latestSentiment = useMemo(
    () => latestForSymbol(sentimentHistory, selectedSymbol),
    [sentimentHistory, selectedSymbol]
  );

  const effectiveSentiment = activeFrame?.sentiment ?? latestSentiment.sentiment;
  const effectivePriceChange = activeFrame?.priceChange ?? selectedCoin?.change24h ?? 0;
  const delusionGap = calculateDelusionGap(effectiveSentiment, effectivePriceChange);
  const delusionState = classifyDelusion(delusionGap);
  const mood = classifyMood(effectiveSentiment);
  const heatmap = useMemo(() => buildSentimentHeatmap(sentimentHistory), [sentimentHistory]);
  const bingoHits = useMemo(() => detectBingoHits(comments), [comments]);
  const availableEvents = useMemo(
    () => [...liveEvents, ...HISTORICAL_EVENTS],
    [liveEvents]
  );

  const fetchPrices = useCallback(async () => {
    try {
      const response = await fetch("/api/prices", { cache: "no-store" });
      const payload = (await response.json()) as PricePayload;
      if (!payload.coins?.length) {
        throw new Error(payload.error ?? "No price records");
      }

      setCoins(payload.coins);
      setPriceSource(payload.source);
    } catch {
      setCoins(buildFallbackCoins());
      setPriceSource("fallback");
    }
  }, []);

  const fetchSentiment = useCallback(async () => {
    try {
      const response = await fetch("/api/sentiment", { cache: "no-store" });
      const payload = (await response.json()) as SentimentPayload;
      if (!payload.items?.length) {
        throw new Error(payload.error ?? "No sentiment records");
      }

      setSentimentHistory((current) => [...current, ...payload.items].slice(-640));
      setComments((current) => [...payload.comments, ...current].slice(0, 18));
      setSentimentSource(payload.degraded ? `${payload.source} + fallback` : payload.source);
    } catch {
      const fallback = ["BTC", "ETH", "DOGE"].map((symbol, index) =>
        generateSyntheticSentiment(Date.now() - index * 1000, symbol)
      );
      setSentimentHistory((current) => [...current, ...fallback].slice(-640));
      setComments((current) => [...fallback.map((point) => point.comment), ...current].slice(0, 18));
      setSentimentSource("synthetic");
    }
  }, []);

  const fetchLiveEvents = useCallback(async () => {
    try {
      const response = await fetch("/api/events", { cache: "no-store" });
      const payload = (await response.json()) as EventsPayload;
      if (!payload.events?.length) {
        throw new Error(payload.error ?? "No live event records");
      }

      setLiveEvents(payload.events);
      setLiveEventsSource(payload.source);
    } catch {
      setLiveEvents(fallbackLiveEvents());
      setLiveEventsSource("live-fallback");
    }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      fetchPrices();
      fetchSentiment();
      fetchLiveEvents();
    }, 0);

    const priceTimer = window.setInterval(fetchPrices, 90_000);
    const sentimentTimer = window.setInterval(fetchSentiment, 60_000);
    const eventsTimer = window.setInterval(fetchLiveEvents, 120_000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(priceTimer);
      window.clearInterval(sentimentTimer);
      window.clearInterval(eventsTimer);
    };
  }, [fetchLiveEvents, fetchPrices, fetchSentiment]);

  useEffect(() => {
    streamStateRef.current = streamState;
  }, [streamState]);

  useEffect(() => {
    let socket: WebSocket | undefined;
    let tickTimer = 0;

    try {
      socket = new WebSocket("wss://ws-feed.exchange.coinbase.com");
      socket.onopen = () => {
        socket?.send(
          JSON.stringify({
            type: "subscribe",
            product_ids: getCoinbaseProductIds(),
            channels: ["ticker"]
          })
        );
        tickTimer = window.setTimeout(() => setStreamState("fallback"), 12_000);
      };
      socket.onerror = () => setStreamState("fallback");
      socket.onclose = () => setStreamState((state) => (state === "live" ? "fallback" : state));
      socket.onmessage = (event) => {
        const payload = JSON.parse(String(event.data)) as CoinbaseTickerMessage;
        const quote = normalizeCoinbaseTickerMessage(payload);
        if (!quote) {
          return;
        }

        window.clearTimeout(tickTimer);
        setStreamState("live");
        const now = Date.now();

        setCoins((current) =>
          current.map((coin) => {
            if (quote.symbol !== coin.symbol) {
              return coin;
            }

            const nextHistory = appendPriceTick(
              coin.history,
              { time: now, value: quote.currentPrice },
              320
            );
            const first = nextHistory[0]?.value ?? quote.currentPrice;
            const change24h =
              quote.change24h ?? ((quote.currentPrice - first) / first) * 100;

            return {
              ...coin,
              currentPrice: quote.currentPrice,
              change24h,
              history: nextHistory,
              sparkline: nextHistory.map((point) => point.value),
              lastUpdated: quote.lastUpdated ?? new Date(now).toISOString()
            };
          })
        );
      };
    } catch {
      window.setTimeout(() => setStreamState("fallback"), 0);
    }

    return () => {
      window.clearTimeout(tickTimer);
      socket?.close();
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (streamStateRef.current === "live") {
        return;
      }

      setCoins((current) =>
        current.map((coin, index) => {
          const now = Date.now();
          const wave = Math.sin(now / 4000 + index) * 0.0018;
          const price = coin.currentPrice * (1 + wave);
          const history = appendPriceTick(coin.history, { time: now, value: price }, 320);
          const first = history[0]?.value ?? price;

          return {
            ...coin,
            currentPrice: price,
            change24h: ((price - first) / first) * 100,
            history,
            sparkline: history.map((point) => point.value),
            lastUpdated: new Date(now).toISOString()
          };
        })
      );
    }, 2500);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = generateSyntheticSentiment(Date.now(), selectedSymbol);
      setSentimentHistory((current) => [...current, next].slice(-640));
      setComments((current) => [next.comment, ...current].slice(0, 18));
    }, 7000);

    return () => window.clearInterval(timer);
  }, [selectedSymbol]);

  useEffect(() => {
    if (!eventPlaying || !activeEvent) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveFrameIndex((index) => {
        const nextIndex = index + 1;
        if (nextIndex >= activeEvent.frames.length) {
          setEventPlaying(false);
          return index;
        }

        return nextIndex;
      });
    }, 950);

    return () => window.clearInterval(timer);
  }, [activeEvent, eventPlaying]);

  useEffect(() => {
    if (!activeFrame) {
      return;
    }

    const timer = window.setTimeout(() => {
      const point = frameToSentimentPoint(activeFrame, selectedSymbol, Date.now());
      setSentimentHistory((current) => [...current, point].slice(-640));
      setComments((current) => [point.comment, ...current].slice(0, 18));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeFrame, selectedSymbol]);

  const playHistoricalEvent = useCallback((slug: string) => {
    const event = availableEvents.find((candidate) => candidate.slug === slug);
    setActiveEvent(event);
    setActiveFrameIndex(0);
    setEventPlaying(Boolean(event));
  }, [availableEvents]);

  const stopHistoricalEvent = useCallback(() => {
    setEventPlaying(false);
    setActiveEvent(undefined);
    setActiveFrameIndex(0);
  }, []);

  return {
    activeEvent,
    activeFrame,
    audioArmed,
    availableEvents,
    bingoHits,
    coins,
    comments,
    delusionGap,
    delusionState,
    effectivePriceChange,
    effectiveSentiment,
    eventPlaying,
    heatmap,
    latestSentiment,
    liveEventsSource,
    mood,
    playHistoricalEvent,
    priceSource,
    selectedCoin,
    selectedSymbol,
    sentimentHistory,
    sentimentSource,
    setAudioArmed,
    setSelectedSymbol,
    stopHistoricalEvent,
    streamState
  };
}
