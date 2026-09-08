"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ActivityChart from "./ActivityChart";
import RequestsTable from "./RequestsTable";
import TryItConsole from "./TryItConsole";

interface Stats {
  totalRequests: number;
  cacheHits: number;
  tierCounts: { local: number; mid: number; premium: number };
  tokensSavedEstimate: number;
  providerCacheReadTokens: number;
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

const EMPTY: Stats = {
  totalRequests: 0,
  cacheHits: 0,
  tierCounts: { local: 0, mid: 0, premium: 0 },
  tokensSavedEstimate: 0,
  providerCacheReadTokens: 0,
};

/** Conta a subir suavemente até `value` sempre que ele mudar. */
function useCountUp(value: number, duration = 700): number {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    function step(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
      else fromRef.current = value;
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return display;
}

export default function StatsClient() {
  const [stats, setStats] = useState<Stats>(EMPTY);
  const [points, setPoints] = useState<DailyPoint[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const [statsRes, seriesRes, requestsRes] = await Promise.all([
      fetch("/api/stats"),
      fetch("/api/stats/timeseries"),
      fetch("/api/requests"),
    ]);
    if (statsRes.ok) setStats(await statsRes.json());
    if (seriesRes.ok) setPoints((await seriesRes.json()).points);
    if (requestsRes.ok) setRequests((await requestsRes.json()).requests);
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount + poll
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const rate = stats.totalRequests > 0 ? Math.round((stats.cacheHits / stats.totalRequests) * 100) : 0;
  const maxTier = Math.max(1, stats.tierCounts.local, stats.tierCounts.mid, stats.tierCounts.premium);

  const totalDisplay = useCountUp(stats.totalRequests);
  const hitsDisplay = useCountUp(stats.cacheHits);
  const rateDisplay = useCountUp(rate);
  const tokensDisplay = useCountUp(stats.tokensSavedEstimate);
  const providerCacheDisplay = useCountUp(stats.providerCacheReadTokens);

  return (
    <div className="space-y-6" style={{ opacity: loaded ? 1 : 0.4, transition: "opacity 0.3s ease" }}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={<IconRequests />} label="Total requests" value={totalDisplay} delay={0} />
        <StatCard icon={<IconBolt />} label="Cache hits" value={hitsDisplay} delay={60} />
        <StatCard icon={<IconTarget />} label="Hit rate" delay={120} ring={rate}>
          {rateDisplay}%
        </StatCard>
        <StatCard icon={<IconCoin />} label="Tokens saved" value={tokensDisplay} delay={180} />
        <StatCard icon={<IconLayers />} label="Anthropic prompt cache" value={providerCacheDisplay} delay={240} />
      </div>

      <div className="mb-card mb-card-hover mb-fade-in p-6" style={{ animationDelay: "300ms" }}>
        <SectionTitle>Try it</SectionTitle>
        <TryItConsole onDone={refresh} />
      </div>

      <div className="mb-card mb-card-hover mb-fade-in p-6" style={{ animationDelay: "340ms" }}>
        <SectionTitle>Activity (last 14 days)</SectionTitle>
        {points.length > 0 && points.some((p) => p.requests > 0) ? (
          <ActivityChart points={points} />
        ) : (
          <EmptyState label="No activity yet — send a request above to see it here." />
        )}
      </div>

      <div className="mb-card mb-card-hover mb-fade-in p-6" style={{ animationDelay: "380ms" }}>
        <SectionTitle>Tier distribution</SectionTitle>
        {(["local", "mid", "premium"] as const).map((tier, i) => (
          <div key={tier} className="flex items-center gap-3 mb-3">
            <div className="w-20 text-sm opacity-70 capitalize">{tier}</div>
            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(stats.tierCounts[tier] / maxTier) * 100}%`,
                  background: "linear-gradient(90deg, var(--orange), var(--amber))",
                  transition: `width 0.8s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms`,
                  boxShadow: stats.tierCounts[tier] > 0 ? "0 0 12px -2px var(--glow)" : "none",
                }}
              />
            </div>
            <div className="w-8 text-right text-sm opacity-70 tabular-nums">{stats.tierCounts[tier]}</div>
          </div>
        ))}
      </div>

      <div className="mb-card mb-card-hover mb-fade-in p-6" style={{ animationDelay: "420ms" }}>
        <SectionTitle>Recent requests</SectionTitle>
        <RequestsTable requests={requests} />
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-semibold mb-4 flex items-center gap-2">{children}</h3>;
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm opacity-50 py-8 text-center">{label}</p>;
}

function StatCard({
  icon,
  label,
  value,
  children,
  delay,
  ring,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  children?: React.ReactNode;
  delay: number;
  ring?: number;
}) {
  return (
    <div className="mb-card mb-card-hover mb-fade-in p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wide opacity-60 leading-tight">{label}</div>
        <div style={{ color: "var(--orange)" }} className="opacity-80">
          {icon}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-3xl font-bold tabular-nums mb-accent">{children ?? value?.toLocaleString()}</div>
        {typeof ring === "number" && <RadialProgress value={ring} />}
      </div>
    </div>
  );
}

function RadialProgress({ value }: { value: number }) {
  const size = 34;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, value)) / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--border)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="url(#mb-ring-gradient)"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)" }}
      />
      <defs>
        <linearGradient id="mb-ring-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--amber)" />
          <stop offset="100%" stopColor="var(--orange)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function iconProps() {
  return { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
}

function IconRequests() {
  return (
    <svg {...iconProps()}>
      <path d="M4 17V7a2 2 0 0 1 2-2h9l5 5v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M14 5v4a1 1 0 0 0 1 1h4" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg {...iconProps()}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function IconCoin() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.5c0-1.4 1.2-2.3 2.5-2.3s2.5.8 2.5 2c0 3-5 1.5-5 4.3 0 1.2 1.2 2 2.5 2s2.5-.9 2.5-2.3" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg {...iconProps()}>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </svg>
  );
}
