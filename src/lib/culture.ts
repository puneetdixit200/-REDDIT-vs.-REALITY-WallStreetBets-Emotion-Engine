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
  source?: "historical" | "live" | "live-fallback";
  url?: string;
  updatedAt?: string;
  frames: HistoricalFrame[];
};

type RedditListing = {
  data?: {
    children?: Array<{
      data?: {
        id?: string;
        title?: string;
        ups?: number;
        score?: number;
        num_comments?: number;
        created_utc?: number;
        permalink?: string;
      };
    }>;
  };
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
  },
  {
    slug: "doge-snl",
    title: "DOGE SNL Sell-The-News, May 2021",
    caption: "The sketch aired. The candle did not enjoy show business.",
    frames: [
      { label: "Meme Runup", sentiment: 0.91, priceChange: 39, volume: 1600 },
      { label: "Prime-Time Countdown", sentiment: 0.98, priceChange: 4, volume: 3100 },
      { label: "Joke Meets Order Book", sentiment: 0.88, priceChange: -31, volume: 4200 },
      { label: "Sunday Bag Check", sentiment: 0.35, priceChange: -43, volume: 2600 }
    ]
  },
  {
    slug: "amc-squeeze",
    title: "AMC Meme Squeeze, June 2021",
    caption: "Popcorn met gamma, then gravity asked for a receipt.",
    frames: [
      { label: "Theater Revival Thesis", sentiment: 0.62, priceChange: 22, volume: 980 },
      { label: "Ape Convoy", sentiment: 0.95, priceChange: 95, volume: 3600 },
      { label: "Dilution Discourse", sentiment: 0.84, priceChange: -17, volume: 2800 },
      { label: "Concession Stand Hangover", sentiment: 0.21, priceChange: -61, volume: 1900 }
    ]
  },
  {
    slug: "bbby-bankruptcy",
    title: "Bed Bath & Beyond Bankruptcy Spiral, 2023",
    caption: "The towel aisle became a derivatives seminar.",
    frames: [
      { label: "Turnaround Fanfic", sentiment: 0.68, priceChange: 14, volume: 760 },
      { label: "Ryan Cohen Tea Leaves", sentiment: 0.9, priceChange: 33, volume: 1900 },
      { label: "Filing Reality", sentiment: -0.42, priceChange: -47, volume: 2400 },
      { label: "Ticker Afterlife", sentiment: 0.22, priceChange: -92, volume: 1700 }
    ]
  },
  {
    slug: "covid-crash",
    title: "COVID Crash, March 2020",
    caption: "Every bounce looked heroic until the next circuit breaker.",
    frames: [
      { label: "Dip-Buy Reflex", sentiment: 0.44, priceChange: -8, volume: 1100 },
      { label: "Circuit Breaker Bingo", sentiment: -0.79, priceChange: -23, volume: 4300 },
      { label: "Printer Invocation", sentiment: 0.38, priceChange: 9, volume: 2900 },
      { label: "V-Shaped Arguments", sentiment: 0.73, priceChange: 27, volume: 2100 }
    ]
  },
  {
    slug: "bitcoin-etf-sell-news",
    title: "Bitcoin ETF Sell-The-News, January 2024",
    caption: "Approval arrived, then the market asked who was left to buy.",
    frames: [
      { label: "Approval Watch", sentiment: 0.72, priceChange: 8, volume: 1300 },
      { label: "Ticker Ceremony", sentiment: 0.93, priceChange: 2, volume: 2500 },
      { label: "GBTC Exit Queue", sentiment: 0.66, priceChange: -16, volume: 3100 },
      { label: "Institutions Are Early Copium", sentiment: 0.81, priceChange: -22, volume: 1900 }
    ]
  },
  {
    slug: "svb-bank-run",
    title: "SVB Bank Run Weekend, March 2023",
    caption: "Group chats discovered duration risk in real time.",
    frames: [
      { label: "Balance Sheet Whisper", sentiment: -0.25, priceChange: -6, volume: 620 },
      { label: "Run Speedrun", sentiment: -0.88, priceChange: -41, volume: 2700 },
      { label: "Sunday Rescue Rumor", sentiment: 0.18, priceChange: -19, volume: 2200 },
      { label: "Moral Hazard Monday", sentiment: 0.55, priceChange: 24, volume: 1600 }
    ]
  },
  {
    slug: "celsius-3ac",
    title: "Celsius and 3AC Credit Freeze, 2022",
    caption: "Yield farming became collateral archaeology.",
    frames: [
      { label: "Earn Is Fine", sentiment: 0.57, priceChange: -4, volume: 830 },
      { label: "Withdrawals Paused", sentiment: -0.71, priceChange: -29, volume: 2600 },
      { label: "Liquidation Cascade", sentiment: -0.93, priceChange: -62, volume: 3800 },
      { label: "Claims Portal Era", sentiment: -0.18, priceChange: -74, volume: 1500 }
    ]
  },
  {
    slug: "nvidia-ai-mania",
    title: "AI Chip Mania, 2024",
    caption: "Every spreadsheet discovered a GPU line item.",
    frames: [
      { label: "Guidance Shock", sentiment: 0.69, priceChange: 25, volume: 1400 },
      { label: "Everything Is AI", sentiment: 0.96, priceChange: 58, volume: 3900 },
      { label: "Valuation Thread War", sentiment: 0.87, priceChange: 7, volume: 3300 },
      { label: "Put Buyer Memorial", sentiment: 0.91, priceChange: 19, volume: 2100 }
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

export function normalizeRedditLiveEvents(
  payload: RedditListing,
  timestamp = Date.now()
): HistoricalEvent[] {
  return (payload.data?.children ?? [])
    .map((child) => child.data)
    .filter((post): post is NonNullable<typeof post> => Boolean(post?.id && post.title))
    .filter((post) => isMarketLiveTitle(String(post.title)))
    .slice(0, 6)
    .map((post) => {
      const id = String(post.id);
      const score = Number(post.ups ?? post.score ?? 0);
      const comments = Number(post.num_comments ?? 0);
      const heat = roundTo(Math.min(1, Math.log10(Math.max(10, score + comments)) / 4.2), 2);
      const title = decodeEntities(String(post.title));
      const sentiment = inferLiveSentiment(title, score, comments);
      const inverseMove = sentiment >= 0 ? -1 : 1;
      const createdAt = post.created_utc
        ? new Date(post.created_utc * 1000).toISOString()
        : new Date(timestamp).toISOString();

      return {
        slug: `live-wsb-${sanitizeSlug(id)}`,
        title: `LIVE: ${title}`,
        caption: `${score.toLocaleString()} upvotes and ${comments.toLocaleString()} comments from WSB right now.`,
        source: "live" as const,
        url: `https://www.reddit.com${post.permalink ?? `/r/wallstreetbets/comments/${id}`}`,
        updatedAt: createdAt,
        frames: [
          {
            label: "Thread Ignition",
            sentiment: roundTo(sentiment * 0.72, 2),
            priceChange: roundTo(sentiment * heat * 8, 1),
            volume: Math.max(200, Math.round(comments * 0.7))
          },
          {
            label: "Comment Velocity",
            sentiment: roundTo(sentiment, 2),
            priceChange: roundTo(inverseMove * heat * 12, 1),
            volume: Math.max(420, comments)
          },
          {
            label: "Reality Check",
            sentiment: roundTo(clampSentiment(sentiment + Math.sign(sentiment || 1) * 0.18), 2),
            priceChange: roundTo(inverseMove * heat * 22, 1),
            volume: Math.max(650, Math.round(score / 2))
          },
          {
            label: "After-Hours Hangover",
            sentiment: roundTo(sentiment * 0.48, 2),
            priceChange: roundTo(inverseMove * heat * 15, 1),
            volume: Math.max(300, Math.round((score + comments) / 4))
          }
        ]
      };
    });
}

export function fallbackLiveEvents(timestamp = Date.now()): HistoricalEvent[] {
  const updatedAt = new Date(timestamp).toISOString();

  return [
    {
      slug: "live-fallback-options-mania",
      title: "LIVE: Options Chain Starts Smoking",
      caption: "Synthetic live fallback while Reddit is unavailable.",
      source: "live-fallback",
      updatedAt,
      frames: [
        { label: "Calls Stack Up", sentiment: 0.71, priceChange: -3, volume: 1200 },
        { label: "Gamma Prayer Circle", sentiment: 0.94, priceChange: -9, volume: 2300 },
        { label: "Bid-Ask Reality", sentiment: 0.88, priceChange: -21, volume: 3100 },
        { label: "Premium Evaporation", sentiment: 0.25, priceChange: -33, volume: 1600 }
      ]
    },
    {
      slug: "live-fallback-crypto-liquidations",
      title: "LIVE: Crypto Liquidation Siren",
      caption: "Synthetic live fallback while external feeds cool down.",
      source: "live-fallback",
      updatedAt,
      frames: [
        { label: "Leverage Builds", sentiment: 0.64, priceChange: 5, volume: 900 },
        { label: "Funding Rate Flex", sentiment: 0.89, priceChange: -7, volume: 1800 },
        { label: "Candle Trapdoor", sentiment: -0.71, priceChange: -28, volume: 3600 },
        { label: "Cope Thread", sentiment: 0.31, priceChange: -34, volume: 2100 }
      ]
    },
    {
      slug: "live-fallback-fed-watch",
      title: "LIVE: Fed Word Salad Repricing",
      caption: "Synthetic live fallback for macro headline chaos.",
      source: "live-fallback",
      updatedAt,
      frames: [
        { label: "Dovish Whisper", sentiment: 0.48, priceChange: 6, volume: 700 },
        { label: "Dot Plot Panic", sentiment: -0.62, priceChange: -15, volume: 1900 },
        { label: "Soft Landing Debate", sentiment: 0.18, priceChange: -4, volume: 1600 },
        { label: "Close Bell Revisionism", sentiment: 0.52, priceChange: 3, volume: 1100 }
      ]
    }
  ];
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

function inferLiveSentiment(title: string, score: number, comments: number): number {
  const lower = title.toLowerCase();
  const bullish = /\b(call|calls|moon|green|bull|rip bears|yolo|gain|gains|pump|breakout)\b/.test(lower);
  const bearish = /\b(put|puts|red|bear|rip|crash|drill|bankrupt|short|loss|down)\b/.test(lower);
  const debateDrag = Math.min(0.35, comments / Math.max(score, 1));

  if (bullish && !bearish) {
    return clampSentiment(0.56 + Math.min(0.36, score / 12000) - debateDrag * 0.18);
  }

  if (bearish && !bullish) {
    return clampSentiment(-0.52 - Math.min(0.34, score / 14000) + debateDrag * 0.1);
  }

  return clampSentiment(0.12 + Math.min(0.22, score / 20000) - debateDrag * 0.3);
}

function clampSentiment(value: number): number {
  return Math.max(-0.98, Math.min(0.98, value));
}

function sanitizeSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function isMarketLiveTitle(title: string): boolean {
  return /\b(market|markets|call|calls|put|puts|stock|stocks|trading|insider|nvda|amd|tsla|intc|samsung|btc|eth|doge|red|green|yolo|strike|chip|fed|rate|earnings|short|long|option|options)\b/i.test(title);
}
