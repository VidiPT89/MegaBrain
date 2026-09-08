"use client";

interface RequestRow {
  endpoint: string;
  provider: string;
  model: string | null;
  tier: string | null;
  cache_hit: boolean;
  tokens_estimate: number;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const TIER_COLORS: Record<string, string> = {
  local: "#4ade80",
  mid: "var(--amber)",
  premium: "var(--orange)",
};

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return <span className="opacity-40">—</span>;
  const color = TIER_COLORS[tier] ?? "var(--muted)";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium capitalize"
      style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {tier}
    </span>
  );
}

export default function RequestsTable({ requests }: { requests: RequestRow[] }) {
  if (requests.length === 0) {
    return <p className="text-sm opacity-50 py-8 text-center">No requests yet — try one above.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-separate" style={{ borderSpacing: "0 2px" }}>
        <thead>
          <tr className="text-left opacity-50">
            <th className="font-normal pb-2 px-2">When</th>
            <th className="font-normal pb-2 px-2">Provider</th>
            <th className="font-normal pb-2 px-2">Model</th>
            <th className="font-normal pb-2 px-2">Tier</th>
            <th className="font-normal pb-2 px-2 text-right">Result</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r, i) => (
            <tr
              key={i}
              className="mb-fade-in"
              style={{
                animationDelay: `${Math.min(i, 10) * 40}ms`,
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in srgb, var(--orange) 6%, transparent)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td className="py-2.5 px-2 opacity-70 rounded-l-lg" style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", borderLeft: "1px solid var(--border)" }}>
                {timeAgo(r.created_at)}
              </td>
              <td className="py-2.5 px-2 capitalize font-medium" style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                {r.provider}
              </td>
              <td className="py-2.5 px-2 opacity-70 font-mono text-xs" style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                {r.model ?? "—"}
              </td>
              <td className="py-2.5 px-2" style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                <TierBadge tier={r.tier} />
              </td>
              <td
                className="py-2.5 px-2 text-right rounded-r-lg"
                style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}
              >
                {r.cache_hit ? (
                  <span className="mb-accent font-semibold">⚡ cache hit · {r.tokens_estimate} saved</span>
                ) : (
                  <span className="opacity-40">miss</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
