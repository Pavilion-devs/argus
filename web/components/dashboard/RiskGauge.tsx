"use client";

import { riskColor } from "@/lib/format";

// A circular 0–100 risk gauge (SVG). Color follows the risk band.
export default function RiskGauge({
  score,
  band,
  size = 160,
}: {
  score: number;
  band?: string;
  size?: number;
}) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = riskColor(band);

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)", filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="tnum text-4xl font-light text-white">{Math.round(score)}</span>
        <span className="text-[10px] uppercase tracking-widest text-zinc-500">/ 100</span>
        {band && (
          <span className="mt-1 text-xs font-medium capitalize" style={{ color }}>
            {band}
          </span>
        )}
      </div>
    </div>
  );
}
