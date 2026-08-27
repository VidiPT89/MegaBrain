"use client";

interface DailyPoint {
  day: string;
  requests: number;
  cacheHits: number;
  tokensSaved: number;
}

export default function ActivityChart({ points }: { points: DailyPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.requests));

  return (
    <div>
      <div className="flex items-end gap-1" style={{ height: 120 }}>
        {points.map((p) => {
          const totalPct = (p.requests / max) * 100;
          const hitPct = (p.cacheHits / max) * 100;
          return (
            <div
              key={p.day}
              className="flex-1 relative"
              style={{ height: "100%" }}
              title={`${p.day}: ${p.requests} pedidos, ${p.cacheHits} cache hits, ${p.tokensSaved} tokens poupados`}
            >
              <div
                className="absolute bottom-0 w-full rounded-t transition-all duration-500"
                style={{ height: `${totalPct}%`, background: "var(--border)", minHeight: p.requests > 0 ? 3 : 0 }}
              />
              <div
                className="absolute bottom-0 w-full rounded-t transition-all duration-500"
                style={{ height: `${hitPct}%`, background: "linear-gradient(180deg, var(--amber), var(--orange))" }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs opacity-50 mt-2">
        <span>{points[0]?.day.slice(5)}</span>
        <span>{points[points.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}
