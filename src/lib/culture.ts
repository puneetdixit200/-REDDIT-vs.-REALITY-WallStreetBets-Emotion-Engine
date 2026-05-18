import {
  calculateDelusionGap,
  type SentimentPoint,
  roundTo
} from "./market";

export type BingoPhrase =
  | "diamond hands"
  | "paper hands"
  | "smooth brain"
  | "wife"
  | "YOLO"
  | "loss porn"
  | "tendies"
  | "moon"
  | "bagholder"
  | "puts"
  | "calls"
  | "copium";

export type HeatmapHour = {
  hour: number;
  sentiment: number;
  intensity: number;
  count: number;
};

export type HeatmapDay = {
  date: string;
  hours: HeatmapHour[];
};

export type HistoricalFrame = {
  label: string;
  sentiment: number;
  priceChange: number;
  volume: number;
};

export type HistoricalEvent = {
  slug: string;
  title: string;
  caption: string;
  frames: HistoricalFrame[];
};

export const BINGO_PHRASES: BingoPhrase[] = [
  "diamond hands",
  "paper hands",
  "smooth brain",
  "wife",
  "YOLO",
  "loss porn",
  "tendies",
  "moon",
  "bagholder",
  "puts",
  "calls",
  "copium"
];

const phrasePatterns: Record<BingoPhrase, RegExp> = {
  "diamond hands": /diamond\s+hands/i,
  "paper hands": /paper\s+hands/i,
  "smooth brain": /smooth\s+brain/i,
  wife: /wife|boyfriend/i,
  YOLO: /\byolo\b/i,
  "loss porn": /loss\s+porn/i,
  tendies: /\btendies\b/i,
  moon: /\bmoon\b|to the moon/i,
  bagholder: /\bbagholder|bags?\b/i,
  puts: /\bputs?\b/i,
  calls: /\bcalls?\b/i,
  copium: /\bcopium|cope\b/i
};

export const HISTORICAL_EVENTS: HistoricalEvent[] = [
  {
    slug: "gme-squeeze",
    title: "GameStop Squeeze, January 2021",
    caption: "Message-board euphoria ran far ahead of price discovery.",
    frames: [
      { label: "Ignition", sentiment: 0.58, priceChange: 18, volume: 420 },
      { label: "Front Page Mania", sentiment: 0.94, priceChange: 133, volume: 2100 },
      { label: "Broker Panic", sentiment: 0.99, priceChange: -44, volume: 3200 },
      { label: "Aftershock", sentiment: 0.72, priceChange: -72, volume: 1800 }
    ]
  },
  {
    slug: "luna-crash",
    title: "LUNA Collapse, May 2022",
    caption: "Confidence kept posting while the chart stopped cooperating.",
    frames: [
      { label: "Stable Until It Wasn't", sentiment: 0.51, priceChange: -8, volume: 520 },
      { label: "Peg Panic", sentiment: -0.25, priceChange: -37, volume: 1440 },
      { label: "Zero Is A Number", sentiment: -0.82, priceChange: -96, volume: 2600 },
      { label: "Post-Mortem Copium", sentiment: 0.28, priceChange: -99, volume: 1900 }
    ]
  },
  {
    slug: "ftx-collapse",
    title: "FTX Collapse, November 2022",
    caption: "The vibes tried to bargain with the balance sheet.",
    frames: [
      { label: "Rumor Mill", sentiment: -0.18, priceChange: -7, volume: 680 },
      { label: "Withdrawal Freeze", sentiment: -0.66, priceChange: -23, volume: 1980 },
      { label: "Bankruptcy Speedrun", sentiment: -0.92, priceChange: -76, volume: 3400 },
      { label: "Receipts Era", sentiment: 0.14, priceChange: -61, volume: 1700 }
    ]
  }
];

export function detectBingoHits(comments: string[]): BingoPhrase[] {
  const corpus = comments.join("\n");

  return BINGO_PHRASES.filter((phrase) => phrasePatterns[phrase].test(corpus));
}

export function buildSentimentHeatmap(points: Pick<SentimentPoint, "timestamp" | "sentiment">[]): HeatmapDay[] {
  const anchor = points.length
    ? new Date(Math.max(...points.map((point) => new Date(point.timestamp).getTime())))
    : new Date();
  const startOfAnchor = Date.UTC(
    anchor.getUTCFullYear(),
    anchor.getUTCMonth(),
    anchor.getUTCDate()
  );

  return Array.from({ length: 7 }, (_, dayOffset) => {
    const date = new Date(startOfAnchor - dayOffset * 24 * 60 * 60 * 1000);
    const dateKey = date.toISOString().slice(0, 10);
    const buckets = Array.from({ length: 24 }, () => ({
      total: 0,
      count: 0
    }));

    points.forEach((point) => {
      const pointDate = new Date(point.timestamp);
      if (pointDate.toISOString().slice(0, 10) !== dateKey) {
        return;
      }

      const bucket = buckets[pointDate.getUTCHours()];
      bucket.total += point.sentiment;
      bucket.count += 1;
    });

    return {
      date: dateKey,
      hours: buckets.map((bucket, hour) => {
        const sentiment = bucket.count ? roundTo(bucket.total / bucket.count, 2) : 0;

        return {
          hour,
          sentiment,
          intensity: roundTo(Math.abs(sentiment), 2),
          count: bucket.count
        };
      })
    };
  });
}

export function loadHistoricalEvent(slug: string): HistoricalEvent | undefined {
  return HISTORICAL_EVENTS.find((event) => event.slug === slug);
}

export function frameToSentimentPoint(
  frame: HistoricalFrame,
  ticker: string,
  timestamp: number
): SentimentPoint {
  return {
    ticker,
    sentiment: frame.sentiment,
    volume: frame.volume,
    timestamp: new Date(timestamp).toISOString(),
    comment: `${ticker} ${frame.label}: ${classifyHistoricalGap(frame.sentiment, frame.priceChange)}`,
    source: "historical"
  };
}

function classifyHistoricalGap(sentiment: number, priceChange: number): string {
  const gap = calculateDelusionGap(sentiment, priceChange);

  if (gap > 85) {
    return "reality is not taking questions";
  }

  if (gap > 50) {
    return "vibes are arguing with the chart";
  }

  return "Reddit and reality briefly made eye contact";
}
