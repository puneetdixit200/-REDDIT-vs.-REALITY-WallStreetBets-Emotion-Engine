# REDDIT vs. REALITY — WallStreetBets Emotion Engine

Live data-art dashboard that compares WallStreetBets sentiment against crypto market reality.

## Features

- Split-screen WSB heartbeat monitor and live market dashboard.
- CoinGecko market API plus CoinCap websocket ticks for BTC, ETH, and DOGE.
- Fallback market providers: Binance US, Kraken, Coinbase spot, then synthetic prices.
- Tradestie WSB sentiment route with deterministic fallback data when the public endpoint is blocked or slow.
- Live WSB event replay from Reddit top posts, plus deterministic live-event fallbacks.
- Center delusion gauge with alert mode, generated audio cues, emoji rain, and chaos amplification.
- WSB bingo, historical delusion replay, heatmap, and “If You Listened” calculator.
- Desktop and mobile Playwright smoke coverage.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

The e2e suite expects the app to be available at `http://localhost:3000`. Override with `PLAYWRIGHT_BASE_URL`.

## Data Notes

The app calls free public endpoints. CoinGecko can return `429` during rate limits, and Tradestie may return a Cloudflare challenge. API routes return fallback data instead of breaking the UI, and the source badges show when fallbacks are active.

## Vercel

This repo is Vercel-ready. Vercel auto-detects Next.js; `vercel.json` pins the build and install commands.
