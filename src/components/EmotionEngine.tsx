"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import {
  Activity,
  CandlestickChart,
  HeartPulse,
  Radio,
  Siren,
  TrendingDown,
  TrendingUp,
  Volume2,
  VolumeX,
  Zap
} from "lucide-react";
import { useEmotionEngine } from "@/hooks/useEmotionEngine";
import { playAlertSequence } from "@/lib/sound";
import { ControlPanels } from "./ControlPanels";
import { DelusionGauge } from "./DelusionGauge";
import { EkgMonitor } from "./EkgMonitor";
import { EmojiRain } from "./EmojiRain";
import { PriceCanvas } from "./PriceCanvas";
import { CommentTicker } from "./CommentTicker";

export function EmotionEngine() {
  const engine = useEmotionEngine();
  const alertPlayedRef = useRef(false);
  const selectedCoin = engine.selectedCoin;
  const pricePositive = (selectedCoin?.change24h ?? 0) >= 0;

  useEffect(() => {
    if (engine.delusionState.alert && engine.audioArmed && !alertPlayedRef.current) {
      alertPlayedRef.current = true;
      playAlertSequence();
    }

    if (!engine.delusionState.alert) {
      alertPlayedRef.current = false;
    }
  }, [engine.audioArmed, engine.delusionState.alert]);

  return (
    <main className={`engine ${engine.delusionState.alert ? "red-alert" : ""}`}>
      <header className="top-bar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <Siren size={20} />
            <CandlestickChart size={20} />
          </div>
          <div>
          <span className="eyebrow">Live WSB Emotion Engine</span>
            <h1>REDDIT vs REALITY</h1>
          </div>
        </div>
        <div className="status-strip">
          <StatusPill icon={<Radio size={15} />} label="Price" value={engine.priceSource} />
          <StatusPill icon={<Zap size={15} />} label="Socket" value={engine.streamState} />
          <StatusPill icon={<Activity size={15} />} label="Sentiment" value={engine.sentimentSource} />
          <button
            type="button"
            className="audio-toggle"
            onClick={() => engine.setAudioArmed(!engine.audioArmed)}
            aria-pressed={engine.audioArmed}
          >
            {engine.audioArmed ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {engine.audioArmed ? "Audio armed" : "Audio muted"}
          </button>
        </div>
      </header>

      <section className="split-screen">
        <section className="sentiment-panel">
          <EmojiRain mood={engine.mood} />
          <PanelHeader
            eyebrow="WallStreetBets Hivemind"
            title={`${engine.selectedSymbol} HEARTBEAT`}
            stat={`${(engine.effectiveSentiment * 100).toFixed(0)}%`}
            tone={engine.mood.color}
            icon={<HeartPulse size={22} />}
          />
          <div className="mood-row">
            <div className="mood-badge" style={{ borderColor: engine.mood.color }}>
              <span>{engine.mood.icon}</span>
              <strong style={{ color: engine.mood.color }}>{engine.mood.label}</strong>
            </div>
            <div>
              <span>Comment volume</span>
              <strong>{engine.latestSentiment.volume.toLocaleString()}</strong>
            </div>
            <div>
              <span>Feed source</span>
              <strong>{engine.latestSentiment.source}</strong>
            </div>
          </div>
          <EkgMonitor
            alert={engine.delusionState.alert}
            points={engine.sentimentHistory}
            symbol={engine.selectedSymbol}
          />
          <CommentTicker comments={engine.comments} />
        </section>

        <DelusionGauge
          gap={engine.delusionGap}
          priceChange={engine.effectivePriceChange}
          sentiment={engine.effectiveSentiment}
          state={engine.delusionState}
        />

        <section className="market-panel">
          <PanelHeader
            eyebrow="Market Reality"
            title={`${selectedCoin?.name ?? "Bitcoin"} LIVE PRICE`}
            stat={formatPrice(selectedCoin?.currentPrice ?? 0)}
            tone={pricePositive ? "#16c784" : "#ea3943"}
            icon={pricePositive ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          />
          <div className="coin-selector" aria-label="Coin selector">
            {engine.coins.map((coin) => {
              const selected = coin.symbol === engine.selectedSymbol;
              const positive = coin.change24h >= 0;

              return (
                <button
                  key={coin.symbol}
                  type="button"
                  className={selected ? "selected" : ""}
                  onClick={() => engine.setSelectedSymbol(coin.symbol)}
                >
                  {coin.image ? (
                    <Image src={coin.image} alt="" width={24} height={24} unoptimized />
                  ) : (
                    <span className="coin-dot" />
                  )}
                  <span>{coin.symbol}</span>
                  <small className={positive ? "gain" : "loss"}>
                    {positive ? "+" : ""}
                    {coin.change24h.toFixed(2)}%
                  </small>
                </button>
              );
            })}
          </div>
          <div className={`price-flash ${pricePositive ? "gain" : "loss"}`}>
            <strong>{formatPrice(selectedCoin?.currentPrice ?? 0)}</strong>
            <span>
              {pricePositive ? "+" : ""}
              {(selectedCoin?.change24h ?? 0).toFixed(2)}% / 24h
            </span>
          </div>
          <PriceCanvas points={selectedCoin?.history ?? []} positive={pricePositive} />
        </section>
      </section>

      <ControlPanels
        activeEvent={engine.activeEvent}
        activeFrame={engine.activeFrame}
        audioArmed={engine.audioArmed}
        events={engine.availableEvents}
        bingoHits={engine.bingoHits}
        coins={engine.coins}
        delusionState={engine.delusionState}
        eventPlaying={engine.eventPlaying}
        heatmap={engine.heatmap}
        liveEventsSource={engine.liveEventsSource}
        onArmAudio={() => engine.setAudioArmed(true)}
        onPlayEvent={engine.playHistoricalEvent}
        onStopEvent={engine.stopHistoricalEvent}
        selectedCoin={selectedCoin}
      />

      <a
        className="made-with-credit"
        href="https://github.com/puneetdixit200"
        target="_blank"
        rel="noreferrer"
        aria-label="Made with heart by PUNEET DIXIT"
      >
        <span>Made with</span>
        <strong aria-hidden="true">♥</strong>
        <span>by</span>
        <b>PUNEET DIXIT</b>
      </a>
    </main>
  );
}

function PanelHeader({
  eyebrow,
  icon,
  stat,
  title,
  tone
}: {
  eyebrow: string;
  icon: React.ReactNode;
  stat: string;
  title: string;
  tone: string;
}) {
  return (
    <div className="panel-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <div className="header-stat" style={{ color: tone }}>
        {icon}
        <strong>{stat}</strong>
      </div>
    </div>
  );
}

function StatusPill({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <span className="status-pill">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  );
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 6 : 2
  }).format(value);
}
