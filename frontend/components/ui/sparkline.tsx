"use client";

import { useId } from "react";

type Props = {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
  fill?: boolean;
};

/** Lightweight inline-SVG sparkline — no deps. */
export default function Sparkline({
  data,
  color = "#8b5cf6",
  height = 40,
  className = "spark",
  fill = true,
}: Props) {
  const id = useId().replace(/:/g, "");
  if (!data || data.length < 2) return <svg className={className} height={height} />;

  const w = 100;
  const h = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = w / (data.length - 1);

  const pts = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / span) * (h - 6) - 3;
    return [x, y] as const;
  });

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" height={height}>
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#sp-${id})`} />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r={2.2}
        fill={color}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}