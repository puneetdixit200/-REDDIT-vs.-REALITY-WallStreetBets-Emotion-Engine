"use client";

import { useMemo, useState } from "react";
import {
  BadgeAlert,
  Calculator,
  Check,
  CircleDollarSign,
  ExternalLink,
  History,
  Play,
  Square,
  Volume2
} from "lucide-react";
import {
  BINGO_PHRASES,
  rankDelusionEvents,
  type BingoPhrase,
  type HeatmapDay,
  type HistoricalEvent,
  type HistoricalFrame
} from "@/lib/culture";
import {
  calculateListeningOutcome,
  type CoinRecord,
  type DelusionState
} from "@/lib/market";
import { playCue, type SoundCue } from "@/lib/sound";

type ControlPanelsProps = {
  activeEvent?: HistoricalEvent;
  activeFrame?: HistoricalFrame;
  audioArmed: boolean;
  events: HistoricalEvent[];
  bingoHits: BingoPhrase[];
  coins: CoinRecord[];
  delusionGap: number;
  delusionState: DelusionState;
  effectivePriceChange: number;
  effectiveSentiment: number;
  eventPlaying: boolean;
  heatmap: HeatmapDay[];
  liveEventsSource: string;
  onArmAudio: () => void;
  onPlayEvent: (slug: string) => void;
  onStopEvent: () => void;
  priceSource: string;
  selectedCoin?: CoinRecord;
  selectedSymbol: string;
  sentimentSource: string;
  streamState: string;
};

const soundCues: Array<{ cue: SoundCue; label: string }> = [
  { cue: "cash-register", label: "Cha-Ching" },
  { cue: "sad-trombone", label: "Sad Trombone" },
  { cue: "margin-call", label: "Margin Call" },
  { cue: "titanic-flute", label: "Titanic Flute" },
  { cue: "copium-alarm", label: "Copium Alarm" }
];

export function ControlPanels({
  activeEvent,
  activeFrame,
  audioArmed,
  events,
  bingoHits,
  coins,
  delusionGap,
  delusionState,
  effectivePriceChange,
  effectiveSentiment,
  eventPlaying,
  heatmap,
  liveEventsSource,
  onArmAudio,
  onPlayEvent,
  onStopEvent,
  priceSource,
  selectedCoin,
  selectedSymbol,
  sentimentSource,
  streamState
}: ControlPanelsProps) {
  return (
    <section className="control-grid" aria-label="WSB chaos controls">
      <BingoCard hits={bingoHits} />
      <HistoricalPanel
        activeEvent={activeEvent}
        activeFrame={activeFrame}
        events={events}
        eventPlaying={eventPlaying}
        liveEventsSource={liveEventsSource}
        onPlayEvent={onPlayEvent}
        onStopEvent={onStopEvent}
      />
      <ListeningCalculator coins={coins} selectedCoin={selectedCoin} />
      <HeatmapPanel heatmap={heatmap} />
      <SoundBoard
        audioArmed={audioArmed}
        delusionState={delusionState}
        onArmAudio={onArmAudio}
      />
      <ChaosConsole
        delusionGap={delusionGap}
        effectivePriceChange={effectivePriceChange}
        effectiveSentiment={effectiveSentiment}
        events={events}
        onPlayEvent={onPlayEvent}
        priceSource={priceSource}
        selectedSymbol={selectedSymbol}
        sentimentSource={sentimentSource}
        streamState={streamState}
      />
    </section>
  );
}

function BingoCard({ hits }: { hits: BingoPhrase[] }) {
  return (
    <article className="tool-card">
      <header>
        <BadgeAlert size={18} />
        <h2>WSB Bingo</h2>
      </header>
      <div className="bingo-grid">
        {BINGO_PHRASES.map((phrase) => {
          const marked = hits.includes(phrase);

          return (
            <div key={phrase} className={`bingo-cell ${marked ? "marked" : ""}`}>
              {marked ? <Check size={14} /> : null}
              <span>{phrase}</span>
            </div>
          );
        })}
      </div>
      <p className="tool-note">
        {hits.length === BINGO_PHRASES.length
          ? "Full card. Confetti would be financially irresponsible."
          : `${hits.length}/${BINGO_PHRASES.length} phrases marked from live comments.`}
      </p>
    </article>
  );
}

function HistoricalPanel({
  activeEvent,
  activeFrame,
  events,
  eventPlaying,
  liveEventsSource,
  onPlayEvent,
  onStopEvent
}: {
  activeEvent?: HistoricalEvent;
  activeFrame?: HistoricalFrame;
  events: HistoricalEvent[];
  eventPlaying: boolean;
  liveEventsSource: string;
  onPlayEvent: (slug: string) => void;
  onStopEvent: () => void;
}) {
  const [selectedSlug, setSelectedSlug] = useState(events[0]?.slug ?? "");
  const selectedEvent = events.find((event) => event.slug === selectedSlug) ?? events[0];

  return (
    <article className="tool-card">
      <header>
        <History size={18} />
        <h2>Delusion Events</h2>
      </header>
      <div className="live-event-strip">
        <strong>Live WSB events</strong>
        <span>{liveEventsSource}</span>
      </div>
      <label className="field-label" htmlFor="history-select">
        Event
      </label>
      <select
        id="history-select"
        value={selectedEvent?.slug ?? ""}
        onChange={(event) => setSelectedSlug(event.target.value)}
      >
        {events.map((event) => (
          <option key={event.slug} value={event.slug}>
            {event.title}
          </option>
        ))}
      </select>
      <div className="button-row">
        <button type="button" onClick={() => selectedEvent && onPlayEvent(selectedEvent.slug)}>
          <Play size={15} />
          Replay
        </button>
        <button type="button" onClick={onStopEvent}>
          <Square size={15} />
          Clear
        </button>
      </div>
      <div className="event-readout">
        <strong>{activeEvent?.title ?? "No event loaded"}</strong>
        {activeEvent?.source ? <em>{activeEvent.source}</em> : null}
        <span>{activeFrame?.label ?? "Pick an event to inject retroactive chaos."}</span>
        {activeFrame ? (
          <small>
            Sentiment {(activeFrame.sentiment * 100).toFixed(0)}% · Price{" "}
            {activeFrame.priceChange.toFixed(0)}%
          </small>
        ) : null}
        {activeEvent?.url ? (
          <a href={activeEvent.url} target="_blank" rel="noreferrer">
            <ExternalLink size={13} />
            Open live thread
          </a>
        ) : null}
      </div>
      <p className="tool-note">{eventPlaying ? "Replay is driving the center gauge." : activeEvent?.caption}</p>
    </article>
  );
}

function ListeningCalculator({
  coins,
  selectedCoin
}: {
  coins: CoinRecord[];
  selectedCoin?: CoinRecord;
}) {
  const [investment, setInvestment] = useState(1000);
  const [symbol, setSymbol] = useState(selectedCoin?.symbol ?? "BTC");
  const coin = coins.find((item) => item.symbol === symbol) ?? selectedCoin ?? coins[0];
  const outcome = useMemo(() => {
    const price = coin?.currentPrice ?? 1;
    const highPrice = price * 1.38;
    const lowPrice = price * 0.62;

    return calculateListeningOutcome({
      symbol: coin?.symbol ?? symbol,
      currentPrice: price,
      highestSentimentPrice: highPrice,
      lowestSentimentPrice: lowPrice,
      investment
    });
  }, [coin, investment, symbol]);

  return (
    <article className="tool-card">
      <header>
        <Calculator size={18} />
        <h2>If You Listened</h2>
      </header>
      <div className="calculator-fields">
        <label>
          Coin
          <select value={symbol} onChange={(event) => setSymbol(event.target.value)}>
            {coins.map((item) => (
              <option key={item.symbol} value={item.symbol}>
                {item.symbol}
              </option>
            ))}
          </select>
        </label>
        <label>
          Stake
          <input
            min={100}
            step={100}
            type="number"
            value={investment}
            onChange={(event) => setInvestment(Number(event.target.value))}
          />
        </label>
      </div>
      <div className="outcome-grid">
        <span>Buy peak hype</span>
        <strong className={outcome.redditDelta >= 0 ? "gain" : "loss"}>
          {formatMoney(outcome.redditDelta)}
        </strong>
        <span>Buy maximum fear</span>
        <strong className={outcome.contrarianDelta >= 0 ? "gain" : "loss"}>
          {formatMoney(outcome.contrarianDelta)}
        </strong>
      </div>
      <p className="tool-note">A deterministic 30-day toy model, not investment advice.</p>
    </article>
  );
}

function HeatmapPanel({ heatmap }: { heatmap: HeatmapDay[] }) {
  return (
    <article className="tool-card heatmap-card">
      <header>
        <CircleDollarSign size={18} />
        <h2>Sentiment Heatmap</h2>
      </header>
      <div className="heatmap">
        {heatmap.map((day) => (
          <div key={day.date} className="heatmap-row">
            <span>{day.date.slice(5)}</span>
            {day.hours.map((hour) => (
              <i
                key={`${day.date}-${hour.hour}`}
                title={`${day.date} ${hour.hour}:00 sentiment ${hour.sentiment}`}
                style={{
                  opacity: 0.25 + hour.intensity * 0.75,
                  background:
                    hour.sentiment >= 0
                      ? "rgba(0, 255, 65, 0.95)"
                      : "rgba(234, 57, 67, 0.95)"
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="tool-note">Green hours leaned greedy. Red hours leaned fearful.</p>
    </article>
  );
}

function SoundBoard({
  audioArmed,
  delusionState,
  onArmAudio
}: {
  audioArmed: boolean;
  delusionState: DelusionState;
  onArmAudio: () => void;
}) {
  return (
    <article className="tool-card">
      <header>
        <Volume2 size={18} />
        <h2>Cope-O-Meter</h2>
      </header>
      <button type="button" className="arm-button" onClick={onArmAudio}>
        <Volume2 size={15} />
        {audioArmed ? "Audio Armed" : "Arm Audio"}
      </button>
      <div className="sound-grid">
        {soundCues.map((sound) => (
          <button
            key={sound.cue}
            type="button"
            onClick={() => {
              onArmAudio();
              playCue(sound.cue);
            }}
          >
            {sound.label}
          </button>
        ))}
      </div>
      <p className="tool-note">
        Current alert mode: <strong style={{ color: delusionState.color }}>{delusionState.label}</strong>
      </p>
    </article>
  );
}

function ChaosConsole({
  delusionGap,
  effectivePriceChange,
  effectiveSentiment,
  events,
  onPlayEvent,
  priceSource,
  selectedSymbol,
  sentimentSource,
  streamState
}: {
  delusionGap: number;
  effectivePriceChange: number;
  effectiveSentiment: number;
  events: HistoricalEvent[];
  onPlayEvent: (slug: string) => void;
  priceSource: string;
  selectedSymbol: string;
  sentimentSource: string;
  streamState: string;
}) {
  const rankedEvents = useMemo(() => rankDelusionEvents(events, 4), [events]);
  const verdict =
    delusionGap > 85
      ? "Reality Disconnect"
      : delusionGap > 60
        ? "Crowd Drift"
        : delusionGap > 30
          ? "Mixed Signal"
          : "Data Aligned";

  return (
    <article className="tool-card chaos-card">
      <header>
        <BadgeAlert size={18} />
        <h2>Anomaly Radar</h2>
      </header>
      <div className="chaos-readout">
        <span>Live verdict</span>
        <strong>{verdict}</strong>
        <small>
          {selectedSymbol}: sentiment {(effectiveSentiment * 100).toFixed(0)}% vs price{" "}
          {effectivePriceChange >= 0 ? "+" : ""}
          {effectivePriceChange.toFixed(1)}%
        </small>
      </div>
      <div className="source-grid">
        <span>
          Price <strong>{priceSource}</strong>
        </span>
        <span>
          WSB <strong>{sentimentSource}</strong>
        </span>
        <span>
          Socket <strong>{streamState}</strong>
        </span>
      </div>
      <div className="anomaly-list">
        {rankedEvents.map((event) => (
          <button
            key={event.slug}
            type="button"
            onClick={() => onPlayEvent(event.slug)}
            title={`Replay ${event.title}`}
          >
            <span>{event.title.replace(/^LIVE:\s*/, "")}</span>
            <strong>{event.maxGap.toFixed(0)}%</strong>
            <small>{event.trigger}</small>
          </button>
        ))}
      </div>
      <p className="tool-note">Tap a ranked event to inject its worst gap into the center gauge.</p>
    </article>
  );
}

function formatMoney(value: number): string {
  const sign = value >= 0 ? "+" : "-";

  return `${sign}$${Math.abs(value).toLocaleString(undefined, {
    maximumFractionDigits: 0
  })}`;
}
