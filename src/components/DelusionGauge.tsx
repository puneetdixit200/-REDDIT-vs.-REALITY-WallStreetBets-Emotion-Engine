"use client";

import { Gauge, Siren } from "lucide-react";
import type { CSSProperties } from "react";
import type { DelusionState } from "@/lib/market";

type DelusionGaugeProps = {
  gap: number;
  state: DelusionState;
  sentiment: number;
  priceChange: number;
};

export function DelusionGauge({ gap, state, sentiment, priceChange }: DelusionGaugeProps) {
  return (
    <aside className={`gauge-rail ${state.alert ? "gauge-rail-alert" : ""}`}>
      <div className="gauge-header">
        {state.alert ? <Siren size={18} /> : <Gauge size={18} />}
        <span>DELUSION GAP</span>
      </div>
      <div className="thermometer" aria-label={`Delusion gap ${gap.toFixed(0)} percent`}>
        <div
          className="thermometer-fill"
          style={{
            height: `${Math.max(5, gap)}%`,
            "--gauge-width": `${Math.max(5, gap)}%`,
            background: state.color,
            boxShadow: `0 0 28px ${state.color}`
          } as CSSProperties}
        />
        <span className="threshold threshold-100">FULL DELUSION</span>
        <span className="threshold threshold-80">Heavy</span>
        <span className="threshold threshold-60">Mild</span>
        <span className="threshold threshold-30">Rational</span>
      </div>
      <strong style={{ color: state.color }}>{gap.toFixed(0)}%</strong>
      <span className="gauge-label">{state.label}</span>
      <div className="gauge-microcopy">
        <span>VIBE {(sentiment * 100).toFixed(0)}%</span>
        <span>PRICE {priceChange.toFixed(1)}%</span>
      </div>
      {state.alert ? (
        <div className="danger-copy">DANGER: SENTIMENT DISCONNECTED FROM REALITY</div>
      ) : null}
    </aside>
  );
}
