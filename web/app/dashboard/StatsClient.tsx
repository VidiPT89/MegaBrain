"use client";

import { useEffect, useState } from "react";

interface Stats {
  totalRequests: number;
  cacheHits: number;
  tierCounts: { local: number; mid: number; premium: number };
  tokensSavedEstimate: number;
}

const EMPTY: Stats = { totalRequests: 0, cacheHits: 0, tierCounts: { local: 0, mid: 0, premium: 0 }, tokensSavedEstimate: 0 };

export default function StatsClient() {
  const [stats, setStats] = useState<Stats>(EMPTY);

  useEffect(() => {
    let active = true;
    async function refresh() {
      const res = await fetch("/api/stats");
      if (res.ok && active) setStats(await res.json());
    }
    refresh();
    const interval = setInterval(refresh, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const rate = stats.totalRequests > 0 ? Math.round((stats.cacheHits / stats.totalRequests) * 100) : 0;
  const maxTier = Math.max(1, stats.tierCounts.local, stats.tierCounts.mid, stats.tierCounts.premium);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total requests" value={stats.totalRequests} />
        <Stat label="Cache hits" value={stats.cacheHits} />
        <Stat label="Hit rate" value={`${rate}%`} />
        <Stat label="Tokens saved" value={stats.tokensSavedEstimate} />
      </div>

      <div className="mb-card p-6">
        <h3 className="font-semibold mb-4">Tier distribution</h3>
        {(["local", "mid", "premium"] as const).map((tier) => (
          <div key={tier} className="flex items-center gap-3 mb-3">
            <div className="w-20 text-sm opacity-70 capitalize">{tier}</div>
            <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(stats.tierCounts[tier] / maxTier) * 100}%`,
                  background: "linear-gradient(90deg, var(--orange), var(--amber))",
                }}
              />
            </div>
            <div className="w-8 text-right text-sm opacity-70">{stats.tierCounts[tier]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="mb-card p-5">
      <div className="text-xs uppercase tracking-wide opacity-60">{label}</div>
      <div className="text-3xl font-bold mt-2" style={{ color: "var(--orange)" }}>
        {value}
      </div>
    </div>
  );
}
