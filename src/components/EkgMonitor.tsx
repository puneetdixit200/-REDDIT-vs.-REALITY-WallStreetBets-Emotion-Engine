"use client";

import { useEffect, useRef } from "react";
import type { SentimentPoint } from "@/lib/market";

type EkgMonitorProps = {
  points: SentimentPoint[];
  symbol: string;
  alert: boolean;
};

export function EkgMonitor({ points, symbol, alert }: EkgMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let frame = 0;
    let raf = 0;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(320, rect.width);
      const height = Math.max(220, rect.height);

      if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
        canvas.width = width * ratio;
        canvas.height = height * ratio;
      }

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#020503";
      context.fillRect(0, 0, width, height);

      context.strokeStyle = "rgba(0, 255, 65, 0.08)";
      context.lineWidth = 1;
      for (let x = 0; x < width; x += 28) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }

      for (let y = 0; y < height; y += 28) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      const center = height * 0.52;
      context.strokeStyle = "rgba(0, 255, 65, 0.16)";
      context.beginPath();
      context.moveTo(0, center);
      context.lineTo(width, center);
      context.stroke();

      const symbolPoints = points.filter((point) => point.ticker === symbol).slice(-72);
      const data = symbolPoints.length > 8 ? symbolPoints : points.slice(-72);
      const segment = width / Math.max(data.length - 1, 1);
      const scroll = (frame * 2) % segment;

      context.save();
      context.shadowBlur = alert ? 26 : 15;
      context.shadowColor = alert ? "#ff2535" : "#00ff41";
      context.lineWidth = alert ? 3 : 2;
      context.strokeStyle = alert ? "#ff364a" : "#00ff41";
      context.beginPath();

      data.forEach((point, index) => {
        const x = width - (data.length - 1 - index) * segment - scroll;
        const chaos = alert ? Math.sin(frame / 3 + index) * 28 : 0;
        const qrs = Math.sin(index * 2.4 + frame / 10) * Math.abs(point.sentiment) * 26;
        const y = center - point.sentiment * height * 0.32 + qrs + chaos;

        if (index === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      });

      context.stroke();
      context.restore();

      const cursorX = width - 18;
      const latest = data.at(-1)?.sentiment ?? 0;
      const cursorY = center - latest * height * 0.32;
      const gradient = context.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, 22);
      gradient.addColorStop(0, alert ? "#ff2535" : "#a5ffbd");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(cursorX, cursorY, 22, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = alert ? "#ff2535" : "#00ff41";
      context.beginPath();
      context.arc(cursorX, cursorY, 4, 0, Math.PI * 2);
      context.fill();

      frame += 1;
      raf = window.requestAnimationFrame(draw);
    };

    draw();

    return () => window.cancelAnimationFrame(raf);
  }, [alert, points, symbol]);

  return <canvas ref={canvasRef} className="ekg-canvas" aria-label="WSB heartbeat monitor" />;
}
