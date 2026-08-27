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

export default function RequestsTable({ requests }: { requests: RequestRow[] }) {
  if (requests.length === 0) {
    return <p className="text-sm opacity-50 py-6 text-center">No requests yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left opacity-50">
            <th className="font-normal pb-2">When</th>
            <th className="font-normal pb-2">Provider</th>
            <th className="font-normal pb-2">Model</th>
            <th className="font-normal pb-2">Tier</th>
            <th className="font-normal pb-2 text-right">Result</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r, i) => (
            <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
              <td className="py-2 opacity-70">{timeAgo(r.created_at)}</td>
              <td className="py-2 capitalize">{r.provider}</td>
              <td className="py-2 opacity-70">{r.model ?? "—"}</td>
              <td className="py-2 capitalize opacity-70">{r.tier ?? "—"}</td>
              <td className="py-2 text-right">
                {r.cache_hit ? (
                  <span style={{ color: "var(--orange)" }}>cache hit · {r.tokens_estimate} saved</span>
                ) : (
                  <span className="opacity-50">miss</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
