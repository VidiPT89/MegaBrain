"use client";

import { useEffect, useState } from "react";
import { MODEL_CATALOG } from "@/lib/models";

interface StoredKey {
  provider: string;
}

export default function TryItConsole({ onDone }: { onDone: () => void }) {
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const [provider, setProvider] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [meta, setMeta] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/settings/key")
      .then((r) => r.json())
      .then((data: { keys: StoredKey[] }) => {
        const providers = data.keys.map((k) => k.provider);
        setConfiguredProviders(providers);
        if (providers.length > 0) {
          setProvider(providers[0]);
          setModel(MODEL_CATALOG[providers[0]]?.[0]?.id ?? "");
        }
      });
  }, []);

  function changeProvider(p: string) {
    setProvider(p);
    setModel(MODEL_CATALOG[p]?.[0]?.id ?? "");
  }

  async function send() {
    if (!prompt.trim() || !provider || !model) return;
    setLoading(true);
    setResponse(null);
    setMeta(null);

    const isAnthropic = provider === "anthropic";
    const endpoint = isAnthropic ? "/api/v1/messages" : "/api/v1/chat/completions";
    const body = isAnthropic
      ? { model, max_tokens: 512, messages: [{ role: "user", content: prompt }] }
      : { model, messages: [{ role: "user", content: prompt }] };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      setResponse(`Error: ${data.error ?? "unknown"}`);
    } else {
      const text = isAnthropic ? data.content?.[0]?.text : data.choices?.[0]?.message?.content;
      setResponse(text ?? "(no text in response)");
      setMeta(data.megabrain?.cache_hit ? "cache hit — instant, 0 tokens" : `miss — tier: ${data.megabrain?.tier}`);
    }
    setLoading(false);
    onDone();
  }

  if (configuredProviders.length === 0) {
    return (
      <p className="text-sm opacity-50">
        Add a key in <a href="/settings" style={{ color: "var(--orange)" }}>Settings</a> to try the proxy here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {configuredProviders.map((p) => (
          <button key={p} className={`mb-pill ${provider === p ? "opacity-100" : "opacity-50"}`} onClick={() => changeProvider(p)}>
            {p}
          </button>
        ))}
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="mb-pill bg-transparent"
          style={{ borderColor: "var(--border)" }}
        >
          {(MODEL_CATALOG[provider] ?? []).map((m) => (
            <option key={m.id} value={m.id} style={{ background: "var(--paper)" }}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ask something..."
        rows={2}
        className="w-full rounded-lg border px-3 py-2 bg-transparent text-sm"
        style={{ borderColor: "var(--border)" }}
      />

      <button className="mb-btn" onClick={send} disabled={loading}>
        {loading ? "Sending..." : "Send"}
      </button>

      {response && (
        <div className="mb-card p-4 text-sm space-y-1">
          <p>{response}</p>
          {meta && <p className="opacity-50 text-xs">{meta}</p>}
        </div>
      )}
    </div>
  );
}
