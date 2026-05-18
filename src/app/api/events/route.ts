import { NextResponse } from "next/server";
import {
  fallbackLiveEvents,
  normalizeRedditLiveEvents
} from "@/lib/culture";

export const dynamic = "force-dynamic";

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
