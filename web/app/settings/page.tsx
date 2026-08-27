"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [provider, setProvider] = useState<"openai" | "anthropic">("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<string | null>(null);

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
    } else {
      const data = await res.json();
      setStatus(`Erro: ${data.error}`);
    }
  }

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-6 py-16 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="opacity-70 text-sm">
        Your key is encrypted before it's stored and is only decrypted server-side to forward your requests.
      </p>

      <div className="mb-card p-6 space-y-4">
        <div className="flex gap-2">
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

        <input
          type="password"
          placeholder={provider === "anthropic" ? "sk-ant-..." : "sk-..."}
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
