"use client";

import { useId, useState } from "react";

interface DailyPoint {
  day: string;
  requests: number;
  cacheHits: number;
  tokensSaved: number;
}

const WIDTH = 600;
const HEIGHT = 140;
const PAD = 8;

function buildPath(values: number[], max: number): { line: string; area: string; coords: [number, number][] } {
  const step = values.length > 1 ? (WIDTH - PAD * 2) / (values.length - 1) : 0;
  const coords: [number, number][] = values.map((v, i) => {
    const x = PAD + step * i;
    const y = PAD + (1 - v / max) * (HEIGHT - PAD * 2);
    return [x, y];
  });

  if (coords.length === 0) return { line: "", area: "", coords: [] };

  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L ${coords[coords.length - 1][0].toFixed(1)} ${HEIGHT - PAD} L ${coords[0][0].toFixed(1)} ${HEIGHT - PAD} Z`;
  return { line, area, coords };
}

export default function ActivityChart({ points }: { points: DailyPoint[] }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.requests));

  const requestsPath = buildPath(
    points.map((p) => p.requests),
    max,
  );
  const hitsPath = buildPath(
    points.map((p) => p.cacheHits),
    max,
  );

  const active = hover !== null ? points[hover] : null;
  const activeCoord = hover !== null ? requestsPath.coords[hover] : null;

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          height={HEIGHT}
          preserveAspectRatio="none"
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={`mb-area-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--orange)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--orange)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`mb-line-${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--amber)" />
              <stop offset="100%" stopColor="var(--orange)" />
            </linearGradient>
          </defs>

          {/* grid lines */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={PAD}
              x2={WIDTH - PAD}
              y1={PAD + f * (HEIGHT - PAD * 2)}
              y2={PAD + f * (HEIGHT - PAD * 2)}
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}

          <path d={requestsPath.area} fill={`url(#mb-area-${uid})`} />
          <path
            d={requestsPath.line}
            fill="none"
            stroke="var(--border)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={hitsPath.line}
            fill="none"
            stroke={`url(#mb-line-${uid})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            style={{
              strokeDasharray: 1,
              strokeDashoffset: 1,
              animation: "mb-draw 1.1s cubic-bezier(0.16,1,0.3,1) forwards",
            }}
          />

          {requestsPath.coords.map(([x], i) => (
            <rect
              key={i}
              x={x - (WIDTH / points.length) / 2}
              y={0}
              width={WIDTH / points.length}
              height={HEIGHT}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}

          {activeCoord && (
            <g>
              <line x1={activeCoord[0]} x2={activeCoord[0]} y1={PAD} y2={HEIGHT - PAD} stroke="var(--border)" strokeWidth="1" />
              <circle cx={activeCoord[0]} cy={activeCoord[1]} r="4" fill="var(--amber)" stroke="var(--paper)" strokeWidth="2" />
            </g>
          )}
        </svg>
        <style>{`@keyframes mb-draw { to { stroke-dashoffset: 0; } }`}</style>

        {active && activeCoord && (
          <div
            className="mb-card px-3 py-2 text-xs absolute pointer-events-none"
            style={{
              left: `${(activeCoord[0] / WIDTH) * 100}%`,
              top: 0,
              transform: `translate(${activeCoord[0] > WIDTH * 0.7 ? "-100%" : "-8px"}, -110%)`,
              whiteSpace: "nowrap",
              zIndex: 10,
            }}
          >
            <div className="font-semibold">{active.day}</div>
            <div className="opacity-70">
              {active.requests} requests · {active.cacheHits} hits · {active.tokensSaved} saved
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between text-xs opacity-50 mt-2">
        <span>{points[0]?.day.slice(5)}</span>
        <span>{points[points.length - 1]?.day.slice(5)}</span>
      </div>

      <div className="flex gap-4 mt-3 text-xs opacity-60">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "var(--border)" }} /> requests
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "linear-gradient(90deg, var(--amber), var(--orange))" }} />{" "}
          cache hits
        </span>
      </div>
    </div>
  );
}
