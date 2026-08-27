"use client";

import { useEffect, useState } from "react";
import ActivityChart from "./ActivityChart";
import RequestsTable from "./RequestsTable";

interface Stats {
  totalRequests: number;
  cacheHits: number;
  tierCounts: { local: number; mid: number; premium: number };
  tokensSavedEstimate: number;
}

interface DailyPoint {
  day: string;
  requests: number;
  cacheHits: number;
  tokensSaved: number;
}

interface RequestRow {
  endpoint: string;
  provider: string;
  model: string | null;
  tier: string | null;
  cache_hit: boolean;
  tokens_estimate: number;
  created_at: string;
}

const EMPTY: Stats = { totalRequests: 0, cacheHits: 0, tierCounts: { local: 0, mid: 0, premium: 0 }, tokensSavedEstimate: 0 };

export default function StatsClient() {
  const [stats, setStats] = useState<Stats>(EMPTY);
  const [points, setPoints] = useState<DailyPoint[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);

  useEffect(() => {
    let active = true;
    async function refresh() {
      const [statsRes, seriesRes, requestsRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/stats/timeseries"),
        fetch("/api/requests"),
      ]);
      if (!active) return;
      if (statsRes.ok) setStats(await statsRes.json());
      if (seriesRes.ok) setPoints((await seriesRes.json()).points);
      if (requestsRes.ok) setRequests((await requestsRes.json()).requests);
    }
    refresh();
    const interval = setInterval(refresh, 5000);
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
        <Stat icon="◆" label="Total requests" value={stats.totalRequests} />
        <Stat icon="⚡" label="Cache hits" value={stats.cacheHits} />
        <Stat icon="%" label="Hit rate" value={`${rate}%`} />
        <Stat icon="◎" label="Tokens saved" value={stats.tokensSavedEstimate} />
      </div>

      <div className="mb-card p-6">
        <h3 className="font-semibold mb-4">Activity (last 14 days)</h3>
        {points.length > 0 ? (
          <ActivityChart points={points} />
        ) : (
          <p className="text-sm opacity-50 py-6 text-center">No activity yet.</p>
        )}
        <div className="flex gap-4 mt-3 text-xs opacity-60">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "var(--border)" }} /> requests
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ background: "linear-gradient(180deg, var(--amber), var(--orange))" }}
            />{" "}
            cache hits
          </span>
        </div>
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

      <div className="mb-card p-6">
        <h3 className="font-semibold mb-4">Recent requests</h3>
        <RequestsTable requests={requests} />
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="mb-card p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide opacity-60">{label}</div>
        <div className="text-sm opacity-40">{icon}</div>
      </div>
      <div className="text-3xl font-bold mt-2" style={{ color: "var(--orange)" }}>
        {value}
      </div>
    </div>
  );
}
