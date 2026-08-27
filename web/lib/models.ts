/** Catálogo estático de modelos conhecidos por provider, para o dropdown de Settings/dashboard. */
export const MODEL_CATALOG: Record<string, { id: string; label: string }[]> = {
  gemini: [
    { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash (rápido, grátis)" },
    { id: "gemini-3.6-pro", label: "Gemini 3.6 Pro (mais capaz)" },
  ],
  anthropic: [
    { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
    { id: "claude-opus-5", label: "Claude Opus 5" },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  ],
  openai: [
    { id: "gpt-5", label: "GPT-5" },
    { id: "gpt-5-mini", label: "GPT-5 Mini" },
  ],
};
