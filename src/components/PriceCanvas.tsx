"use client";

import { useEffect, useRef } from "react";
import type { PricePoint } from "@/lib/market";

type PriceCanvasProps = {
  points: PricePoint[];
  positive: boolean;
};

export function PriceCanvas({ points, positive }: PriceCanvasProps) {
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

    let raf = 0;
    let frame = 0;

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
      context.fillStyle = "#080a10";
      context.fillRect(0, 0, width, height);
      context.strokeStyle = "rgba(240, 185, 11, 0.09)";
      context.lineWidth = 1;

      for (let x = 0; x < width; x += 44) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }

      for (let y = 0; y < height; y += 36) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      const data = points.slice(-320);
      const values = data.map((point) => point.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const spread = Math.max(max - min, max * 0.002, 1);
      const pad = 18;
      const color = positive ? "#16c784" : "#ea3943";
      const progress = Math.min(1, frame / 35);

      const toX = (index: number) =>
        pad + (index / Math.max(data.length - 1, 1)) * (width - pad * 2);
      const toY = (value: number) =>
        pad + (1 - (value - min) / spread) * (height - pad * 2);

      context.beginPath();
      data.forEach((point, index) => {
        const cappedIndex = Math.min(index, Math.floor((data.length - 1) * progress));
        const x = toX(cappedIndex);
        const y = toY(data[cappedIndex]?.value ?? point.value);

        if (index === 0) {
          context.moveTo(x, y);
        } else if (index <= cappedIndex) {
          context.lineTo(x, y);
        }
      });

      context.lineTo(toX(Math.floor((data.length - 1) * progress)), height - pad);
      context.lineTo(pad, height - pad);
      context.closePath();
      const fill = context.createLinearGradient(0, pad, 0, height);
      fill.addColorStop(0, positive ? "rgba(22, 199, 132, 0.32)" : "rgba(234, 57, 67, 0.32)");
      fill.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = fill;
      context.fill();

      context.beginPath();
      data.forEach((point, index) => {
        if (index / Math.max(data.length - 1, 1) > progress) {
          return;
        }

        const x = toX(index);
        const y = toY(point.value);

        if (index === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      });
      context.strokeStyle = color;
      context.lineWidth = 2.5;
      context.shadowBlur = 16;
      context.shadowColor = color;
      context.stroke();
      context.shadowBlur = 0;

      const latest = data.at(-1);
      if (latest) {
        context.fillStyle = color;
        context.beginPath();
        context.arc(width - pad, toY(latest.value), 4, 0, Math.PI * 2);
        context.fill();
      }

      frame += 1;
      raf = window.requestAnimationFrame(draw);
    };

    draw();

    return () => window.cancelAnimationFrame(raf);
  }, [points, positive]);

  return <canvas ref={canvasRef} className="price-canvas" aria-label="Live price area chart" />;
}
