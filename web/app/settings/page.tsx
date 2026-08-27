"use client";

import { useEffect, useState } from "react";

const PLACEHOLDERS: Record<string, string> = {
  anthropic: "sk-ant-...",
  openai: "sk-...",
  gemini: "AIza...",
};

const LABELS: Record<string, string> = {
  gemini: "Gemini",
  anthropic: "Anthropic",
  openai: "OpenAI",
};

interface StoredKey {
  provider: string;
  updated_at: string;
}

export default function SettingsPage() {
  const [provider, setProvider] = useState<"openai" | "anthropic" | "gemini">("gemini");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [keys, setKeys] = useState<StoredKey[]>([]);

  async function loadKeys() {
    const res = await fetch("/api/settings/key");
    if (res.ok) setKeys((await res.json()).keys);
  }

  useEffect(() => {
    loadKeys();
  }, []);

  async function save() {
    setStatus("A guardar...");
    const res = await fetch("/api/settings/key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey }),
    });
    if (res.ok) {
      setStatus("Guardada.");
      setApiKey("");
      loadKeys();
    } else {
      const data = await res.json();
      setStatus(`Erro: ${data.error}`);
    }
  }

  async function remove(providerToRemove: string) {
    await fetch("/api/settings/key", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: providerToRemove }),
    });
    loadKeys();
  }

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-6 py-16 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="opacity-70 text-sm">
        Your key is encrypted before it&apos;s stored and is only decrypted server-side to forward your requests.
      </p>

      {keys.length > 0 && (
        <div className="mb-card p-6 space-y-3">
          <p className="font-semibold text-sm">Your keys</p>
          {keys.map((k) => (
            <div key={k.provider} className="flex items-center justify-between text-sm">
              <span>
                {LABELS[k.provider] ?? k.provider}{" "}
                <span className="opacity-50">· added {new Date(k.updated_at).toLocaleDateString()}</span>
              </span>
              <button className="mb-pill" onClick={() => remove(k.provider)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mb-card p-6 space-y-4">
        <div className="flex gap-2">
          <button
            className={`mb-pill ${provider === "gemini" ? "opacity-100" : "opacity-50"}`}
            onClick={() => setProvider("gemini")}
          >
            Gemini (free)
          </button>
          <button
            className={`mb-pill ${provider === "anthropic" ? "opacity-100" : "opacity-50"}`}
            onClick={() => setProvider("anthropic")}
          >
            Anthropic
          </button>
          <button
            className={`mb-pill ${provider === "openai" ? "opacity-100" : "opacity-50"}`}
            onClick={() => setProvider("openai")}
          >
            OpenAI
          </button>
        </div>

        {provider === "gemini" && (
          <p className="text-sm opacity-70">
            Get a free key with no credit card at{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--orange)" }}
            >
              aistudio.google.com/apikey
            </a>
            .
          </p>
        )}

        <input
          type="password"
          placeholder={PLACEHOLDERS[provider]}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 bg-transparent"
          style={{ borderColor: "var(--border)" }}
        />

        <button className="mb-btn" onClick={save}>
          Save key
        </button>

        {status && <p className="text-sm opacity-70">{status}</p>}
      </div>
    </main>
  );
}
